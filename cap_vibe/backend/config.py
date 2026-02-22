import os

DATABASE = os.getenv('LPLATE_DB', 'lplate.db')
JWT_SECRET = os.getenv('JWT_SECRET', 'change-me-in-production')
JWT_EXPIRY_DAYS = 7

STATE_REQUIREMENTS = {
    'ACT': {'total': 100, 'night': 10},
    'NSW': {'total': 120, 'night': 20},
    'VIC': {'total': 120, 'night': 10},
    'QLD': {'total': 100, 'night': 10},
    'SA':  {'total': 75,  'night': 15},
    'WA':  {'total': 50,  'night': 0},
    'TAS': {'total': 80,  'night': 15},
    'NT':  {'total': 50,  'night': 0},
}

DEFAULT_STATE = 'ACT'
DEFAULT_TARGET_HOURS = STATE_REQUIREMENTS[DEFAULT_STATE]['total']
NIGHT_HOURS_REQUIRED = STATE_REQUIREMENTS[DEFAULT_STATE]['night']
