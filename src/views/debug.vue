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
import { useRouter } from 'vue-router'
import { Preferences } from '@capacitor/preferences'
import { api } from './classes/api'
import MasterDebugModal from './MasterDebugModal.vue'

const router = useRouter()
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
  router.push('/')
}

const seedTrips = async () => {
  // wipe existing trips so old single-point routes don't get pulled back alongside the new ones
  await api.delete('/api/trips')
  await Preferences.remove({ key: 'trips' })

  const mumRes = await api.post('/api/sv', { full_name: 'Sarah Whitman', licence_no: '0481726' })
  const dadRes = await api.post('/api/sv', { full_name: 'Mark Whitman', licence_no: '0392845' })
  const mum = mumRes.data
  const dad = dadRes.data
  // no apostrophes: the API HTML-escapes strings, so "Dad's" would display as "Dad&#39;s"
  const carRes = await api.post('/api/cars', { nickname: 'Mums Corolla', plate: 'YMC42N' })
  const carRes2 = await api.post('/api/cars', { nickname: 'Dads Hilux', plate: 'CXR88K' })
  const car = carRes.data
  const car2 = carRes2.data

  await Preferences.set({ key: 'svs', value: JSON.stringify([mum, dad]) })
  await Preferences.set({ key: 'cars', value: JSON.stringify([car, car2]) })

  const now = Date.now()
  const hr = 3600000

  // build a wandering route of `n` points starting near Canberra, with varying
  // speed so the speed-coloured polyline on the trip detail page renders
  const makeGps = (startLat: number, startLon: number, n: number, startTime: number, endTime: number) => {
    const pts = []
    let lat = startLat
    let lon = startLon
    let heading = Math.random() * Math.PI * 2
    for (let i = 0; i < n; i++) {
      heading += (Math.random() - 0.5) * 0.6 // gently change direction
      const step = 0.0012 // ~120 m per point
      lat += Math.cos(heading) * step
      lon += Math.sin(heading) * step
      // speed in km/h: a sine wave (stops + open road) plus jitter
      const speed = Math.max(0, 45 + 35 * Math.sin(i / 3) + (Math.random() - 0.5) * 15)
      pts.push({
        lat,
        lon,
        time: Math.round(startTime + ((endTime - startTime) * i) / (n - 1)),
        speed: Math.round(speed),
      })
    }
    return pts
  }

  const fakeTrips = [
    { id: 9001, start_time: now - 10 * hr, end_time: now - 9.3 * hr, start_odo: 48210, end_odo: 48235, day: true, day_night: 'day', weather: 'sunny', sv_id: mum.id, car_id: car.id, gps: makeGps(-35.3136, 149.1166, 40, now - 10 * hr, now - 9.3 * hr), synced: false },
    { id: 9002, start_time: now - 30 * hr, end_time: now - 28.5 * hr, start_odo: 48235, end_odo: 48298, day: false, day_night: 'night', weather: 'cloudy', sv_id: dad.id, car_id: car2.id, gps: makeGps(-35.2820, 149.1280, 50, now - 30 * hr, now - 28.5 * hr), synced: false },
    { id: 9003, start_time: now - 54 * hr, end_time: now - 52.7 * hr, start_odo: 48298, end_odo: 48342, day: true, day_night: 'day', weather: 'rain', sv_id: mum.id, car_id: car.id, gps: makeGps(-35.3400, 149.0900, 45, now - 54 * hr, now - 52.7 * hr), synced: false },
    { id: 9004, start_time: now - 78 * hr, end_time: now - 76 * hr, start_odo: 48342, end_odo: 48421, day: true, day_night: 'day', weather: 'sunny', sv_id: dad.id, car_id: car2.id, gps: makeGps(-35.2500, 149.1000, 60, now - 78 * hr, now - 76 * hr), synced: false },
    { id: 9005, start_time: now - 102 * hr, end_time: now - 100.5 * hr, start_odo: 48421, end_odo: 48468, day: false, day_night: 'night', weather: 'fog', sv_id: mum.id, car_id: car.id, gps: makeGps(-35.3000, 149.1500, 48, now - 102 * hr, now - 100.5 * hr), synced: false },
  ]
  await Preferences.set({ key: 'trips', value: JSON.stringify(fakeTrips) })
  alert(`Seeded Mum (id=${mum.id}), Dad (id=${dad.id}), 2 cars, and 5 trips (local only, synced: false).`)
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
