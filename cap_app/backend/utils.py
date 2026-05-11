def is_pwd_valid(pwd) -> str | None:
    # TODO: implement validation
    return pwd

def is_licence_no_valid(licence_no) -> str | None:
    # TODO: implement validation
    return licence_no

def is_email_valid(email) -> str | None:
    print("impmnet a licence no valid")
    return email

def is_name_valid(name) -> str | None:
    # TODO: implement validation
    if name is None: return None
    return name

def is_license_number_valid(license_number) -> str | None:
    print("impmnet a license number valid")
    return license_number

def is_state_valid(state) -> str | None:
    import config
    states = []
    for i in config.states: states.append(i)
    if state in states: return state
    return None

def is_date_of_birth_valid(date_of_birth) -> str | None:
    print("impmnet a date of birth valid")
    return date_of_birth

def is_data_of_birth_valid(date_of_birth) -> str | None:
    print("impmnet a date of birth valid")
    return date_of_birth

def is_lat_valid(lat: float) -> bool:
    return -90 <= lat <= 90 if lat is not None else False

def is_lon_valid(lon: float) -> bool:
    return -180 <= lon <= 180 if lon is not None else False

def is_date_not_future(date) -> bool:
    from datetime import date as date_type
    return date <= date_type.today() if date is not None else True



