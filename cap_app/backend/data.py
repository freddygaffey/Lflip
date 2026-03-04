import flask_sqlalchemy
from sqlalchemy.orm import validates
import flask_login
import utils

db = flask_sqlalchemy.SQLAlchemy()

# the data classes were genrated by a llm after I provided spicific instruction
# i wrote the first coupple of validation functions and got a llm to coppy that pattern
# on the exact table and atributre format i wanted this is allowed in the Kings
# ai ploicis as I was using it to automate boring and repditve task 

class User(db.Model, flask_login.UserMixin):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    account_number = db.Column(db.String(50), unique=True, nullable=True )

    f_name = db.Column(db.String(255), nullable=True)
    l_name = db.Column(db.String(255), nullable=True)
    nickname = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(255), nullable=False,unique=True)
    password_hash = db.Column(db.String(100), nullable=False)
    license_records = db.relationship("LicenseInfo", backref="account", lazy=True)

    def __init__(self, f_name, l_name, email, password_hash, license_info: "LicenseInfo" | None, nickname=None):
        self.f_name = f_name
        self.l_name = l_name
        self.email = email
        self.password_hash = password_hash
        self.nickname = nickname if nickname is not None else f_name
        if license_info is not None:
            self.license_records.append(license_info)

    @validates("f_name", "l_name", "nickname")
    def name_validate(self, key, name):
        if not utils.is_name_valid(name): raise ValueError(f"{key} is not valid")
        return name

    @validates("email")
    def email_validate(self, key, email):
        if not utils.is_email_valid(email): raise ValueError(f"{key} is not valid")
        return email

    @validates("password_hash")
    def password_validate(self, key, password_hash):
        if not utils.is_pwd_valid(password_hash): raise ValueError(f"{key} is not valid")
        return password_hash

class LicenseInfo(db.Model):
    """Stores license, license number and state per account with history via last_updated."""
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    account_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    # license = db.Column(db.String(100), nullable=True)  # license type (e.g. Learner, P1, Full)
    license_number = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(100), nullable=False)  # parant leaner
    date_of_birth = db.Column(db.Date, nullable=True)
    last_updated = db.Column(db.DateTime, nullable=False)

    __table_args__ = (db.Index("ix_license_info_account_updated", "account_id", "last_updated"),)

    @validates("license_number")
    def license_number_validate(self, key, license_number):
        if not utils.is_license_number_valid(license_number): raise ValueError(f"{key} is not valid")
        return license_number

    @validates("state")
    def state_validate(self, key, state):
        if not utils.is_state_valid(state): raise ValueError(f"{key} is not valid")
        return state

    @validates("role")
    def role_validate(self, key, role):
        if not utils.is_role_valid(role): raise ValueError(f"{key} is not valid role")
        return role

    @validates("date_of_birth")
    def date_of_birth_validate(self, key, date_of_birth):
        if date_of_birth is not None and not utils.is_date_of_birth_valid(date_of_birth):
            raise ValueError(f"{key} is not valid")
        return date_of_birth


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
    link_to = db.relationship("User", backref=db.backref("pair_codes", lazy=True))

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

    @validates("date")
    def date_validate(self, key, date):
        if not utils.is_date_not_future(date):
            raise ValueError(f"{key} cannot be in the future")
        return date

    @validates("start_odometer", "end_odometer")
    def odometer_validate(self, key, value):
        start = value if key == "start_odometer" else self.start_odometer
        end = value if key == "end_odometer" else self.end_odometer
        if start is not None and end is not None and end < start:
            raise ValueError("end_odometer must be >= start_odometer")
        return value

    @validates("start_time", "end_time")
    def time_validate(self, key, value):
        start = value if key == "start_time" else self.start_time
        end = value if key == "end_time" else self.end_time
        if start is not None and end is not None and end < start:
            raise ValueError("end_time must be >= start_time")
        return value

class GpsPoint(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    timestamp = db.Column(db.DateTime, nullable=False)
    trip_id = db.Column(db.Integer, db.ForeignKey("trip.id"), nullable=False)
    lon = db.Column(db.Float, nullable=False)
    lat = db.Column(db.Float, nullable=False)
    speed = db.Column(db.Float, nullable=True)
    hdop = db.Column(db.Float, nullable=True)

    @validates("lat")
    def lat_validate(self, key, lat):
        if not utils.is_lat_valid(lat):
            raise ValueError(f"{key} must be between -90 and 90")
        return lat

    @validates("lon")
    def lon_validate(self, key, lon):
        if not utils.is_lon_valid(lon):
            raise ValueError(f"{key} must be between -180 and 180")
        return lon
