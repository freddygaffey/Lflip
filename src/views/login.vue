<template>
    <ion-page>
      <ion-header>
        <ion-toolbar>
          <ion-title>Sign In</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <div class="auth-card">
          <ion-list lines="none" class="auth-list">
            <ion-item>
              <ion-input v-model="email" label="Email" label-placement="stacked" placeholder="you@example.com" type="email"></ion-input>
            </ion-item>
            <ion-item>
              <ion-input v-model="password" label="Password" label-placement="stacked" placeholder="••••••••" type="password"></ion-input>
            </ion-item>
          </ion-list>

          <ion-button expand="block" class="ion-margin-top" @click="signIn">Sign in</ion-button>
          <ion-button expand="block" fill="clear" router-link="/register">Create an account</ion-button>
          <ion-button expand="block" fill="outline" @click="makeDemoAccount">Try a demo account</ion-button>

          <p class="auth-message" v-if="passOk">{{ passOk }}</p>
        </div>
     </ion-content>
    </ion-page>
  </template>
  
  <script setup lang="ts">
import { IonButton, IonInput, IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonList, IonItem, onIonViewWillEnter } from '@ionic/vue';
import { ref, warn } from 'vue'
import { useRouter } from 'vue-router'
import { Preferences } from '@capacitor/preferences'
import { api, login } from './classes/api'
import { carsStore } from './classes/cars';
import { svsStore } from './classes/svs';

const router = useRouter()
const email = ref('')
const password = ref('')
const passOk = ref('')

// first-time users get the intro carousel; returning users go straight in
const routeAfterAuth = async () => {
  // the onboarding only runs for accounts that just registered
  const { value: pending } = await Preferences.get({ key: 'needsOnboarding' })
  router.push(pending === 'true' ? '/welcome' : '/tabs/dashboard')
}

const isAuth = async () => {
  const response = await api.post('/api/dashboard')
  console.log('auth check', response.status)
  if (response.status === 200) {
    // fetchState writes the hour caps the dashboard reads on load — await it,
    // or the dashboard can read stale values before it lands
    await fetchState()
    await routeAfterAuth()
  }
}
const fetchState = async () => {
  const response = await api.get('/api/state')
  if (response.status !== 200) return
  const data = response.data
  await Preferences.set({ key: 'total', value: String(data.total) })
  await Preferences.set({ key: 'night', value: String(data.night) })
}
onIonViewWillEnter(isAuth)

const signIn = async () => {
  try {
    const response = await login(email.value, password.value)
    console.log('login response', response.status)
    passOk.value = response.data.message
    if (response.status !== 200) return

    // navigate as soon as login succeeds. fetching hour caps and cached data is
    // secondary — if it threw before, the user was left stuck on this screen
    // with no error. the dashboard falls back to defaults until fetchState lands.
    await routeAfterAuth()
    fetchState().catch(() => {})
    carsStore.pull_cloud()
    svsStore.pull_cloud()
  } catch {
    passOk.value = "can't reach the server, try again"
  }
}

// One-tap throwaway account for demos: registers a fresh dummy user that
// passes the backend checks (unique email; password needs 8+ chars with an
// upper, a lower and a special character), signs in, seeds it with sample
// supervisors/cars/trips so the app isn't empty, then routes in.
const makeDemoAccount = async () => {
  passOk.value = ''
  const suffix = Math.random().toString(36).slice(2, 8)
  const demoEmail = `demo-${suffix}@example.com`
  const demoPwd = 'Demo!drive99'
  try {
    const reg = await api.post('/api/register', {
      email: demoEmail, pwd: demoPwd, f_name: 'Demo',
      l_name: 'Driver', state: 'act', licence_no: '',
    })
    if (reg.status !== 200) {
      passOk.value = reg.data?.message ?? 'could not create demo account'
      return
    }
    const auth = await login(demoEmail, demoPwd)
    if (auth.status !== 200) {
      passOk.value = auth.data?.message ?? 'could not sign in to demo account'
      return
    }
    // register alone doesn't create the licence record — /api/set_licence does.
    // without it /api/state 404s, so the hour targets fall back to defaults and
    // the assistant has no licence details to report on.
    await api.post('/api/set_licence', { state: 'act', licence_no: '17482936' })

    // a demo account is brand new, so it gets the onboarding like any register
    await Preferences.set({ key: 'needsOnboarding', value: 'true' })

    // deliberately no seed data - the demo starts blank like a real new account,
    // so there are no sample trips to slowly upload and no sample supervisors
    // the tester has to clean up
    // the dashboard reads these caps on load, so they must land before we route
    await fetchState()
    await routeAfterAuth()
  } catch {
    passOk.value = "can't reach the server, try again"
  }
}
</script>

<style scoped>
.auth-card {
  max-width: 420px;
  margin: 0 auto;
  padding-top: 24px;
}

.auth-list {
  background: transparent;
}

.auth-message {
  text-align: center;
  color: var(--ion-color-danger);
  margin-top: 12px;
}
</style>