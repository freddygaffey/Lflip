<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>AI Chat</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :scroll-y="false">
      <div v-if="loading" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 12px; padding: 24px; text-align: center;">
        <ion-spinner name="crescent"></ion-spinner>
        <p>Please wait, AI chat is loading...</p>
        <p style="font-size: 0.85em; color: gray;">If this takes too long, please check your internet connection.</p>
      </div>
      <iframe
          v-show="!loading"
          src="https://www.chatbase.co/chatbot-iframe/Llyxf7QiQNvd_iQZve-fq"
          frameborder="0"
          style="display: block; width: 100%; height: 100%; border: none;"
          @load="loading = false"
      ></iframe>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonSpinner } from '@ionic/vue'
import { ref } from 'vue'

const loading = ref(true)
</script>
