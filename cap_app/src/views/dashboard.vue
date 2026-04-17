<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Dashboard</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
        <div style="display: flex; gap: 1px;">
          <div style="flex: 1"><Pie :data="DchartData" :options="DchartOptions"/><p>{{ totalDay }}/100</p></div>
          <div style="flex: 1"><Pie :data="NchartData" :options="NchartOptions"/><p>{{ totalNight }}/100</p></div>
          <div style="flex: 1"><Pie :data="TchartData" :options="TchartOptions"/><p>{{ total }}/100</p></div>
        </div>
        <!-- <p>{{ status }}</p>
        <p>day {{ totalDay }}</p>
        <p>night {{ totalNight }}</p>
        <p>sum {{ total }}</p> -->
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, onIonViewDidEnter } from '@ionic/vue'
import { CapacitorHttp } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js'

const API_URL = import.meta.env.VITE_API_URL
const status = ref('loading...')
const totalDay = ref('')
const totalNight = ref('')
const total = ref('')

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
  DchartData.value = { ...DchartData.value, datasets: [{ ...DchartData.value.datasets[0], data: [day, Math.max(0, 100 - day)] }] }
  NchartData.value = { ...NchartData.value, datasets: [{ ...NchartData.value.datasets[0], data: [night, Math.max(0, 100 - night)] }] }
  TchartData.value = { ...TchartData.value, datasets: [{ ...TchartData.value.datasets[0], data: [tot, Math.max(0, 100 - tot)] }] }
}
ChartJS.register(ArcElement, Tooltip, Legend, Title)

const makeChart = (label: string, color: string) => ref({
  // labels: [label, 'Remaining'],
  datasets: [{ data: [0, 100], backgroundColor: [color, '#e0e0e0'] }]
})
const makeOptions = (title: string) => ({
  responsive: true,
  // plugins: { legend: { position: 'top' as const }, title: { display: true, text: title } }
  plugins: {title: { display: true, text: title } }
})

const DchartData = makeChart('Day', '#FFD700')
const NchartData = makeChart('Night', '#1a1a2e')
const TchartData = makeChart('Total', '#4CAF50')
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
      const response = await CapacitorHttp.post({
        url: `${API_URL}/api/trips/push_trip`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        data: { trip },
      })
      if (response.status === 200) trip.synced = true
    }
    await Preferences.set({ key: 'trips', value: JSON.stringify(trips) })
}


const load_dasbord = async () => {
  uploadTrips()
  updateHours()
}

onIonViewDidEnter(load_dasbord)
</script> 