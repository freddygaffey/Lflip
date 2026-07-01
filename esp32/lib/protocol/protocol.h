// protocol.h — the SHARED "contract" between master and edge firmware.
// Freddy Gaffey
// how this works: the edge broadcasts on FF:FF:FF:FF:FF:FF (everyone hears it).
// a master in pairing mode sees the sender's MAC, saves it as its paired edge,
// and replies to confirm. the edge reads the master's MAC from that reply, and
// from then on they talk directly by MAC. (plaintext — no encryption.)
//
// Both firmwares #include this. ESP-NOW copies these bytes verbatim from one
// chip to the other, so the layout MUST be identical on both sides — hence one
// definition, here. __attribute__((packed)) removes hidden padding bytes.
#pragma once
#include <stdint.h>

// Bump if you change any struct below, so a mismatched board ignores garbage.
// v4: added UNPAIR (master tells an edge to disconnect and go back to pairing).
// v5: added SERVO_CAL (app jogs/saves a plate's servo end-points).
// v6: PlateState is now 3-way (L / CENTER / P) with a calibrated Center.
constexpr uint8_t PROTO_VERSION = 6;

// All boards must agree on one Wi-Fi channel for ESP-NOW.
constexpr uint8_t ESPNOW_CHANNEL = 1;

// Desired / actual position of the plates (they all move together).
// The plate is a 3-position flap: one face shows L, the other shows P, and
// CENTER is edge-on (neither shown / "off"). Each position maps to a per-edge
// calibrated servo pulse; the user decides which physical spot is L vs P.
enum class PlateState : uint8_t { L = 0, CENTER = 1, P = 2 };

// Every packet starts with version + type so the receiver knows what it got.
enum class MsgType : uint8_t {
  PAIR_REQ = 1,   // edge   -> master  (broadcast) "pair request"
  PAIR_ACK = 2,   // master -> edge    (unicast)   "pair accepted"
  POLL     = 3,   // edge   -> master  (unicast)   "status update"
  CMD      = 4,   // master -> edge    (unicast)   "command"
  UNPAIR   = 5,   // master -> edge    (unicast)   "forget me, go back to pairing"
  SERVO_CAL = 6,  // master -> edge    (unicast)   "jog/save a servo end-point"
};

// edge -> master, broadcast: asks to be paired.
struct __attribute__((packed)) PairReqMsg {
  uint8_t version;   // = PROTO_VERSION
  MsgType type;      // = MsgType::PAIR_REQ
};

// master -> edge, unicast: confirms pairing. The edge learns the master's MAC
// from the packet's sender address, so the body is just version + type.
struct __attribute__((packed)) PairAckMsg {
  uint8_t version;       // = PROTO_VERSION
  MsgType type;          // = MsgType::PAIR_ACK
};

// edge -> master, unicast: poll for the desired state.
struct __attribute__((packed)) PollMsg {
  uint8_t    version;    // = PROTO_VERSION
  MsgType    type;       // = MsgType::POLL
  uint16_t   battMv;     // battery millivolts (0 until that phase)
  PlateState current;    // what this edge currently believes it is
};

// master -> edge, unicast: the command reply.
struct __attribute__((packed)) CmdMsg {
  uint8_t    version;    // = PROTO_VERSION
  MsgType    type;       // = MsgType::CMD
  PlateState desired;    // the state the edge should move to
};

// master -> edge, unicast: "disconnect". The master is forgetting all its
// pairings; tell each edge to drop us and start broadcasting for a new master.
struct __attribute__((packed)) UnpairMsg {
  uint8_t version;       // = PROTO_VERSION
  MsgType type;          // = MsgType::UNPAIR
};

// master -> edge, unicast: servo calibration. Lets the app jog one plate's servo
// live and save the safe end-points (just shy of the mechanical stops).
//   action 0 = jog to `us` (live preview)   1 = save `us` as the DOWN end-point
//   action 2 = save `us` as the UP end-point   3 = end session / power servo off
struct __attribute__((packed)) ServoCalMsg {
  uint8_t  version;      // = PROTO_VERSION
  MsgType  type;         // = MsgType::SERVO_CAL
  uint8_t  action;       // 0 jog / 1 save-down / 2 save-up / 3 off
  uint16_t us;           // pulse width in microseconds
};












