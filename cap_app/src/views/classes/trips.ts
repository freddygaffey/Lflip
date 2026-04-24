import { CapacitorHttp } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { Ref } from 'vue'

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
    cars:Array<Car>;
    time_cloud_sync: number;

    constructor(){
        this.time_cloud_sync = Date.now()
        this.cars = []
   }

    private async headers(){
        const { value: token } = await Preferences.get({ key: 'auth_token' })
        return { Authorization: `Bearer ${token}` }
    }

    async pull_cloud(){
        const headers = await this.headers()

        const carsRes = await CapacitorHttp.get({ url: `${API_URL}/api/cars`, headers })
        if (carsRes.status === 200) {
            this.cars = typeof carsRes.data === 'string' ? JSON.parse(carsRes.data) : carsRes.data
            await Preferences.set({ key: 'cars', value: JSON.stringify(this.cars) })
        }
    }

    async load_cache(){
        const { value } = await Preferences.get({key: 'cars'})
        if (value) this.cars.values = JSON.parse(value)
    }

    async add_car(car:Car){
        let tok = await this.headers()
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tok.Authorization}`,}
        this.cars.push(car)
        await Preferences.set({ key: 'cars', value: JSON.stringify(this.cars) })
        await CapacitorHttp.post({ url:`${API_URL}/api/cars`, headers, data: car })
    }

    get_car_by_id(id:number){
        const car = this.cars.find(c => c.id === id)
        return car
    }

    delete_car_by_id(id:number){
        const car = this.cars.find(c => c.id === id)

        return car
    }

}

export let carsStore =new Cars()