import flask_sqlalchemy
from flask_login import UserMixin
from flask import Flask
import config
from werkzeug.security import check_password_hash

db = flask_sqlalchemy.SQLAlchemy()

class User(UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(100), nullable=False)
    license_number = db.Column(db.String(100), nullable=True)

    def __init__(self, username, password_hash, state, role,license_number=None):
        self.username = username
        self.password_hash = password_hash
        self.state = config.states[state]
        if self.state is None:
            raise ValueError(f"Invalid state: {state}")

        roles = ["learner","sd_driver"]
        if role not in roles:
            raise ValueError(f"Invalid role: {role}")
        self.role = role
        if self.role == "sd_driver":
            if license_number is None:
                raise ValueError("License number is required for SD driver")
        self.license_number = license_number

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    


