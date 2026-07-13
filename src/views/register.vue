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
          <p class="legal-note">
            By signing up you agree to the
            <router-link to="/terms">Terms of Use</router-link> and
            <router-link to="/privacy">Privacy Policy</router-link>.
          </p>
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
    import { api, login } from './classes/api'
    const router = useRouter()

    const f_name = ref('')
    const l_name = ref('')
    const email = ref('')
    const password = ref('')
    const password_check = ref('')
    const state = ref('')
    const license_number = ref('')
    const error_txt = ref('')

    const signIn = async () => {
      await login(email.value, password.value)
    }
    const add_info = async () => {
      const r = await api.post('/api/set_licence', { state: state.value, licence_no: license_number.value })
      console.log(r.data)
    }
    const signUp = async () => {
      error_txt.value = ''
      if (password.value !== password_check.value) { error_txt.value = "passwords don't match"; return }
      try {
        const response = await api.post('/api/register', {
          email: email.value, pwd: password.value, f_name: f_name.value,
          l_name: l_name.value, state: state.value,
          licence_no: license_number.value,
        })
        if (response.status !== 200) {
          error_txt.value = response.data?.message ?? 'register failed'
          return
        }
        await signIn();
        await add_info();
        router.push('/login')
      } catch {
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

.legal-note {
  text-align: center;
  font-size: 12px;
  color: var(--ion-color-medium);
  margin-top: 8px;
}

.error-msg {
  color: var(--ion-color-danger);
  text-align: center;
  font-size: 14px;
  margin-top: 12px;
}
</style>
