<template>
    <ion-page>
      <ion-header>
        <ion-toolbar>
          <ion-title>Register</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <div class="auth-card">
          <ion-list lines="none" class="auth-list">
            <ion-item>
              <ion-input v-model="f_name" label="First name" label-placement="stacked" type="text"></ion-input>
            </ion-item>
            <ion-item>
              <ion-input v-model="l_name" label="Last name" label-placement="stacked" type="text"></ion-input>
            </ion-item>
            <ion-item>
              <ion-input v-model="email" label="Email" label-placement="stacked" placeholder="you@example.com" type="email"></ion-input>
            </ion-item>
            <ion-item>
              <ion-input v-model="password" label="Password" label-placement="stacked" placeholder="••••••••" type="password"></ion-input>
            </ion-item>
            <ion-item>
              <ion-input v-model="password_check" label="Confirm password" label-placement="stacked" placeholder="••••••••" type="password"></ion-input>
            </ion-item>
            <ion-item>
              <ion-select v-model="state" label="State" label-placement="stacked" placeholder="Select state" interface="popover">
                <ion-select-option value="act">ACT</ion-select-option>
                <ion-select-option value="nsw">NSW</ion-select-option>
                <ion-select-option value="vic">VIC</ion-select-option>
                <ion-select-option value="qld">QLD</ion-select-option>
                <ion-select-option value="sa">SA</ion-select-option>
                <ion-select-option value="wa">WA</ion-select-option>
                <ion-select-option value="tas">TAS</ion-select-option>
                <ion-select-option value="nt">NT</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-input v-model="license_number" label="Licence number (optional)" label-placement="stacked" type="text"></ion-input>
            </ion-item>
          </ion-list>

          <ion-button expand="block" class="ion-margin-top" @click="signUp">Sign up</ion-button>
          <ion-button expand="block" fill="clear" router-link="/login">Already have an account? Log in</ion-button>
          <p v-if="error_txt" class="error-msg">{{ error_txt }}</p>
        </div>
      </ion-content>
    </ion-page>
  </template>

  <script setup lang="ts">
    import { IonButton, IonInput, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonSelect, IonSelectOption } from '@ionic/vue';
    import { ref } from 'vue'
    import { useRouter } from 'vue-router'
    import { CapacitorHttp } from '@capacitor/core'
    import { Preferences } from '@capacitor/preferences'
    const router = useRouter()
    const API_URL = import.meta.env.VITE_API_URL

    const f_name = ref('')
    const l_name = ref('')
    const email = ref('')
    const password = ref('')
    const password_check = ref('')
    const state = ref('')
    const license_number = ref('')
    const error_txt = ref('')

    const signIn = async () => {
      const r = await CapacitorHttp.post({
        url: `${API_URL}/api/login`,
        headers: { 'Content-Type': 'application/json' },
        data: { email: email.value, password: password.value }
      })
      if (r.status === 200) {
        await Preferences.set({ key: 'auth_token', value: r.data.token })
      }
    }
    const add_info = async () => {
      const { value: token } = await Preferences.get({ key: 'auth_token' })
      const r = await CapacitorHttp.post({
        url: `${API_URL}/api/set_licence`,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        data: { state: state.value, licence_no: license_number.value }
      })
      console.log(r.data)
    }
    const signUp = async () => {
      error_txt.value = ''
      // bolt-on 1: passwords must match (client-side, before the request)
      if (password.value !== password_check.value) { error_txt.value = "passwords don't match"; return }

      // bolt-on 2: catch network errors instead of letting them throw unhandled
      try {
        const response = await CapacitorHttp.post({
          url: `${API_URL}/api/register`,
          headers: { 'Content-Type': 'application/json' },
          data: { email: email.value, pwd: password.value, f_name: f_name.value,
                  l_name: l_name.value, state: state.value,
                  licence_no: license_number.value }
        })
        if (response.status !== 200) {
          const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data
          error_txt.value = data?.message ?? 'register failed'
          return
        }
        await signIn();
        await add_info();
        router.push('/login') // login will cashe all need data and then redirect you to /tabs/dasbord
      } catch (e) {
        console.error('register error', e)
        error_txt.value = "can't reach the server, try again"
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

.error-msg {
  color: var(--ion-color-danger);
  text-align: center;
  font-size: 14px;
  margin-top: 12px;
}
</style>
