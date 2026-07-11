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
    const state = ref('')
    const license_number = ref('')
  
    const signIn = async () => {
      await login(email.value, password.value)
    }
    const add_info = async () => {
      const r = await api.post('/api/set_licence', { state: state.value, licence_no: license_number.value })
      console.log(r.data)
    }
    const signUp = async () => {
      const response = await api.post('/api/register', {
        email: email.value, pwd: password.value, f_name: f_name.value,
        l_name: l_name.value, state: state.value,
        licence_no: license_number.value,
      })
      if (response.status !== 200) { console.error('register failed', response.data); return; }
      await signIn();
      await add_info();
      router.push('/login') // login will cashe all need data and then redirect you to /tabs/dasbord
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
</style>