"""
Fake BLE car broadcaster for laptop testing.

One BLE peripheral advertising three "cars" — each car is a service
with its own odometer notify characteristic that increments
at a different rate.

Setup:
    python3 -m venv .venv
    source .venv/bin/activate
    pip install bless

Run:
    python fake_ble_car.py

Scan side: connect to peripheral, then subscribe to whichever
car's odo characteristic you want.
"""

import asyncio
import logging

from bless import (
    BlessServer,
    BlessGATTCharacteristic,
    GATTCharacteristicProperties,
    GATTAttributePermissions,
)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("fake-ble-car")

DEVICE_NAME = "Cars"

CARS = [
    {
        "name": "Car A",
        "service_uuid": "12345678-1234-5678-1234-56789abcdef0",
        "odo_uuid":     "12345678-1234-5678-1234-56789abcdef1",
        "start_odo": 12345,
        "increment": 1,    # km per tick
    },
    {
        "name": "Car B",
        "service_uuid": "22345678-1234-5678-1234-56789abcdef0",
        "odo_uuid":     "22345678-1234-5678-1234-56789abcdef1",
        "start_odo": 54321,
        "increment": 2,
    },
    {
        "name": "Car C",
        "service_uuid": "32345678-1234-5678-1234-56789abcdef0",
        "odo_uuid":     "32345678-1234-5678-1234-56789abcdef1",
        "start_odo": 99999,
        "increment": 5,
    },
]

TICK_SECONDS = 1


def read_request(characteristic: BlessGATTCharacteristic, **_):
    return characteristic.value


def write_request(characteristic: BlessGATTCharacteristic, value, **_):
    characteristic.value = value
    log.info("write %s: %s", characteristic.uuid, value)


async def main():
    server = BlessServer(name=DEVICE_NAME)
    server.read_request_func = read_request
    server.write_request_func = write_request

    for car in CARS:
        await server.add_new_service(car["service_uuid"])
        await server.add_new_characteristic(
            car["service_uuid"],
            car["odo_uuid"],
            GATTCharacteristicProperties.read | GATTCharacteristicProperties.notify,
            None,
            GATTAttributePermissions.readable,
        )
        car["odo"] = car["start_odo"]
        log.info("registered %s — service %s", car["name"], car["service_uuid"])

    await server.start()
    log.info("advertising as %s with %d cars", DEVICE_NAME, len(CARS))

    try:
        while True:
            for car in CARS:
                car["odo"] += car["increment"]
                payload = str(car["odo"]).encode("utf-8")
                char = server.get_characteristic(car["odo_uuid"])
                char.value = payload
                server.update_value(car["service_uuid"], car["odo_uuid"])
            log.info("odo: " + ", ".join(f"{c['name']}={c['odo']}" for c in CARS))
            await asyncio.sleep(TICK_SECONDS)
    except KeyboardInterrupt:
        pass
    finally:
        await server.stop()


if __name__ == "__main__":
    asyncio.run(main())
