<template>
    <ion-page>
      <ion-header>
        <ion-toolbar>
          <ion-title>Register</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-input v-model="f_name" placeholder="first name" type="text"></ion-input>
        <ion-input v-model="l_name" placeholder="last name" type="text"></ion-input>
        <ion-input v-model="email" placeholder="email" type="email"></ion-input>
        <ion-input v-model="password" placeholder="password" type="password"></ion-input>
        <ion-select v-model="state" placeholder="Select state" interface="popover">
            <select v-model="state" slot="lable">
                <ion-select-option value="act">ACT</ion-select-option>
                <ion-select-option value="nsw">NSW</ion-select-option>
                <ion-select-option value="vic">VIC</ion-select-option>
                <ion-select-option value="qld">QLD</ion-select-option>
                <ion-select-option value="sa">SA</ion-select-option>
                <ion-select-option value="wa">WA</ion-select-option>
                <ion-select-option value="tas">TAS</ion-select-option>
                <ion-select-option value="nt">NT</ion-select-option>
            </select>
        </ion-select>
        <ion-button :color="role == 'learner' ? 'success' : 'danger'" v-model="role" @click="role = 'learner'">learner</ion-button>
        <ion-button :color="role == 'sd' ? 'success' : 'danger'" v-model="role" @click="role = 'sd'">sd</ion-button>
        <ion-input v-model="license_number" :placeholder="role === 'learner' ? 'license number (optinal)' : 'licence number'" type="text"></ion-input>
        <ion-button @click="signUp">sign up</ion-button>
      </ion-content>
    </ion-page>
  </template>
  
  <script setup lang="ts">
    import { IonButton, IonInput, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonSelect, IonSelectOption } from '@ionic/vue';
    import { ref } from 'vue'
    import { useRouter } from 'vue-router'

    const router = useRouter()
  
    const f_name = ref('')
    const l_name = ref('')
    const email = ref('')
    const password = ref('')
    const state = ref('')
    const role = ref('')
    const license_number = ref('')
  
    const signIn = async () => {
      const response = await fetch('http://localhost:5001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.value, password: password.value }),
        credentials: 'include'
      })
      const data = await response.json()
    }
    const add_info = async () => {
      const r = await fetch('http://localhost:5001/api/set_licence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({  state: state.value,
                                role: role.value,
                                licence_no: license_number.value }),
        credentials: 'include'
      })
      const d = await r.json()
      console.log(d)
    }
    const signUp = async () => {
      const response = await fetch('http://localhost:5001/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.value,
                               pwd: password.value,
                                f_name: f_name.value,
                                l_name: l_name.value,
                                state: state.value,
                                role: role.value,
                                licence_no: license_number.value }),
        credentials: 'include'
      })
      if (!response.ok) { console.error('register failed', await response.json()); return; }
      await signIn();
      await add_info();
      router.push('/tabs/dashboard')
    }
  </script>