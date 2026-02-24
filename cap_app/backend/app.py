import flask
from flask import jsonify, Response, request 
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
import json
import flask_login

import config

app = flask.Flask(__name__)
CORS(app)

login_manager = flask_login.LoginManager()
login_manager.init_app(app)

@app.route('/', methods=['GET'])
def home():
    return "Hello, World!"

class User(flask_login.UserMixin):
    def __init__(self, id, password_hash, state, role,license_number=None):
        self.id = id
        self.password_hash = password_hash
        self.state = config.states[state]
        if self.state is None:
            raise ValueError(f"Invalid state: {state}")

        roles = ["learner","sd_driver"]
        if role not in roles:
            raise ValueError(f"Invalid role: {role}")
        self.role = role
        if self.role == "sd_driver":
            if license_number is None:
                raise ValueError("License number is required for SD driver")
        self.license_number = license_number

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    def get_id(self):
        return self.id
    def get_state(self):
        return self.state
    def get_role(self):
        return self.role
    def get_license_number(self):
        return self.license_number

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
    user = User(id=1, password_hash=generate_password_hash(password), state=state, role=role, license_number=license_number)
    register_user(user)
    return jsonify({"message": "Register successful"}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
