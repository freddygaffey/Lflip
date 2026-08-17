<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Recording</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p class="rec-sub">
        Feel free to lock your phone until the practice session is over —
        or hand it to a friend to hold (e.g. for navigation).
      </p>

      <ion-card>
        <ion-list lines="full">
          <ion-item>
            <ion-label>Started</ion-label>
            <ion-label slot="end" class="stat-value">{{ startedLabel }}</ion-label>
          </ion-item>
          <ion-item>
            <ion-label>Time elapsed</ion-label>
            <ion-label slot="end" class="stat-value">{{ elapsedLabel }}</ion-label>
          </ion-item>
        </ion-list>
      </ion-card>

      <ion-button expand="block" color="danger" class="big-btn" @click="stop">Stop Recording</ion-button>
      <ion-button expand="block" fill="clear" color="medium" class="big-btn" @click="cancel">Cancel trip</ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
  import { ref, watch, onMounted, onUnmounted, type WatchStopHandle } from 'vue';
  import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonCard, IonList, IonItem, IonLabel, onIonViewDidEnter, onIonViewWillLeave } from '@ionic/vue';
  import { useRouter } from 'vue-router';
  import { Capacitor, registerPlugin } from '@capacitor/core';
  import { Geolocation } from '@capacitor/geolocation';
  import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';
  import { Preferences } from '@capacitor/preferences';

  // native only: runs a foreground service so points keep coming with the
  // screen off / phone locked. web falls back to the in-page watcher below.
  const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');
  import { carsStore } from './classes/cars';
  import { plateLink } from './classes/plates';

  const router = useRouter()

  type GpsPoint = { time: number, lat: number, lon: number }

  let watchId: string | null = null
  const gpsPoints: GpsPoint[] = []
  let lastLogTime = 0
  const timeout = 1000

  const startedLabel = ref('--:--')
  const elapsedLabel = ref('00:00:00')
  let startTime = Date.now()
  let elapsedTimer: ReturnType<typeof setInterval> | null = null
  let plateWatch: WatchStopHandle | null = null

  const updateElapsed = () => {
    const diff = Math.max(0, Date.now() - startTime)
    const totalSeconds = Math.floor(diff / 1000)
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    const pad = (n: number) => n.toString().padStart(2, '0')
    elapsedLabel.value = `${pad(h)}:${pad(m)}:${pad(s)}`
  }

  onMounted(() => {
    elapsedTimer = setInterval(updateElapsed, 1000)
  })
  onUnmounted(() => {
    if (elapsedTimer) clearInterval(elapsedTimer)
  })

  const logPoint = (time: number, lat: number, lon: number) => {
    if (Date.now() - lastLogTime < timeout) return
    lastLogTime = Date.now()
    gpsPoints.push({ time, lat, lon })
  }

  const stopWatching = () => {
    if (!watchId) return
    if (Capacitor.isNativePlatform()) BackgroundGeolocation.removeWatcher({ id: watchId })
    else Geolocation.clearWatch({ id: watchId })
    watchId = null
  }

  onIonViewDidEnter(async () => {
    gpsPoints.length = 0
    lastLogTime = 0
    if (Capacitor.isNativePlatform()) {
      watchId = await BackgroundGeolocation.addWatcher(
        {
          backgroundTitle: 'L Flip is recording your trip',
          backgroundMessage: 'Logging your practice drive',
          requestPermissions: true,
          distanceFilter: 5,
        },
        (location, error) => {
          if (error || !location) return
          logPoint(location.time ?? Date.now(), location.latitude, location.longitude)
        }
      )
    } else {
      watchId = await Geolocation.watchPosition(
        {enableHighAccuracy: true, timeout: 10000},
        (position, err) => {
          if (err || !position) return
          logPoint(position.timestamp, position.coords.latitude, position.coords.longitude)
        }
      )
    }

    // Connect to this trip's car L-plate (if it has one) for the whole trip.
    try {
      const { value } = await Preferences.get({ key: 'trips' })
      const trips = JSON.parse(value ?? '[]')
      const trip = trips[trips.length - 1]
      startTime = trip?.start_time ?? Date.now()
      startedLabel.value = new Date(startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      updateElapsed()

      const carId = trip?.car_id
      if (carId != null) {
        if (!carsStore.cars.value.length) await carsStore.load_cache()
        const car = carsStore.get_car_by_id(carId)
        if (car) {
          // Flip to L whenever the link comes up — not just once, so a hub that
          // rebooted (and forgot its state) gets re-flipped on reconnect.
          plateWatch = watch(plateLink.connected, async (up) => {
            if (!up) return
            try { await plateLink.setPlates(0) }
            catch (e) { console.error('plate flip failed', e) }
          }, { immediate: true })
          await plateLink.connect(car)
        }
      }
    } catch (e) {
      console.error('plate connect (trip) failed', e)
    }
  })
  onIonViewWillLeave(async () => {
    stopWatching()
    if (plateWatch) { plateWatch(); plateWatch = null }
    // Trip over: plates back to center (off) before we let the link go.
    try { if (plateLink.connected.value) await plateLink.setPlates(1) }
    catch (e) { console.error('plate center failed', e) }
    plateLink.disconnect()
  })
  const cancel = async () => {
    await Preferences.remove({ key: 'trips' })
    console.log('trips cleared')
    router.push("/tabs")
  }
  const stop = async () => {
    stopWatching()
    const { value } = await Preferences.get({key:'trips'})
    const trips = JSON.parse(value ?? '[]')
    trips[trips.length -1].gps = gpsPoints
    trips[trips.length -1].end_time = Date.now()
    await Preferences.set({ key: 'trips', value: JSON.stringify(trips)})
    router.push('/endTrip')
  }
</script>

<style scoped>
.rec-sub {
  color: var(--ion-color-medium);
  font-size: 14px;
  line-height: 1.5;
  margin: 0 4px 16px;
}

.stat-value {
  font-weight: 700;
  text-align: right;
}

.big-btn {
  height: 64px;
  font-size: 18px;
  margin-top: 16px;
}
</style>
