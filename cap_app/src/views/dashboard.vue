<template>
  <ion-page>
    <ion-content>
      <h1>Dashboard</h1>
      <p>{{ displayData }}</p>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { IonPage, IonContent } from '@ionic/vue'

const displayData = ref('')

onMounted(() => {
  fetch('http://127.0.0.1:5000/api/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
    .then(res => res.text())
    .then(data => { displayData.value = data })
    .catch(err => { displayData.value = 'Error: ' + err })
})
</script>
