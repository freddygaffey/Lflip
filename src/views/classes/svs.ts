// AI generated from cars.ts — same singleton pattern, adapted for the supervisor (Sv) endpoints

import { ref } from 'vue'
import { Preferences } from '@capacitor/preferences'
import { api } from './api'

export type Sv = {
  id: number
  full_name: string
  licence_no: string | null
  last_used: number | null
}

class Svs{
    svs = ref<Sv[]>([])

    private async save_cache(){
        await Preferences.set({ key: 'svs', value: JSON.stringify(this.svs.value) })
    }

    async pull_cloud(){
        const svsRes = await api.get('/api/sv')
        if (svsRes.status === 200) {
            this.svs.value = svsRes.data
            await this.save_cache()
        }
    }

    async load_cache(){
        const { value } = await Preferences.get({key: 'svs'})
        if (value) this.svs.value = JSON.parse(value)
    }

    async add_sv(sv: Sv){
        const res = await api.post('/api/sv', sv)
        if (res.status !== 200 ) return
        this.svs.value.push(res.data)
        await this.save_cache()
    }

    async delete_sv(id: number){
        const res = await api.delete(`/api/sv/${id}`)
        if (res.status !== 200) return
        this.svs.value = this.svs.value.filter(s => s.id !== id)
        await this.save_cache()
    }

    async update_sv(sv: Sv){
        const payload = {
            full_name: sv.full_name,
            licence_no: sv.licence_no || null,
            last_used: sv.last_used ?? null,
        }
        const res = await api.patch(`/api/sv/${sv.id}`, payload)
        if (res.status !== 200 ) return
        const i = this.svs.value.findIndex(s => s.id === sv.id)
        if (i >= 0) this.svs.value[i] = res.data
        await this.save_cache()
    }

    get_sv_by_id(id: number){
        const sv = this.svs.value.find(s => s.id === id)
        return sv
    }

}

export const svsStore = new Svs()
