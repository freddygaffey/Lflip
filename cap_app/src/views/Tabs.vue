<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="startTrip" href="/tabs/startTrip">
          <ion-label>Log Trip</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="dashboard" href="/tabs/dashboard">
          <ion-label>Dashboard</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="ai" href="/tabs/ai">
          <ion-label>AI Chat</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="settings" href="/tabs/settings">
          <ion-label>Settings</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="debug" href="/tabs/debug">
          <ion-label>Debug</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonTabs, IonTabBar, IonTabButton, IonLabel, IonRouterOutlet } from '@ionic/vue'
</script>
