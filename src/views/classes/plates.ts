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
const PLATE_CHAR    = 'a1b2c3d4-0002-4000-8000-000000000002'  // plate 0/1
const PLATE_CMD     = 'a1b2c3d4-0003-4000-8000-000000000003'  // debug command
const PLATE_STAT    = 'a1b2c3d4-0004-4000-8000-000000000004'  // status JSON

// Shape of the status JSON the master reports (see master/main.cpp buildStatus).
export type PlateEdge = { i: number; mac: string; age: number; mv: number; cur: number }
// An edge the master HEARD in discovery but hasn't paired yet (user picks these).
export type PlateCand = { mac: string; age: number }
export type PlateStatus = {
  uid: string; up: number; edges: number; desired: number; pairing: boolean
  // flip verdict for the trip-start screen: 'nohw' | 'pending' | 'ok' | 'failed'
  flip: string
  // self-test of a freshly paired edge: 'none' | 'testing' | 'pass' | 'fail'
  test: string
  e: PlateEdge[]       // paired edges
  cand: PlateCand[]    // discovered, not-yet-paired edges
}

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
      await this.withTimeout(BleClient.connect(id, () => this.onDrop()), 12000)
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

  // ── Debug helpers (used by the Debug tab's master panel) ────────────────────

  // Scan for any L-plate master in range and return what's advertising.
  async scanMasters(ms = 5000): Promise<{ deviceId: string; name?: string }[]> {
    const { BleClient } = await import('@capacitor-community/bluetooth-le')
    await BleClient.initialize()
    const found: { deviceId: string; name?: string }[] = []
    await BleClient.requestLEScan({ services: [PLATE_SERVICE] }, r => {
      if (!found.find(x => x.deviceId === r.device.deviceId))
        found.push({ deviceId: r.device.deviceId, name: r.device.name })
    })
    await new Promise(res => setTimeout(res, ms))
    try { await BleClient.stopLEScan() } catch {}
    return found
  }

  // Reject if a promise doesn't settle in `ms`. Without this, a hung BLE
  // connect (e.g. the master reset mid-connect) leaves the UI stuck on
  // 'connecting' forever, because iOS never resolves or rejects.
  private withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      p,
      new Promise<T>((_, rej) => setTimeout(() => rej(new Error('connect timed out')), ms)),
    ])
  }

  // Connect straight to a known deviceId (from scanMasters) and hold it.
  async connectById(deviceId: string) {
    const { BleClient } = await import('@capacitor-community/bluetooth-le')
    await BleClient.initialize()
    this.keepAlive = true
    this.wantName = ''
    this.status.value = 'connecting'
    try {
      await this.withTimeout(BleClient.connect(deviceId, () => this.onDrop()), 12000)
    } catch (e) {
      // hung or failed — clean up so the UI shows 'off' and you can retry
      this.connected.value = false
      this.deviceId = ''
      this.status.value = 'off'
      try { await BleClient.disconnect(deviceId) } catch {}
      throw e
    }
    this.deviceId = deviceId
    this.connected.value = true
    this.status.value = 'connected'
  }

  // Send a single debug-command opcode to the master.
  private async sendCmd(op: number) {
    if (!this.connected.value || !this.deviceId) throw new Error('not connected')
    const { BleClient, numbersToDataView } = await import('@capacitor-community/bluetooth-le')
    await BleClient.write(this.deviceId, PLATE_SERVICE, PLATE_CMD, numbersToDataView([op]))
  }

  async enterPairing() { await this.sendCmd(1) }   // master listens 60s for edges
  async factoryReset() { await this.sendCmd(2) }   // wipes pairings + restarts
  async stopPairing()  { await this.sendCmd(3) }

  // Pair ONE discovered edge by its MAC (from status.cand). Sends opcode 4
  // followed by the 6 MAC bytes — the master pairs only that edge, then self-tests.
  async pairSelected(mac: string) {
    if (!this.connected.value || !this.deviceId) throw new Error('not connected')
    const bytes = mac.split(':').map(h => parseInt(h, 16))   // "B0:A6:.." -> [176,166,..]
    if (bytes.length !== 6 || bytes.some(isNaN)) throw new Error('bad MAC: ' + mac)
    const { BleClient, numbersToDataView } = await import('@capacitor-community/bluetooth-le')
    await BleClient.write(this.deviceId, PLATE_SERVICE, PLATE_CMD, numbersToDataView([4, ...bytes]))
  }

  // Servo calibration for ONE paired edge (front/back plate), addressed by its
  // index in status.e[]. The master relays this to that edge over ESP-NOW.
  //   action 0 = jog to `us` (live preview)   1 = save `us` as DOWN end-point
  //   action 2 = save `us` as UP end-point    3 = end session / power servo off
  // `us` is the servo pulse width in microseconds (clamped on the edge to 500-2500).
  async calibrate(edgeIdx: number, action: 0 | 1 | 2 | 3, us = 1500) {
    if (!this.connected.value || !this.deviceId) throw new Error('not connected')
    const u = Math.max(500, Math.min(2500, Math.round(us)))
    const { BleClient, numbersToDataView } = await import('@capacitor-community/bluetooth-le')
    // [opcode 5][edgeIdx][action][us_lo][us_hi]  (us little-endian)
    await BleClient.write(this.deviceId, PLATE_SERVICE, PLATE_CMD,
      numbersToDataView([5, edgeIdx & 0xff, action, u & 0xff, (u >> 8) & 0xff]))
  }

  // Read the master's live status JSON (paired edges, ages, battery, etc).
  async readStatus(): Promise<PlateStatus> {
    if (!this.connected.value || !this.deviceId) throw new Error('not connected')
    const { BleClient } = await import('@capacitor-community/bluetooth-le')
    const dv = await BleClient.read(this.deviceId, PLATE_SERVICE, PLATE_STAT)
    const txt = new TextDecoder().decode(dv.buffer)
    return JSON.parse(txt) as PlateStatus
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
