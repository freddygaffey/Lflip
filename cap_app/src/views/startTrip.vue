<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Log Trip</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-button @click="start">Start</ion-button>
      <ion-button @click="getPos">get poss</ion-button>
      <p>{{ posT }}</p>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
  import { IonButton, IonInput, IonContent, IonPage, IonHeader, IonToolbar, IonTitle } from '@ionic/vue';
  import { Geolocation } from '@capacitor/geolocation'
  import { ref } from 'vue';                                                                       
  const start = async () => {
    console.log("todo")
  }
  const posT = ref('')
  const getPos = async () => {
    await Geolocation.requestPermissions()
    const pos = await Geolocation.getCurrentPosition()
    console.log(pos.coords.latitude, pos.coords.longitude)
    posT.value = `${pos.coords.latitude}, ${pos.coords.longitude}`
  }
</script>
