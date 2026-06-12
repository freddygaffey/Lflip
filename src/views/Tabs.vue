<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>L Flip</ion-title>
        <ion-buttons slot="end">
          <router-link to="/tabs/debug">
            <ion-button>
              <ion-icon slot="icon-only" :ios="bugOutline" :md="bugSharp"></ion-icon>
            </ion-button>
          </router-link>
          <router-link to="/tabs/settings">
            <ion-button>
              <ion-icon slot="icon-only" :ios="settingsOutline" :md="settingsSharp"></ion-icon>
            </ion-button>
          </router-link>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="dashboard" href="/tabs/dashboard">
          <ion-icon :ios="bookOutline" :md="bookSharp"></ion-icon>
          <ion-label>Dashboard</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="startTrip" href="/tabs/startTrip" class="lp-start-tab">
          <div class="lp-record-icon">
            <span class="lp-record-dot"></span>
          </div>
          <ion-label>Start</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="ai" href="/tabs/ai">
          <ion-icon :ios="chatbubblesOutline" :md="chatbubblesSharp"></ion-icon>
          <ion-label>Assistant</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonTabs, IonTabBar, IonTabButton, IonLabel, IonRouterOutlet, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon } from '@ionic/vue'
import { settingsOutline, settingsSharp, bugOutline, bugSharp, bookOutline, bookSharp, chatbubblesOutline, chatbubblesSharp } from 'ionicons/icons'
</script>