#include <Arduino.h>
#include <vector>
#include <LittleFS.h>
#include <ArduinoJson.h>

#include "mbedtls/sha256.h"

// supervising driver id = hash(license number and full name on license)
// license id = license number
// name = full name on drives license 
// nick name = a short name to display on the ui can't have duplicates

void add_SVD(String SVD_full_name, int licence_no, String nick_name) {
    unsigned char id[32];
    String input = String(licence_no) + SVD_full_name; 

    mbedtls_sha256_context ctx;
    mbedtls_sha256_init(&ctx);
    mbedtls_sha256_starts(&ctx, 0);
    mbedtls_sha256_update(&ctx, (unsigned char*)input.c_str(), input.length());
    mbedtls_sha256_finish(&ctx, id);
    mbedtls_sha256_free(&ctx);

    JsonDocument doc; 
    File file = LittleFS.open("/SDV.json", "r");
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
    new_SVD["hash_id"] = id;
    new_SVD["last_used"] = String(time(nullptr));

    file = LittleFS.open("/SVD.json","w");
    serializeJson(doc,file);
    file.close();
}
