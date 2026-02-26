from flask import Flask, request, jsonify, render_template, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required
from data import db, User
from config import states
from utils import is_pwd_valid, is_username_valid
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'd44b1948f232719742fe027e617e99681763eecf36f4899faf72485e6ade686fd44b1948f232719742fe027e617e99681763eecf36f4899faf72485e6ade686f'
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
    username = data.get("username")
    pwd = data.get("password")
    if not username or not pwd:
        return jsonify({"message": "username and/or pwd required"}), 400
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"message": "invalid credentials"}), 401
    if check_password_hash(user.password_hash, pwd):
        login_user(user)
        return jsonify({"message": "ok"}), 200
    else:
        return jsonify({"message": "invalid credentials"}), 401

@app.post("/api/logout")
def logout():
    logout_user()
    return jsonify({"message": "logged out"}), 200

@app.post("/api/register")
def register():
    data = request.json
    print(data)
    username = data.get("username")
    pwd = data.get("pwd")
    state = data.get("state")
    role = data.get("role")
    licence_no = data.get("licence_no")
    if role not in ["learner","sd"]: return jsonify({"message": "not a valid role"}), 400
    if state not in states: return jsonify({"message": "not valid state"}), 400
    if not is_username_valid(username): return jsonify({"message": "enter a valid username"}), 400
    if not is_pwd_valid(pwd): return jsonify({"message": "enter a valid pwd"}), 400
    pwd_hash = generate_password_hash(pwd)

    user = User(
        username=username,
        password_hash=pwd_hash,
        state=state,
        role=role,
        license_number=licence_no)

    db.session.add(user)
    db.session.commit()
    login_user(user)
    return jsonify({"message": "ok"}) ,200

@app.post("/api/test")

def test():
    return "some string", 200
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0")
