// singleton store for the AI assistant's data-access preferences.
// kept in local Preferences for offline use and synced with the backend.
// follows the same pattern as svs.ts / cars.ts

import { ref } from 'vue'
import { CapacitorHttp } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const API_URL = import.meta.env.VITE_API_URL

export type AiPrefs = {
  allow_trips: boolean
  allow_cars: boolean
  allow_supervisors: boolean
  allow_licence: boolean
  allow_profile: boolean
}

const DEFAULTS: AiPrefs = {
  allow_trips: false,
  allow_cars: false,
  allow_supervisors: false,
  allow_licence: false,
  allow_profile: false,
}

// label + description for each toggle, used to render the settings UI
export const AI_PREF_FIELDS: { key: keyof AiPrefs; label: string; description: string }[] = [
  { key: 'allow_trips', label: 'Driving log', description: 'Your logged trips, hours and odometer readings' },
  { key: 'allow_cars', label: 'Cars', description: 'Your saved vehicles' },
  { key: 'allow_supervisors', label: 'Supervising drivers', description: 'Names and licence numbers of your supervisors' },
  { key: 'allow_licence', label: 'Licence info', description: 'Your licence number, state and date of birth' },
  { key: 'allow_profile', label: 'Profile', description: 'Your name and email address' },
]

class AiPreferences {
  prefs = ref<AiPrefs>({ ...DEFAULTS })

  private async headers() {
    const { value: token } = await Preferences.get({ key: 'auth_token' })
    return { Authorization: `Bearer ${token}` }
  }

  private async save_cache() {
    await Preferences.set({ key: 'ai_prefs', value: JSON.stringify(this.prefs.value) })
  }

  async load_cache() {
    const { value } = await Preferences.get({ key: 'ai_prefs' })
    if (value) this.prefs.value = { ...DEFAULTS, ...JSON.parse(value) }
  }

  async pull_cloud() {
    const headers = await this.headers()
    const res = await CapacitorHttp.get({ url: `${API_URL}/api/ai/preferences`, headers })
    if (res.status !== 200) return
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
    this.prefs.value = { ...DEFAULTS, ...data }
    await this.save_cache()
  }

  // optimistically update locally, then push the single changed flag to the backend
  async set(key: keyof AiPrefs, value: boolean) {
    this.prefs.value[key] = value
    await this.save_cache()
    const headers = { ...(await this.headers()), 'Content-Type': 'application/json' }
    const res = await CapacitorHttp.patch({
      url: `${API_URL}/api/ai/preferences`,
      headers,
      data: { [key]: value },
    })
    if (res.status === 200) {
      const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
      this.prefs.value = { ...DEFAULTS, ...data }
      await this.save_cache()
    }
  }
}

export const aiPrefsStore = new AiPreferences()
