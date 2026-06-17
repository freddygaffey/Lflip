// shared trip types so the views don't each redefine their own copy

export type GpsPoint = {
  time: number
  lat: number
  lon: number
  speed?: number
}

export type Trip = {
  id: number
  start_time: number
  end_time: number
  start_odo: number
  end_odo: number
  day?: boolean
  day_night: 'day' | 'night'
  weather: string
  gps?: GpsPoint[]
  synced?: boolean
  car_id: number
  sv_id: number
  sv_name: string | null
  sv_licence_no: string | null
}
