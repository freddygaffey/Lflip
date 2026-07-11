// i wrote this file almost all my self as it was the only way to learn how to do classes in ts
// i now understend them much better
// i realise that this may be a little bit over the top
// i made a UAV called skydock that useed a psudo sington like this it work or that so i reused that concept
// this file is not written by AI save where documented
// NOTE: the HTTP calls were refactored with AI to use the shared api helper (cookie on web, Bearer on native)

import { ref } from 'vue'
import { Preferences } from '@capacitor/preferences'
import { api } from './api'


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

    async pull_cloud(){
        const carsRes = await api.get('/api/cars')
        if (carsRes.status === 200) {
            this.cars.value = carsRes.data
            await Preferences.set({ key: 'cars', value: JSON.stringify(this.cars.value) })
        }
    }

    async load_cache(){
        const { value } = await Preferences.get({key: 'cars'})
        if (value) this.cars.value = JSON.parse(value)
    }

    async add_car(car:Car){
        const res = await api.post('/api/cars', car)
        if (res.status !== 200 ) return
        await this.pull_cloud()
    }

    async delete_car(id: number){
        const res = await api.delete(`/api/cars/${id}`)
        if (res.status !== 200) return
        await this.pull_cloud()
    }

    async update_car(car: Car){
        const payload = {
            nickname: car.nickname,
            plate: car.plate || null,
            ble_device_name: car.ble_device_name || null,
        }
        const res = await api.patch(`/api/cars/${car.id}`, payload)
        if (res.status !== 200 ) return
        await this.pull_cloud()
    }

    get_car_by_id(id:number){
        const car = this.cars.value.find(c => c.id === id)
        return car
    }

}

export const carsStore =new Cars()
