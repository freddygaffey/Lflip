from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import threading
from collections import deque
import logging

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

# ollama only handles one generation well at a time, so requests are
# queued and processed one-by-one by a single worker thread
class OllamaJob:
    def __init__(self, messages: list, max_tokens: int):
        self.messages = messages
        self.max_tokens = max_tokens
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
            resp = requests.post(
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model": OLLAMA_MODEL,
                    "messages": job.messages,
                    "stream": False,
                    "options": {"num_predict": job.max_tokens},
                },
                timeout=120,
            )
            resp.raise_for_status()
            job.result = resp.json()
        except requests.RequestException as e:
            job.error = e
        finally:
            job.done.set()

threading.Thread(target=ollama_worker, daemon=True).start()

def run_ollama(messages: list, max_tokens: int) -> OllamaJob:
    job = OllamaJob(messages, max_tokens)
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

    # build the messages array: prior turns as context, then the new message
    messages = [
        {"role": "assistant" if m["is_ai"] else "user", "content": m["content"]}
        for m in history
    ]
    messages.append({"role": "user", "content": prompt})

    # queue the request to ollama (processed one-by-one, in order, by the worker thread)
    job = run_ollama(messages, max_tokens)
    if job.error:
        return jsonify({"message": f"ollama request failed: {job.error}"}), 502

    reply = job.result.get("message", {}).get("content", "")
    tokens_used = job.result.get("eval_count", 0)

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
