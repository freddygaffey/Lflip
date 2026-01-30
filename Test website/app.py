
# config.py
ESP_IP = '192.168.4.1'

from flask import Flask, render_template
import time

app = Flask(__name__)


@app.route('/')
def test_controls():
    current_time = int(time.time())
    esp_ip = '192.168.4.1'
    sd_id = 'max_smith'
    
    start_url = f"http://{esp_ip}/start?start_time={current_time}&SD_ID={sd_id}"
    stop_url = f"http://{esp_ip}/stop?end_time={current_time}"
    odo_url = f"http://{esp_ip}/odo_update?odo=100"
    sync_url = f"http://{esp_ip}/sync"
    
    return render_template('test_controls.html',
                          start_url=start_url,
                          stop_url=stop_url,
                          odo_url=odo_url,
                          sync_url=sync_url)