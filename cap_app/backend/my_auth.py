import jwt
from datetime import timedelta, datetime
import time
from functools import wraps
from flask import request, jsonify
from config import secret_key

def gen_token(user_id,time_exp_day=3):
    payload = {
        'sub': str(user_id),
        'exp': int(time.time()) + (time_exp_day * 24 * 60 * 60)
    }
    tok = jwt.encode(payload, secret_key, algorithm="HS256")
    return tok

# this functon was written by a llm but i understand how it works
# it is a decrater that takes a repoonce and if valid it will run the route 
# else it will run return a error
# the user id is gotten from the token it is in coded in it it think
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.cookies.get('auth_token')
        auth_header = request.headers.get('Authorization')
        if not token and auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        if not token:
            return jsonify({"message": "unauthorized"}), 401
        try:
            payload = jwt.decode(
                token, secret_key,
                algorithms=['HS256']
            )
            request.user_id = payload['sub']
            return f(*args, **kwargs)
        except jwt.InvalidTokenError as e:
            return jsonify({"message": "invalid token"}), 401
    return decorated 