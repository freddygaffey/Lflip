<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Debug</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-button @click="signOut" color="danger">Sign out</ion-button>
      <ion-button @click="seedTrips" color="warning">Seed Test Data</ion-button>
      <ion-button @click="deleteTrips" color="danger">Delete All Trips</ion-button>
      <ion-button @click="deleteCars" color="danger">Delete All Cars</ion-button>
      <ion-button @click="showRawTrips" color="medium">Show raw trips</ion-button>
      <ion-button @click="setServerToTrue" color="medium">overite trips</ion-button>
      <ion-button @click="showAllPrefs" color="medium">Show all preferences</ion-button>
      <pre v-if="rawTripsText" class="raw-trips">{{ rawTripsText }}</pre>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButton } from '@ionic/vue'
import { useRouter } from 'vue-router'
import { Preferences } from '@capacitor/preferences'
import { CapacitorHttp } from '@capacitor/core'

const API_URL = import.meta.env.VITE_API_URL
const router = useRouter()
const rawTripsText = ref('')

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
  const { value: token } = await Preferences.get({ key: 'auth_token' })
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }

  const svRes = await CapacitorHttp.post({
    url: `${API_URL}/api/sv`,
    headers,
    data: { nickname: 'Test Supervisor', licence_no: '1234567' },
  })
  const sv = svRes.data
  const carRes = await CapacitorHttp.post({
    url: `${API_URL}/api/cars`,
    headers,
    data: { nickname: 'Test Car', plate: 'TEST-01' },
  })
  const carRes2 = await CapacitorHttp.post({
    url: `${API_URL}/api/cars`,
    headers,
    data: { nickname: 'Test Car', plate: 'TEST-01' },
  })
  const car = carRes.data
  const car2 = carRes2.data

  await Preferences.set({ key: 'svs', value: JSON.stringify([sv]) })
  await Preferences.set({ key: 'cars', value: JSON.stringify([car, car2]) })

  const now = Date.now()
  const hr = 3600000
  const fakeTrips = [
    { start_time: now - 10 * hr, end_time: now - 7 * hr, start_odo: 100, end_odo: 250, day: true, day_night: 'day', weather: 'sunny', sv_id: 1, car_id: 1, gps: [{ lat: -35.3136, lon: 149.1166, time: now - 10 * hr }], synced: false },
    { start_time: now - 20 * hr, end_time: now - 18 * hr, start_odo: 250, end_odo: 370, day: false, day_night: 'night', weather: 'cloudy', sv_id: 1, car_id: 1, gps: [{ lat: -35.3136, lon: 149.1166, time: now - 20 * hr }], synced: false },
    { start_time: now - 30 * hr, end_time: now - 27 * hr, start_odo: 370, end_odo: 520, day: true, day_night: 'day', weather: 'rain', sv_id: 1, car_id: 1, gps: [{ lat: -35.3136, lon: 149.1166, time: now - 30 * hr }], synced: false },
    { start_time: now - 40 * hr, end_time: now - 38 * hr, start_odo: 520, end_odo: 630, day: true, day_night: 'day', weather: 'sunny', sv_id: 1, car_id: 1, gps: [{ lat: -35.3136, lon: 149.1166, time: now - 40 * hr }], synced: false },
    { start_time: now - 50 * hr, end_time: now - 48 * hr, start_odo: 630, end_odo: 740, day: false, day_night: 'night', weather: 'fog', sv_id: 1, car_id: 1, gps: [{ lat: -35.3136, lon: 149.1166, time: now - 50 * hr }], synced: false },
  ]
  await Preferences.set({ key: 'trips', value: JSON.stringify(fakeTrips) })
  alert(`Seeded SV id=${sv.id}, Car id=${car.id}, and 5 trips (local only, synced: false).`)
}
const setServerToTrue = async () => {
  const { value: token } = await Preferences.get({ key: 'auth_token' })
  const r = await CapacitorHttp.get({
    url: `${API_URL}/api/trips`,
    headers: { 'Authorization': `Bearer ${token}` }
  })
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
  const { value: token } = await Preferences.get({ key: 'auth_token' })
  await CapacitorHttp.delete({
    url: `${API_URL}/api/cars`,
    headers: { 'Authorization': `Bearer ${token}` }
  })
  alert('All cars deleted!')
}

const deleteTrips = async () => {
  const { value: token } = await Preferences.get({ key: 'auth_token' })
  await Preferences.remove({ key: 'trips' })
  await CapacitorHttp.delete({
    url: `${API_URL}/api/trips`,
    headers: { 'Authorization': `Bearer ${token}` }
  })
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
