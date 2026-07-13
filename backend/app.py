from flask import Flask, request, jsonify, render_template, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from markupsafe import escape
from data import db, User, LicenseInfo, Trip, GpsPoint, Car, Sv, Chat, ChatMessage, AiPreference
import secrets
from config import states, secret_key, TOKEN_LIMIT_5H, TOKEN_LIMIT_WEEK
from utils import is_pwd_valid, is_email_valid
from flask_cors import CORS
from flask_limiter import Limiter
from my_auth import gen_token, require_auth
import time
from datetime import datetime, timedelta
from sqlalchemy import func
from functools import wraps

import sys

app = Flask(__name__)
app.config['SECRET_KEY'] = secret_key

# behind nginx the socket IP is always 127.0.0.1, so rate-limit on the real
# client IP from X-Forwarded-For (nginx must set it) and fall back to the socket
def client_ip():
    fwd = request.headers.get("X-Forwarded-For", "")
    return fwd.split(",")[0].strip() if fwd else request.remote_addr

limiter = Limiter(key_func=client_ip, app=app)

def handle_validation_error(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)

        # this is ok as i will call value errors these are made by message
        # thay are allredy safe like "you passowrd or user name is inforect" ect
        except ValueError as e:
            db.session.rollback()
            return jsonify({"message": str(e)}), 400
        except Exception:
            db.session.rollback()
            app.logger.exception("unhandled error in %s", f.__name__)
            return jsonify({"message": "server error"}), 500
    return wrapper

########################################################
# api routes
########################################################
@app.get("/")
def root():
    print("the os it" + request.headers.get('User-Agent', ''))
    return "you are connected to the pyton server", 200


@app.post("/api/login")
@limiter.limit("5 per minute")
def login():
    print("the os it" + request.headers.get('User-Agent', ''))
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
            "nickname": escape(user.nickname),
            "email": escape(user.email),
            "token": token})
        response.set_cookie('auth_token', token, httponly=True, secure=True,
                            samesite='Lax', domain='.lflip.pebnum.com')
        return response, 200
    else:
        return jsonify({"message": "invalid credentials"}), 401

@app.post("/api/logout")
def logout():
    return jsonify({"message": "log out is a front end only"}), 200

@app.post("/api/register")
@limiter.limit("5 per minute")
@handle_validation_error
def register():
    data = request.json
    email = data.get("email")
    pwd = data.get("pwd")
    f_name = data.get("f_name")
    l_name = data.get("l_name")

    if not is_email_valid(email): return jsonify({"message": "enter a valid email"}), 400
    if not is_pwd_valid(pwd): return jsonify({"message": "enter a valid pwd"}), 400
    pwd_hash = generate_password_hash(pwd)
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "email already registered"}), 400

    user = User(f_name=f_name, l_name=l_name, email=email, password_hash=pwd_hash, license_info=None)
    db.session.add(user)
    db.session.commit()

    # give every new user an all-off AiPreference row up front (opt-in: no data
    # is shared with the assistant until they enable a category in Settings)
    db.session.add(AiPreference(user_id=user.id))
    db.session.commit()

    # token = str(gen_token(user.id))
    # response = jsonify({"message":"ok"})
    # response.set_cookie('auth_token', token, httponly=True, secure=False, samesite='Lax')
    return jsonify({"message":"ok"}) ,200

@app.post("/api/set_licence")
@require_auth
@handle_validation_error
def set_licence():
        time.sleep(0.5)
        data = request.json
        state = data.get("state")
        licence_no = data.get("licence_no")

        licence_info = LicenseInfo(
            account_id=request.user_id,
            state=state,
            licence_no=licence_no)
        db.session.add(licence_info)
        db.session.commit()
        return jsonify({"message" :"ok"}), 200

@app.post("/api/is_tok_valid")
@require_auth
def is_tok_valid_route():
    return jsonify({"id":request.user_id}), 200

@app.route("/api/test",methods=["GET","POST"])
@require_auth
def test():
    print("the os it" + request.headers.get('User-Agent', ''))
    return "some string", 200

@app.post("/api/dashboard")
@require_auth
def start_dashboard():
    return "top secret yay", 200

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
@handle_validation_error
def sync_trips():
    data = request.json or {}
    trip_data = data.get("trip")
    if trip_data is None or type(trip_data) is not dict:
        return jsonify({"message": "trip must be one object in body, e.g. {\"trip\": {...}}"}), 400

    start_time_ms = trip_data.get("start_time")
    end_time_ms = trip_data.get("end_time")
    if start_time_ms is None or end_time_ms is None:
        return jsonify({"message": "trip start_time and end_time required"}), 400
    trip = Trip(
        learner_id=int(request.user_id),
        start_time=datetime.fromtimestamp(start_time_ms / 1000),
        end_time=datetime.fromtimestamp(end_time_ms / 1000),
        start_odo=trip_data.get("start_odo"),
        end_odo=trip_data.get("end_odo"),
        day_night="night" if trip_data.get("day") is False else "day",
        weather=trip_data.get("weather"),
        car_id=trip_data.get("car_id"),
        sv_id=trip_data.get("sv_id"),
        sv_name=trip_data.get("sv_name"),
        sv_licence_no=trip_data.get("sv_licence_no"),
    )
    db.session.add(trip)
    db.session.commit()

    gps = trip_data.get("gps") or []
    for i in gps:
        p = GpsPoint(
            trip_id=trip.id,
            speed=i.get("speed"),
            lon=i.get("lon"),
            lat=i.get("lat"),
            timestamp=datetime.fromtimestamp(i.get("time") / 1000),
        )
        db.session.add(p)
    db.session.commit()

    return jsonify({"message": "ok"}), 200

@app.delete("/api/trips")
@require_auth
def delete_trips():
    # delete per-object (not bulk) so the gps_points cascade fires
    trips = Trip.query.filter_by(learner_id=int(request.user_id)).all()
    for t in trips:
        db.session.delete(t)
    db.session.commit()
    return jsonify({"message": "ok"}), 200

@app.delete("/api/trips/<int:id>")
@require_auth
def delete_trip(id):
    trip = Trip.query.filter_by(learner_id=int(request.user_id), id=int(id)).first()
    if trip is not None:
        db.session.delete(trip)
        db.session.commit()
    return jsonify({"message": "ok"}), 200

@app.get("/api/trips")
@require_auth
def pull_trips():
    # lightweight list: no gps points so the dashboard loads fast.
    # gps is fetched per-trip via /api/trips/<id>/gps when a map is opened.
    trips = Trip.query.filter_by(learner_id=int(request.user_id)).all()
    value_json = []
    for t in trips:
        td = {
            "id": t.id,
            "start_time": t.start_time.timestamp() * 1000,
            "end_time": t.end_time.timestamp() * 1000,
            "start_odo": t.start_odo,
            "end_odo": t.end_odo,
            "day_night": escape(t.day_night),
            "weather": escape(t.weather) if t.weather else None,
            "car_id": t.car_id,
            "sv_id": t.sv_id,
            "sv_name": escape(t.sv_name) if t.sv_name else None,
            "sv_licence_no": escape(t.sv_licence_no) if t.sv_licence_no else None}

        value_json.append(td)

    return jsonify(value_json), 200


@app.get("/api/trips/<int:trip_id>/gps")
@require_auth
def pull_trip_gps(trip_id):
    # ownership check: only return gps for a trip belonging to this learner
    trip = Trip.query.filter_by(id=trip_id, learner_id=int(request.user_id)).first()
    if trip is None:
        return jsonify({"error": "not found"}), 404

    gps = GpsPoint.query.filter_by(trip_id=trip_id).all()
    gps_arr = [{
        "time": g.timestamp.timestamp() * 1000,
        "lon": g.lon,
        "lat": g.lat,
        "speed": g.speed} for g in gps]

    return jsonify(gps_arr), 200


# i copied the car routes and just renamed  
@app.get("/api/sv")
@require_auth
def list_sv():
    sv = Sv.query.filter_by(owner_id=int(request.user_id)).all()
    return jsonify([{
        "id": c.id,
        "full_name": escape(c.full_name),
        "licence_no": escape(c.licence_no),
        "last_used": c.last_used.timestamp() * 1000 if c.last_used else None,
    } for c in sv]), 200

@app.post("/api/sv")
@require_auth
@handle_validation_error
def create_sv():
    data = request.json or {}
    full_name = data.get("full_name")
    licence_no = data.get("licence_no")
    if not full_name:
        return jsonify({"message": "full_name required"}), 400

    sv = Sv(
        owner_id=int(request.user_id),
        full_name=full_name,
        licence_no=licence_no
    )
    db.session.add(sv)
    db.session.commit()

    return jsonify({
        "id": sv.id,
        "full_name": escape(sv.full_name),
        "licence_no": escape(sv.licence_no),
    }), 200

@app.patch("/api/sv/<int:sv_id>")
@require_auth
@handle_validation_error
def update_sv(sv_id):
    sv = Sv.query.filter_by(id=sv_id, owner_id=int(request.user_id)).first()
    if not sv:
        return jsonify({"message": "not found"}), 404
    data = request.json or {}
    if "full_name" in data:
        sv.full_name = data["full_name"]
    if "licence_no" in data:
        sv.licence_no = data["licence_no"]
    if "last_used" in data:
        sv.last_used = datetime.fromtimestamp(data["last_used"] / 1000) if data["last_used"] else None

    db.session.commit()

    return jsonify({
        "id": sv.id,
        "full_name": escape(sv.full_name),
        "licence_no": escape(sv.licence_no),
        "last_used": sv.last_used.timestamp() * 1000 if sv.last_used else None,
    }), 200

@app.delete("/api/sv")
@require_auth
def delete_all_sv():
    Sv.query.filter_by(owner_id=int(request.user_id)).delete()
    db.session.commit()
    return jsonify({"message": "ok"}), 200

@app.delete("/api/sv/<int:sv_id>")
@require_auth
def delete_sv(sv_id):
    sv = Sv.query.filter_by(id=sv_id, owner_id=int(request.user_id)).first()
    if not sv:
        return jsonify({"message": "not found"}), 404
    db.session.delete(sv)
    db.session.commit()
    return jsonify({"message": "ok"}), 200

@app.get("/api/cars")
@require_auth
def list_cars():
    cars = Car.query.filter_by(owner_id=int(request.user_id)).all()
    return jsonify([{
        "id": c.id,
        "nickname": escape(c.nickname),
        "plate": escape(c.plate) if c.plate else None,
        "ble_device_name": escape(c.ble_device_name) if c.ble_device_name else None,
        "ble_service_uuid": escape(c.ble_service_uuid) if c.ble_service_uuid else None,
        "has_pairing_secret": bool(c.pairing_secret),
        "last_used": c.last_used.timestamp() * 1000 if c.last_used else None,
    } for c in cars]), 200

@app.post("/api/cars")
@require_auth
@handle_validation_error
def create_car():
    data = request.json or {}
    nickname = data.get("nickname")
    if not nickname:
        return jsonify({"message": "nickname required"}), 400

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

    return jsonify({
        "id": car.id,
        "nickname": escape(car.nickname),
        "plate": escape(car.plate) if car.plate else None,
        "ble_device_name": escape(car.ble_device_name) if car.ble_device_name else None,
        "ble_service_uuid": escape(car.ble_service_uuid) if car.ble_service_uuid else None,
        "pairing_secret": car.pairing_secret,
    }), 200

@app.patch("/api/cars/<int:car_id>")
@require_auth
@handle_validation_error
def update_car(car_id):
    car = Car.query.filter_by(id=car_id, owner_id=int(request.user_id)).first()
    if not car:
        return jsonify({"message": "not found"}), 404
    data = request.json or {}
    if "nickname" in data:
        car.nickname = data["nickname"]
    if "plate" in data:
        car.plate = data["plate"]
    if "ble_device_name" in data:
        car.ble_device_name = data["ble_device_name"]
    if "ble_service_uuid" in data:
        car.ble_service_uuid = data["ble_service_uuid"]
    if "last_used" in data:
        car.last_used = datetime.fromtimestamp(data["last_used"] / 1000) if data["last_used"] else None

    db.session.commit()

    return jsonify({
        "id": car.id,
        "nickname": escape(car.nickname),
        "plate": escape(car.plate) if car.plate else None,
        "ble_device_name": escape(car.ble_device_name) if car.ble_device_name else None,
        "ble_service_uuid": escape(car.ble_service_uuid) if car.ble_service_uuid else None,
        "has_pairing_secret": bool(car.pairing_secret),
        "last_used": car.last_used.timestamp() * 1000 if car.last_used else None,
    }), 200

@app.delete("/api/cars")
@require_auth
def delete_all_cars():
    Car.query.filter_by(owner_id=int(request.user_id)).delete()
    db.session.commit()
    return jsonify({"message": "ok"}), 200

@app.delete("/api/cars/<int:car_id>")
@require_auth
def delete_car(car_id):
    car = Car.query.filter_by(id=car_id, owner_id=int(request.user_id)).first()
    if not car:
        return jsonify({"message": "not found"}), 404
    db.session.delete(car)
    db.session.commit()
    return jsonify({"message": "ok"}), 200

######### ai chat bot funcnality #############
@app.get("/api/chats")
@require_auth
def list_chats():
    # only list chats that actually have messages - skip blank/abandoned ones
    chats = Chat.query.filter(
        Chat.user_id == int(request.user_id),
        Chat.hidden == False,
        Chat.messages.any(),
    ).all()
    return jsonify([{
        "id": c.id,
        "chat_name": escape(c.chat_name) if c.chat_name else None,
        "created_at": c.created_at.timestamp() * 1000 if c.created_at else None,
    } for c in chats]), 200

@app.post("/api/chats")
@require_auth
@handle_validation_error
def create_chat():
    data = request.json or {}
    chat = Chat(
        user_id=int(request.user_id),
        chat_name=data.get("chat_name"),
    )
    db.session.add(chat)
    db.session.commit()

    return jsonify({
        "id": chat.id,
        "chat_name": escape(chat.chat_name) if chat.chat_name else None,
        "created_at": chat.created_at.timestamp() * 1000 if chat.created_at else None,
    }), 200

@app.patch("/api/chats/<int:chat_id>")
@require_auth
@handle_validation_error
def update_chat(chat_id):
    chat = Chat.query.filter_by(id=chat_id, user_id=int(request.user_id)).first()
    if not chat:
        return jsonify({"message": "not found"}), 404

    data = request.json or {}
    if "chat_name" in data:
        name = (data.get("chat_name") or "").strip()
        chat.chat_name = name[:100] if name else None
        db.session.commit()

    return jsonify({
        "id": chat.id,
        "chat_name": escape(chat.chat_name) if chat.chat_name else None,
        "created_at": chat.created_at.timestamp() * 1000 if chat.created_at else None,
    }), 200

@app.delete("/api/chats/<int:chat_id>")
@require_auth
def delete_chat(chat_id):
    chat = Chat.query.filter_by(id=chat_id, user_id=int(request.user_id)).first()
    if not chat:
        return jsonify({"message": "not found"}), 404
    chat.hidden = True
    db.session.commit()
    return jsonify({"message": "ok"}), 200

@app.get("/api/chats/<int:chat_id>/messages")
@require_auth
def list_chat_messages(chat_id):
    chat = Chat.query.filter_by(id=chat_id, user_id=int(request.user_id)).first()
    if not chat:
        return jsonify({"message": "not found"}), 404

    messages = ChatMessage.query.filter_by(chat_id=chat.id).order_by(ChatMessage.timestamp.asc()).all()
    return jsonify([{
        "id": m.id,
        "is_ai": m.is_ai,
        "content": escape(m.content),
        "tokens_used": m.tokens_used,
        "timestamp": m.timestamp.timestamp() * 1000 if m.timestamp else None,
    } for m in messages]), 200

@app.post("/api/chats/<int:chat_id>/messages")
@require_auth
@handle_validation_error
def create_chat_message(chat_id):
    chat = Chat.query.filter_by(id=chat_id, user_id=int(request.user_id)).first()
    if not chat:
        return jsonify({"message": "not found"}), 404

    data = request.json or {}
    content = data.get("content")
    is_ai = data.get("is_ai")
    if content is None or is_ai is None:
        return jsonify({"message": "content and is_ai required"}), 400

    message = ChatMessage(
        chat_id=chat.id,
        is_ai=bool(is_ai),
        content=content,
        tokens_used=data.get("tokens_used"),
    )
    db.session.add(message)
    db.session.commit()

    return jsonify({
        "id": message.id,
        "is_ai": message.is_ai,
        "content": escape(message.content),
        "tokens_used": message.tokens_used,
        "timestamp": message.timestamp.timestamp() * 1000 if message.timestamp else None,
    }), 200


@app.get("/api/ai/tokens_left")
@require_auth
def ai_tokens_left():
    now = datetime.now()
    used_5h = db.session.query(func.sum(ChatMessage.tokens_used)) \
        .join(Chat, Chat.id == ChatMessage.chat_id) \
        .filter(Chat.user_id == int(request.user_id), ChatMessage.is_ai == True, ChatMessage.timestamp >= now - timedelta(hours=5)) \
        .scalar() or 0
    used_week = db.session.query(func.sum(ChatMessage.tokens_used)) \
        .join(Chat, Chat.id == ChatMessage.chat_id) \
        .filter(Chat.user_id == int(request.user_id), ChatMessage.is_ai == True, ChatMessage.timestamp >= now - timedelta(days=7)) \
        .scalar() or 0

    return jsonify({
        "tokens_left_5h": max(TOKEN_LIMIT_5H - used_5h, 0),
        "tokens_left_week": max(TOKEN_LIMIT_WEEK - used_week, 0),
    }), 200

################ ai pref congiuration
def _get_or_create_ai_prefs(user_id: int) -> AiPreference:
    prefs = AiPreference.query.filter_by(user_id=user_id).first()
    if not prefs:
        prefs = AiPreference(user_id=user_id)
        db.session.add(prefs)
        db.session.commit()
    return prefs

def _ai_prefs_json(prefs: AiPreference) -> dict:
    return {field: getattr(prefs, field) for field in AiPreference.FIELDS}

@app.get("/api/ai/preferences")
@require_auth
def get_ai_preferences():
    prefs = _get_or_create_ai_prefs(int(request.user_id))
    return jsonify(_ai_prefs_json(prefs)), 200

@app.patch("/api/ai/preferences")
@require_auth
@handle_validation_error
def update_ai_preferences():
    prefs = _get_or_create_ai_prefs(int(request.user_id))
    data = request.json or {}
    for field in AiPreference.FIELDS:
        if field in data:
            setattr(prefs, field, bool(data[field]))
    db.session.commit()
    return jsonify(_ai_prefs_json(prefs)), 200


@app.delete("/api/account")
@limiter.limit("1 per minute")
@require_auth
@handle_validation_error
def delete_account():
    data = request.json or {}
    pwd = data.get("password")
    user = db.session.get(User, int(request.user_id))
    if user is None:
        return jsonify({"message": "not found"}), 404
    # re-check the password so a stolen token alone can't wipe the account
    if not pwd or not check_password_hash(user.password_hash, pwd):
        return jsonify({"message": "invalid credentials"}), 401

    uid = user.id
    chat_ids = [c.id for c in Chat.query.filter_by(user_id=uid).all()]
    if chat_ids:
        ChatMessage.query.filter(ChatMessage.chat_id.in_(chat_ids)).delete(synchronize_session=False)
    Chat.query.filter_by(user_id=uid).delete(synchronize_session=False)
    AiPreference.query.filter_by(user_id=uid).delete(synchronize_session=False)
    # trips per-object (not bulk) so the gps_points cascade fires
    for t in Trip.query.filter_by(learner_id=uid).all():
        db.session.delete(t)
    Car.query.filter_by(owner_id=uid).delete(synchronize_session=False)
    Sv.query.filter_by(owner_id=uid).delete(synchronize_session=False)
    LicenseInfo.query.filter_by(account_id=uid).delete(synchronize_session=False)
    db.session.delete(user)
    db.session.commit()

    response = jsonify({"message": "ok"})
    response.delete_cookie('auth_token', domain='.lflip.pebnum.com')
    return response, 200


if __name__ == "__main__":
    import argparse
    debug = False
    passer = argparse.ArgumentParser()
    passer.add_argument('-d','--debug',action='store_true')
    args = passer.parse_args()

    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///database.db'
    db.init_app(app)

    with app.app_context():
        db.create_all()
    if args.debug: 
        @app.post("/api/ai/reset_usage")
        @require_auth
        def reset_ai_usage():
            # debug helper: the AI token "limit" is computed as LIMIT - sum(tokens_used),
            # so zeroing this account's recorded AI usage effectively tops it back up.
            chat_ids = [c.id for c in Chat.query.filter_by(user_id=int(request.user_id)).all()]
            reset = 0
            if chat_ids:
                reset = ChatMessage.query.filter(
                    ChatMessage.chat_id.in_(chat_ids),
                    ChatMessage.is_ai == True,
                ).update({"tokens_used": 0}, synchronize_session=False)
                db.session.commit()
            return jsonify({"message": "ok", "messages_reset": reset}), 200

        CORS(app, supports_credentials=True, origins=["https://lflip.pebnum.com", "capacitor://localhost", r"http://localhost(:\d+)?"])
        app.run(host="127.0.0.1", port=5001) # TODO: PROD: remove befor producion
    else:
        CORS(app, supports_credentials=True, origins=["https://lflip.pebnum.com", "capacitor://localhost", r"http://localhost(:\d+)?"])
        app.run(host="127.0.0.1", port=5000)
