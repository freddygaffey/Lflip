from flask import Flask, request, jsonify, render_template, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required
from data import db, User, LicenseInfo, SupervisionPair, Trip, GpsPoint
from config import states
from utils import is_pwd_valid
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
# TODO: change on deployment
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
    email = data.get("email")
    pwd = data.get("password")
    if not email or not pwd:
        return jsonify({"message": "email and/or password required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "invalid credentials"}), 401
    if check_password_hash(user.password_hash, pwd):
        login_user(user)

        return jsonify({
            "message": "ok",
            "account_id": user.id,
            "nickname": user.nickname,
            "email": user.email}), 200
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
    email = data.get("email")
    pwd = data.get("pwd")
    f_name = data.get("f_name")
    l_name = data.get("l_name")

    # state = data.get("state")
    # role = data.get("role")
    # licence_no = data.get("licence_no")

    # if role not in ["learner","sd"]: return jsonify({"message": "not a valid role"}), 400
    # if state not in states: return jsonify({"message": "not valid state"}), 400
    if not is_pwd_valid(pwd): return jsonify({"message": "enter a valid pwd"}), 400
    pwd_hash = generate_password_hash(pwd)
    try:
        user = User(f_name=f_name, l_name=l_name, email=email, password_hash=pwd_hash, license_info=None)
    except ValueError as e:
        return jsonify({"message": str(e)}), 400

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
