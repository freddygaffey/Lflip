<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <!-- TODO: supervisors section -->
       <h2>Add Car</h2>
       <ion-list>
        <ion-item
          v-for="car in cars"
          :key="car.id"
          button
          @click="onCarClick(car)"
        >
          <ion-label>{{ car.nickname }}</ion-label>
        </ion-item>
        <ion-item button @click="onCarClick(null)">
          <ion-label>Click to add car</ion-label>
        </ion-item>
       </ion-list>
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
  modalController,
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import { Preferences } from '@capacitor/preferences'
import { CapacitorHttp } from '@capacitor/core'
import CarFormModal from './CarFormModal.vue'

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

async function onCarClick(car: Car | null) {
  const model = await modalController.create({
    component: CarFormModal,
    componentProps: { car }
  })
  await model.present()
  const { data, role } = await model.onWillDismiss()
  if (role == 'save') {
    if (car) Object.assign(car,data)
    else cars.value.push(data)
  }
  else if (role == 'delete' && car) {
    cars.value = cars.value.filter(c => c.id != car.id)
  }
}

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
