# config.py
ESP_IP = '192.168.4.1'

from flask import Flask

app = Flask(__name__)

@app.route('/')
def esp_link():
    return '''
    <a href="http://192.168.4.1/">Open L-Plate Device</a>
    <p style="color: gray; font-size: 12px;">
        (Must be connected to same WiFi as your L-Plate)
    </p>
    '''