#include <Arduino.h>
#include <SPI.h>
#include <SD.h>
#include <time.h>
#include "gps.h"
#include "acell.h"

// https://github.com/espressif/arduino-esp32/blob/master/libraries/SD/README.md
// for the right pins i used the same ones in this gide


// ESP32-C3 default SPI pins
#define SD_CS   7    // Chip Select
#define SD_MOSI 6    // Master Out Slave In
#define SD_MISO 5    // Master In Slave Out
#define SD_SCK  4    // Serial Clock

String buffer;
const int buffer_length = 50;
String log_file_name;

// log file struture 
// in the /trips/
// name is {start_time_ms_since_epoc}_{start_odo_km}_{sd_driver_name}.csv
// for example _213948712_1231_john smith.csv
// the dash    ^ means that it is incompleate compleat it without the
// the contense is 
    // there are diffrent types of entryes for each sencoer 
// "gps", {mcs scince start}, {gps speed}, {lon}, {lat}
// "acell", {mcs scince start},{x},{y},{z}
// the end of the file is 
// {current_time_epoc_+_1},{end_odo},{wether}

void _check_buff_and_write_to_file();

bool init_sd_card() {
  SPI.begin(SD_SCK, SD_MISO, SD_MOSI, SD_CS);
  SD.begin(SD_CS);
  if (!SD.exists("/trips")) SD.mkdir("/trips");
  return SD.begin(SD_CS);
}

File make_log_file(float odo_m, String sd_name)
{
    time_t start_time = time(nullptr); 
    String name = "/trips/_";
    name += String(start_time);
    name += "_";
    name += String((odo_m/1000),10);
    name += "_";
    name += sd_name;
    name += ".csv";

    File file = SD.open(name, FILE_WRITE);
    log_file_name = name.substring(7);
    return file;
}

File _get_log_file();

void end_trip(unsigned long end_odo,String weather){
    String str_to_w;
    str_to_w += String(time(nullptr))+","+
                String(end_odo)+","+
                weather;
    File f = _get_log_file();
    f.print(str_to_w);
    String name_of_file = f.name();
    f.close();
    String new_name_of_file = "/trips/" + name_of_file.substring(1);
    name_of_file = "/trips/" + name_of_file;
    SD.rename(name_of_file, new_name_of_file);
    log_file_name = "";
}

File _get_log_file(){
    String palth = "/trips/" + log_file_name;
    File file = SD.open(palth.c_str(),FILE_APPEND);
    if (file) return file;
    if (!file) {
        Serial.println("you shold make this function search if this is a problem");
        Serial.println("cant find the log file in the _get_log_file function in sd_card");
    }
    return file;
}

void log_acell(Acell acell) {
// "acell",{mcs scince start},{x},{y},{z}
    String name = log_file_name;
    char line[128];

    if (!(name.indexOf('_') == 0)) {
        Serial.println("the file passed to write a acell point dose not start with _ to mean active");
    }

    long start_time = name.substring(1,name.indexOf('_',1)).toDouble(); 
    // long start_odo = name.substring(name.indexOf("_",2), name.indexOf("_",name.indexOf("_",2))).toDouble();
    // String sd_name = name.substring(name.lastIndexOf('_',name[-1]));
    
    timeval time_rn;
    gettimeofday(&time_rn, nullptr);
    long current_time_mcs = ((time_rn.tv_sec - start_time) * 1000000) + time_rn.tv_usec;
    snprintf(line, sizeof(line), "acell,%ld,%f,%f,%f\n",
         current_time_mcs, acell.x, acell.y, acell.z);
    buffer += line; 
    _check_buff_and_write_to_file();
}

void log_gps(GpsCords gps_cord, float gps_speed_ms) {
    String name = log_file_name;
    char line[75];
    long start_time = name.substring(1,name.indexOf('_',1)).toDouble(); 
    // long start_odo = name.substring(name.indexOf("_",2), name.indexOf("_",name.indexOf("_",2))).toDouble();
    // String sd_name = name.substring(name.lastIndexOf('_',name[-1]));
    
    timeval time_rn;
    gettimeofday(&time_rn, nullptr);
    long current_time_mcs = ((time_rn.tv_sec - start_time) * 1000000) + time_rn.tv_usec;
    snprintf(line,sizeof(line),"gps,%ld,%.2f,%.8f,%.8f\n",
        current_time_mcs,gps_speed_ms,gps_cord.lon,gps_cord.lat);
        
    buffer += line; 
    _check_buff_and_write_to_file();
}

void delete_current_log() {
    if (log_file_name.length() == 0) return;
    String path = "/trips/" + log_file_name;
    SD.remove(path);
    buffer = "";
    log_file_name = "";
    Serial.println("Deleted incomplete log: " + path);
}

void _check_buff_and_write_to_file(){
    if (buffer.length() > buffer_length){
        File trip_file = _get_log_file();
        trip_file.print(buffer);
        trip_file.close();
        buffer = "";
    }
}
