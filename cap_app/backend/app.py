from flask import Flask, request, jsonify, render_template, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager, UserMixin
from data import db, User, LicenseInfo, Pair, Trip, GpsPoint
from config import states, secret_key
from utils import is_pwd_valid
from flask_cors import CORS
from my_auth import gen_token, require_auth

app = Flask(__name__)
CORS(app)

# TODO: change on deployment
app.config['SECRET_KEY'] = secret_key
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
db.init_app(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

########################################################
# api routes
########################################################
@app.post("/api/login")
def login():
    data = request.json
    email = data.get("email")
    pwd = data.get("password")
    if not email or not pwd:
        return jsonify({"message": "email and/or password required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "invalid credentials"}), 401
    if check_password_hash(user.password_hash, pwd):
        return jsonify({
            "message": "ok",
            "account_id": user.id,
            "nickname": user.nickname,
            "email": user.email,
            "jwt": str(gen_token(user.id))}), 200
    else:
        return jsonify({"message": "invalid credentials"}), 401

@app.post("/api/logout")
def logout():
    return jsonify({"message": "log out is a front end only"}), 200

@app.post("/api/register")
def register():
    data = request.json
    print(data)
    email = data.get("email")
    pwd = data.get("pwd")
    f_name = data.get("f_name")
    l_name = data.get("l_name")

    # state = data.get("state")
    # role = data.get("role")
    # licence_no = data.get("licence_no")

    if not is_pwd_valid(pwd): return jsonify({"message": "enter a valid pwd"}), 400
    pwd_hash = generate_password_hash(pwd)
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "email already registered"}), 400

    try:
        user = User(f_name=f_name, l_name=l_name, email=email, password_hash=pwd_hash, license_info=None)
    except ValueError as e:
        return jsonify({"message": str(e)}), 400

    db.session.add(user)
    db.session.commit()
    
    return jsonify({"message":"ok",
                    "jwt":gen_token(user.id)}),200
@app.post("/api/is_tok_valid")
@require_auth
def is_tok_valid_route():
    return jsonify({"id":request.user_id}), 200

@app.post("/api/test")
@require_auth
def test():
    return "some string", 200

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0")
