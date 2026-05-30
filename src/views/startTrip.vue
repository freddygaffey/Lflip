<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Log Trip</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-button @click="start" :disabled="!canStart">Start</ion-button>
      <ion-input v-model="start_odo" placeholder="start odo (km)" type="text" inputmode="numeric"></ion-input>
    <ion-item>
      <ion-select label="Car" label-placement="floating" placeholder="Pick a car" v-model="selectedCarId">
        <ion-select-option value="null">Guest Car</ion-select-option>
        <ion-select-option 
        v-for="(c, i) in cars"
        :key="c.id"
        :value="c.id"
         >{{ c.nickname }}</ion-select-option>
      </ion-select>
    </ion-item>
    <ion-item>
    <ion-select label="Supervising Driver" label-placement="floating" placeholder="Pick a driver" v-model="selectedSvId">
        <ion-select-option :value="null">Guest Driver</ion-select-option>
        <ion-select-option 
        v-for="(sv, i) in svs"
        :key="sv.id"
        :value="sv.id"
         >{{ sv.full_name }}</ion-select-option>
      </ion-select>
    </ion-item>
    <ion-input v-if="selectedSvId === null" v-model="guestName" placeholder="enter full name as on licence"></ion-input>
    <ion-input v-if="selectedSvId === null" v-model="guestLicence" placeholder="enter licence number"></ion-input>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
  import { IonButton, onIonViewWillEnter ,IonInput, IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonItem, IonSelect, IonSelectOption } from '@ionic/vue';
  import { Geolocation } from '@capacitor/geolocation'
  import { Capacitor } from '@capacitor/core'
  import { ref } from 'vue';
  import { Preferences } from '@capacitor/preferences'
  import { useRouter } from 'vue-router';
  import { carsStore } from './classes/cars';
  import { svsStore } from './classes/svs';
  import { computed } from 'vue'

  // hardware-capable if on a real device, OR if the debug "simulate native" flag is on
  const isNative = computed(() => Capacitor.isNativePlatform())
  onIonViewWillEnter(async () => {
    const { value } = await Preferences.get({ key: 'simulate_native' })
    const native_overide = value === 'true'
    const send_to_markting = !isNative.value && !native_overide
    if (send_to_markting) {
      alert('You need to be on a phone to start a trip (or enable "Simulate native" in debug).')
      router.push('/marketing')
    }
  })


  // const start_enabled = ref('')
  const start_odo = ref('')
  const cars = carsStore.cars
  const svs = svsStore.svs
  const selectedCarId = ref<number | null>(null)
  const selectedSvId = ref<number | null>(null)
  const guestName = ref('')
  const guestLicence = ref('')

  // require odo, and (for a guest driver) a full name + licence number
  const canStart = computed(() => {
    if (!start_odo.value) return false
    if (selectedSvId.value === null && (!guestName.value.trim() || !guestLicence.value.trim())) return false
    return true
  })

  const router = useRouter()
  
    // const { value } = await Preferences.get({key: 'odo'})
    // const odo = parseFloat(value ?? "0")
    // await Preferences.set({
    // key: 'odo',
    // value: String(odo)})
  
    // const start_enabled = computed(() => 
    //   )

  const start = async () => {
    const newTrip = {
      start_time: Date.now(),
      end_time: null,
      start_odo: parseFloat(start_odo.value),
      end_odo: null,
      gps: [],
      accel: [],
      sv_id: selectedSvId.value,
      sv_name: selectedSvId.value === null
        ? guestName.value.trim()
        : (svsStore.get_sv_by_id(selectedSvId.value)?.full_name ?? null),
      sv_licence_no: selectedSvId.value === null
        ? guestLicence.value.trim()
        : (svsStore.get_sv_by_id(selectedSvId.value)?.licence_no ?? null),
      car_id: selectedCarId.value,
      weather: null,
      day: null,
      synced: false,
    }
    const { value: tripsValue } = await Preferences.get({ key: 'trips' })
    const trips = tripsValue ? JSON.parse(tripsValue) : []
    trips.push(newTrip)
    await Preferences.set({ key: 'trips', value: JSON.stringify(trips) })
    getPos()
    router.push('/log')
  }

  const getPos = async () => {
    await Geolocation.requestPermissions()
    const pos = await Geolocation.getCurrentPosition()
    console.log(pos)
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