<template>
    <ion-page>
      <ion-content>
        <ion-input v-model="username" placeholder="username" type="text"></ion-input>
        <ion-input v-model="password" placeholder="password" type="password"></ion-input>
        <ion-select v-model="state" placeholder="Select state" interface="popover">
            <ion-select-option value="act">ACT</ion-select-option>
            <ion-select-option value="nsw">NSW</ion-select-option>
            <ion-select-option value="vic">VIC</ion-select-option>
            <ion-select-option value="qld">QLD</ion-select-option>
            <ion-select-option value="sa">SA</ion-select-option>
            <ion-select-option value="wa">WA</ion-select-option>
            <ion-select-option value="tas">TAS</ion-select-option>
            <ion-select-option value="nt">NT</ion-select-option>
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
  
    const username = ref('')
    const password = ref('')
    const state = ref('')
    const role = ref('')
    const license_number = ref('')
  
    const signUp = async () => {
    console.log("username", username.value)
    console.log("password", password.value)
    console.log("state", state.value)
    console.log("role", role.value)
    console.log("license_number", license_number.value)
      const response = await fetch('http://127.0.0.1:5000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: username.value, pwd: password.value, state: state.value, role: role.value, licence_no: license_number.value }),
      })
      const data = await response.json()
      console.log(data)
    }
  </script>