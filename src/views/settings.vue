<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <!-- TODO: supervisors section -->
       <h2>Add car</h2>
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
    <ion-button color="danger" fill="outline" @click="deleteAccount">Delete Account</ion-button>

    <ion-list>
      <ion-item button router-link="/privacy">
        <ion-label>Privacy Policy</ion-label>
      </ion-item>
      <ion-item button router-link="/terms">
        <ion-label>Terms of Use</ion-label>
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
  IonToggle,
  IonNote,
  modalController,
  alertController,
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import { Preferences } from '@capacitor/preferences'
import { api } from './classes/api'
import CarFormModal from './CarFormModal.vue'
import SvFormModal from './SvFormModal.vue'
import { Capacitor } from '@capacitor/core'
import { carsStore, type Car } from './classes/cars'
import { svsStore, type Sv } from './classes/svs'
import { aiPrefsStore, AI_PREF_FIELDS, type AiPrefs } from './classes/aiPrefs'
import type { ToggleCustomEvent } from '@ionic/vue'

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
type LocalTrip = { synced?: boolean }

// how many locally-stored drives haven't made it to the cloud yet
async function countUnsyncedTrips(): Promise<number> {
  const { value } = await Preferences.get({ key: 'trips' })
  const trips = JSON.parse(value ?? '[]') as LocalTrip[]
  return trips.filter((t) => !t.synced).length
}

// push any unsynced drives to the backend. returns true only if everything synced.
async function pushUnsyncedTrips(): Promise<boolean> {
  const { value: tripsRaw } = await Preferences.get({ key: 'trips' })
  const trips = JSON.parse(tripsRaw ?? '[]') as LocalTrip[]
  try {
    for (const trip of trips) {
      if (trip.synced) continue
      const response = await api.post('/api/trips/push_trip', { trip })
      if (response.status === 200) trip.synced = true
      else return false
    }
    return true
  } catch {
    return false
  } finally {
    // persist whatever managed to sync so a partial upload isn't lost
    await Preferences.set({ key: 'trips', value: JSON.stringify(trips) })
  }
}

// wipe local data on sign-out, but keep the "seen the intro" flag so the
// welcome carousel doesn't replay every time the same person logs back in
async function clearKeepingIntro() {
  const { value: seenIntro } = await Preferences.get({ key: 'hasSeenIntro' })
  await Preferences.clear()
  if (seenIntro) await Preferences.set({ key: 'hasSeenIntro', value: seenIntro })
}

async function deleteAccount() {
  if (!navigator.onLine) {
    alert("you need to be online to delete your account")
    return
  }
  const alertEl = await alertController.create({
    header: 'Delete account?',
    message: 'This permanently deletes your account and all your trips, GPS routes, cars, supervisors and AI chats. It cannot be undone. Enter your password to confirm.',
    inputs: [{ name: 'password', type: 'password', placeholder: 'Password' }],
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Delete forever', role: 'destructive' },
    ],
  })
  await alertEl.present()
  const { role, data } = await alertEl.onWillDismiss()
  if (role !== 'destructive') return

  const password = data?.values?.password
  if (!password) {
    alert("enter your password to delete your account")
    return
  }
  const res = await api.delete('/api/account', { password })
  if (res.status !== 200) {
    if (res.status === 429) alert("too many attempts, wait a minute and try again")
    else if (res.data?.message === 'invalid credentials') alert("wrong password, account not deleted")
    else alert("couldn't delete your account, try again")
    return
  }
  await Preferences.clear()
  router.push("/")
}

async function signOut(){
  const unsynced = await countUnsyncedTrips()

  // offline: we can't sync, so warn before wiping anything that hasn't uploaded
  if (!navigator.onLine) {
    if (unsynced > 0) {
      const ok = confirm(
        `You're offline and ${unsynced} drive(s) haven't been uploaded yet. ` +
        `Signing out will permanently delete them. Sign out anyway?`
      )
      if (!ok) return
    }
    await clearKeepingIntro()
    router.push("/")
    return
  }

  // online: sync first so nothing is lost on wipe
  if (unsynced > 0) {
    const synced = await pushUnsyncedTrips()
    if (!synced) {
      const force = confirm(
        "Some drives couldn't be uploaded. Signing out now will permanently " +
        "delete the unsaved drives. Sign out anyway?"
      )
      if (!force) return
    }
  }

  // clear the server-side httpOnly auth cookie (web); Preferences.clear covers native
  try { await api.post('/api/logout') } catch { /* sign out locally regardless */ }
  await Preferences.clear()
  router.push("/")
}
</script>

<style scoped>
h2 {
  margin: 20px 16px 8px;
  font-size: 18px;
}

ion-button {
  margin: 8px 16px;
}
</style>
