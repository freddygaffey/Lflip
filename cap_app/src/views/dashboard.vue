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
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, type Ref } from 'vue'
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, onIonViewDidEnter } from '@ionic/vue'
import { CapacitorHttp } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js'
// import { st } from 'vue-router/dist/router-CWoNjPRp.mjs'

const API_URL = import.meta.env.VITE_API_URL
let status = ref('🔄')
const totalDay = ref('')
const totalNight = ref('')
const total = ref('')
const capDay = ref(100)
const capNight = ref(100)
const capTotal = ref(100)

type PieData = { datasets: [{ data: number[]; backgroundColor: string[] }] }
const prefNum = (v: string | null) => parseInt(v ?? '100', 10) || 100
const setRing = (chart: Ref<PieData>, used: number, cap: number) => {
  const ds = chart.value.datasets[0]
  chart.value = { ...chart.value, datasets: [{ ...ds, data: [used, Math.max(0, cap - used)] }] }
}

const updateHours = async () => {
  const trips = JSON.parse((await Preferences.get({ key: "trips" })).value ?? '[]')
  let day = 0.0
  let night = 0.0
  for (const t of trips) {
    if (t.day_night == "day") {
      day += (t.end_time - t.start_time) / 1000 / 3600
    }
    if (t.day_night == "night") {
      night += (t.end_time - t.start_time) / 1000 / 3600
    }
  }
  console.log(day);
  console.log(night);
  console.log(total);
  console.log(trips);
  
  const tot = day + night
  totalDay.value = day.toFixed(2)
  totalNight.value = night.toFixed(2)
  total.value = tot.toFixed(2)
  setRing(DchartData, day, capDay.value)
  setRing(NchartData, night, capNight.value)
  setRing(TchartData, tot, capTotal.value)
}
ChartJS.register(ArcElement, Tooltip, Legend, Title)

const makeChart = (color: string, outOf: string) => ref<PieData>({
  datasets: [{ data: [0, parseInt(outOf, 10) || 100], backgroundColor: [color, '#e0e0e0'] }]
})
const makeOptions = (title: string) => ({
  responsive: true,
  // plugins: { legend: { position: 'top' as const }, title: { display: true, text: title } }
  plugins: {title: { display: true, text: title } }
})
const DchartData = makeChart('#FFD700', '100')
const NchartData = makeChart('#1a1a2e', '100')
const TchartData = makeChart('#4CAF50', '100')

const DchartOptions = makeOptions('Day Hours')
const NchartOptions = makeOptions('Night Hours')
const TchartOptions = makeOptions('Total Hours')

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
  const [{ value: tn }, { value: tt }] = await Promise.all([
    Preferences.get({ key: 'night' }),
    Preferences.get({ key: 'total' }),
  ])
  const t = prefNum(tt),
    n = prefNum(tn),
    d = Math.max(0, t - n) || t
  ;[capTotal.value, capNight.value, capDay.value] = [t, n, d]
  for (const [ch, cap] of [
    [DchartData, d],
    [NchartData, n],
    [TchartData, t],
  ] as [Ref<PieData>, number][])
    setRing(ch, 0, cap)
  await uploadTrips()
  await pullTrips()
  await updateHours()
}

const pullTrips = async () => {
  const { value: token } = await Preferences.get({ key: 'auth_token' })
  const res = await CapacitorHttp.get({
    url: `${API_URL}/api/trips`,
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status !== 200) return
  const remote = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
  const synced = remote.map((t: any) => ({ ...t, synced: true }))
  await Preferences.set({ key: 'trips', value: JSON.stringify(synced) })
}

onIonViewDidEnter(load_dasbord)
</script> 