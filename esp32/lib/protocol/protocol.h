// protocol.h — the SHARED "contract" between master and edge firmware.
//
// Both firmwares #include this. ESP-NOW copies these bytes verbatim from one
// chip to the other, so the layout MUST be identical on both sides — hence one
// definition, here. __attribute__((packed)) removes hidden padding bytes.
#pragma once
#include <stdint.h>

// Bump if you change any struct below, so a mismatched board ignores garbage.
constexpr uint8_t PROTO_VERSION = 2;

// All boards must agree on one Wi-Fi channel for ESP-NOW.
constexpr uint8_t ESPNOW_CHANNEL = 1;

// Length of the ESP-NOW keys (fixed by the hardware at 16 bytes).
constexpr uint8_t KEY_LEN = 16;

// Product-wide Primary Master Key. Same in every board's firmware. It only
// protects the per-system LMK at rest; the LMK (exchanged at pairing) is what
// actually encrypts traffic. 16 bytes exactly.
const uint8_t ESPNOW_PMK[KEY_LEN] = {
  'L','f','l','i','p','-','P','M','K','-','v','2','-','x','x','x'
};

// Desired / actual position of the plates (they all move together).
enum class PlateState : uint8_t { DOWN = 0, UP = 1 };

// Every packet starts with version + type so the receiver knows what it got.
enum class MsgType : uint8_t {
  PAIR_REQ = 1,   // edge   -> master  (broadcast, unencrypted) "pair me"
  PAIR_ACK = 2,   // master -> edge    (unicast,  unencrypted)  carries the LMK
  POLL     = 3,   // edge   -> master  (unicast,  encrypted)    "what should I be?"
  CMD      = 4,   // master -> edge    (unicast,  encrypted)    "be this"
};

// edge -> master, broadcast: asks to be paired.
struct __attribute__((packed)) PairReqMsg {
  uint8_t version;   // = PROTO_VERSION
  MsgType type;      // = MsgType::PAIR_REQ
};

// master -> edge, unicast: confirms pairing and hands over the system key.
struct __attribute__((packed)) PairAckMsg {
  uint8_t version;       // = PROTO_VERSION
  MsgType type;          // = MsgType::PAIR_ACK
  uint8_t lmk[KEY_LEN];  // the per-system encryption key to use from now on
};

// edge -> master, encrypted unicast: poll for the desired state.
struct __attribute__((packed)) PollMsg {
  uint8_t    version;    // = PROTO_VERSION
  MsgType    type;       // = MsgType::POLL
  uint16_t   battMv;     // battery millivolts (0 until that phase)
  PlateState current;    // what this edge currently believes it is
};

// master -> edge, encrypted unicast: the command reply.
struct __attribute__((packed)) CmdMsg {
  uint8_t    version;    // = PROTO_VERSION
  MsgType    type;       // = MsgType::CMD
  PlateState desired;    // the state the edge should move to
};
