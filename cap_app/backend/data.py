import flask_sqlalchemy
import flask_login
from werkzeug.security import check_password_hash

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

    email = db.Column(db.String(255), nullable=True)
    username = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(100), nullable=False) # parant leaner
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
