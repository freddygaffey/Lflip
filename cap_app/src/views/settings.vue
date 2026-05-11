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
    <ion-button @click="signOut">Sign Out</ion-button>
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
import { carsStore, type Car } from './classes/cars'
import { svsStore, type Sv } from './classes/svs'

const API_URL = import.meta.env.VITE_API_URL
const router = useRouter()

const cars = carsStore.cars


async function onCarClick(car: Car | null) {
  if (!navigator.onLine) {
    alert("you need to be online to edit cars")
    return
  }
  if (!Capacitor.isNativePlatform() && car === null) {
    alert("sorry you cant make a car you need to be on a phone");
    return;
  }
  const model = await modalController.create({
    component: CarFormModal,
    componentProps: { car }
  })
  await model.present()
  await model.onWillDismiss()
}

const svs = svsStore.svs
const newSv = ref({ nickname: '', licence_no: ''})

onMounted(async () => {
  await carsStore.pull_cloud()
  await svsStore.pull_cloud()
})

async function onSvClick(sv: Sv | null) {
  if (!navigator.onLine) {
    alert("you need to be online to edit supervisors")
    return
  }
  const model = await modalController.create({
    component: SvFormModal,
    componentProps: { sv }
  })
  await model.present()
  await model.onWillDismiss()
}
async function signOut(){
  if (!navigator.onLine) {
    alert("you need to be online to sign out as it will cause sync isues")
    return
  }
  await Preferences.clear()
  router.push("/")
}
</script>

<style scoped>
</style>
