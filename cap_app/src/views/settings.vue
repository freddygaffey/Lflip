<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-button @click="signOut" color="danger">Sign out</ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButton } from '@ionic/vue'
import { useRouter } from 'vue-router'
import { Preferences } from '@capacitor/preferences'

const router = useRouter()

const signOut = async () => {
  await Preferences.remove({ key: 'auth_token' })
  router.push('/')
}
</script>
