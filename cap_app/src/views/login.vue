<template>
    <ion-page>
      <ion-header>
        <ion-toolbar>
          <ion-title>Sign In</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-input v-model="email" placeholder="email" type="email"></ion-input>
        <ion-input v-model="password" placeholder="password" type="password"></ion-input>
        <ion-button @click="signIn">sign in</ion-button>
        <ion-button router-link="/register">Go to register</ion-button>
      </ion-content>
    </ion-page>
  </template>
  
  <script setup lang="ts">
import { IonButton, IonInput, IonContent, IonPage, IonHeader, IonToolbar, IonTitle } from '@ionic/vue';
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { CapacitorHttp } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { onMounted } from 'vue';

const API_URL = import.meta.env.VITE_API_URL
const router = useRouter()
const email = ref('')
const password = ref('')
const isAuth = async () => {
  const { value: token } = await Preferences.get({ key: 'auth_token' })
  const response = await CapacitorHttp.post({
    url: `${API_URL}/api/dashboard`,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  })
 console.log('login response', response.status, response.data)
 console.log("found token will redrect you");
 
  if (response.status === 200) {
    router.push('/tabs/dashboard')
  }
}

onMounted(isAuth)
const signIn = async () => {
  const response = await CapacitorHttp.post({
    url: `${API_URL}/api/login`,
    headers: { 'Content-Type': 'application/json' },
    data: { email: email.value, password: password.value }
  })
  console.log('login response', response.status, response.data)
  if (response.status === 200) {
    await Preferences.set({ key: 'auth_token', value: response.data.token })
    router.push('/tabs/dashboard')
  }
}
</script>