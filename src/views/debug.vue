<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Debug</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-button @click="openMasterDebug" color="primary">L-plate master debug</ion-button>
      <ion-button @click="signOut" color="danger">Sign out</ion-button>
      <ion-button @click="seedTrips" color="warning">Seed Test Data</ion-button>
      <ion-button @click="deleteTrips" color="danger">Delete All Trips</ion-button>
      <ion-button @click="deleteCars" color="danger">Delete All Cars</ion-button>
      <ion-button @click="nukeAllData" color="danger">Nuke All Data</ion-button>
      <ion-button @click="showRawTrips" color="medium">Show raw trips</ion-button>
      <ion-button @click="setServerToTrue" color="medium">overite trips</ion-button>
      <ion-button @click="showAllPrefs" color="medium">Show all preferences</ion-button>
      <ion-button @click="topUpUsage" color="warning">Top up AI usage</ion-button>
      <ion-button @click="toggleSimulateNative" :color="simulateNative ? 'success' : 'medium'">
        Simulate native: {{ simulateNative ? 'ON' : 'OFF' }}
      </ion-button>
      <ion-button @click="hitTest" color="medium">hit test</ion-button>
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

onMounted(async () => {
  const { value } = await Preferences.get({ key: 'simulate_native' })
  simulateNative.value = value === 'true'
})

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
}

const deleteTrips = async () => {
  await Preferences.remove({ key: 'trips' })
  await api.delete('/api/trips')
  alert('Deleted!')
}
</script>

<style scoped>
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
