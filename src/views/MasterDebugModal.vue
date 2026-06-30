<!-- Master (L-plate) debug panel. Connect to a master over BLE and inspect /
     control it: live status (paired edges, last-seen age, battery, state),
     enter/stop pairing, toggle plates, factory reset. Debug-tab only. -->
<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>Master debug</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="dismiss">Close</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding">
    <p><strong>Link:</strong> {{ status }}</p>

    <!-- 1. Find + connect -->
    <template v-if="!connected">
      <ion-button expand="block" fill="outline" :disabled="scanning" @click="scan">
        {{ scanning ? 'Scanning…' : 'Scan for masters' }}
      </ion-button>
      <ion-list v-if="found.length">
        <ion-item v-for="d in found" :key="d.deviceId" button @click="connect(d.deviceId)">
          <ion-label>
            <h3>{{ d.name || 'Unnamed' }}</h3>
            <p>{{ d.deviceId }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
      <p v-else-if="!scanning" class="hint">No masters found yet. Make sure it's powered and tap scan.</p>
    </template>

    <!-- 2. Live status + controls -->
    <template v-else>
      <ion-button expand="block" color="medium" @click="disconnect">Disconnect</ion-button>

      <div v-if="st" class="stat">
        <div class="row"><span>UID</span><b>{{ st.uid }}</b></div>
        <div class="row"><span>Uptime</span><b>{{ st.up }}s</b></div>
        <div class="row"><span>Desired plate</span><b>{{ st.desired ? 'UP' : 'DOWN' }}</b></div>
        <div class="row"><span>Discovery mode</span><b :class="{ on: st.pairing }">{{ st.pairing ? 'ON (listening)' : 'off' }}</b></div>
        <div class="row"><span>Paired edges</span><b :class="{ bad: st.edges === 0 }">{{ st.edges }}</b></div>
        <div class="row"><span>Flip</span><b :class="flipClass(st.flip)">{{ st.flip }}</b></div>
        <div class="row"><span>Self-test</span><b :class="testClass(st.test)">{{ st.test }}</b></div>
      </div>
      <p v-else class="hint">Reading status…</p>

      <!-- per-edge table -->
      <template v-if="st && st.e?.length">
        <ion-list-header><ion-label>Edges (plates)</ion-label></ion-list-header>
        <template v-for="e in st.e" :key="e.i">
          <ion-item lines="full">
            <ion-label>
              <h3>#{{ e.i }} · {{ e.mac }}</h3>
              <p>
                last poll: <b :class="ageClass(e.age)">{{ ageText(e.age) }}</b>
                · batt: {{ e.mv }}mV · state: {{ e.cur ? 'UP' : 'DOWN' }}
              </p>
            </ion-label>
            <ion-button slot="end" size="small" fill="outline"
                        :color="calIdx === e.i ? 'success' : 'medium'"
                        @click="calIdx === e.i ? endCal() : startCal(e.i)">
              {{ calIdx === e.i ? 'Close' : 'Calibrate' }}
            </ion-button>
          </ion-item>

          <!-- inline servo calibration for this plate -->
          <div v-if="calIdx === e.i" class="cal">
            <p class="hint">
              Drag to move this plate's servo, stopping just <i>before</i> it grinds on each
              stop. Set the DOWN and UP positions, then tap Close. Saved on the board.
            </p>
            <ion-range :min="500" :max="2500" :step="25" :value="calUs" @ionChange="onCalRange">
              <ion-label slot="start">500</ion-label>
              <ion-label slot="end">2500</ion-label>
            </ion-range>
            <div class="row"><span>Pulse</span><b>{{ calUs }} µs</b></div>
            <div class="calbtns">
              <ion-button size="small" fill="outline" @click="nudge(-25)">−25</ion-button>
              <ion-button size="small" fill="outline" @click="nudge(25)">+25</ion-button>
              <ion-button size="small" color="primary" @click="saveCal(1)">Set DOWN</ion-button>
              <ion-button size="small" color="primary" @click="saveCal(2)">Set UP</ion-button>
            </div>
          </div>
        </template>
      </template>

      <!-- discovered (not yet paired) edges — appear while in discovery mode -->
      <template v-if="st && st.cand?.length">
        <ion-list-header><ion-label>Discovered edges (tap to pair)</ion-label></ion-list-header>
        <ion-item v-for="c in st.cand" :key="c.mac" button lines="full" @click="pairOne(c.mac)">
          <ion-label>
            <h3>{{ c.mac }}</h3>
            <p>heard {{ ageText(c.age) }} · tap to pair</p>
          </ion-label>
        </ion-item>
      </template>

      <p v-if="st && st.edges === 0 && !st.cand?.length" class="warn">
        ⚠️ No edges paired — plates won't move. Tap <b>Enter discovery</b> below, then
        power on each edge board; it'll appear here for you to pair.
      </p>

      <ion-list-header><ion-label>Controls</ion-label></ion-list-header>
      <ion-button expand="block" :color="st && st.pairing ? 'success' : 'primary'" @click="pair">
        {{ st && st.pairing ? 'Discovering… (tap an edge above)' : 'Enter discovery (60s)' }}
      </ion-button>
      <ion-button expand="block" fill="outline" @click="stopPair">Stop pairing</ion-button>
      <ion-button expand="block" fill="outline" @click="plates(1)">Plates UP</ion-button>
      <ion-button expand="block" fill="outline" @click="plates(0)">Plates DOWN</ion-button>
      <ion-button expand="block" color="danger" @click="reset">Factory reset master</ion-button>

      <p v-if="msg" class="hint">{{ msg }}</p>
    </template>
  </ion-content>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import {
  modalController, alertController,
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonList, IonListHeader, IonItem, IonLabel, IonRange,
} from '@ionic/vue'
import { plateLink, type PlateStatus } from './classes/plates'

const status = plateLink.status
const connected = plateLink.connected

const scanning = ref(false)
const found = ref<{ deviceId: string; name?: string }[]>([])
const st = ref<PlateStatus | null>(null)
const msg = ref('')
let poll: ReturnType<typeof setInterval> | null = null

// Servo calibration: which edge index is open, and its live pulse width (µs).
const calIdx = ref<number | null>(null)
const calUs = ref(1500)

const scan = async () => {
  scanning.value = true
  found.value = []
  try {
    found.value = await plateLink.scanMasters(5000)
  } catch (e) {
    msg.value = 'scan failed: ' + e
  } finally {
    scanning.value = false
  }
}

const connect = async (deviceId: string) => {
  try {
    await plateLink.connectById(deviceId)
    startPolling()
  } catch (e) {
    msg.value = 'connect failed: ' + e
  }
}

const startPolling = () => {
  if (poll) clearInterval(poll)
  const tick = async () => {
    try { st.value = await plateLink.readStatus() } catch { /* transient */ }
  }
  tick()
  poll = setInterval(tick, 1500)
}

const disconnect = async () => {
  if (poll) { clearInterval(poll); poll = null }
  st.value = null
  calIdx.value = null
  await plateLink.disconnect()
}

// ── Servo calibration (per plate) ────────────────────────────────────────────
// Open a jog session for edge index `i`, centring the servo so it can't be
// sitting on a stop.
const startCal = async (i: number) => {
  calIdx.value = i
  calUs.value = 1500
  try { await plateLink.calibrate(i, 0, calUs.value); msg.value = 'calibrating plate #' + i }
  catch (e) { msg.value = 'cal failed: ' + e }
}
const jog = async () => {
  if (calIdx.value === null) return
  try { await plateLink.calibrate(calIdx.value, 0, calUs.value) }
  catch (e) { msg.value = 'jog failed: ' + e }
}
const onCalRange = async (ev: CustomEvent) => {
  calUs.value = Number((ev.detail as { value: number }).value)
  await jog()
}
const nudge = async (d: number) => {
  calUs.value = Math.max(500, Math.min(2500, calUs.value + d))
  await jog()
}
// action 1 = save current pulse as DOWN, 2 = save as UP. Persisted on the edge.
const saveCal = async (action: 1 | 2) => {
  if (calIdx.value === null) return
  try {
    await plateLink.calibrate(calIdx.value, action, calUs.value)
    msg.value = (action === 1 ? 'DOWN' : 'UP') + ' set to ' + calUs.value + 'µs'
  } catch (e) { msg.value = 'save failed: ' + e }
}
const endCal = async () => {
  const i = calIdx.value
  calIdx.value = null
  if (i === null) return
  try { await plateLink.calibrate(i, 3) } catch { /* servo also auto-powers-off */ }
}

const pair = async () => {
  try { await plateLink.enterPairing(); msg.value = 'discovery on — power on each edge; it appears above' }
  catch (e) { msg.value = 'cmd failed: ' + e }
}
const pairOne = async (mac: string) => {
  try { await plateLink.pairSelected(mac); msg.value = 'pairing ' + mac + '…' }
  catch (e) { msg.value = 'pair failed: ' + e }
}
const stopPair = async () => {
  try { await plateLink.stopPairing(); msg.value = 'pairing off' }
  catch (e) { msg.value = 'cmd failed: ' + e }
}
const plates = async (s: 0 | 1) => {
  try { await plateLink.setPlates(s); msg.value = 'sent plates ' + (s ? 'UP' : 'DOWN') }
  catch (e) { msg.value = 'cmd failed: ' + e }
}
const reset = async () => {
  const a = await alertController.create({
    header: 'Factory reset master?',
    message: 'Wipes all edge pairings on this master and restarts it.',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Reset', role: 'destructive', handler: async () => {
        try { await plateLink.factoryReset(); msg.value = 'reset sent — master restarting' } catch (e) { msg.value = '' + e }
      } },
    ],
  })
  await a.present()
}

// "1200" ms -> "1.2s ago"; -1 -> "never"
const ageText = (age: number) => age < 0 ? 'never' : (age / 1000).toFixed(1) + 's ago'
const ageClass = (age: number) => (age < 0 || age > 10000) ? 'bad' : 'ok'

// colour the verdicts: green for good, red for bad, neutral otherwise
const flipClass = (f: string) => f === 'ok' ? 'ok' : (f === 'failed' || f === 'nohw') ? 'bad' : ''
const testClass = (t: string) => t === 'pass' ? 'ok' : t === 'fail' ? 'bad' : ''

const dismiss = async () => { await disconnect(); modalController.dismiss() }
onUnmounted(() => { if (poll) clearInterval(poll); plateLink.disconnect() })
</script>

<style scoped>
.hint { color: var(--ion-color-medium); font-size: 13px; }
.warn { color: var(--ion-color-danger); font-size: 14px; margin: 12px 0; }
.stat { margin: 10px 0; }
.stat .row { display: flex; justify-content: space-between; padding: 4px 2px; border-bottom: 1px solid var(--ion-color-light); }
.on { color: var(--ion-color-success); }
.bad { color: var(--ion-color-danger); }
.ok { color: var(--ion-color-success); }
.cal { padding: 4px 14px 12px; border-bottom: 1px solid var(--ion-color-light); }
.cal .row { display: flex; justify-content: space-between; padding: 2px 0; }
.calbtns { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
</style>
