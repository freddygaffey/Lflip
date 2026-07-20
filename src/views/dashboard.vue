<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Dashboard {{ status }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <!-- First-run: no car yet → guide the user into setup instead of an empty logbook. -->
      <div v-if="needsSetup" class="getting-started">
        <h2>👋 Let's get you set up</h2>
        <p>Add your car and pair its L-plates, then you can start logging drives.</p>
        <ion-button expand="block" @click="goAddCar">Add your car</ion-button>
      </div>

      <div class="charts-row">
        <div class="chart-col"><div class="chart-box"><Pie :data="DchartData" :options="DchartOptions"/></div><p>{{ totalDay }}/{{ capDay }}</p></div>
        <div class="chart-col"><div class="chart-box"><Pie :data="NchartData" :options="NchartOptions"/></div><p>{{ totalNight }}/{{ capNight }}</p></div>
        <div class="chart-col"><div class="chart-box"><Pie :data="TchartData" :options="TchartOptions"/></div><p>{{ total }}/{{ capTotal }}</p></div>
      </div>

      <ion-segment v-model="mode" class="mode-switch">
        <ion-segment-button value="day">
          <ion-label>Day</ion-label>
        </ion-segment-button>
        <ion-segment-button value="night">
          <ion-label>Night</ion-label>
        </ion-segment-button>
      </ion-segment>

      <div class="logbook">
        <div class="logbook-title">
          Record of Driving Hours — {{ mode === 'day' ? 'Day' : 'Night' }}
          <span class="logbook-sub">with a supervising driver</span>
        </div>
        <div class="logbook-scroll-wrap">
        <div class="logbook-scroll">
          <table class="logbook-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Weather<br>Conditions</th>
                <th>SD Name</th>
                <th>SD Licence</th>
                <th>SD Signature</th>
                <th>Start<br>Time</th>
                <th>Finish<br>Time</th>
                <th>Odometer<br>Start</th>
                <th>Odometer<br>Finish</th>
                <th>Total<br>Time</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in filteredTrips" :key="t.id" @click="openTrip(t)">
                <td>{{ fmtDate(t.start_time) }}</td>
                <td>{{ t.weather }}</td>
                <td>{{ t.sv_name ?? svsStore.get_sv_by_id(t.sv_id)?.full_name }}</td>
                <td>{{ t.sv_licence_no ?? svsStore.get_sv_by_id(t.sv_id)?.licence_no }}</td>
                <td></td>
                <td>{{ fmtTime(t.start_time) }}</td>
                <td>{{ fmtTime(t.end_time) }}</td>
                <td>{{ t.start_odo }}</td>
                <td>{{ t.end_odo }}</td>
                <td>{{ fmtDuration(t) }}</td>
              </tr>
              <tr v-if="filteredTrips.length === 0">
                <td colspan="10" class="logbook-empty">No {{ mode }} trips have been recorded yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, onIonViewDidEnter, IonSegment, IonSegmentButton, IonLabel, IonButton } from '@ionic/vue'
import { Preferences } from '@capacitor/preferences'
import { api } from './classes/api'
import { useRouter } from 'vue-router'

import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js'
import { carsStore } from './classes/cars'
import { svsStore } from './classes/svs'
import type { Trip } from './classes/trips'

const router = useRouter()

// First-run nudge: a freshly signed-up user has no car yet. Show a "get started"
// card that sends them to Settings → Add car (where they pair + calibrate).
const cars = carsStore.cars
const needsSetup = computed(() => cars.value.length === 0)
const goAddCar = () => router.push('/tabs/settings')

const mode = ref<'day' | 'night'>('day')
let status = ref('🔄')
const totalDay = ref('')
const totalNight = ref('')
const total = ref('')
const capDay = ref(90)
const capNight = ref(10)
const capTotal = ref(100)

// carsStore.pull_cloud()
// svsStore.pull_cloud()

ChartJS.register(ArcElement, Tooltip, Legend, Title)

const DchartData = ref({ datasets: [{ data: [0, 90], backgroundColor: ['#C5BF10', '#E0E0E0'] }] })
const NchartData = ref({ datasets: [{ data: [0, 10], backgroundColor: ['#1D1D1D', '#E0E0E0'] }] })
const TchartData = ref({ datasets: [{ data: [0, 100], backgroundColor: ['#36A225', '#E0E0E0'] }] })

const DchartOptions = { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Day Hours' } } }
const NchartOptions = { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Night Hours' } } }
const TchartOptions = { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Total Hours' } } }

const updateHours = async () => {
  const trips = JSON.parse((await Preferences.get({ key: "trips" })).value ?? '[]')
  let day = 0
  let night = 0
  for (const t of trips) {
    if (t.day_night == "day") day += (t.end_time - t.start_time) / 1000 / 3600
    if (t.day_night == "night") night += (t.end_time - t.start_time) / 1000 / 3600
  }
  const tot = day + night
  totalDay.value = day.toFixed(2)
  totalNight.value = night.toFixed(2)
  total.value = tot.toFixed(2)
  DchartData.value = { datasets: [{ data: [day, Math.max(0, capDay.value - day)], backgroundColor: ['#C5BF10', '#E0E0E0'] }] }
  NchartData.value = { datasets: [{ data: [night, Math.max(0, capNight.value - night)], backgroundColor: ['#1D1D1D', '#E0E0E0'] }] }
  TchartData.value = { datasets: [{ data: [tot, Math.max(0, capTotal.value - tot)], backgroundColor: ['#36A225', '#E0E0E0'] }] }
}

const uploadTrips = async () => {
  const { value: tripsRaw } = await Preferences.get({ key: 'trips' })
  const trips = JSON.parse(tripsRaw ?? '[]')
  type LocalTrip = { synced?: boolean }
    const unsynced = (trips as LocalTrip[]).filter((trip) => !trip.synced)
    let ok = true
    try {
      for (const trip of unsynced) {
        status.value = "📵"
        const response = await api.post('/api/trips/push_trip', { trip })
        if (response.status === 200) trip.synced = true
        else { ok = false; break }
      }
    } finally {
      // always persist what did upload. returning early without saving meant a
      // partial sync re-sent every trip next time, duplicating them server-side.
      await Preferences.set({ key: 'trips', value: JSON.stringify(trips) })
      status.value = ok ? '✅' : '📵'
    }
    return ok
}


const load_dasbord = async () => {
  const [{ value: tn }, { value: tt }] = await Promise.all([
    Preferences.get({ key: 'night' }),
    Preferences.get({ key: 'total' }),
  ])
  const t = parseInt(tt ?? '100', 10) || 100
  const n = parseInt(tn ?? '100', 10) || 100
  const d = Math.max(0, t - n) || t
  capTotal.value = t
  capNight.value = n
  capDay.value = d
  // read local trips straight away so the dashboard paints, then fetch the rest
  // together rather than one round trip at a time
  await updateHours()
  await Promise.all([pullTrips(), svsStore.pull_cloud(), carsStore.pull_cloud()])
  await updateHours()
  // uploading stale trips can be slow (each carries its GPS track), so it runs
  // in the background instead of blocking the screen the user is looking at
  uploadTrips().then((ok) => { if (ok) pullTrips().then(updateHours) })
}

async function pullTrips() {
  const res = await api.get('/api/trips')
  if (res.status !== 200) return

  const remote = res.data

  // mark every trip from the server as already synced
  const synced = []
  for (let i = 0; i < remote.length; i++) {
    const trip = remote[i]
    trip.synced = true
    synced.push(trip)
  }

  await Preferences.set({ key: 'trips', value: JSON.stringify(synced) })
  trips.value = synced
}


const trips = ref<Trip[]>([])

const filteredTrips = computed(() =>
  trips.value.filter((t) => t.day_night === mode.value).slice().reverse()
)

const fmtDate = (ms: number) => new Date(ms).toLocaleDateString()
const fmtTime = (ms: number) =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const fmtDuration = (t: Trip) => {
  const h = Math.floor((t.end_time - t.start_time) / 3600000)
  const m = String(Math.floor(((t.end_time - t.start_time) / 60000) % 60)).padStart(2, '0')
  return `${h}:${m}`
}

const openTrip = (t: Trip) => router.push(`/tabs/trip/${t.id}`)

onIonViewDidEnter(() => {
  carsStore.load_cache()   // instant local car list so the setup card is correct on entry
  load_dasbord()
  // on iOS the pie charts render mid page-transition with a wrong canvas size
  // (off-centre until you scroll); nudge chart.js to re-measure once settled
  setTimeout(() => window.dispatchEvent(new Event('resize')), 100)
})
</script>

<style scoped>

.getting-started {
  border: 1px solid var(--ion-color-light-shade);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  text-align: center;
  background: var(--ion-color-light);
}
.getting-started h2 { margin: 0 0 6px; font-size: 18px; color: var(--ion-color-light-contrast); }
.getting-started p { margin: 0 0 12px; color: var(--ion-color-medium); font-size: 14px; }

.charts-row {
  display: flex;
  gap: 4px;
  text-align: center;
  margin: 0 -16px;
}

.chart-col {
  flex: 1;
  min-width: 0;
}

.chart-box {
  position: relative;
  height: 120px;
}

.mode-switch {
  margin-top: 20px;
}

.logbook {
  margin-top: 16px;
  border: 2px solid #1a2a5e;
  border-radius: 4px;
  overflow: hidden;
}

.logbook-title {
  background: #1a2a5e;
  color: #fff;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
  padding: 8px 10px;
}

.logbook-sub {
  display: block;
  font-weight: 400;
  font-size: 0.7rem;
  opacity: 0.85;
  text-transform: none;
  letter-spacing: 0;
}

.logbook-scroll-wrap {
  position: relative;
}

/* right-edge fade hints that the table scrolls sideways */
.logbook-scroll-wrap::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 40px;
  pointer-events: none;
  background: linear-gradient(to right, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.95));
}

.logbook-scroll {
  overflow-x: auto;
}

.logbook-table {
  border-collapse: collapse;
  width: 100%;
  min-width: 760px;
  background: #fff;
  color: #1a1a1a;
  font-size: 0.75rem;
}

/* fixed-ish column widths so the viewport cuts mid-column, peeking the next one */
.logbook-table th,
.logbook-table td {
  min-width: 84px;
}

.logbook-table th {
  background: #1a2a5e;
  color: #fff;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.65rem;
  padding: 6px 8px;
  border: 1px solid #1a2a5e;
  text-align: left;
  vertical-align: bottom;
  white-space: nowrap;
}

.logbook-table td {
  border: 1px solid #c4c4c4;
  padding: 10px 8px;
  white-space: nowrap;
}

.logbook-table tbody tr {
  cursor: pointer;
}

.logbook-table tbody tr:nth-child(even) {
  background: #f4f5f9;
}

.logbook-table tbody tr:hover {
  background: #e6e9f5;
}

.logbook-empty {
  text-align: center;
  color: #888;
  font-style: italic;
  cursor: default;
}
</style> 
