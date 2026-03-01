import flask_sqlalchemy
from sqlalchemy.orm import validates
import flask_login
import utils

db = flask_sqlalchemy.SQLAlchemy()

# the data classes were genrated by a llm after I provided spicific instruction
# on the exact table and atributre format i wanted this is allowed in the Kings
# ai ploicis as I was using it to automate boring and repditve task 

class User(db.Model, flask_login.UserMixin):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    account_number = db.Column(db.String(50), unique=True, nullable=True)

    f_name = db.Column(db.String(255), nullable=True)
    l_name = db.Column(db.String(255), nullable=True)
    nickname = db.Column(db.String(100), nullable=True)
    @validates("f_name","l_name","nickname")
    def name_validate(self,key,name):
        if not utils.is_name_valid(name): raise(ValueError(f"{key} is not valid"))
        return name

    email = db.Column(db.String(255), nullable=True)
    @validates("email")
    def email_validate(self, key, email):
        if not utils.is_email_valid(email): raise ValueError(f"{key} is not valid")
        return email

    username = db.Column(db.String(100), nullable=False)
    @validates("username")
    def username_validate(self, key, username):
        if not utils.is_username_valid(username): raise ValueError(f"{key} is not valid")
        return username

    password_hash = db.Column(db.String(100), nullable=False)
    @validates("password_hash")
    def password_validate(self, key, password_hash):
        if not utils.is_pwd_valid(password_hash): raise ValueError(f"{key} is not valid")
        return password_hash

    license_records = db.relationship("LicenseInfo", backref="account", lazy=True)

    def __init__(self, f_name, l_name, email, password_hash, license_info: "LicenseInfo", username=None, nickname=None):
        self.f_name = f_name
        self.l_name = l_name
        self.email = email
        self.password_hash = password_hash
        self.username = username if username is not None else email
        self.nickname = nickname if nickname is not None else f_name
        self.license_records.append(license_info)
              

class LicenseInfo(db.Model):
    """Stores license, license number and state per account with history via last_updated."""
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    account_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    # license = db.Column(db.String(100), nullable=True)  # license type (e.g. Learner, P1, Full)
    license_number = db.Column(db.String(100), nullable=False)
    @validates("license_number")
    def license_number_validate(self,key,license_number):
        if not utils.is_license_number_valid(license_number): raise ValueError(f"{key} is not valid")
        return license_number

    state = db.Column(db.String(100), nullable=False)
    @validates("state")
    def state_validate(self,key,state):
        if not utils.is_state_valid(state): raise ValueError(f"{key} is not valid")
        return state
        
    role = db.Column(db.String(100), nullable=False) # parant leaner
    @validates("role")
    def role_validate(self,key,role):
        valid_roles = ["learner","parant"]
        role = role.lower()
        if role not in valid_roles: raise ValueError(f"{key} is not valid role")
        return role

    date_of_birth = db.Column(db.Date, nullable=True)
    last_updated = db.Column(db.DateTime, nullable=False)

    __table_args__ = (db.Index("ix_license_info_account_updated", "account_id", "last_updated"),)


class Pair(db.Model):
    """Glue table linking supervising drivers with learner drivers."""
    __table_args__ = (db.UniqueConstraint("supervising_driver_id", "learner_driver_id", name="uq_supervision_pair"),)

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    supervising_driver_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    learner_driver_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    supervising_driver = db.relationship("User", foreign_keys=[supervising_driver_id])
    learner_driver = db.relationship("User", foreign_keys=[learner_driver_id])

class PairCodes(db.Model):
    """this is the table will store the links to link parants and there users to make links"""
    key = db.Column(db.Integer, primary_key=True)
    time_made = db.Column(db.Time,nullable=False)
    link_to_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
     
class Trip(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    start_time = db.Column(db.Time, nullable=True)
    end_time = db.Column(db.Time, nullable=True)
    date = db.Column(db.Date, nullable=False)
    start_odometer = db.Column(db.Float, nullable=True)
    end_odometer = db.Column(db.Float, nullable=True)
    notes = db.Column(db.JSON, nullable=True)  # structured blob: supervising_driver_name, license_number, supervising_driver_id
    supervising_driver_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    learner_driver_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)

    supervising_driver = db.relationship("User", foreign_keys=[supervising_driver_id])
    learner_driver = db.relationship("User", foreign_keys=[learner_driver_id])
    gps_points = db.relationship("GpsPoint", backref="trip", lazy=True)

class GpsPoint(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    timestamp = db.Column(db.DateTime, nullable=False)
    trip_id = db.Column(db.Integer, db.ForeignKey("trip.id"), nullable=False)
    lon = db.Column(db.Float, nullable=False)
    lat = db.Column(db.Float, nullable=False)
    speed = db.Column(db.Float, nullable=True)
    hdop = db.Column(db.Float, nullable=True)
