// singleton store for device-level app modes (runtime feature switches).
// follows the same pattern as aiPrefs.ts, but purely local — these are
// per-device presentation choices, so nothing syncs to the backend.
//
//   debugEnabled — shows the Debug tab in the bottom bar (off by default).
//   actGov       — "ACT Government mode": trims the app down to the core
//                  trip-logging product for an ACT audience. Hides the AI
//                  assistant, debug tools and the interstate (non-ACT)
//                  options. One codebase, no build flags.

import { ref } from 'vue'
import { Preferences } from '@capacitor/preferences'

const KEY_DEBUG = 'debug_enabled'
const KEY_ACT_GOV = 'act_gov_mode'

class AppMode {
  debugEnabled = ref(false)
  actGov = ref(false)

  async load_cache() {
    const { value: dbg } = await Preferences.get({ key: KEY_DEBUG })
    const { value: act } = await Preferences.get({ key: KEY_ACT_GOV })
    this.debugEnabled.value = dbg === 'true'
    this.actGov.value = act === 'true'
  }

  async setDebugEnabled(on: boolean) {
    this.debugEnabled.value = on
    await Preferences.set({ key: KEY_DEBUG, value: String(on) })
  }

  async setActGov(on: boolean) {
    this.actGov.value = on
    await Preferences.set({ key: KEY_ACT_GOV, value: String(on) })
  }
}

export const appModeStore = new AppMode()
