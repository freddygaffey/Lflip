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
       <h2>Add licenced driver</h2>
       <ion-list>
        <ion-item
          v-for="sv in svs"
          :key="sv.id"
          button
          @click="onSvClick(sv)"
        >
          <ion-label>{{ sv.nickname }}</ion-label>
        </ion-item>
        <ion-item button @click="onSvClick(null)">
          <ion-label>Click to add supervisor</ion-label>
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
import SvFormModal from './SvFormModal.vue'
import { Capacitor } from '@capacitor/core'

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
  if (!Capacitor.isNativePlatform() && car === null) {
    alert("sorry you cant make a car you need to be on a phone");
    return;
  }
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

type Sv = {
  id: number
  nickname: string
  licence_no: number
}
const svs = ref<Sv[]>([])
const newSv = ref({ nickname: '', licence_no: ''})

onMounted(async () => {
  // this function is ai genarated
  const { value: token } = await Preferences.get({ key: 'auth_token' })
  const headers = { Authorization: `Bearer ${token}` }

  const carsRes = await CapacitorHttp.get({ url: `${API_URL}/api/cars`, headers })
  if (carsRes.status === 200) {
    cars.value = typeof carsRes.data === 'string' ? JSON.parse(carsRes.data) : carsRes.data
    await Preferences.set({ key: 'cars', value: JSON.stringify(cars.value) })
  }

  const svRes = await CapacitorHttp.get({ url: `${API_URL}/api/sv`, headers })
  if (svRes.status === 200) {
    svs.value = typeof svRes.data === 'string' ? JSON.parse(svRes.data) : svRes.data
    await Preferences.set({ key: 'svs', value: JSON.stringify(svs.value) })
  }
})

async function onSvClick(sv: Sv | null) {
  const model = await modalController.create({
    component: SvFormModal,
    componentProps: { sv }
  })
  await model.present()
  const { data, role } = await model.onWillDismiss()
  if (role == 'save') {
    if (sv) Object.assign(sv,data)
    else svs.value.push(data)
  }
  else if (role == 'delete' && sv) {
    svs.value = svs.value.filter(s => s.id != sv.id)
  }
}
</script>

<style scoped>
</style>
