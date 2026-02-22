import uuid
import time
import json
import re

from flask import Flask, request, g, jsonify
from flask_cors import CORS
import bcrypt

from db import get_db, close_db, init_db
from auth import create_token, require_auth
from config import STATE_REQUIREMENTS, DEFAULT_STATE, DEFAULT_TARGET_HOURS, NIGHT_HOURS_REQUIRED

app = Flask(__name__)
CORS(app)
app.teardown_appcontext(close_db)

# =============================================================================
# Helpers
# =============================================================================

def _now_ms():
    return int(time.time() * 1000)


def _snake(name):
    """camelCase -> snake_case"""
    return re.sub(r'(?<=[a-z0-9])([A-Z])', r'_\1', name).lower()


def _camel(name):
    """snake_case -> camelCase"""
    parts = name.split('_')
    return parts[0] + ''.join(p.capitalize() for p in parts[1:])


_JSON_FIELDS = {'gps_points', 'accel_points', 'accel_events'}

_TRIP_CAMEL_OVERRIDES = {'learnerId': 'user_id', 'learnerName': 'learner_name'}
_TRIP_SNAKE_OVERRIDES = {'user_id': 'learnerId', 'learner_name': 'learnerName'}

TRIP_COLUMNS = {
    'id', 'user_id', 'supervisor_id', 'supervisor_name', 'car_id', 'car_name',
    'learner_name', 'cloud_id', 'start_time', 'end_time', 'start_odometer',
    'end_odometer', 'start_lat', 'start_lng', 'status', 'sync_status',
    'approval_state', 'approved_by', 'approved_at', 'weather', 'gps_points',
    'accel_points', 'accel_events', 'distance_km', 'odo_distance_km',
    'day_minutes', 'night_minutes', 'max_speed_kmh', 'avg_speed_kmh',
    'odo_source', 'version', 'created_at', 'updated_at',
}


def trip_row_to_json(row):
    """DB row -> camelCase dict (with learnerId instead of userId)."""
    if row is None:
        return None
    out = {}
    for key in row.keys():
        val = row[key]
        if key in _JSON_FIELDS and isinstance(val, str):
            try:
                val = json.loads(val)
            except (json.JSONDecodeError, TypeError):
                pass
        camel = _TRIP_SNAKE_OVERRIDES.get(key, _camel(key))
        out[camel] = val
    return out


def trip_json_to_row(data, user_id):
    """camelCase request body -> snake_case dict for DB."""
    row = {}
    for camel_key, val in data.items():
        snake_key = _TRIP_CAMEL_OVERRIDES.get(camel_key, _snake(camel_key))
        if snake_key in _JSON_FIELDS and val is not None and not isinstance(val, str):
            val = json.dumps(val)
        if snake_key in TRIP_COLUMNS:
            row[snake_key] = val
    row['user_id'] = user_id
    return row


def _validate_password(pw):
    """Return an error string if the password is invalid, else None."""
    if len(pw) < 6:
        return 'Password must be at least 6 characters'
    if not re.search(r'[a-zA-Z]', pw):
        return 'Password must contain at least one letter'
    if not re.search(r'\d', pw):
        return 'Password must contain at least one number'
    return None


def _linked_learner_ids(parent_id):
    rows = get_db().execute(
        'SELECT learner_id FROM parent_links WHERE parent_id = ?', (parent_id,)
    ).fetchall()
    return [r['learner_id'] for r in rows]


# =============================================================================
# Auth
# =============================================================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    body = request.get_json(force=True)
    email = (body.get('email') or '').strip().lower()
    password = body.get('password') or ''
    name = (body.get('name') or '').strip()
    role = body.get('role', 'learner')
    licence_number = body.get('licenceNumber')
    state = body.get('state', DEFAULT_STATE)
    if state not in STATE_REQUIREMENTS:
        state = DEFAULT_STATE

    if not email:
        return jsonify({'error': 'Email is required'}), 400
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    if not password:
        return jsonify({'error': 'Password is required'}), 400
    if role not in ('learner', 'parent'):
        return jsonify({'error': 'Role must be learner or parent'}), 400
    pw_err = _validate_password(password)
    if pw_err:
        return jsonify({'error': pw_err}), 400

    db = get_db()
    if db.execute('SELECT 1 FROM users WHERE email = ?', (email,)).fetchone():
        return jsonify({'error': 'That email is already registered — try logging in instead'}), 409

    user_id = str(uuid.uuid4())
    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    db.execute(
        'INSERT INTO users (id, email, password_hash, name, role, licence_number, state, created_at)'
        ' VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        (user_id, email, pw_hash, name, role, licence_number, state, _now_ms()),
    )
    db.commit()
    token = create_token(user_id, role)
    return jsonify({'token': token, 'userId': user_id, 'name': name, 'role': role, 'email': email, 'state': state})


@app.route('/api/auth/login', methods=['POST'])
def login():
    body = request.get_json(force=True)
    email = (body.get('email') or '').strip().lower()
    password = body.get('password') or ''

    db = get_db()
    user = db.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    if not user:
        return jsonify({'error': 'No account found with that email — check for typos or register'}), 401
    if not bcrypt.checkpw(password.encode(), user['password_hash'].encode()):
        return jsonify({'error': 'Incorrect password — please try again'}), 401

    token = create_token(user['id'], user['role'])
    return jsonify({
        'token': token,
        'userId': user['id'],
        'name': user['name'],
        'role': user['role'],
        'email': user['email'],
        'state': user['state'] or DEFAULT_STATE,
    })


@app.route('/api/auth/me', methods=['GET'])
@require_auth
def me():
    user = get_db().execute('SELECT * FROM users WHERE id = ?', (g.user_id,)).fetchone()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({
        'userId': user['id'],
        'name': user['name'],
        'role': user['role'],
        'email': user['email'],
        'licenceNumber': user['licence_number'],
        'state': user['state'] or DEFAULT_STATE,
    })


@app.route('/api/auth/update-email', methods=['PATCH'])
@require_auth
def update_email():
    body = request.get_json(force=True)
    new_email = (body.get('newEmail') or '').strip().lower()
    password = body.get('password') or ''

    if not new_email:
        return jsonify({'error': 'Please enter a new email address'}), 400

    db = get_db()
    user = db.execute('SELECT * FROM users WHERE id = ?', (g.user_id,)).fetchone()
    if not user or not bcrypt.checkpw(password.encode(), user['password_hash'].encode()):
        return jsonify({'error': 'Incorrect password — please try again'}), 401

    if db.execute('SELECT 1 FROM users WHERE email = ? AND id != ?', (new_email, g.user_id)).fetchone():
        return jsonify({'error': 'That email is already used by another account'}), 409

    db.execute('UPDATE users SET email = ? WHERE id = ?', (new_email, g.user_id))
    db.commit()
    return jsonify({'success': True, 'email': new_email})


@app.route('/api/auth/update-password', methods=['PATCH'])
@require_auth
def update_password():
    body = request.get_json(force=True)
    current_password = body.get('currentPassword') or ''
    new_password = body.get('newPassword') or ''

    pw_err = _validate_password(new_password)
    if pw_err:
        return jsonify({'error': pw_err}), 400

    db = get_db()
    user = db.execute('SELECT * FROM users WHERE id = ?', (g.user_id,)).fetchone()
    if not user or not bcrypt.checkpw(current_password.encode(), user['password_hash'].encode()):
        return jsonify({'error': 'Current password is incorrect — please try again'}), 401

    new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    db.execute('UPDATE users SET password_hash = ? WHERE id = ?', (new_hash, g.user_id))
    db.commit()
    return jsonify({'success': True})


@app.route('/api/auth/update-state', methods=['PATCH'])
@require_auth
def update_state():
    body = request.get_json(force=True)
    new_state = (body.get('state') or '').strip().upper()
    if new_state not in STATE_REQUIREMENTS:
        return jsonify({'error': f'Invalid state. Must be one of: {", ".join(STATE_REQUIREMENTS)}'}), 400

    db = get_db()
    db.execute('UPDATE users SET state = ? WHERE id = ?', (new_state, g.user_id))
    db.commit()
    reqs = STATE_REQUIREMENTS[new_state]
    return jsonify({'success': True, 'state': new_state, 'targetHours': reqs['total'], 'nightTargetHours': reqs['night']})


# =============================================================================
# Pairing
# =============================================================================

@app.route('/api/pair/create', methods=['POST'])
@require_auth
def pair_create():
    if g.user_role != 'learner':
        return jsonify({'error': 'Only learners can create pairing tokens'}), 403

    token = f'PAIR-{uuid.uuid4().hex[:8].upper()}'
    expires_at = _now_ms() + 15 * 60 * 1000

    db = get_db()
    db.execute('DELETE FROM pairing_tokens WHERE learner_id = ?', (g.user_id,))
    db.execute(
        'INSERT INTO pairing_tokens (token, learner_id, expires_at) VALUES (?, ?, ?)',
        (token, g.user_id, expires_at),
    )
    db.commit()
    return jsonify({'token': token, 'expiresAt': expires_at})


@app.route('/api/pair/complete', methods=['POST'])
@require_auth
def pair_complete():
    if g.user_role != 'parent':
        return jsonify({'error': 'Only parents can complete pairing'}), 403

    token_str = (request.get_json(force=True).get('token') or '').strip()
    db = get_db()
    row = db.execute('SELECT * FROM pairing_tokens WHERE token = ?', (token_str,)).fetchone()

    if not row or row['expires_at'] < _now_ms():
        if row:
            db.execute('DELETE FROM pairing_tokens WHERE token = ?', (token_str,))
            db.commit()
        return jsonify({'error': 'Invalid or expired pairing code'}), 400

    learner_id = row['learner_id']
    existing = db.execute(
        'SELECT 1 FROM parent_links WHERE parent_id = ? AND learner_id = ?',
        (g.user_id, learner_id),
    ).fetchone()
    if not existing:
        db.execute(
            'INSERT INTO parent_links (id, parent_id, learner_id, created_at) VALUES (?, ?, ?, ?)',
            (str(uuid.uuid4()), g.user_id, learner_id, _now_ms()),
        )
    db.execute('DELETE FROM pairing_tokens WHERE token = ?', (token_str,))
    db.commit()

    learner = db.execute('SELECT name FROM users WHERE id = ?', (learner_id,)).fetchone()
    return jsonify({'success': True, 'learnerName': learner['name'] if learner else 'Learner'})


@app.route('/api/pair/linked', methods=['GET'])
@require_auth
def pair_linked():
    if g.user_role != 'parent':
        return jsonify({'error': 'Only parents can view linked learners'}), 403
    rows = get_db().execute(
        'SELECT pl.learner_id, u.name FROM parent_links pl'
        ' JOIN users u ON u.id = pl.learner_id WHERE pl.parent_id = ?',
        (g.user_id,),
    ).fetchall()
    return jsonify([{'id': r['learner_id'], 'name': r['name']} for r in rows])


@app.route('/api/pair/linked/<learner_id>', methods=['DELETE'])
@require_auth
def pair_unlink(learner_id):
    if g.user_role != 'parent':
        return jsonify({'error': 'Only parents can unlink learners'}), 403
    db = get_db()
    db.execute(
        'DELETE FROM parent_links WHERE parent_id = ? AND learner_id = ?',
        (g.user_id, learner_id),
    )
    db.commit()
    return jsonify({'success': True})


# =============================================================================
# Trips
# =============================================================================

@app.route('/api/trips', methods=['POST'])
@require_auth
def create_trip():
    if g.user_role != 'learner':
        return jsonify({'error': 'Only learners can create trips'}), 403

    body = request.get_json(force=True)
    row = trip_json_to_row(body, g.user_id)

    trip_id = row.get('id') or str(uuid.uuid4())
    row['id'] = trip_id
    row['cloud_id'] = f'cloud-{trip_id}'
    row['sync_status'] = 'synced'

    now = _now_ms()
    row.setdefault('created_at', now)
    row['updated_at'] = now
    row.setdefault('status', 'complete')
    row.setdefault('approval_state', 'pending')
    row.setdefault('version', 1)

    user = get_db().execute('SELECT name FROM users WHERE id = ?', (g.user_id,)).fetchone()
    if user:
        row['learner_name'] = user['name']

    db = get_db()
    existing = db.execute('SELECT id FROM trips WHERE id = ?', (trip_id,)).fetchone()

    if existing:
        cols = [k for k in row if k != 'id']
        db.execute(
            f"UPDATE trips SET {', '.join(f'{c} = ?' for c in cols)} WHERE id = ?",
            [row[c] for c in cols] + [trip_id],
        )
    else:
        cols = list(row.keys())
        db.execute(
            f"INSERT INTO trips ({', '.join(cols)}) VALUES ({', '.join('?' for _ in cols)})",
            [row[c] for c in cols],
        )
    db.commit()
    return jsonify({'id': trip_id, 'cloudId': row['cloud_id']})


@app.route('/api/trips', methods=['GET'])
@require_auth
def get_trips():
    conditions = []
    params = []

    if g.user_role == 'parent':
        ids = _linked_learner_ids(g.user_id)
        if not ids:
            return jsonify([])
        conditions.append(f"user_id IN ({', '.join('?' for _ in ids)})")
        params.extend(ids)
    else:
        conditions.append('user_id = ?')
        params.append(g.user_id)

    conditions.append("status = 'complete'")

    if request.args.get('supervisorId'):
        conditions.append('supervisor_id = ?')
        params.append(request.args['supervisorId'])
    if request.args.get('dateFrom'):
        conditions.append('start_time >= ?')
        params.append(int(request.args['dateFrom']))
    if request.args.get('dateTo'):
        conditions.append('start_time <= ?')
        params.append(int(request.args['dateTo']))
    if request.args.get('nightOnly'):
        conditions.append('night_minutes > 0')
    if request.args.get('dayOnly'):
        conditions.append('day_minutes > 0')

    rows = get_db().execute(
        f"SELECT * FROM trips WHERE {' AND '.join(conditions)} ORDER BY start_time DESC",
        params,
    ).fetchall()
    return jsonify([trip_row_to_json(r) for r in rows])


@app.route('/api/trips/<trip_id>', methods=['GET'])
@require_auth
def get_trip(trip_id):
    row = get_db().execute('SELECT * FROM trips WHERE id = ?', (trip_id,)).fetchone()
    if not row:
        return jsonify({'error': 'Trip not found'}), 404

    if g.user_role == 'learner' and row['user_id'] != g.user_id:
        return jsonify({'error': 'Access denied'}), 403
    if g.user_role == 'parent' and row['user_id'] not in _linked_learner_ids(g.user_id):
        return jsonify({'error': 'Access denied'}), 403

    return jsonify(trip_row_to_json(row))


@app.route('/api/trips/<trip_id>', methods=['PATCH'])
@require_auth
def update_trip(trip_id):
    db = get_db()
    row = db.execute('SELECT * FROM trips WHERE id = ?', (trip_id,)).fetchone()
    if not row:
        return jsonify({'error': 'Trip not found'}), 404
    if row['user_id'] != g.user_id:
        return jsonify({'error': 'Access denied'}), 403

    updates = trip_json_to_row(request.get_json(force=True), g.user_id)
    updates.pop('id', None)
    updates['updated_at'] = _now_ms()

    cols = list(updates.keys())
    db.execute(
        f"UPDATE trips SET {', '.join(f'{c} = ?' for c in cols)} WHERE id = ?",
        [updates[c] for c in cols] + [trip_id],
    )
    db.commit()
    updated = db.execute('SELECT * FROM trips WHERE id = ?', (trip_id,)).fetchone()
    return jsonify(trip_row_to_json(updated))


@app.route('/api/trips/<trip_id>', methods=['DELETE'])
@require_auth
def delete_trip(trip_id):
    db = get_db()
    row = db.execute('SELECT user_id FROM trips WHERE id = ?', (trip_id,)).fetchone()
    if not row:
        return jsonify({'error': 'Trip not found'}), 404
    if row['user_id'] != g.user_id:
        return jsonify({'error': 'Access denied'}), 403
    db.execute('DELETE FROM trips WHERE id = ?', (trip_id,))
    db.commit()
    return jsonify({'success': True})


@app.route('/api/trips/<trip_id>/approve', methods=['PATCH'])
@require_auth
def approve_trip(trip_id):
    if g.user_role != 'parent':
        return jsonify({'error': 'Only parents can approve trips'}), 403

    db = get_db()
    row = db.execute('SELECT user_id FROM trips WHERE id = ?', (trip_id,)).fetchone()
    if not row:
        return jsonify({'error': 'Trip not found'}), 404
    if row['user_id'] not in _linked_learner_ids(g.user_id):
        return jsonify({'error': 'Access denied'}), 403

    approved = request.get_json(force=True).get('approved', True)
    now = _now_ms()
    db.execute(
        'UPDATE trips SET approval_state = ?, approved_by = ?, approved_at = ?, updated_at = ?'
        ' WHERE id = ?',
        ('approved' if approved else 'rejected', g.user_id, now, now, trip_id),
    )
    db.commit()
    return jsonify({'success': True})


# =============================================================================
# Supervisors
# =============================================================================

@app.route('/api/supervisors', methods=['GET'])
@require_auth
def get_supervisors():
    rows = get_db().execute(
        'SELECT * FROM supervisors WHERE user_id = ? ORDER BY created_at DESC',
        (g.user_id,),
    ).fetchall()
    return jsonify([{
        'id': r['id'],
        'name': r['name'],
        'licenceNumber': r['licence_number'],
        'relationship': r['relationship'],
    } for r in rows])


@app.route('/api/supervisors', methods=['POST'])
@require_auth
def add_supervisor():
    body = request.get_json(force=True)
    name = (body.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'name is required'}), 400
    licence = body.get('licenceNumber')
    rel = body.get('relationship', 'Other')

    sup_id = str(uuid.uuid4())
    now = _now_ms()
    get_db().execute(
        'INSERT INTO supervisors (id, user_id, name, licence_number, relationship, created_at, updated_at)'
        ' VALUES (?, ?, ?, ?, ?, ?, ?)',
        (sup_id, g.user_id, name, licence, rel, now, now),
    )
    get_db().commit()
    return jsonify({'id': sup_id, 'name': name, 'licenceNumber': licence, 'relationship': rel})


@app.route('/api/supervisors/<sup_id>', methods=['PATCH'])
@require_auth
def update_supervisor(sup_id):
    db = get_db()
    row = db.execute(
        'SELECT * FROM supervisors WHERE id = ? AND user_id = ?', (sup_id, g.user_id)
    ).fetchone()
    if not row:
        return jsonify({'error': 'Supervisor not found'}), 404

    body = request.get_json(force=True)
    name = body.get('name', row['name'])
    licence = body.get('licenceNumber', row['licence_number'])
    rel = body.get('relationship', row['relationship'])
    db.execute(
        'UPDATE supervisors SET name = ?, licence_number = ?, relationship = ?, updated_at = ?'
        ' WHERE id = ?',
        (name, licence, rel, _now_ms(), sup_id),
    )
    db.commit()
    return jsonify({'id': sup_id, 'name': name, 'licenceNumber': licence, 'relationship': rel})


@app.route('/api/supervisors/<sup_id>', methods=['DELETE'])
@require_auth
def delete_supervisor(sup_id):
    db = get_db()
    row = db.execute(
        'SELECT 1 FROM supervisors WHERE id = ? AND user_id = ?', (sup_id, g.user_id)
    ).fetchone()
    if not row:
        return jsonify({'error': 'Supervisor not found'}), 404
    db.execute('DELETE FROM supervisors WHERE id = ?', (sup_id,))
    db.commit()
    return jsonify({'success': True})


# =============================================================================
# Cars
# =============================================================================

@app.route('/api/cars', methods=['GET'])
@require_auth
def get_cars():
    rows = get_db().execute(
        'SELECT * FROM cars WHERE user_id = ? ORDER BY created_at DESC', (g.user_id,)
    ).fetchall()
    return jsonify([{
        'id': r['id'],
        'name': r['name'],
        'numberPlate': r['number_plate'],
        'lastOdometer': r['last_odometer'],
        'esp32DeviceId': r['esp32_device_id'],
    } for r in rows])


@app.route('/api/cars', methods=['POST'])
@require_auth
def add_car():
    body = request.get_json(force=True)
    name = (body.get('name') or '').strip() or body.get('numberPlate', 'Car')
    plate = body.get('numberPlate')

    car_id = str(uuid.uuid4())
    now = _now_ms()
    get_db().execute(
        'INSERT INTO cars (id, user_id, name, number_plate, created_at, updated_at)'
        ' VALUES (?, ?, ?, ?, ?, ?)',
        (car_id, g.user_id, name, plate, now, now),
    )
    get_db().commit()
    return jsonify({
        'id': car_id, 'name': name, 'numberPlate': plate,
        'lastOdometer': None, 'esp32DeviceId': None,
    })


@app.route('/api/cars/<car_id>', methods=['PATCH'])
@require_auth
def update_car(car_id):
    db = get_db()
    row = db.execute(
        'SELECT * FROM cars WHERE id = ? AND user_id = ?', (car_id, g.user_id)
    ).fetchone()
    if not row:
        return jsonify({'error': 'Car not found'}), 404

    body = request.get_json(force=True)
    name = body.get('name', row['name'])
    plate = body.get('numberPlate', row['number_plate'])
    odo = body.get('lastOdometer', row['last_odometer'])
    esp32 = body.get('esp32DeviceId', row['esp32_device_id'])
    db.execute(
        'UPDATE cars SET name = ?, number_plate = ?, last_odometer = ?, esp32_device_id = ?,'
        ' updated_at = ? WHERE id = ?',
        (name, plate, odo, esp32, _now_ms(), car_id),
    )
    db.commit()
    return jsonify({
        'id': car_id, 'name': name, 'numberPlate': plate,
        'lastOdometer': odo, 'esp32DeviceId': esp32,
    })


@app.route('/api/cars/<car_id>', methods=['DELETE'])
@require_auth
def delete_car(car_id):
    db = get_db()
    row = db.execute(
        'SELECT 1 FROM cars WHERE id = ? AND user_id = ?', (car_id, g.user_id)
    ).fetchone()
    if not row:
        return jsonify({'error': 'Car not found'}), 404
    db.execute('DELETE FROM cars WHERE id = ?', (car_id,))
    db.commit()
    return jsonify({'success': True})


# =============================================================================
# Logbook Summary
# =============================================================================

@app.route('/api/logbook/summary', methods=['GET'])
@require_auth
def logbook_summary():
    db = get_db()

    user = db.execute('SELECT state FROM users WHERE id = ?', (g.user_id,)).fetchone()
    user_state = (user['state'] if user and user['state'] else DEFAULT_STATE)
    reqs = STATE_REQUIREMENTS.get(user_state, STATE_REQUIREMENTS[DEFAULT_STATE])
    target_total = reqs['total']
    target_night = reqs['night']

    if g.user_role == 'parent':
        ids = _linked_learner_ids(g.user_id)
        if not ids:
            return jsonify({
                'totalHours': 0, 'dayHours': 0, 'nightHours': 0,
                'tripCount': 0, 'targetHours': target_total,
                'nightTargetHours': target_night, 'lastTripDate': None,
            })
        ph = ', '.join('?' for _ in ids)
        rows = db.execute(
            f"SELECT day_minutes, night_minutes, start_time FROM trips"
            f" WHERE user_id IN ({ph}) AND status = 'complete'"
            f" ORDER BY start_time DESC",
            ids,
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT day_minutes, night_minutes, start_time FROM trips"
            " WHERE user_id = ? AND status = 'complete'"
            " ORDER BY start_time DESC",
            (g.user_id,),
        ).fetchall()

    day = sum(r['day_minutes'] or 0 for r in rows)
    night = sum(r['night_minutes'] or 0 for r in rows)
    return jsonify({
        'totalHours': (day + night) / 60,
        'dayHours': day / 60,
        'nightHours': night / 60,
        'tripCount': len(rows),
        'targetHours': target_total,
        'nightTargetHours': target_night,
        'lastTripDate': rows[0]['start_time'] if rows else None,
    })


# =============================================================================
# Devices (optional, placeholder)
# =============================================================================

@app.route('/api/devices/register', methods=['POST'])
@require_auth
def register_device():
    return jsonify({'success': True})


# =============================================================================
# Boot
# =============================================================================

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
