// Per-car L-plate BLE link (AI-assisted — BLE is fiddly).
//
// Connects to ONE car's master at a time, identified by that car's saved
// ble_device_name (the master advertises a unique name like "LP-3F1A9C20", so
// mum's and dad's plates don't clash). Not a global always-on manager: you
// connect when you need it (active trip, or the settings test) and disconnect
// when done. Same pseudo-singleton pattern as cars.ts.
import { ref } from 'vue'
import type { Car } from './cars'

// The product service every L-plate master advertises. Used ONLY to filter the
// scan — the per-car identity is the device name above, not this UUID.
const PLATE_SERVICE = 'a1b2c3d4-0001-4000-8000-000000000001'
const PLATE_CHAR    = 'a1b2c3d4-0002-4000-8000-000000000002'

type Status = 'off' | 'searching' | 'connecting' | 'connected'

class PlateLink {
  status = ref<Status>('off')
  connected = ref(false)
  carId = ref<number | null>(null)

  private deviceId = ''
  private wantName = ''
  private keepAlive = false   // true while we should hold/retry the link

  // Connect to a specific car's master and keep it up (reconnect if it drops
  // while still wanted, e.g. you drove back into range). No-op if the car has
  // never been paired (no saved device name).
  async connect(car: Car) {
    if (!car?.ble_device_name) { this.status.value = 'off'; return }
    this.wantName = car.ble_device_name
    this.carId.value = car.id ?? null
    this.keepAlive = true
    await this.attempt()
  }

  private async attempt() {
    if (!this.keepAlive || this.connected.value) return
    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le')
      await BleClient.initialize()
      this.status.value = 'searching'
      const id = await this.scanFor(this.wantName)
      if (!id) { this.retryLater(3000); return }
      this.status.value = 'connecting'
      await BleClient.connect(id, () => this.onDrop())
      this.deviceId = id
      this.connected.value = true
      this.status.value = 'connected'
    } catch (e) {
      console.error('plate connect failed', e)
      this.status.value = 'off'
      this.retryLater(3000)
    }
  }

  private retryLater(ms: number) {
    if (this.keepAlive) setTimeout(() => this.attempt(), ms)
  }

  // Fired by the BLE stack when the master goes out of range / powers off.
  private onDrop() {
    this.connected.value = false
    this.deviceId = ''
    if (this.keepAlive) { this.status.value = 'searching'; this.retryLater(1500) }
    else this.status.value = 'off'
  }

  // Scan (filtered to L-plate masters) for the device whose advertised name
  // matches `name`. iOS may have saved a deviceId instead, so match that too.
  private async scanFor(name: string): Promise<string> {
    const { BleClient } = await import('@capacitor-community/bluetooth-le')
    return await new Promise<string>(resolve => {
      let id = ''
      const stop = async () => { try { await BleClient.stopLEScan() } catch {} }
      BleClient.requestLEScan({ services: [PLATE_SERVICE] }, async r => {
        if (!id && (r.device.name === name || r.device.deviceId === name)) {
          id = r.device.deviceId
          await stop()
          resolve(id)
        }
      }).catch(() => resolve(''))
      setTimeout(async () => { await stop(); resolve(id) }, 4000)
    })
  }

  // Toggle: 1 = plates up, 0 = plates down. Uses the live connection.
  async setPlates(state: 0 | 1) {
    if (!this.connected.value || !this.deviceId) throw new Error('plates not connected')
    const { BleClient, numbersToDataView } = await import('@capacitor-community/bluetooth-le')
    await BleClient.write(this.deviceId, PLATE_SERVICE, PLATE_CHAR, numbersToDataView([state]))
  }

  async disconnect() {
    this.keepAlive = false
    this.carId.value = null
    const id = this.deviceId
    this.deviceId = ''
    this.connected.value = false
    this.status.value = 'off'
    if (!id) return
    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le')
      await BleClient.disconnect(id)
    } catch {}
  }
}

export const plateLink = new PlateLink()
