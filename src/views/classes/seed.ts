// Shared demo/test seed: creates supervisors, cars and a set of trips for the
// signed-in account. Used by the debug "Seed Test Data" button and by the
// one-tap demo account on the login screen. Must be called while authenticated
// (it hits /api/sv and /api/cars). Supervisors and cars are created on the
// server; trips are written to local Preferences (synced:false) and pushed on
// the next dashboard load.
import { Preferences } from '@capacitor/preferences'
import { api } from './api'

// build a wandering route of `n` points starting near Canberra, with varying
// speed so the speed-coloured polyline on the trip detail page renders
function makeGps(startLat: number, startLon: number, n: number, startTime: number, endTime: number) {
  const pts = []
  let lat = startLat
  let lon = startLon
  let heading = Math.random() * Math.PI * 2
  for (let i = 0; i < n; i++) {
    heading += (Math.random() - 0.5) * 0.6 // gently change direction
    const step = 0.0012 // ~120 m per point
    lat += Math.cos(heading) * step
    lon += Math.sin(heading) * step
    // speed in km/h: a sine wave (stops + open road) plus jitter
    const speed = Math.max(0, 45 + 35 * Math.sin(i / 3) + (Math.random() - 0.5) * 15)
    pts.push({
      lat,
      lon,
      time: Math.round(startTime + ((endTime - startTime) * i) / (n - 1)),
      speed: Math.round(speed),
    })
  }
  return pts
}

export async function seedTestData() {
  // wipe existing trips so old single-point routes don't get pulled back alongside the new ones
  await api.delete('/api/trips')
  await Preferences.remove({ key: 'trips' })

  const mum = (await api.post('/api/sv', { full_name: 'Sarah Whitman', licence_no: '0481726' })).data
  const dad = (await api.post('/api/sv', { full_name: 'Mark Whitman', licence_no: '0392845' })).data
  // no apostrophes: the API HTML-escapes strings, so "Dad's" would display as "Dad&#39;s"
  const car = (await api.post('/api/cars', { nickname: 'Mums Corolla', plate: 'YMC42N' })).data
  const car2 = (await api.post('/api/cars', { nickname: 'Dads Hilux', plate: 'CXR88K' })).data

  await Preferences.set({ key: 'svs', value: JSON.stringify([mum, dad]) })
  await Preferences.set({ key: 'cars', value: JSON.stringify([car, car2]) })

  const now = Date.now()
  const hr = 3600000

  const fakeTrips = [
    { id: 9001, start_time: now - 10 * hr, end_time: now - 9.3 * hr, start_odo: 48210, end_odo: 48235, day: true, day_night: 'day', weather: 'sunny', sv_id: mum.id, car_id: car.id, gps: makeGps(-35.3136, 149.1166, 40, now - 10 * hr, now - 9.3 * hr), synced: false },
    { id: 9002, start_time: now - 30 * hr, end_time: now - 28.5 * hr, start_odo: 48235, end_odo: 48298, day: false, day_night: 'night', weather: 'cloudy', sv_id: dad.id, car_id: car2.id, gps: makeGps(-35.2820, 149.1280, 50, now - 30 * hr, now - 28.5 * hr), synced: false },
    { id: 9003, start_time: now - 54 * hr, end_time: now - 52.7 * hr, start_odo: 48298, end_odo: 48342, day: true, day_night: 'day', weather: 'rain', sv_id: mum.id, car_id: car.id, gps: makeGps(-35.3400, 149.0900, 45, now - 54 * hr, now - 52.7 * hr), synced: false },
    { id: 9004, start_time: now - 78 * hr, end_time: now - 76 * hr, start_odo: 48342, end_odo: 48421, day: true, day_night: 'day', weather: 'sunny', sv_id: dad.id, car_id: car2.id, gps: makeGps(-35.2500, 149.1000, 60, now - 78 * hr, now - 76 * hr), synced: false },
    { id: 9005, start_time: now - 102 * hr, end_time: now - 100.5 * hr, start_odo: 48421, end_odo: 48468, day: false, day_night: 'night', weather: 'fog', sv_id: mum.id, car_id: car.id, gps: makeGps(-35.3000, 149.1500, 48, now - 102 * hr, now - 100.5 * hr), synced: false },
  ]
  await Preferences.set({ key: 'trips', value: JSON.stringify(fakeTrips) })
  return { mum, dad, cars: [car, car2], tripCount: fakeTrips.length }
}
