from data import db, Learner, Trip, GpsReading, AcellReading, Car
from datetime import datetime

def user_create_task(title, description, priority):
    new_task = Task(title=title, description=description, priority=priority)
    db.session.add(new_task)
    db.session.commit()
    return new_task

def add_trip(file_name: str, trip_csv:str, learner:Learner, car:Car):
    # name is {start_time_ms_since_epoc}_{start_odo_km}_{sd_driver_name}.csv
    # for example _213948712_1231_john smith.csv
    # the dash    ^ means that it is incompleate compleat it without the
    # the contense is 
    #  // there are diffrent types of entryes for each sencoer 
    # "gps", {mcs scince start}, {gps speed}, {lon}, {lat}
    # "acell", {mcs scince start},{x},{y},{z}
    # the end of the file is 
    # {current_time_epoc_+_1},{end_odo},{wether}

    file_name = file_name.replace(".csv","")
    if file_name[0] == "_": raise ValueError("the file shold not start with a _ means incompleate")

    file_name = file_name.split("_")
    # name is {start_time_ms_since_epoc}_{start_odo_km}_{sd_driver_name}.csv
    start_time_int = int(file_name[0])
    start_odo = float(file_name[1])
    sd_name = "_".join(file_name[2:]) 
    
    start_time = datetime.fromtimestamp(start_time_int)

    ######## passed file name #########
    
    lines = trip_csv.splitlines()
    gps = []
    acell = []
    for i in lines[:-1]:
        if i[0] == "g":
            gps.append(i)
            continue
        elif i[0] == "a":
            acell.append(i)
            continue
        else: raise ValueError(f"the csv data is invalid {i} can not be passed")

    data = lines[-1]
    data = data.split(",")

    end_time = int(data[-1])
    end_odo = float(data[-2])
    try:
        weather = data[-3]
    except IndexError:
        weather = None
    
    start_time= datetime.fromtimestamp(start_time)
    end_time= datetime.fromtimestamp(end_time)
    trip = Trip(
        sd_name = sd_name,
        sd_number = None,
        start_time= start_time,
        end_time= end_time,
        weather= weather,
        start_odo= start_odo,
        end_odo= end_odo,
        learner=learner,
        car= car,
        duration = end_time - start_time
    )
    db.session.add(trip)
    db.session.commit()
    # "gps", {mcs scince start}, {gps speed}, {lon}, {lat}
    for i in gps:
        data = i.split(",")

        gp = GpsReading(
           time = datetime.fromtimestamp(start_time_int + (float(data[1]/1_000_000))),
           trip=trip,
           speed=float(data[2]),
           lon=float(data[3]),
           lat=float(data[4])
        )
        db.session.add(gp)

    # "acell", {mcs scince start},{x},{y},{z}
    for i in acell:
        data = i.split(",")

        acel = AcellReading(
            trip=trip,
            time = datetime.fromtimestamp(start_time_int + (float(data[1]/1_000_000))),
            x=float(data[2]),
            y=float(data[3]),
            z=float(data[4])
        )
        db.session.add(acel)
    db.session.commit()

    return trip
    