from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Learner(db.Model):
    __tablename__ = 'learners'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    nohc = db.Column(db.Float,default=0)
    
    
class Trip(db.Model):
    __tablename__ = 'trips'

    id = db.Column(db.Integer, primary_key=True)

    learner_id = db.Column(db.Integer, db.ForeignKey('learners.id'),nullable=False)
    car_id = db.Column(db.Integer, db.ForeignKey('cars.id'),nullable=False)
    
    sd_name = db.Column(db.String(50),nullable=False)
    sd_number = db.Column(db.Integer(),nullable=True)
    start_time = db.Column(db.DateTime(),nullable=False)
    end_time = db.Column(db.DateTime(),nullable=False)
    weather = db.Column(db.String(20),default="clear")
    start_odo = db.Column(db.Float,nullable=False)
    end_odo = db.Column(db.Float,nullable=False)
    duration = db.column(db.Float,nullable=False)

    learner = db.relationship("Learner", backref='trips')
    car = db.relationship("Car",backref="trips")

class GpsReading(db.Model):
    __tablename__ = 'gps_readings'

    id = db.Column(db.Integer, primary_key=True)
    
    trip_id = db.Column(db.Integer, db.ForeignKey('trips.id'),nullable=False)
    time = db.Column(db.DateTime(), nullable= False)
    lon = db.Column(db.Float)
    lat = db.Column(db.Float)
    speed = db.Column(db.Float)
    
    trip = db.relationship("Trip",backref="gps_readings")

class AcellReading(db.Model):
    __tablename__ = 'acell_readings'

    id = db.Column(db.Integer, primary_key=True)

    trip_id = db.Column(db.Integer, db.ForeignKey('trips.id'),nullable=False)

    time = db.Column(db.DateTime(), nullable= False)
    x = db.Column(db.Float)
    y = db.Column(db.Float)
    z = db.Column(db.Float)

    trip = db.relationship("Trip",backref="acell_readings")
    
class Car(db.Model):
    __tablename__ = 'cars'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(30),nullable=False)
    odo = db.Column(db.Float,nullable=False)
    unique_chip_id = db.Column(db.String(10),unique=True)
    