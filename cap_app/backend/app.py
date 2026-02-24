import flask
from flask import jsonify, Response, request 
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
import json
import flask_login

import config
from database import db, User

app = flask.Flask(__name__)
CORS(app)

login_manager = flask_login.LoginManager()
login_manager.init_app(app)

@app.route('/', methods=['GET'])
def home():
    return "Hello, World!"


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    state = data.get('state')
    role = data.get('role')
    license_number = data.get('license_number')

    user = User(id=1, password_hash=generate_password_hash(password), state=state, role=role, license_number=license_number)
    login_user(user)
    return jsonify({"message": "Login successful"}), 200

@app.route('/logout', methods=['POST'])
def logout():
    logout_user()
    return jsonify({"message": "Logout successful"}), 200

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    state = data.get('state')
    role = data.get('role')
    license_number = data.get('license_number')
    user = User(username=username, password_hash=generate_password_hash(password), state=state, role=role, license_number=license_number)
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "Register successful"}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
