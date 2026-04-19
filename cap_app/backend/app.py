from flask import Flask, request, jsonify, render_template, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from data import db, User, LicenseInfo, Trip, GpsPoint, Car
import secrets
from config import states, secret_key
from utils import is_pwd_valid
from flask_cors import CORS
from my_auth import gen_token, require_auth
import time
from datetime import datetime

app = Flask(__name__)
CORS(app, supports_credentials=True)

# TODO: change on deployment
app.config['SECRET_KEY'] = secret_key
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
db.init_app(app)

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
        token = str(gen_token(user.id))
        response = jsonify({
            "message": "ok",
            "account_id": user.id,
            "nickname": user.nickname,
            "email": user.email,
            "token": token})
        response.set_cookie('auth_token', token, httponly=True, secure=False, samesite='Lax')
        return response, 200
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

    # token = str(gen_token(user.id))
    # response = jsonify({"message":"ok"})
    # response.set_cookie('auth_token', token, httponly=True, secure=False, samesite='Lax')
    return jsonify({"message":"ok"}) ,200

@app.post("/api/set_licence")
@require_auth
def set_licence():
        print("ran somthing")
        time.sleep(0.5)
        data = request.json
        print(data)
        state = data.get("state")
        role = data.get("role")
        licence_no = data.get("licence_no")

        licence_info = LicenseInfo(
            account_id=request.user_id,
            state=state,
            license_number=licence_no,
            role=role)
        db.session.add(licence_info)
        db.session.commit()
        return jsonify({"message" :"ok"}), 200


@app.post("/api/is_tok_valid")
@require_auth
def is_tok_valid_route():
    return jsonify({"id":request.user_id}), 200

@app.post("/api/test")
@require_auth
def test():
    return "some string", 200

@app.post("/api/dashboard")
@require_auth
def start_dashboard():
    return "top secret yay", 200
    request.user_id 
    query = db.select()

@app.post("/api/is_auth")
@require_auth
def is_auth(): return "ok" , 200

@app.get("/api/state")
@require_auth
def license_state():
    info = LicenseInfo.query.filter_by(account_id=int(request.user_id)).first()
    if not info:
        return jsonify({"message": "no licence on file"}), 404
    r = jsonify({
        "state": info.state,
        "total": states[info.state].total_hours,
        "night": states[info.state].night_hours
    })
    return r, 200
# @app.post("/api/state/total")
# @require_auth
# def is_auth():
#     info = LicenseInfo.query.filter_by(acount_id=int(request.user_id)).first()
#     return str(states[info.state].total_hours), 200

# @app.post("/api/state/night")
# @require_auth
# def is_auth():
#     info = LicenseInfo.query.filter_by(acount_id=int(request.user_id)).first()
#     return str(states[info.state].night_hours), 200

@app.post("/api/trips/push_trip")
@require_auth
def sync_trips():
    data = request.json or {}
    trip_data = data.get("trip")
    # One trip = JSON object `{ "start_time": ... }`, not `[...]` and not missing.
    if trip_data is None or type(trip_data) is not dict:
        return jsonify({"message": "trip must be one object in body, e.g. {\"trip\": {...}}"}), 400
    try:
        start_time_ms = trip_data.get("start_time")
        end_time_ms = trip_data.get("end_time")
        if start_time_ms is None or end_time_ms is None:
            return jsonify({"message": "trip start_time and end_time required"}), 400
        trip = Trip(
            learner_driver_id=int(request.user_id),
            start_time=datetime.fromtimestamp(start_time_ms / 1000),
            end_time=datetime.fromtimestamp(end_time_ms / 1000),
            start_odometer=trip_data.get("start_odo"),
            end_odometer=trip_data.get("end_odo"),
            day_night="night" if trip_data.get("day") is False else "day",
            weather=trip_data.get("weather"),
            notes=None,
        )
        db.session.add(trip)
        db.session.commit()
    except (TypeError, ValueError) as e:
        db.session.rollback()
        return jsonify({"message": str(e)}), 400
    return jsonify({"message": "ok"}), 200

# @app.post("/api/trips/sync")
# @require_auth
# def sync_trips():
#     data = request.json
#     print(data)
#     trips = data.get("trips", [])
#     for t in trips:
#         trip = Trip(
#             learner_driver_id=request.user_id,
#             start_time=datetime.fromtimestamp(t.get("start_time") / 1000),
#             end_time=datetime.fromtimestamp(t.get("end_time") / 1000),
#             start_odometer=t.get("start_odo"),
#             end_odometer=t.get("end_odo"),
#             day_night="day" if t.get("day") else "night",
#             notes={"weather": t.get("weather")}
#         )
#         db.session.add(trip)
#     db.session.commit()
#     return jsonify({"message": "ok"}), 200


@app.delete("/api/trips")
@require_auth
def delete_trips():
    Trip.query.filter_by(learner_driver_id=int(request.user_id)).delete()
    db.session.commit()
    return jsonify({"message": "ok"}), 200


@app.get("/api/trips")
@require_auth
def pull_trips():
    trips = Trip.query.filter_by(learner_driver_id=request.user_id).all()
    return jsonify([{
        "id": t.id,
        "start_time": t.start_time.timestamp() * 1000,
        "end_time": t.end_time.timestamp() * 1000,
        "start_odometer": t.start_odometer,
        "end_odometer": t.end_odometer,
        "day_night": t.day_night,
        "weather": t.weather,
    } for t in trips]), 200
    

@app.get("/api/cars")
@require_auth
def list_cars():
    cars = Car.query.filter_by(owner_id=int(request.user_id)).all()
    return jsonify([{
        "id": c.id,
        "nickname": c.nickname,
        "plate": c.plate,
        "ble_device_name": c.ble_device_name,
        "ble_service_uuid": c.ble_service_uuid,
        "has_pairing_secret": bool(c.pairing_secret),
    } for c in cars]), 200


@app.post("/api/cars")
@require_auth
def create_car():
    data = request.json or {}
    nickname = data.get("nickname")
    if not nickname:
        return jsonify({"message": "nickname required"}), 400
    try:
        car = Car(
            owner_id=int(request.user_id),
            nickname=nickname,
            plate=data.get("plate"),
            ble_device_name=data.get("ble_device_name"),
            ble_service_uuid=data.get("ble_service_uuid"),
            pairing_secret=secrets.token_hex(32),
        )
        db.session.add(car)
        db.session.commit()
    except (TypeError, ValueError) as e:
        db.session.rollback()
        return jsonify({"message": str(e)}), 400
    return jsonify({
        "id": car.id,
        "nickname": car.nickname,
        "plate": car.plate,
        "ble_device_name": car.ble_device_name,
        "ble_service_uuid": car.ble_service_uuid,
        "pairing_secret": car.pairing_secret,
    }), 200


@app.delete("/api/cars/<int:car_id>")
@require_auth
def delete_car(car_id):
    car = Car.query.filter_by(id=car_id, owner_id=int(request.user_id)).first()
    if not car:
        return jsonify({"message": "not found"}), 404
    db.session.delete(car)
    db.session.commit()
    return jsonify({"message": "ok"}), 200


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=5001, debug=True)
