<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Dashboard</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
        <p>{{ displayData }}</p>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle } from '@ionic/vue'
import { CapacitorHttp } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const API_URL = import.meta.env.VITE_API_URL
const displayData = ref('loading...')

onMounted(async () => {
  const { value: token } = await Preferences.get({ key: 'auth_token' })
  const response = await CapacitorHttp.get({
    url: `${API_URL}/api/trips`,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  })
  if (response.status === 200) {
    displayData.value = response.data
  } else {
    displayData.value = 'auth failed: ' + response.status
  }
})
</script>
