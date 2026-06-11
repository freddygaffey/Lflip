def is_pwd_valid(pwd) -> str | None:
    # TODO: implement validation
    """ 
    8 char 
    1 cap 
    1 lower
    one special char 
    """
    pwd = str(pwd)
    letters = "qwertyuiopasdfghjklzxcvbnm"
    chars = """!@#$%^&*()_+~:"{}|<>?/.,;'[]\-=`~"""
    if not len(pwd) >= 8: return None

    lower_count = 0
    upper_count = 0
    s_char_count = 0
    for i in pwd:
        if i in letters: lower_count += 1
        if i in letters.upper: upper_count += 1
        if i in chr: s_char_count += 1
    if not (lower_count >= 1): return None
    if not (upper_count >= 1): return None
    if not (s_char_count >= 1): return None

    return pwd

def is_licence_no_valid(licence_no,state) -> str | None:
    # TODO: implement validation
    '''
    Victoria: Usually 9 digits, numbers only (e.g., 123456789)
    New South Wales (NSW): 8 digits, numbers only (e.g., 12345678)
    Queensland: 9 digits, numbers only (e.g., 123456789)
    South Australia: 7 digits, numbers only (e.g., 1234567)
    Western Australia: 7 digits, numbers only (e.g., 1234567)
    Tasmania: 7 digits, numbers only (e.g., 1234567)
    Northern Territory: 6 or 7 digits, numbers only (e.g., 123456 or 1234567)
    Australian Capital Territory (ACT): 8 digits, numbers only (e.g., 12345678)
    https://etacs.com.au/australian-licence-numbers-usi-verification/
    '''
    licence_no = str(licence_no)

    # digit lengths allowed per state (keys match config.states)
    lengths = {
        "vic": [9],
        "nsw": [8],
        "qld": [9],
        "sa":  [7],
        "wa":  [7],
        "tas": [7],
        "nt":  [6, 7],
        "act": [8],
    }

    if state is None: return None
    state = state.lower()
    if state not in lengths: return None
    if not licence_no.isdigit(): return None
    if len(licence_no) not in lengths[state]: return None

    return licence_no

def is_email_valid(email) -> str | None:
    import re
    email = str(email)
    pattern = r'^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email): return None
    return email

def is_name_valid(name) -> str | None:
    if name is None: return None
    name = str(name).strip()
    if not name or len(name) > 100: return None
    if not all(c.isalpha() or c in " '-" for c in name): return None
    return name

def is_state_valid(state) -> str | None:
    import config
    states = []
    for i in config.states: states.append(i)
    if state in states: return state
    return None

def is_date_of_birth_valid(date_of_birth) -> str | None:
    from datetime import date as date_type
    if date_of_birth is None: return None
    if date_of_birth > date_type.today(): return None
    age = (date_type.today() - date_of_birth).days // 365
    if age < 16 or age > 120: return None
    return date_of_birth

def is_license_number_valid(license_number) -> str | None:
    license_number = str(license_number)
    if not license_number.isdigit() or len(license_number) < 6 or len(license_number) > 20: return None
    return license_number

def is_lat_valid(lat: float) -> bool:
    return -90 <= lat <= 90 if lat is not None else False

def is_lon_valid(lon: float) -> bool:
    return -180 <= lon <= 180 if lon is not None else False

def is_date_not_future(date) -> bool:
    from datetime import date as date_type
    return date <= date_type.today() if date is not None else True



