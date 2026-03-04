<template>
    <ion-page>
      <ion-content>
        <ion-input v-model="email" placeholder="email" type="email"></ion-input>
        <ion-input v-model="password" placeholder="password" type="password"></ion-input>
        <ion-button @click="signIn">sign in</ion-button>
        <a href="/register">register</a>
      </ion-content>
    </ion-page>
  </template>
  
  <script setup lang="ts">
import { IonButton, IonInput, IonContent, IonPage } from '@ionic/vue';
import { ref } from 'vue'

const email = ref('')
const password = ref('')

const signIn = async () => {
  const response = await fetch('http://127.0.0.1:5000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.value, password: password.value }),
  })
  const data = await response.json()
  if (data.jwt) localStorage.setItem('token', data.jwt)
}
</script>