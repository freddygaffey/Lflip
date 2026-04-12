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
        <ion-note slot="end" v-if="weatherLoading">Detecting...</ion-note>
      </ion-item>

      <ion-button expand="block" class="ion-margin-top" @click="save" :disabled="!endOdo">Save Trip</ion-button>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonItem, IonLabel, IonInput, IonToggle, IonSelect, IonSelectOption, IonNote } from '@ionic/vue'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Preferences } from '@capacitor/preferences'
import { Geolocation } from '@capacitor/geolocation'

const router = useRouter()
const endOdo = ref('')
const isDay = ref(true)
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
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,is_day`
    )
    const data = await res.json()
    weather.value = mapWeatherCode(data.current.weather_code)
    isDay.value = data.current.is_day === 1
  } catch {
    // leave weather blank if detection fails — user selects manually
  } finally {
    weatherLoading.value = false
  }
}

onMounted(detectWeather)

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
