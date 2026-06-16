<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ trip ? `Trip (${trip.day_night})` : 'Trip' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div v-if="trip">
        <!-- map will go here later -->
        <div class="map-placeholder">Map coming soon</div>

        <ion-card>
          <ion-card-content>
            <p>Date: {{ fmtDate(trip.start_time) }}</p>
            <p>Duration: {{ fmtDuration(trip) }}</p>
            <p>Length: {{ trip.end_odo - trip.start_odo }} km</p>
            <p>Start odo: {{ trip.start_odo }}</p>
            <p>End odo: {{ trip.end_odo }}</p>
            <p>Car: {{ carsStore.get_car_by_id(trip.car_id)?.nickname ?? 'None saved' }}</p>
            <p>Supervising driver: {{ trip.sv_name ?? svsStore.get_sv_by_id(trip.sv_id)?.full_name }}</p>
            <p>Supervising number: {{ trip.sv_licence_no ?? svsStore.get_sv_by_id(trip.sv_id)?.licence_no }}</p>
            <p>Weather: {{ trip.weather }}</p>
          </ion-card-content>
        </ion-card>
      </div>
      <div v-else>
        <p>Trip not found.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonCard, IonCardContent, onIonViewDidEnter } from '@ionic/vue'
import { Preferences } from '@capacitor/preferences'
import { useRoute } from 'vue-router'
import { carsStore } from './classes/cars'
import { svsStore } from './classes/svs'

type Trip = {
  id: number
  start_time: number
  end_time: number
  start_odo: number
  end_odo: number
  day_night: 'day' | 'night'
  weather: string
  car_id: number
  sv_id: number
  sv_name: string | null
  sv_licence_no: string | null
}

const route = useRoute()
const trip = ref<Trip | null>(null)

const fmtDate = (ms: number) => new Date(ms).toLocaleDateString()

const fmtDuration = (t: Trip) => {
  const h = Math.floor((t.end_time - t.start_time) / 3600000)
  const m = String(Math.floor(((t.end_time - t.start_time) / 60000) % 60)).padStart(2, '0')
  return `${h}:${m}`
}

const load = async () => {
  const trips: Trip[] = JSON.parse((await Preferences.get({ key: 'trips' })).value ?? '[]')
  const id = Number(route.params.id)
  trip.value = trips.find((t) => t.id === id) ?? null
  await carsStore.pull_cloud()
  await svsStore.pull_cloud()
}

onIonViewDidEnter(load)
</script>

<style scoped>
.map-placeholder {
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ion-color-light, #f0f0f0);
  border-radius: 8px;
  color: var(--ion-color-medium, #888);
  margin-bottom: 16px;
}
</style>
