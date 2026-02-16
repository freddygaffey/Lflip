#include <Arduino.h>
#include <vector>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <time.h>

#include "mbedtls/sha256.h"
String current_svd = "";
// supervising driver id = hash(license number and full name on license)
// license id = license number
// name = full name on drives license 
// nick name = a short name to display on the ui can't have duplicates
// last_used unix epoch
JsonDocument get_all_svd();

void set_SVD(String hash_id) {
    current_svd = hash_id;
    JsonDocument doc = get_all_svd();
    JsonArray all_SVD = doc["SVD"];
    String nickname = "";
    for (JsonObject svd : all_SVD) {
        if (svd["hash_id"] == hash_id) {
            svd["last_used"] = String(time(nullptr));
            nickname = svd["nick_name"].as<String>();
        }
    }
    File file = LittleFS.open("/SVD.json","w");
    serializeJson(doc,file);
    file.close();
    // Serial.println("current svd set to " + hash_id);
    // Serial.println("nick name is " + nickname);
}

void add_SVD(String SVD_full_name, int licence_no, String nick_name) {
    unsigned char id[32];
    String input = String(licence_no) + SVD_full_name; 

    mbedtls_sha256_context ctx;
    mbedtls_sha256_init(&ctx);
    mbedtls_sha256_starts(&ctx, 0);
    mbedtls_sha256_update(&ctx, (unsigned char*)input.c_str(), input.length());
    mbedtls_sha256_finish(&ctx, id);
    mbedtls_sha256_free(&ctx);
    
    String id_hex = "";
    for (int i = 0; i < 32; i++) {
        char hex[3];
        sprintf(hex, "%02x", id[i]);
        id_hex += hex;
    }

    JsonDocument doc; 
    File file = LittleFS.open("/SVD.json", "r");
    if (file) {
        deserializeJson(doc, file);
        file.close();
    }
    if (!doc["SVD"].is<JsonArray>()){
        doc["SVD"].to<JsonArray>();
    }
    JsonArray all_SVD = doc["SVD"];

    JsonObject new_SVD = all_SVD.add<JsonObject>();
    new_SVD["nick_name"] = nick_name;
    new_SVD["hash_id"] = id_hex;
    new_SVD["last_used"] = String(time(nullptr));

    file = LittleFS.open("/SVD.json","w");
    serializeJson(doc,file);
    file.close();
}

JsonDocument get_all_svd() {
    JsonDocument doc; 
    File file = LittleFS.open("/SVD.json", "r");
    if (file) {
        deserializeJson(doc, file);
        file.close();
        return doc;
    }
    else return doc;
}

String get_current_sdv() {
    return current_svd;
}