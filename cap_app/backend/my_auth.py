import jwt
from datetime import timedelta, datetime
from functools import wraps
from config import secret_key

def gen_token(user_id,time_exp_day=3):
    payload = {
        'sub': user_id,
        'exp': datetime.utcnow() + timedelta(days=time_exp_day)
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
        auth = request.headers.get('Authorization')
        if not auth or not auth.startswith('Bearer '):
            return jsonify({"message": "unauthorized"}), 401
        try:
            payload = jwt.decode(
                auth[7:], secret_key,
                algorithms=['HS256']
            )
            request.user_id = payload['sub']
            return f(*args, **kwargs)
        except jwt.InvalidTokenError:
            return jsonify({"message": "invalid token"}), 401
    return decorated 