import { ref, type Ref } from 'vue'
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, onIonViewDidEnter } from '@ionic/vue'
import { CapacitorHttp } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js'

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
        const headers = await this.headers()

        

    }
    get_car_by_id(){}
}


  }
  const { value: token } = await Preferences.get({ key: 'auth_token' })
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  const isEdit = !!form.value.id
  const url = isEdit
    ? `${API_URL}/api/cars/${form.value.id}`
    : `${API_URL}/api/cars`

  const payload = {
    nickname: form.value.nickname,
    plate: form.value.plate || null,
    ble_device_name: form.value.ble_device_name || null,
  }
  console.log('POST', url, payload)

  const res = isEdit
    ? await CapacitorHttp.patch({ url, headers, data: payload })
    : await CapacitorHttp.post({ url, headers, data: payload })

  console.log('save resp', res.status, res.data)
  if (res.status === 200) {
    const saved = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
    const { value: cached } = await Preferences.get({ key: 'cars' })
    const list = cached ? JSON.parse(cached) : []
    const idx = list.findIndex((c: any) => c.id === saved.id)
    if (idx >= 0) list[idx] = saved
    else list.push(saved)
    await Preferences.set({ key: 'cars', value: JSON.stringify(list) })
    dismiss('save', saved)
  } else console.error('save failed', res.status, res.data)