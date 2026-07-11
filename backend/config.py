import os
secret_key = os.environ.get("SECRET_KEY")

# this is commited to a privit repo 
# TODO: put this in e env file 

# ai token usage limits - generous because gpt-oss is a reasoning model that
# spends a lot of tokens "thinking", and tool calls add several turns per reply
TOKEN_LIMIT_5H = 100000
TOKEN_LIMIT_WEEK = 500000

class State(object):
    def __init__(self, total_hours, night_hours):
        self.total_hours = total_hours
        self.night_hours = night_hours

states = {
    "act": State(total_hours=100, night_hours=10),
    "nsw": State(total_hours=120, night_hours=25),
    "vic": State(total_hours=120, night_hours=20),
    "qld": State(total_hours=100, night_hours=10),
    "sa": State(total_hours=75,  night_hours=15),
    "wa": State(total_hours=50,  night_hours=5),
    "tas": State(total_hours=80,  night_hours=15),
    "nt":  State(total_hours=50,  night_hours=5),
}
