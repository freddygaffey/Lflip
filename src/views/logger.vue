<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Loggger</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
        <h1><strong>DO NOT LOOK AT YOUR PHONE WHILE YOU ARE DRIVING</strong></h1>
      <ion-button @click="stop">Stop</ion-button>
      <ion-button @click="cancel">Cancel</ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
  import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButton, onIonViewDidEnter, onIonViewWillLeave } from '@ionic/vue';
  import { useRouter } from 'vue-router';
  import { Geolocation } from '@capacitor/geolocation';
  import { Preferences } from '@capacitor/preferences';
  import { carsStore } from './classes/cars';
  import { plateLink } from './classes/plates';

  const router = useRouter()

  type GpsPoint = { time: number, lat: number, lon: number }

  let watchId: string | null = null
  const gpsPoints: GpsPoint[] = []
  let lastLogTime = 0
  let timeout = 1000

  onIonViewDidEnter(async () => {
    gpsPoints.length = 0
    lastLogTime = 0
    watchId = await Geolocation.watchPosition(
      {enableHighAccuracy: true, timeout: 10000},
      (position, err) => {
        if (err || !position) return
        if (Date.now() - lastLogTime < timeout) {
          console.log("miss due timout");
          return
        }
        console.log(position.coords);
        lastLogTime = Date.now()
        gpsPoints.push({ time: position.timestamp, lat: position.coords.latitude, lon: position.coords.longitude })
      }
    )

    // Connect to this trip's car L-plate (if it has one) for the whole trip.
    try {
      const { value } = await Preferences.get({ key: 'trips' })
      const trips = JSON.parse(value ?? '[]')
      const carId = trips[trips.length - 1]?.car_id
      if (carId != null) {
        if (!carsStore.cars.value.length) await carsStore.load_cache()
        const car = carsStore.get_car_by_id(carId)
        if (car) await plateLink.connect(car)
      }
    } catch (e) {
      console.error('plate connect (trip) failed', e)
    }
  })
  onIonViewWillLeave(() => {
    if (watchId) Geolocation.clearWatch({ id: watchId })
    plateLink.disconnect()
  })
  const cancel = async () => {
    await Preferences.remove({ key: 'trips' })
    console.log('trips cleared')
    router.push("/tabs")
  }
  const stop = async () => {
    if (watchId) Geolocation.clearWatch({ id: watchId })
    const { value } = await Preferences.get({key:'trips'})
    const trips = JSON.parse(value ?? '[]')
    trips[trips.length -1].gps = gpsPoints
    trips[trips.length -1].end_time = Date.now()
    await Preferences.set({ key: 'trips', value: JSON.stringify(trips)})
    router.push('/endTrip')
  }
</script>
