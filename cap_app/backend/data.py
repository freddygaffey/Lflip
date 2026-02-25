import flask_sqlalchemy
import flask_login
from werkzeug.security import check_password_hash

db = flask_sqlalchemy.SQLAlchemy()

class User(db.Model, flask_login.UserMixin):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(100), nullable=False)
    license_number = db.Column(db.String(100), nullable=True)