<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="dashboard" href="/tabs/dashboard">
          <ion-icon :ios="bookOutline" :md="bookSharp"></ion-icon>
          <ion-label>Dashboard</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="ai" href="/tabs/ai">
          <ion-icon :ios="chatbubblesOutline" :md="chatbubblesSharp"></ion-icon>
          <ion-label>Assistant</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="startTrip" href="/tabs/startTrip" class="lp-start-tab">
          <div class="lp-record-icon">
            <span class="lp-record-dot"></span>
          </div>
          <ion-label>Record</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="settings" href="/tabs/settings">
          <ion-icon :ios="settingsOutline" :md="settingsSharp"></ion-icon>
          <ion-label>Settings</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="debug" href="/tabs/debug">
          <ion-icon :ios="bugOutline" :md="bugSharp"></ion-icon>
          <ion-label>Debug</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonTabs, IonTabBar, IonTabButton, IonLabel, IonRouterOutlet, IonIcon } from '@ionic/vue'
import {
  bookOutline, bookSharp, chatbubblesOutline, chatbubblesSharp,
  settingsOutline, settingsSharp, bugOutline, bugSharp,
} from 'ionicons/icons'
</script>
