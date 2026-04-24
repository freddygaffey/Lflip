// i wrote this file almost all my self as it was the only way to learn how to do classes in ts
// i now understend them much better 
// i realise that this may be a little bit over the top
// i made a UAV called skydock that useed a psudo sington like this it work or that so i reused that concept
// this file is not written by AI save where documented

import { ref, type Ref } from 'vue'
import { CapacitorHttp } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'


const API_URL = import.meta.env.VITE_API_URL

export type Car = {
  id: number
  nickname: string
  plate: string | null
  ble_device_name: string | null
  ble_service_uuid: string | null
  has_pairing_secret: boolean
}

class Cars{
    cars = ref<Car[]>([])  
    time_cloud_sync: number;

    constructor(){
        this.time_cloud_sync = Date.now()
        this.cars.value = []
   }

    private async headers(){
        const { value: token } = await Preferences.get({ key: 'auth_token' })
        return { Authorization: `Bearer ${token}` }
    }

    async pull_cloud(){
        const headers = await this.headers()

        const carsRes = await CapacitorHttp.get({ url: `${API_URL}/api/cars`, headers })
        if (carsRes.status === 200) {
            this.cars.value = typeof carsRes.data === 'string' ? JSON.parse(carsRes.data) : carsRes.data
            await Preferences.set({ key: 'cars', value: JSON.stringify(this.cars.value) })
        }
    }

    async load_cache(){
        const { value } = await Preferences.get({key: 'cars'})
        if (value) this.cars.value = JSON.parse(value)
    }

    async add_car(car:Car){
        let tok = await this.headers()
        const headers = { ...tok, 'Content-Type': 'application/json' }
        this.cars.value.push(car)
        await Preferences.set({ key: 'cars', value: JSON.stringify(this.cars.value) })
        await CapacitorHttp.post({ url:`${API_URL}/api/cars`, headers, data: car })
    }

    // ai generated
    async delete_car(id: number){
        const headers = await this.headers()
        const res = await CapacitorHttp.delete({ url: `${API_URL}/api/cars/${id}`, headers })
        if (res.status === 200) {
            this.cars.value = this.cars.value.filter(c => c.id !== id)
            await Preferences.set({ key: 'cars', value: JSON.stringify(this.cars.value) })
        }
    }

    // ai generated
    async update_car(car: Car){
        const headers = { ...(await this.headers()), 'Content-Type': 'application/json' }
        const payload = {
            nickname: car.nickname,
            plate: car.plate || null,
            ble_device_name: car.ble_device_name || null,
        }
        const res = await CapacitorHttp.patch({ url: `${API_URL}/api/cars/${car.id}`, headers, data: payload })
        if (res.status === 200) {
            const saved = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
            const idx = this.cars.value.findIndex(c => c.id === saved.id)
            if (idx >= 0) this.cars.value[idx] = saved
            await Preferences.set({ key: 'cars', value: JSON.stringify(this.cars.value) })
        }
    }

    get_car_by_id(id:number){
        const car = this.cars.value.find(c => c.id === id)
        return car
    }

}

export let carsStore =new Cars()