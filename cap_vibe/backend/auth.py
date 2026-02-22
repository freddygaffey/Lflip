import time
from functools import wraps

import jwt
from flask import request, g, jsonify

from config import JWT_SECRET, JWT_EXPIRY_DAYS


def create_token(user_id, role):
    payload = {
        'sub': user_id,
        'role': role,
        'iat': int(time.time()),
        'exp': int(time.time()) + JWT_EXPIRY_DAYS * 86400,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


def decode_token(token):
    return jwt.decode(token, JWT_SECRET, algorithms=['HS256'])


def require_auth(f):
    """Decorator: validates Bearer token, sets g.user_id and g.user_role."""
    @wraps(f)
    def decorated(*args, **kwargs):
        header = request.headers.get('Authorization', '')
        if not header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid token'}), 401
        try:
            payload = decode_token(header[7:])
            g.user_id = payload['sub']
            g.user_role = payload['role']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated
