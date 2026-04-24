<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Log Trip</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-button @click="start" :disabled="!start_odo">Start</ion-button>
      <ion-input v-model="start_odo" placeholder="start odo (km)" type="text" inputmode="numeric"></ion-input>
      <!-- <ion-button @click="getPos">get poss</ion-button> -->
      <!-- <p>{{ posT }}</p> -->
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
  import { IonButton, IonInput, IonContent, IonPage, IonHeader, IonToolbar, IonTitle } from '@ionic/vue';
  import { Geolocation } from '@capacitor/geolocation'
  import { ref } from 'vue';
  import { Preferences } from '@capacitor/preferences'
  import { useRouter } from 'vue-router';

  const start_odo = ref('')

  const router = useRouter()
  const start = async () => {
    // const { value } = await Preferences.get({key: 'odo'})
    // const odo = parseFloat(value ?? "0")
    // await Preferences.set({
    // key: 'odo',
    // value: String(odo)})


  const newTrip = {
        start_time: Date.now(),
        end_time: null,
        start_odo: parseFloat(start_odo.value),
        end_odo: null,
        gps: [],
        accel: [],
        sv_id: 1,
        car_id: 1,
        weather: null,
        day: null,
        synced: false}

  const { value: tripsValue } = await Preferences.get({key:'trips'})
  const trips = tripsValue ? JSON.parse(tripsValue) : []
  
  trips.push(newTrip)
  await Preferences.set({
    key:'trips',
    value: JSON.stringify(trips)
  })
  getPos()
  router.push('/log')
  }

  const getPos = async () => {
    await Geolocation.requestPermissions()
    const pos = await Geolocation.getCurrentPosition()
    console.log(pos.coords.latitude, pos.coords.longitude)
    // posT.value = `${pos.coords.latitude}, ${pos.coords.longitude}`
  }
</script>

<!--
[trip 1,trip 2,...]
trip 
start time
end time
start odo
end odo
gps [{time:[lon,lat]},...]
acell [{time:[x,y,z]},...] | none
parant id 
car id
weather 
day True | false
synced = true
 -->