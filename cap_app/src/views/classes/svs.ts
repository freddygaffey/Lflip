// AI generated from cars.ts — same singleton pattern, adapted for the supervisor (Sv) endpoints

import { ref } from 'vue'
import { CapacitorHttp } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'


const API_URL = import.meta.env.VITE_API_URL

export type Sv = {
  id: number
  full_name: string
  licence_no: string | null
  last_used: number | null
}

class Svs{
    svs = ref<Sv[]>([])

    private async headers(){
        const { value: token } = await Preferences.get({ key: 'auth_token' })
        return { Authorization: `Bearer ${token}` }
    }

    private async save_cache(){
        await Preferences.set({ key: 'svs', value: JSON.stringify(this.svs.value) })
    }

    async pull_cloud(){
        const headers = await this.headers()

        const svsRes = await CapacitorHttp.get({ url: `${API_URL}/api/sv`, headers })
        if (svsRes.status === 200) {
            this.svs.value = typeof svsRes.data === 'string' ? JSON.parse(svsRes.data) : svsRes.data
            await this.save_cache()
        }
    }

    async load_cache(){
        const { value } = await Preferences.get({key: 'svs'})
        if (value) this.svs.value = JSON.parse(value)
    }

    async add_sv(sv: Sv){
        let tok = await this.headers()
        const headers = { ...tok, 'Content-Type': 'application/json' }
        const res = await CapacitorHttp.post({ url:`${API_URL}/api/sv`, headers, data: sv })
        if (res.status !== 200 ) return
        const saved = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
        this.svs.value.push(saved)
        await this.save_cache()
    }

    async delete_sv(id: number){
        const headers = await this.headers()
        const res = await CapacitorHttp.delete({ url: `${API_URL}/api/sv/${id}`, headers })
        if (res.status !== 200) return
        this.svs.value = this.svs.value.filter(s => s.id !== id)
        await this.save_cache()
    }

    async update_sv(sv: Sv){
        const headers = { ...(await this.headers()), 'Content-Type': 'application/json' }
        const payload = {
            full_name: sv.full_name,
            licence_no: sv.licence_no || null,
            last_used: sv.last_used ?? null,
        }
        const res = await CapacitorHttp.patch({ url: `${API_URL}/api/sv/${sv.id}`, headers, data: payload })
        if (res.status !== 200 ) return
        const saved = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
        const i = this.svs.value.findIndex(s => s.id === sv.id)
        if (i >= 0) this.svs.value[i] = saved
        await this.save_cache()
    }

    get_sv_by_id(id: number){
        const sv = this.svs.value.find(s => s.id === id)
        return sv
    }

}

export const svsStore = new Svs()
