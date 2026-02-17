from flask import Flask, send_from_directory

app = Flask(__name__)


@app.route("/manifest.json")
def manifest():
    return send_from_directory(".", "manifest.json", mimetype="application/manifest+json")


@app.route("/sw.js")
def service_worker():
    return send_from_directory(".", "sw.js", mimetype="application/javascript")

@app.route('/', methods=['GET'])
def dashboard():
    return ""


if __name__ == "__main__":
    app.run(debug=True)
