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
        <div class="row"><span>Pairing mode</span><b :class="{ on: st.pairing }">{{ st.pairing ? 'ON (listening)' : 'off' }}</b></div>
        <div class="row"><span>Paired edges</span><b :class="{ bad: st.edges === 0 }">{{ st.edges }}</b></div>
      </div>
      <p v-else class="hint">Reading status…</p>

      <!-- per-edge table -->
      <template v-if="st && st.e.length">
        <ion-list-header><ion-label>Edges</ion-label></ion-list-header>
        <ion-item v-for="e in st.e" :key="e.i" lines="full">
          <ion-label>
            <h3>#{{ e.i }} · {{ e.mac }}</h3>
            <p>
              last poll: <b :class="ageClass(e.age)">{{ ageText(e.age) }}</b>
              · batt: {{ e.mv }}mV · state: {{ e.cur ? 'UP' : 'DOWN' }}
            </p>
          </ion-label>
        </ion-item>
      </template>

      <p v-if="st && st.edges === 0" class="warn">
        ⚠️ No edges are paired — that's why plates don't move even though the app connects.
        Tap <b>Enter pairing</b> below, then press the button on each edge board to pair it.
      </p>

      <ion-list-header><ion-label>Controls</ion-label></ion-list-header>
      <ion-button expand="block" :color="st && st.pairing ? 'success' : 'primary'" @click="pair">
        {{ st && st.pairing ? 'Pairing… (tap edge buttons)' : 'Enter pairing (60s)' }}
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
  IonList, IonListHeader, IonItem, IonLabel,
} from '@ionic/vue'
import { plateLink, type PlateStatus } from './classes/plates'

const status = plateLink.status
const connected = plateLink.connected

const scanning = ref(false)
const found = ref<{ deviceId: string; name?: string }[]>([])
const st = ref<PlateStatus | null>(null)
const msg = ref('')
let poll: ReturnType<typeof setInterval> | null = null

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
  await plateLink.disconnect()
}

const pair = async () => {
  try { await plateLink.enterPairing(); msg.value = 'pairing on — press the button on each edge now' }
  catch (e) { msg.value = 'cmd failed: ' + e }
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
</style>
