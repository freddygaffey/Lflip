<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <!-- TODO: cars section -->
      <!-- TODO: supervisors section -->
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonInput,
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import { Preferences } from '@capacitor/preferences'
import { CapacitorHttp } from '@capacitor/core'

const API_URL = import.meta.env.VITE_API_URL
const router = useRouter()

type Car = {
  id: number
  nickname: string
  plate: string | null
  ble_device_name: string | null
  ble_service_uuid: string | null
  has_pairing_secret: boolean
}

const cars = ref<Car[]>([])
const newCar = ref({ nickname: '', plate: '', ble_device_name: '' })

const authHeaders = async () => {
  const { value: token } = await Preferences.get({ key: 'auth_token' })
  return { Authorization: `Bearer ${token}` }
}

// TODO: loadCars — GET /api/cars
// TODO: addCar    — POST /api/cars
// TODO: removeCar — DELETE /api/cars/:id

onMounted(() => {
  // TODO: loadCars()
})
</script>

<style scoped>
</style>
