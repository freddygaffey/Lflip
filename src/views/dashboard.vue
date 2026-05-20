<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Dashboard {{ status }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
        <div style="display: flex; gap: 1px;">
          <div style="flex: 1"><Pie :data="DchartData" :options="DchartOptions"/><p>{{ totalDay }}/{{ capDay }}</p></div>
          <div style="flex: 1"><Pie :data="NchartData" :options="NchartOptions"/><p>{{ totalNight }}/{{ capNight }}</p></div>
          <div style="flex: 1"><Pie :data="TchartData" :options="TchartOptions"/><p>{{ total }}/{{ capTotal }}</p></div>
        </div>
        <!-- <p>{{ status }}</p>
        <p>day {{ totalDay }}</p>
        <p>night {{ totalNight }}</p>
        <p>sum {{ total }}</p> -->
        <h2>List of trips</h2>
        <ion-card v-for="(t, i) in trips.slice().reverse()" :key="t.start_time">
          <ion-card-header >
            <ion-card-title>Trip {{ trips.length - i}} {{t.day_night == 'day' ? '☀️' : '🌜' }}</ion-card-title>
            <!-- <ion-card-subtitle>duration {{ Math.floor((t.end_time - t.start_time) / 3600000) }}:{{ String(Math.floor(((t.end_time - t.start_time) / 60000)%60)).padStart(2,0) }}</ion-card-subtitle> -->
          </ion-card-header>
          <ion-card-content>
            <p>Duration: {{ Math.floor((t.end_time - t.start_time) / 3600000) }}:{{ String(Math.floor(((t.end_time - t.start_time) / 60000)%60)).padStart(2,'0') }}</p>
            <p>Length: {{ t.end_odo - t.start_odo }} km</p>
            <p>Start odo: {{ t.start_odo }}</p>
            <p>End odo: {{ t.end_odo }}</p>
            <p>Car: {{ carsStore.get_car_by_id(t.car_id)?.nickname }}</p>
            <p>Supervising driver: {{ svsStore.get_sv_by_id(t.sv_id)?.full_name }}</p>
            <p>Supervising number: {{ svsStore.get_sv_by_id(t.sv_id)?.licence_no }}</p>
            <p>Weather: {{ t.weather }}</p>
            <p></p>
            <!-- <p>{{ t }}</p> -->
          </ion-card-content>
        </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonCard, IonCardHeader, IonCardTitle, IonCardContent, onIonViewDidEnter } from '@ionic/vue'
import { CapacitorHttp } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js'
import { carsStore } from './classes/cars'
import { svsStore } from './classes/svs'

const API_URL = import.meta.env.VITE_API_URL
let status = ref('🔄')
const totalDay = ref('')
const totalNight = ref('')
const total = ref('')
const capDay = ref(90)
const capNight = ref(10)
const capTotal = ref(100)

// carsStore.pull_cloud()
// svsStore.pull_cloud()

ChartJS.register(ArcElement, Tooltip, Legend, Title)

const DchartData = ref({ datasets: [{ data: [0, 90], backgroundColor: ['#FFD700', '#e0e0e0'] }] })
const NchartData = ref({ datasets: [{ data: [0, 10], backgroundColor: ['#1a1a2e', '#e0e0e0'] }] })
const TchartData = ref({ datasets: [{ data: [0, 100], backgroundColor: ['#4CAF50', '#e0e0e0'] }] })

const DchartOptions = { responsive: true, plugins: { title: { display: true, text: 'Day Hours' } } }
const NchartOptions = { responsive: true, plugins: { title: { display: true, text: 'Night Hours' } } }
const TchartOptions = { responsive: true, plugins: { title: { display: true, text: 'Total Hours' } } }

const updateHours = async () => {
  const trips = JSON.parse((await Preferences.get({ key: "trips" })).value ?? '[]')
  let day = 0
  let night = 0
  for (const t of trips) {
    if (t.day_night == "day") day += (t.end_time - t.start_time) / 1000 / 3600
    if (t.day_night == "night") night += (t.end_time - t.start_time) / 1000 / 3600
  }
  const tot = day + night
  totalDay.value = day.toFixed(2)
  totalNight.value = night.toFixed(2)
  total.value = tot.toFixed(2)
  DchartData.value = { datasets: [{ data: [day, Math.max(0, capDay.value - day)], backgroundColor: ['#FFD700', '#e0e0e0'] }] }
  NchartData.value = { datasets: [{ data: [night, Math.max(0, capNight.value - night)], backgroundColor: ['#1a1a2e', '#e0e0e0'] }] }
  TchartData.value = { datasets: [{ data: [tot, Math.max(0, capTotal.value - tot)], backgroundColor: ['#4CAF50', '#e0e0e0'] }] }
}

const uploadTrips = async () => {
  const { value: tripsRaw } = await Preferences.get({ key: 'trips' })
  const trips = JSON.parse(tripsRaw ?? '[]')
  const { value: token } = await Preferences.get({ key: 'auth_token' })
  type LocalTrip = { synced?: boolean }
    const unsynced = (trips as LocalTrip[]).filter((trip) => !trip.synced)
    for (const trip of unsynced) {
      // TODO: FIX: this is kind of a hack but it works should use a try except
      status.value = "📵" 
      const response = await CapacitorHttp.post({
        url: `${API_URL}/api/trips/push_trip`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        data: { trip },
      })
      if (response.status === 200) trip.synced = true
      else {
        return false}
    }
    await Preferences.set({ key: 'trips', value: JSON.stringify(trips) })
    status.value = '✅'
}


const load_dasbord = async () => {
  const { value: tn } = await Preferences.get({ key: 'night' })
  const { value: tt } = await Preferences.get({ key: 'total' })
  const t = parseInt(tt ?? '100', 10) || 100
  const n = parseInt(tn ?? '100', 10) || 100
  const d = Math.max(0, t - n) || t
  capTotal.value = t
  capNight.value = n
  capDay.value = d
  // do all sycing so if go offline later it will still work
  await uploadTrips()
  await pullTrips()
  await svsStore.pull_cloud()
  await carsStore.pull_cloud()
  await updateHours()
}

async function pullTrips() {
  const tokenPref = await Preferences.get({ key: 'auth_token' })
  const token = tokenPref.value

  const res = await CapacitorHttp.get({
    url: `${API_URL}/api/trips`,
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status !== 200) return

  let remote = res.data
  if (typeof remote === 'string') {
    remote = JSON.parse(remote)
  }

  // mark every trip from the server as already synced
  const synced = []
  for (let i = 0; i < remote.length; i++) {
    const trip = remote[i]
    trip.synced = true
    synced.push(trip)
  }

  await Preferences.set({ key: 'trips', value: JSON.stringify(synced) })
  trips.value = synced
}


type GpsPoint = {
  lat: number
  lon: number
  time: number
}

type Trip = {
  start_time: number
  end_time: number
  start_odo: number
  end_odo: number
  day: boolean
  day_night: 'day' | 'night'
  weather: string
  gps: GpsPoint[]
  synced: boolean
  car_id: number
  sv_id: number
}

const trips = ref<Trip[]>([])

onIonViewDidEnter(load_dasbord)
</script> 