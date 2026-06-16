<template>
  <ion-buttons slot="end">
    <ion-button router-link="/tabs/debug" aria-label="Debug">
      <ion-icon slot="icon-only" :ios="bugOutline" :md="bugSharp"></ion-icon>
    </ion-button>
    <ion-button router-link="/tabs/settings" aria-label="Settings">
      <ion-icon slot="icon-only" :ios="settingsOutline" :md="settingsSharp"></ion-icon>
    </ion-button>
  </ion-buttons>
</template>

<script setup lang="ts">
import { IonButtons, IonButton, IonIcon } from '@ionic/vue'
import { settingsOutline, settingsSharp, bugOutline, bugSharp } from 'ionicons/icons'
</script>
