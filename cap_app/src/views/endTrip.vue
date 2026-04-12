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
        <ion-label>End Odometer (km)</ion-label>
        <ion-input v-model="endOdo" type="text" inputmode="numeric" placeholder="e.g. 12345"></ion-input>
      </ion-item>

      <ion-item>
        <ion-label>{{ isDay ? 'Day' : 'Night' }}</ion-label>
        <ion-toggle v-model="isDay" slot="end"></ion-toggle>
      </ion-item>

      <ion-item>
        <ion-label>Weather</ion-label>
        <ion-select v-model="weather" placeholder="Select">
          <ion-select-option value="sunny">Sunny</ion-select-option>
          <ion-select-option value="cloudy">Cloudy</ion-select-option>
          <ion-select-option value="rain">Rain</ion-select-option>
          <ion-select-option value="fog">Fog</ion-select-option>
        </ion-select>
      </ion-item>

      <ion-button expand="block" class="ion-margin-top" @click="save">Save Trip</ion-button>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonItem, IonLabel, IonInput, IonToggle, IonSelect, IonSelectOption } from '@ionic/vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Preferences } from '@capacitor/preferences'

const router = useRouter()
const endOdo = ref('')
const isDay = ref(true)
const weather = ref('')

const save = async () => {
  const { value } = await Preferences.get({ key: 'trips' })
  const trips = JSON.parse(value ?? '[]')
  const current = trips[trips.length - 1]
  current.end_odo = parseFloat(endOdo.value)
  current.day = isDay.value
  current.weather = weather.value
  await Preferences.set({ key: 'trips', value: JSON.stringify(trips) })
  // TODO: send to backend
  router.push('/tabs/dashboard')
}
</script>
