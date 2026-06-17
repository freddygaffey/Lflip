<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ trip ? `Trip (${trip.day_night})` : 'Trip' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button color="danger" :disabled="!trip || deleting" @click="deleteTrip">
            <ion-icon slot="icon-only" :icon="trashOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div v-if="trip">
        <div v-show="hasGps" ref="mapEl" class="trip-map"></div>
        <div v-show="hasGps" class="speed-legend">
          <span>Slower</span>
          <div class="speed-bar"></div>
          <span>Faster</span>
        </div>
        <p v-if="!hasGps" class="no-gps">No GPS data recorded for this trip.</p>

        <ion-card>
          <ion-card-content>
            <p>Date: {{ fmtDate(trip.start_time) }}</p>
            <p>Duration: {{ fmtDuration(trip) }}</p>
            <p>Length: {{ trip.end_odo - trip.start_odo }} km</p>
            <p>Start odo: {{ trip.start_odo }}</p>
            <p>End odo: {{ trip.end_odo }}</p>
            <p>Car: {{ carsStore.get_car_by_id(trip.car_id)?.nickname ?? 'None saved' }}</p>
            <p>Supervising driver: {{ trip.sv_name ?? svsStore.get_sv_by_id(trip.sv_id)?.full_name }}</p>
            <p>Supervising number: {{ trip.sv_licence_no ?? svsStore.get_sv_by_id(trip.sv_id)?.licence_no }}</p>
            <p>Weather: {{ trip.weather }}</p>
          </ion-card-content>
        </ion-card>
      </div>
      <div v-else>
        <p>Trip not found.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, nextTick, onUnmounted } from 'vue'
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon, IonCard, IonCardContent, onIonViewDidEnter } from '@ionic/vue'
import { trashOutline } from 'ionicons/icons'
import { Preferences } from '@capacitor/preferences'
import { CapacitorHttp } from '@capacitor/core'
import { useRoute, useRouter } from 'vue-router'
// leaflet is loaded lazily inside renderMap() so the ~150KB map library is
// split into its own chunk and only downloaded when a trip map is actually shown
import type * as LeafletNS from 'leaflet'
import { carsStore } from './classes/cars'
import { svsStore } from './classes/svs'
import type { Trip } from './classes/trips'

const API_URL = import.meta.env.VITE_API_URL
const route = useRoute()
const router = useRouter()
const trip = ref<Trip | null>(null)
const mapEl = ref<HTMLElement | null>(null)
const hasGps = ref(false)
const deleting = ref(false)
let map: LeafletNS.Map | null = null

const fmtDate = (ms: number) => new Date(ms).toLocaleDateString()

const fmtDuration = (t: Trip) => {
  const h = Math.floor((t.end_time - t.start_time) / 3600000)
  const m = String(Math.floor(((t.end_time - t.start_time) / 60000) % 60)).padStart(2, '0')
  return `${h}:${m}`
}

const renderMap = async () => {
  // ionic caches the page, so this can run again on re-entry; tear down the old map
  if (map) { map.remove(); map = null }

  const points = (trip.value?.gps ?? []).filter((p) => p.lat != null && p.lon != null)
  hasGps.value = points.length > 0
  if (!hasGps.value) return

  // dynamic import: leaflet + its css are only fetched the first time a map renders
  const L = (await import('leaflet')).default
  await import('leaflet/dist/leaflet.css')

  await nextTick()
  if (!mapEl.value) return

  map = L.map(mapEl.value).setView([points[0].lat, points[0].lon], 13)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  const latlngs = points.map((p) => [p.lat, p.lon] as [number, number])

  // colour each segment by speed: slow = green, fast = red
  const speeds = points.map((p) => p.speed ?? 0)
  const minSpeed = Math.min(...speeds)
  const maxSpeed = Math.max(...speeds)
  const speedColor = (speed: number) => {
    const range = maxSpeed - minSpeed
    const norm = range > 0 ? (speed - minSpeed) / range : 0.5
    const hue = 120 - norm * 120 // 120 = green (slow) -> 0 = red (fast)
    return `hsl(${hue}, 85%, 45%)`
  }

  const segments = L.layerGroup().addTo(map)
  for (let i = 1; i < latlngs.length; i++) {
    const segSpeed = ((points[i - 1].speed ?? 0) + (points[i].speed ?? 0)) / 2
    L.polyline([latlngs[i - 1], latlngs[i]], { color: speedColor(segSpeed), weight: 5 }).addTo(segments)
  }
  const routeLine = L.polyline(latlngs) // not added to map; used only for bounds

  const start = latlngs[0]
  const end = latlngs[latlngs.length - 1]
  L.circleMarker(start, { radius: 7, color: '#fff', weight: 2, fillColor: '#36A225', fillOpacity: 1 })
    .addTo(map).bindPopup('Start')
  L.circleMarker(end, { radius: 7, color: '#fff', weight: 2, fillColor: '#C5102E', fillOpacity: 1 })
    .addTo(map).bindPopup('End')

  // the container has zero size during the ion-content transition, so re-measure
  // and only then fit to the route (fitBounds needs real dimensions to pick a zoom)
  setTimeout(() => {
    map?.invalidateSize()
    map?.fitBounds(routeLine.getBounds(), { padding: [24, 24] })
  }, 200)
}

// the trips list is lightweight (no gps), so fetch this trip's points on demand
const fetchGps = async (t: Trip) => {
  if (!navigator.onLine) return
  const { value: token } = await Preferences.get({ key: 'auth_token' })
  try {
    const res = await CapacitorHttp.get({
      url: `${API_URL}/api/trips/${t.id}/gps`,
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status !== 200) return
    let data = res.data
    if (typeof data === 'string') data = JSON.parse(data)
    t.gps = data
  } catch {
    // offline or error: leave gps empty so the view shows "no GPS data"
  }
}

const load = async () => {
  const trips: Trip[] = JSON.parse((await Preferences.get({ key: 'trips' })).value ?? '[]')
  const id = Number(route.params.id)
  trip.value = trips.find((t) => t.id === id) ?? null
  await Promise.all([carsStore.pull_cloud(), svsStore.pull_cloud()])

  // locally-created (unsynced) trips already carry gps; synced ones don't, so fetch it
  if (trip.value && (!trip.value.gps || trip.value.gps.length === 0)) {
    await fetchGps(trip.value)
  }
  await renderMap()
}

const deleteTrip = async () => {
  if (!trip.value) return
  if (!navigator.onLine) {
    alert('You need to be online to delete a trip.')
    return
  }
  if (!confirm('Delete this trip? This cannot be undone.')) return

  deleting.value = true
  const id = trip.value.id
  const { value: token } = await Preferences.get({ key: 'auth_token' })
  try {
    const res = await CapacitorHttp.delete({
      url: `${API_URL}/api/trips/${id}`,
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status !== 200) {
      alert('Could not delete the trip. Please try again.')
      return
    }
    // keep the local cache in sync so the dashboard doesn't show it again
    const trips: Trip[] = JSON.parse((await Preferences.get({ key: 'trips' })).value ?? '[]')
    await Preferences.set({
      key: 'trips',
      value: JSON.stringify(trips.filter((t) => t.id !== id)),
    })
    router.replace('/tabs/dashboard')
  } catch {
    alert('Could not delete the trip. Please try again.')
  } finally {
    deleting.value = false
  }
}

onIonViewDidEnter(load)
onUnmounted(() => { map?.remove(); map = null })
</script>

<style scoped>
.trip-map {
  height: 240px;
  border-radius: 8px;
  margin-bottom: 8px;
  z-index: 0;
}

.speed-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: var(--ion-color-medium, #888);
  margin-bottom: 16px;
}

.speed-bar {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(to right, hsl(120, 85%, 45%), hsl(60, 85%, 45%), hsl(0, 85%, 45%));
}

.no-gps {
  color: var(--ion-color-medium, #888);
  font-style: italic;
}
</style>
