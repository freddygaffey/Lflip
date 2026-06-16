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
          <ion-label>{{ sv.full_name }}</ion-label>
        </ion-item>
        <ion-item button @click="onSvClick(null)">
          <ion-label>Click to add supervisor</ion-label>
        </ion-item>
       </ion-list>

       <h2>What the assistant can access</h2>
       <ion-list>
        <ion-item lines="none">
          <ion-note>Choose which of your data the AI assistant is allowed to use when answering. Everything is off until you turn it on.</ion-note>
        </ion-item>
        <ion-item v-for="field in AI_PREF_FIELDS" :key="field.key">
          <ion-label class="ion-text-wrap">
            <h3>{{ field.label }}</h3>
            <p>{{ field.description }}</p>
          </ion-label>
          <ion-toggle
            slot="end"
            :checked="aiPrefs[field.key]"
            @ion-change="onPrefToggle(field.key, $event)"
          ></ion-toggle>
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
  IonToggle,
  IonNote,
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
import { aiPrefsStore, AI_PREF_FIELDS, type AiPrefs } from './classes/aiPrefs'
import type { ToggleCustomEvent } from '@ionic/vue'

const API_URL = import.meta.env.VITE_API_URL
const router = useRouter()

const cars = carsStore.cars


async function onCarClick(car: Car | null) {
  if (!navigator.onLine) {
    alert("you need to be online to edit cars")
    return
  }
  const { value } = await Preferences.get({ key: 'simulate_native' })
  const native_override = value === 'true'
  if (!Capacitor.isNativePlatform() && !native_override && car === null) {
    alert("Adding a car pairs it with your L-plate hardware over Bluetooth, which needs the phone app. Open L Flip on your phone to add a car (or enable \"Simulate native\" in debug).")
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
const newSv = ref({ full_name: '', licence_no: ''})

const aiPrefs = aiPrefsStore.prefs

async function onPrefToggle(key: keyof AiPrefs, ev: ToggleCustomEvent) {
  await aiPrefsStore.set(key, ev.detail.checked)
}

onMounted(async () => {
  await aiPrefsStore.load_cache()
  await carsStore.pull_cloud()
  await svsStore.pull_cloud()
  await aiPrefsStore.pull_cloud()
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
