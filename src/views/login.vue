<template>
    <ion-page>
      <ion-header>
        <ion-toolbar>
          <ion-title>Sign In</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <div class="auth-card">
          <ion-list lines="none" class="auth-list">
            <ion-item>
              <ion-input v-model="email" label="Email" label-placement="stacked" placeholder="you@example.com" type="email"></ion-input>
            </ion-item>
            <ion-item>
              <ion-input v-model="password" label="Password" label-placement="stacked" placeholder="••••••••" type="password"></ion-input>
            </ion-item>
          </ion-list>

          <ion-button expand="block" class="ion-margin-top" @click="signIn">Sign in</ion-button>
          <ion-button expand="block" fill="clear" router-link="/register">Create an account</ion-button>

          <p class="auth-message" v-if="passOk">{{ passOk }}</p>
        </div>
     </ion-content>
    </ion-page>
  </template>
  
  <script setup lang="ts">
import { IonButton, IonInput, IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonList, IonItem, onIonViewWillEnter } from '@ionic/vue';
import { ref, warn } from 'vue'
import { useRouter } from 'vue-router'
import { CapacitorHttp } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { carsStore } from './classes/cars';
import { svsStore } from './classes/svs';

const API_URL = import.meta.env.VITE_API_URL
const router = useRouter()
const email = ref('')
const password = ref('')
const passOk = ref('')

const isAuth = async () => {
  const { value: token } = await Preferences.get({ key: 'auth_token' })
  const response = await CapacitorHttp.post({
    url: `${API_URL}/api/dashboard`,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  })
 console.log('login response', response.status, response.data)
 console.log("found token will redirect you");
 
  if (response.status === 200) {
    fetchState()
    router.push('/tabs/dashboard')
  }
}
const fetchState = async () => {
  const { value: token } = await Preferences.get({ key: 'auth_token' })
  if (!token) return
  const response = await CapacitorHttp.get({
    url: `${API_URL}/api/state`,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  })
  console.log('stats response', response.status, response.data)
  if (response.status !== 200) return
  const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data
  await Preferences.set({ key: 'total', value: String(data.total) })
  await Preferences.set({ key: 'night', value: String(data.night) })
}
onIonViewWillEnter(isAuth)

const signIn = async () => {
  const response = await CapacitorHttp.post({
    url: `${API_URL}/api/login`,
    headers: { 'Content-Type': 'application/json' },
    data: { email: email.value, password: password.value }
  })
  console.log('login response', response.status, response.data)
  passOk.value = response.data.message
  if (response.status === 200) {
    await Preferences.set({ key: 'auth_token', value: response.data.token })
    await fetchState()
    router.push('/tabs/dashboard')
  }
  // this will do offline cashing
  carsStore.pull_cloud()
  svsStore.pull_cloud()
}
</script>

<style scoped>
.auth-card {
  max-width: 420px;
  margin: 0 auto;
  padding-top: 24px;
}

.auth-list {
  background: transparent;
}

.auth-message {
  text-align: center;
  color: var(--ion-color-danger);
  margin-top: 12px;
}
</style>