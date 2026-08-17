<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Log Trip</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="trip-form">
        <div class="start-circle-wrap">
          <button class="start-circle" :class="{ pending: canStart && platesPending }" :disabled="!canStart" @click="start">
            Start<br />Trip
          </button>
        </div>
        <p class="plate-hint" v-if="expectsPlates">
          {{ plateConnected ? 'L-plates connected' : 'Connecting to L-plates…' }}
        </p>

        <ion-list lines="none" class="trip-list">
          <ion-item>
            <ion-input v-model="start_odo" label="Start Odo (km)" label-placement="floating" type="text" inputmode="numeric" placeholder="e.g. 12345"></ion-input>
          </ion-item>

          <ion-item>
            <ion-select label="Car" label-placement="stacked" placeholder="Pick a car" interface="popover" v-model="selectedCarId">
              <ion-select-option value="null">Guest Car</ion-select-option>
              <ion-select-option
              v-for="c in cars"
              :key="c.id"
              :value="c.id"
               >{{ c.nickname }}</ion-select-option>
            </ion-select>
          </ion-item>
          <p class="trip-hint" v-if="!cars.length || !svs.length">
            No setup needed — pick <strong>Guest</strong> for the car or driver to log a drive right now.
            Add your own in <strong>Settings</strong> to save them and pair L-plate hardware.
          </p>
          <ion-item>
            <ion-select label="Supervising Driver" label-placement="stacked" placeholder="Pick a driver" interface="popover" v-model="selectedSvId">
              <ion-select-option :value="null">Guest Driver</ion-select-option>
              <ion-select-option
              v-for="sv in svs"
              :key="sv.id"
              :value="sv.id"
               >{{ sv.full_name }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item v-if="selectedSvId === null">
            <ion-input v-model="guestName" label="Full name (as on licence)" label-placement="floating"></ion-input>
          </ion-item>
          <ion-item v-if="selectedSvId === null">
            <ion-input v-model="guestLicence" label="Licence number" label-placement="floating"></ion-input>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
  import { onIonViewWillEnter, onIonViewWillLeave, alertController, IonInput, IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonSelect, IonSelectOption } from '@ionic/vue';
  import { Geolocation } from '@capacitor/geolocation'
  import { Capacitor } from '@capacitor/core'
  import { ref, watch } from 'vue';
  import { Preferences } from '@capacitor/preferences'
  import { useRouter } from 'vue-router';
  import { carsStore } from './classes/cars';
  import { svsStore } from './classes/svs';
  import { plateLink } from './classes/plates';
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

    // back on this screen: the recording screen owns the link during a trip,
    // so reclaim it (or restart it) for whatever car is still selected
    handedOff = false
    const car = selectedCar.value
    if (car?.ble_device_name && !plateLink.connected.value) plateLink.connect(car)

    // prefill the start odo from the most recently finished trip's end odo
    const { value: tripsValue } = await Preferences.get({ key: 'trips' })
    const trips = tripsValue ? JSON.parse(tripsValue) : []
    const lastTrip = trips.filter((t: any) => t.end_odo != null).pop()
    if (lastTrip) start_odo.value = String(lastTrip.end_odo)
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

  // Plate link, started here so the button can show readiness BEFORE the trip:
  // green = plates connected (or car has none), amber = still trying. If the
  // user starts while it's amber they get the choice to go on without plates.
  const plateConnected = plateLink.connected
  const selectedCar = computed(() =>
    typeof selectedCarId.value === 'number' ? carsStore.get_car_by_id(selectedCarId.value) : undefined)
  const expectsPlates = computed(() => !!selectedCar.value?.ble_device_name)
  const platesPending = computed(() => expectsPlates.value && !plateConnected.value)
  let handedOff = false   // true while navigating to the recording screen, which takes over the link

  // when a car is picked, prefill the start odo with that car's last known end
  // odo, and start connecting to its plates (if it has any) in the background
  watch(selectedCarId, async (carId) => {
    const car = selectedCar.value
    if (car?.ble_device_name) plateLink.connect(car)
    else plateLink.disconnect()

    if (carId === null) return
    const { value: tripsValue } = await Preferences.get({ key: 'trips' })
    const trips = tripsValue ? JSON.parse(tripsValue) : []
    const lastTrip = trips
      .filter((t: any) => t.car_id === carId && t.end_odo != null)
      .pop()
    if (lastTrip) start_odo.value = String(lastTrip.end_odo)
  })

  // don't hold the BLE link if the user wanders off without starting a trip
  onIonViewWillLeave(() => { if (!handedOff) plateLink.disconnect() })

    // const { value } = await Preferences.get({key: 'odo'})
    // const odo = parseFloat(value ?? "0")
    // await Preferences.set({
    // key: 'odo',
    // value: String(odo)})
  
    // const start_enabled = computed(() => 
    //   )

  const start = async () => {
    // Fail-safe: plates expected but not reachable — the drive still matters
    // more than the hardware, so offer to log it anyway (flip plates by hand).
    if (platesPending.value) {
      const alert = await alertController.create({
        header: 'L-plates not connected',
        message: "Can't reach this car's L-plates yet. Start anyway and flip them by hand, or wait for them to connect.",
        buttons: [
          { text: 'Wait', role: 'cancel' },
          { text: 'Start anyway', role: 'confirm' },
        ],
      })
      await alert.present()
      const { role } = await alert.onDidDismiss()
      if (role !== 'confirm') return
    }
    handedOff = true
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

<style scoped>
.trip-form {
  max-width: 420px;
  margin: 0 auto;
}

.trip-list {
  background: transparent;
}

.trip-hint {
  font-size: 13.5px;
  line-height: 1.45;
  color: var(--ion-color-medium);
  margin: 8px 4px 0;
  padding: 0 12px;
}

.start-circle-wrap {
  display: flex;
  justify-content: center;
  padding: 32px 0;
}

.start-circle {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  border: none;
  background: var(--lp-green);
  color: #ffffff;
  font-size: 22px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  line-height: 1.4;
  box-shadow: 0 6px 20px rgba(54, 162, 37, 0.4);
  transition: transform 0.1s ease, opacity 0.2s ease;
}

.start-circle:active {
  transform: scale(0.97);
}

.start-circle:disabled {
  background: var(--ion-color-medium);
  box-shadow: none;
  opacity: 0.6;
}

/* startable, but the car's L-plates haven't connected yet */
.start-circle.pending {
  background: var(--ion-color-warning);
  box-shadow: 0 6px 20px rgba(224, 168, 0, 0.4);
}

.plate-hint {
  text-align: center;
  font-size: 13.5px;
  color: var(--ion-color-medium);
  margin: -16px 0 16px;
}
</style>

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