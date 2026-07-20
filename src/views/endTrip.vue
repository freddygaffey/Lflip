<!-- this file was co authored with ai -->
<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>End Trip</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">

      <ion-item>
        <ion-label>End odometer</ion-label>
        <ion-input ref="odoInput" v-model="endOdo" type="text" inputmode="numeric" placeholder="e.g. 12345"></ion-input>
      </ion-item>

      <ion-segment v-model="mode" class="mode-switch">
        <ion-segment-button value="day">
          <ion-label>Day</ion-label>
        </ion-segment-button>
        <ion-segment-button value="night">
          <ion-label>Night</ion-label>
        </ion-segment-button>
      </ion-segment>

      <!-- this does padding for the toggles -->
      <div> <p></p> </div> 

      <ion-item>
        <ion-label>Weather</ion-label>
        <ion-select v-model="weather" placeholder="Select">
          <ion-select-option value="sunny">Sunny</ion-select-option>
          <ion-select-option value="cloudy">Cloudy</ion-select-option>
          <ion-select-option value="rain">Rain</ion-select-option>
          <ion-select-option value="fog">Fog</ion-select-option>
        </ion-select>
        <ion-note slot="end" v-if="weatherLoading">Detecting...</ion-note>
      </ion-item>

      <ion-button expand="block" class="ion-margin-top" @click="save" :disabled="!endOdo">Save Trip</ion-button>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonItem, IonLabel, IonInput, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonNote, onIonViewDidEnter } from '@ionic/vue'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Preferences } from '@capacitor/preferences'
import { Geolocation } from '@capacitor/geolocation'
import { CapacitorHttp } from '@capacitor/core'
import { api } from './classes/api'

const router = useRouter()
const endOdo = ref('')
const odoInput = ref<InstanceType<typeof IonInput> | null>(null)

// focus the odometer field once the page transition settles
onIonViewDidEnter(() => {
  setTimeout(() => odoInput.value?.$el.setFocus(), 250)
})
const isDay = ref(true)
// segment works in 'day'/'night' strings while the rest of the file uses isDay
const mode = computed({
  get: () => (isDay.value ? 'day' : 'night'),
  set: (v) => { isDay.value = v === 'day' },
})
const weather = ref('')
const weatherLoading = ref(false)

// WMO weather code → app weather option
// codes: https://open-meteo.com/en/docs#weathervariables
function mapWeatherCode(code: number): string {
  if (code === 0) return 'sunny'
  if (code <= 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51) return 'rain'
  return 'cloudy'
}

const detectWeather = async () => {
  weatherLoading.value = true
  try {
    const pos = await Geolocation.getCurrentPosition()
    const { latitude: lat, longitude: lon } = pos.coords
    const res = await CapacitorHttp.get({
      url: 'https://api.open-meteo.com/v1/forecast',
      params: { latitude: String(lat), longitude: String(lon), current: 'weather_code,is_day' },
    })
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
    weather.value = mapWeatherCode(data.current.weather_code)
    isDay.value = data.current.is_day === 1
  } catch {
    // leave weather blank if detection fails — user selects manually
  } finally {
    weatherLoading.value = false
  }
}

type GpsPoint = { time: number, lat: number, lon: number }
type Trip = { gps?: GpsPoint[], start_odo: number, end_odo?: number }

function haversine(p1: [number, number], p2: [number, number]): number {
  const [lat1, lon1] = p1
  const [lat2, lon2] = p2
  const R = 6371.0
  const phi1 = lat1 * Math.PI / 180
  const phi2 = lat2 * Math.PI / 180
  const dphi = (lat2 - lat1) * Math.PI / 180
  const dlambda = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dphi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function calculateEndOdo(trip: Trip): number {
  const points = trip.gps ?? []
  let dist = 0
  for (let i = 0; i < points.length - 1; i++) {
    dist += haversine([points[i].lat, points[i].lon], [points[i + 1].lat, points[i + 1].lon])
  }
  return trip.start_odo + dist
}

// def calculate_end_odo(trip):
//   points = trip.get("gps", [])
//   dist = 0
//   for i in range(len(points) - 1):
//     p1 = (points[i]["lat"], points[i]["lon"])
//     p2 = (points[i+1]["lat"], points[i+1]["lon"])
//     dist += haversine(p1, p2)
//   return trip["start_odo"] + dist
//
// def haversine(p1, p2):
//   lat1, lon1 = p1
//   lat2, lon2 = p2
//   R = 6371.0  # Earth radius in kilometers
//
//   # Convert degrees to radians
//   phi1 = math.radians(lat1)
//   phi2 = math.radians(lat2)
//   dphi = math.radians(lat2 - lat1)
//   dlambda = math.radians(lon2 - lon1)
//
//   # Haversine formula
//   a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
//   c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
//
//   return R * c  # Distance in kilometers

async function prefillEndOdo() {
  const { value } = await Preferences.get({ key: 'trips' })
  const trips: Trip[] = JSON.parse(value ?? '[]')
  const current = trips[trips.length - 1]
  if (!current) return
  const computed = calculateEndOdo(current)
  endOdo.value = String(Math.round(computed * 10) / 10)
}

onMounted(() => {
  prefillEndOdo()
  detectWeather()
})

const save = async () => {
  const { value: tripsRaw } = await Preferences.get({ key: 'trips' })
  const trips = JSON.parse(tripsRaw ?? '[]')
  const current = trips[trips.length - 1]
  const start_odo = current.start_odo
  if (start_odo > parseFloat(endOdo.value)) {
    alert(`The end odometer you entered is before the trip's start odometer (${start_odo.toLocaleString()}). Please enter a valid odometer reading.`)
    return
  }
  current.end_odo = parseFloat(endOdo.value)
  current.day = isDay.value
  current.day_night = isDay.value ? 'day' : 'night'

  current.weather = weather.value
  if (!weather.value) {
    current.weather = 'sunny'
    weather.value = 'sunny'
  }

  if (current.end_time == null) {
    current.end_time = Date.now()
  }
  await Preferences.set({ key: 'trips', value: JSON.stringify(trips) })

  if (navigator.onLine) {
    type LocalTrip = { synced?: boolean }
    const unsynced = (trips as LocalTrip[]).filter((trip) => !trip.synced)
    for (const trip of unsynced) {
      const response = await api.post('/api/trips/push_trip', { trip })
      if (response.status === 200) trip.synced = true
      else {trips.synced = false}
    }
    await Preferences.set({ key: 'trips', value: JSON.stringify(trips) })
  }

  router.replace('/tabs/startTrip')
}
</script>
