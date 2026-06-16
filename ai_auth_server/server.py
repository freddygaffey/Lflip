from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import threading
from collections import deque
import logging

import tools  # the AI-friendly tools package (ai_auth_server/tools)

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO)

# TODO: PROD: point these at the real hosts
DEFAULT_MAIN_SERVER_URL = "http://127.0.0.1:5001"  # 5001 with `python app.py -d`, 5000 without

# the frontend sends its VITE_API_URL in the X-Api-Url header; map that back
# to the matching backend so this server talks to the right one
MAIN_SERVER_MAP = {
    "5000": "http://127.0.0.1:5000",
    "5001": "http://127.0.0.1:5001",
    "api.": "http://127.0.0.1:5000",
    "dev.": "http://127.0.0.1:5001",
}

def get_main_server_url() -> str:
    api_url = request.headers.get("X-Api-Url", "")
    for key, url in MAIN_SERVER_MAP.items():
        if key in api_url:
            return url
    return DEFAULT_MAIN_SERVER_URL

OLLAMA_URL = "http://127.0.0.1:11434"
OLLAMA_MODEL = "gpt-oss:120b-cloud"

# how many times the model may call tools before we force a final text answer
MAX_TOOL_ROUNDS = 4

# the system prompt that sets up the assistant. injected at the start of every
# conversation so the model knows what it is, that it has tools over the user's
# own data, and that tools it isn't offered are off-limits.
CONTEXT = (
    "You are the in-app assistant for L Flip, an Australian learner-driver "
    "logbook app. You help learner drivers with road rules, their logged driving "
    "practice, and their licence requirements.\n\n"
    "You have tools that read the signed-in learner's OWN logged data (trips, "
    "cars, supervising drivers, licence/state). Only the tools the learner has "
    "permitted are available to you. If the data needed to answer isn't available "
    "as a tool, say you don't have access and that they can enable it in Settings "
    "- do not guess or invent numbers.\n\n"
    "Call a tool when the question is about the learner's own data; answer "
    "directly for general road-rule or licence questions. Be concise and "
    "practical and use Australian terms.\n\n"
    "Never write tool calls, JSON, or function syntax in your replies. Use the "
    "real tool-calling mechanism to call a tool; otherwise reply in plain "
    "English. If you cannot access the data needed, just say so."
)

# which backend endpoint supplies each data category a tool can require
CATEGORY_ENDPOINTS = {
    "trips": "/api/trips",
    "cars": "/api/cars",
    "supervisors": "/api/sv",
    "licence": "/api/state",
}

# ollama only handles one generation well at a time, so requests are
# queued and processed one-by-one by a single worker thread
class OllamaJob:
    def __init__(self, messages: list, max_tokens: int, tool_schemas: list | None = None):
        self.messages = messages
        self.max_tokens = max_tokens
        self.tool_schemas = tool_schemas
        self.result = None
        self.error = None
        self.done = threading.Event()

ollama_queue: deque[OllamaJob] = deque()
ollama_queue_not_empty = threading.Condition()

def ollama_worker():
    while True:
        with ollama_queue_not_empty:
            while not ollama_queue:
                ollama_queue_not_empty.wait()
            job = ollama_queue.popleft()

        try:
            payload = {
                "model": OLLAMA_MODEL,
                "messages": job.messages,
                "stream": False,
                "options": {"num_predict": job.max_tokens},
            }
            # only advertise tools when there are any the user has permitted
            if job.tool_schemas:
                payload["tools"] = job.tool_schemas
            resp = requests.post(f"{OLLAMA_URL}/api/chat", json=payload, timeout=120)
            resp.raise_for_status()
            job.result = resp.json()
        except requests.RequestException as e:
            job.error = e
        finally:
            job.done.set()

threading.Thread(target=ollama_worker, daemon=True).start()

def run_ollama(messages: list, max_tokens: int, tool_schemas: list | None = None) -> OllamaJob:
    job = OllamaJob(messages, max_tokens, tool_schemas)
    with ollama_queue_not_empty:
        ollama_queue.append(job)
        ollama_queue_not_empty.notify()
    job.done.wait()
    return job


def generate_title(prompt: str) -> str | None:
    """Ask the model for a short title summarising the first message of a chat.

    gpt-oss is a reasoning model, so it spends tokens "thinking" before it
    writes the answer. num_predict has to be high enough to cover that thinking
    plus the short title, otherwise message.content comes back empty.
    """
    messages = [
        {"role": "system", "content": (
            "You generate a concise title for a chat, 3 to 5 words long. "
            "Reply with only the title text, no quotes and no trailing punctuation."
        )},
        {"role": "user", "content": prompt},
    ]
    job = run_ollama(messages, 256)
    if job.error or not job.result:
        return None
    title = job.result.get("message", {}).get("content", "")
    # tidy up: collapse whitespace and strip wrapping quotes/punctuation
    title = " ".join(title.split()).strip(' "\'.')
    return title[:100] or None


def get_token() -> str | None:
    token = request.cookies.get("auth_token")
    auth_header = request.headers.get("Authorization")
    if not token and auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    return token


def forward_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# --------------------------------------------------------------------------- #
# tool runtime: preferences, data fetching, and the permission-checked dispatcher
# --------------------------------------------------------------------------- #
def get_ai_prefs(main_url: str, token: str) -> dict:
    """Fetch the user's AiPreference flags. Defaults to {} (nothing allowed) so
    failures fail safe - no data is exposed."""
    try:
        r = requests.get(f"{main_url}/api/ai/preferences", headers=forward_headers(token), timeout=10)
        if r.status_code == 200:
            return r.json()
    except requests.RequestException:
        pass
    return {}


def fetch_category(category: str, main_url: str, token: str, cache: dict):
    """Fetch one data category's raw JSON from the backend, caching it for the
    rest of this request so several tools don't re-fetch the same thing."""
    if category in cache:
        return cache[category]
    raw = None
    endpoint = CATEGORY_ENDPOINTS.get(category)
    if endpoint:
        try:
            r = requests.get(f"{main_url}{endpoint}", headers=forward_headers(token), timeout=10)
            if r.status_code == 200:
                raw = r.json()
        except requests.RequestException:
            raw = None
    cache[category] = raw
    return raw


def build_ctx(categories, main_url: str, token: str, cache: dict):
    """Build a parser.Context containing only the requested data categories."""
    keymap = {"trips": "trips_raw", "cars": "cars_raw",
              "supervisors": "svs_raw", "licence": "state_raw"}
    kwargs = {keymap[c]: fetch_category(c, main_url, token, cache)
              for c in categories if c in keymap}
    return tools.parser.build_context(**kwargs)


def execute_tool(name: str, prefs: dict, main_url: str, token: str, cache: dict) -> str:
    """The "passer": run a tool the model asked for, but only after checking the
    user has permitted every data category it needs. Returns a short text result
    (or a notice) to feed back to the model."""
    if name not in tools.TOOLS:
        return f"(no such tool: {name})"
    # permission check - the tool is only allowed if all its REQUIRES are enabled
    if name not in tools.allowed_tools(prefs):
        needed = ", ".join(tools.TOOLS[name].REQUIRES)
        return (f"(permission denied: the learner has not enabled access to "
                f"{needed}; tell them they can turn it on in Settings)")
    ctx = build_ctx(tools.TOOLS[name].REQUIRES, main_url, token, cache)
    try:
        result = tools.run_tool(name, ctx)
        return tools.TOOLS[name].format_for_ai(result)
    except Exception as e:  # a tool blowing up shouldn't kill the chat
        logging.exception("tool %s failed", name)
        return f"(tool {name} failed: {e})"


@app.get("/")
def main():
    return "this is the ai server it works" , 200

@app.post("/api/ai/chat")
def chat():
    token = get_token()
    if not token:
        return jsonify({"message": "unauthorized"}), 401

    data = request.json or {}
    chat_id = data.get("chat_id")
    prompt = data.get("prompt")
    if chat_id is None or not prompt:
        return jsonify({"message": "chat_id and prompt required"}), 400

    MAIN_SERVER_URL = get_main_server_url()

    # check the user has tokens left on the main server
    try:
        tokens_resp = requests.get(
            f"{MAIN_SERVER_URL}/api/ai/tokens_left",
            headers=forward_headers(token),
            timeout=10,
        )
    except requests.RequestException:
        return jsonify({"message": "could not reach main server"}), 502

    if tokens_resp.status_code != 200:
        return jsonify({"message": "unauthorized"}), 401

    tokens_left = tokens_resp.json()
    max_tokens = min(tokens_left.get("tokens_left_5h", 0), tokens_left.get("tokens_left_week", 0))
    if max_tokens <= 0:
        return jsonify({"message": "token limit reached"}), 429

    # fetch prior messages so the model has conversation context
    try:
        history_resp = requests.get(
            f"{MAIN_SERVER_URL}/api/chats/{chat_id}/messages",
            headers=forward_headers(token),
            timeout=10,
        )
    except requests.RequestException:
        return jsonify({"message": "could not reach main server"}), 502

    if history_resp.status_code != 200:
        return jsonify({"message": "not found"}), 404

    history = history_resp.json()

    # record the user's message on the main server
    try:
        requests.post(
            f"{MAIN_SERVER_URL}/api/chats/{chat_id}/messages",
            headers=forward_headers(token),
            json={"is_ai": False, "content": prompt},
            timeout=10,
        )
    except requests.RequestException:
        return jsonify({"message": "could not reach main server"}), 502

    # fetch the user's tool/data permissions and the schemas they allow
    prefs = get_ai_prefs(MAIN_SERVER_URL, token)
    tool_schemas = tools.allowed_schemas(prefs)

    # build the messages: system context, prior turns, then the new message
    messages = [{"role": "system", "content": CONTEXT}]
    messages += [
        {"role": "assistant" if m["is_ai"] else "user", "content": m["content"]}
        for m in history
    ]
    messages.append({"role": "user", "content": prompt})

    # tool-calling loop: the model may call permitted tools, read the results and
    # call more, until it returns a normal text answer (capped for safety).
    reply = ""
    tokens_used = 0
    fetch_cache: dict = {}
    for _ in range(MAX_TOOL_ROUNDS):
        budget = max_tokens - tokens_used
        if budget <= 0:
            break
        job = run_ollama(messages, budget, tool_schemas)
        if job.error:
            return jsonify({"message": f"ollama request failed: {job.error}"}), 502
        msg = job.result.get("message", {}) or {}
        tokens_used += job.result.get("eval_count", 0)

        calls = msg.get("tool_calls") or []
        if not calls:
            reply = msg.get("content", "")
            break

        # record the assistant's tool request, then run each tool and feed it back
        messages.append(msg)
        for call in calls:
            fn = call.get("function", {}) or {}
            name = fn.get("name", "")
            summary = execute_tool(name, prefs, MAIN_SERVER_URL, token, fetch_cache)
            messages.append({"role": "tool", "content": summary, "tool_name": name})
    else:
        # used every tool round - ask once more with no tools to force an answer
        job = run_ollama(messages, max(1, max_tokens - tokens_used))
        if not job.error and job.result:
            reply = job.result.get("message", {}).get("content", "")
            tokens_used += job.result.get("eval_count", 0)

    if not reply:
        reply = "Sorry, I couldn't produce an answer for that. Please try again."

    # record the ai's reply + token usage on the main server
    try:
        requests.post(
            f"{MAIN_SERVER_URL}/api/chats/{chat_id}/messages",
            headers=forward_headers(token),
            json={"is_ai": True, "content": reply, "tokens_used": tokens_used},
            timeout=10,
        )
    except requests.RequestException:
        return jsonify({"message": "could not reach main server"}), 502

    # first message in the chat -> auto-name it (best-effort). fall back to a
    # trimmed version of the prompt if the model doesn't return a usable title
    if not history:
        title = generate_title(prompt) or " ".join(prompt.split())[:40]
        try:
            requests.patch(
                f"{MAIN_SERVER_URL}/api/chats/{chat_id}",
                headers=forward_headers(token),
                json={"chat_name": title},
                timeout=10,
            )
        except requests.RequestException:
            pass

    return jsonify({"content": reply, "tokens_used": tokens_used}), 200


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("-d", "--debug", action="store_true")
    args = parser.parse_args()

    app.run(host="127.0.0.1", port=5050, debug=args.debug)
