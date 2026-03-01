def is_pwd_valid(pwd) -> str | None:
    print("implment pwd validation")
    return pwd

def is_username_valid(username) -> str | None:
    print("implment username validation")
    return username

def is_licence_no_valid(licence_no) -> str | None:
    print("impmnet a licence no valid")
    return licence_no

def is_email_valid(email) -> str | None:
    print("impmnet a licence no valid")
    return email

def is_name_valid(name) -> str | None:
    print("impmnet a licence no valid")
    return name

def is_uname_valid(username) -> str | None:
    print("impmnet a licence no valid")
    return username

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

def is_role_valid(role) -> str | None:
    print("impmnet a role valid")
    valid_roles = ["learner","parant"]
    role = role.lower()
    if role not in valid_roles: return None
    return role

def is_data_of_birth_valid(date_of_birth) -> str | None:
    print("impmnet a date of birth valid")
    return date_of_birth



