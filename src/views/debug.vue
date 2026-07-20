<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Debug</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p class="debug-note">Developer tools for testing. Not part of the normal app.</p>

      <ion-button expand="block" @click="toggleDemoMode" :color="demoMode ? 'success' : 'medium'">
        Demo mode: {{ demoMode ? 'ON' : 'OFF' }}
      </ion-button>
      <p class="debug-note">
        {{ demoMode ? 'Full tools unlocked, including ones that change or delete data.'
                    : 'Turn on to unlock demo data, resets and hardware tools.' }}
      </p>

      <h4 class="debug-section">Inspect</h4>
      <ion-button expand="block" @click="showRawTrips" color="medium">View stored trips</ion-button>
      <ion-button expand="block" @click="showAllPrefs" color="medium">View stored data</ion-button>
      <ion-button expand="block" @click="signOut" fill="outline" color="danger">Sign out</ion-button>

      <template v-if="demoMode">
        <h4 class="debug-section">Demo data</h4>
        <ion-button expand="block" @click="seedTrips" color="warning">Load demo data</ion-button>
        <ion-button expand="block" @click="setServerToTrue" color="medium">Pull server trips (overwrite local)</ion-button>

        <h4 class="debug-section">Clear data</h4>
        <ion-button expand="block" @click="deleteTrips" fill="outline" color="danger">Delete all trips</ion-button>
        <ion-button expand="block" @click="deleteCars" fill="outline" color="danger">Delete all cars</ion-button>
        <ion-button expand="block" @click="nukeAllData" color="danger">Clear everything</ion-button>

        <h4 class="debug-section">Hardware &amp; platform</h4>
        <ion-button expand="block" @click="openMasterDebug" color="primary">L-plate master debug</ion-button>
        <ion-button expand="block" @click="toggleSimulateNative" :color="simulateNative ? 'success' : 'medium'">
          Simulate phone app: {{ simulateNative ? 'ON' : 'OFF' }}
        </ion-button>

        <h4 class="debug-section">Other</h4>
        <ion-button expand="block" @click="topUpUsage" color="warning">Reset AI usage limit</ion-button>
        <ion-button expand="block" @click="hitTest" color="medium">Ping test endpoint</ion-button>
      </template>

      <pre v-if="rawTripsText" class="raw-trips">{{ rawTripsText }}</pre>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButton, modalController } from '@ionic/vue'
import { Preferences } from '@capacitor/preferences'
import { api } from './classes/api'
import { seedTestData } from './classes/seed'
import MasterDebugModal from './MasterDebugModal.vue'

const rawTripsText = ref('')
const simulateNative = ref(false)
// demo mode gates the powerful/destructive tools; off by default you only get
// the read-only ones, so it's harder to wipe data by accident
const demoMode = ref(false)

onMounted(async () => {
  const [native, demo] = await Promise.all([
    Preferences.get({ key: 'simulate_native' }),
    Preferences.get({ key: 'demo_mode' }),
  ])
  simulateNative.value = native.value === 'true'
  demoMode.value = demo.value === 'true'
})

const toggleDemoMode = async () => {
  demoMode.value = !demoMode.value
  await Preferences.set({ key: 'demo_mode', value: String(demoMode.value) })
}

const openMasterDebug = async () => {
  const modal = await modalController.create({ component: MasterDebugModal })
  await modal.present()
}

const toggleSimulateNative = async () => {
  simulateNative.value = !simulateNative.value
  await Preferences.set({ key: 'simulate_native', value: String(simulateNative.value) })
}

const topUpUsage = async () => {
  const r = await api.post('/api/ai/reset_usage')
  alert(r.status === 200 ? 'AI usage reset — limit topped up.' : `Failed (${r.status}).`)
}

const hitTest = async () => {
  await api.post('/api/test')
 }

const showAllPrefs = async () => {
  const { keys } = await Preferences.keys()
  const all: Record<string, unknown> = {}
  for (const k of keys) {
    const { value } = await Preferences.get({ key: k })
    try {
      all[k] = value ? JSON.parse(value) : value
    } catch {
      all[k] = value
    }
  }
  console.log('preferences', all)
  rawTripsText.value = JSON.stringify(all, null, 2)
}

const showRawTrips = async () => {
  const { value } = await Preferences.get({ key: 'trips' })
  const raw = value ?? ''
  let parsed: unknown
  try {
    parsed = raw ? JSON.parse(raw) : []
  } catch {
    parsed = raw
  }
  console.log('trips', parsed)
  rawTripsText.value =
    typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)
}

const signOut = async () => {
  await Preferences.remove({ key: 'auth_token' })
  window.location.assign('/')
}

const seedTrips = async () => {
  const r = await seedTestData()
  alert(`Seeded Mum (id=${r.mum.id}), Dad (id=${r.dad.id}), 2 cars, and ${r.tripCount} trips (local only, synced: false).`)
}
const setServerToTrue = async () => {
  const r = await api.get('/api/trips')
  type ServerTrip = {
    id: number
    start_time: number
    end_time: number
    start_odometer: number
    end_odometer: number
    day_night: string
    weather: string
  }
  const serverTrips = (r.data as ServerTrip[]) ?? []
  const localTrips = serverTrips.map((t) => ({
    start_time: t.start_time,
    end_time: t.end_time,
    start_odo: t.start_odometer,
    end_odo: t.end_odometer,
    day: t.day_night === 'day',
    day_night: t.day_night,
    weather: t.weather,
    gps: [],
    synced: true,
  }))
  await Preferences.set({ key: 'trips', value: JSON.stringify(localTrips) })
  alert(`Overwrote local trips with ${localTrips.length} from server.`)
}
const deleteCars = async () => {
  await api.delete('/api/cars')
  alert('All cars deleted!')
}

const nukeAllData = async () => {
  if (!confirm('Nuke ALL data? This deletes every trip, car, supervisor, and local pref.')) return
  await Promise.all([
    api.delete('/api/trips'),
    api.delete('/api/cars'),
    api.delete('/api/sv'),
  ])
  const { keys } = await Preferences.keys()
  for (const k of keys) {
    if (k === 'auth_token') continue
    await Preferences.remove({ key: k })
  }
  alert('Nuked. Server data and local prefs cleared (auth_token kept).')
  // the cars/supervisors lists live in module-level stores that this doesn't
  // touch, so the UI keeps showing the old data. reload to reset them empty
  // (keeps the current route and login since auth_token is preserved).
  window.location.reload()
}

const deleteTrips = async () => {
  await Preferences.remove({ key: 'trips' })
  await api.delete('/api/trips')
  alert('Deleted!')
}
</script>

<style scoped>
.debug-section {
  margin: 20px 0 8px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ion-color-medium);
}
.debug-note {
  margin: 8px 0;
  font-size: 13px;
  color: var(--ion-color-medium);
}
.raw-trips {
  margin: 12px;
  padding: 12px;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--ion-color-light, #f4f5f8);
  border-radius: 8px;
}
</style>
