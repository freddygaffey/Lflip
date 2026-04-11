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

const router = useRouter()
const email = ref('')
const password = ref('')

const signIn = async () => {
  const response = await fetch('http://localhost:5001/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.value, password: password.value }),
    credentials: 'include'
  })
  const data = await response.json()
  console.log('login response', response.status, data)
  if (response.ok) {
    router.push('/tabs/dashboard')
  }
}
</script>