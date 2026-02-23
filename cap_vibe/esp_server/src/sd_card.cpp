#include <Arduino.h>
#include <SPI.h>
#include <SD.h>
#include <time.h>
#include "sd_card.h"

#define SD_CS   7
#define SD_MOSI 6
#define SD_MISO 5
#define SD_SCK  4

#define ODO_LOG_INTERVAL_MS 10000  // log odo every 10 s
#define BUFFER_LENGTH 50

String buffer;
String log_file_name;
unsigned long last_odo_log_ms = 0;

File _get_log_file();

void _check_buff_and_write() {
  if (buffer.length() > BUFFER_LENGTH) {
    File f = _get_log_file();
    if (f) {
      f.print(buffer);
      f.close();
    }
    buffer = "";
  }
}

bool init_sd_card() {
  SPI.begin(SD_SCK, SD_MISO, SD_MOSI, SD_CS);
  if (!SD.begin(SD_CS)) {
    Serial.println("SD card init failed");
    return false;
  }
  if (!SD.exists("/trips")) {
    SD.mkdir("/trips");
  }
  Serial.println("SD card OK");
  return true;
}

File make_log_file(float odo_km, String sd_name) {
  time_t start_time = time(nullptr);
  String name = "/trips/_";
  name += String((long)start_time);
  name += "_";
  name += String(odo_km, 2);
  name += "_";
  name += sd_name;
  name += ".csv";

  File file = SD.open(name.c_str(), FILE_WRITE);
  if (file) {
    log_file_name = name.substring(7);
    // Header: start_time,start_odo_km,sd_id
    String header = String((long)start_time) + "," + String(odo_km, 2) + "," + sd_name + "\n";
    file.print(header);
    file.close();
    last_odo_log_ms = millis();
  }
  return file;
}

File _get_log_file() {
  if (log_file_name.isEmpty()) return File();
  String path = "/trips/" + log_file_name;
  return SD.open(path.c_str(), FILE_APPEND);
}

void log_odo_sample(float odo_km) {
  if (log_file_name.isEmpty()) return;
  char line[48];
  snprintf(line, sizeof(line), "%.2f\n", odo_km);
  buffer += line;
  _check_buff_and_write();
}

void end_trip(float end_odo_km, String weather) {
  String str_to_w;
  str_to_w += String((long)time(nullptr)) + ",";
  str_to_w += String(end_odo_km, 2) + ",";
  str_to_w += weather + "\n";

  File f = _get_log_file();
  if (f) {
    f.print(str_to_w);
    String name_of_file = f.name();
    f.close();

    String old_path = "/trips/" + log_file_name;
    String new_name = log_file_name;
    if (new_name.startsWith("_")) {
      new_name = new_name.substring(1);
    }
    String new_path = "/trips/" + new_name;
    if (SD.exists(new_path)) SD.remove(new_path);
    SD.rename(old_path, new_path);
  }
  log_file_name = "";
  buffer = "";
}
