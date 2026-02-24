from flask import Flask, request, jsonify, render_template, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required
from data_base import db, User

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
db.init_app(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/', methods=['GET'])
def home():
    return redirect('/login')

@app.route('/login', methods=['POST', 'GET'])
def login():
    if request.method == 'GET':
        return render_template('login.html')
    data = request.form
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return render_template('login.html', error='Username and password required'), 400
    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password_hash, password):
        return render_template('login.html', error='Invalid username or password'), 401
    login_user(user)
    return redirect(url_for('private'))

@app.route('/logout', methods=['GET', 'POST'])
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/register', methods=['POST', 'GET'])
def register():
    if request.method == 'GET':
        return render_template('register.html')
    data = request.form
    username = data.get('username')
    password = data.get('password')
    state = data.get('state')
    role = data.get('role')
    license_number = data.get('license_number') or None
    if not username or not password or not state or not role:
        return render_template('register.html', error='Username, password, state and role required'), 400
    if User.query.filter_by(username=username).first():
        return render_template('register.html', error='Username already taken'), 400
    user = User(
        username=username,
        password_hash=generate_password_hash(password),
        state=state,
        role=role,
        license_number=license_number
    )
    db.session.add(user)
    db.session.commit()
    login_user(user)
    return redirect(url_for('private'))

@app.route('/private', methods=['GET'])
@login_required
def private():
    return "This is top secret. <a href='/logout'>Logout</a>"

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000, host='0.0.0.0')
