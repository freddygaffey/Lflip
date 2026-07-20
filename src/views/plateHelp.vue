<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>How L-plates work</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="help">
        <p>
          Your smart L-plates are made of a <strong>controller</strong> (the small box
          your phone connects to over Bluetooth) and one or two <strong>plates</strong>
          (the L-plates themselves). The controller tells the plates when to show the L.
        </p>

        <h2>Pairing for the first time</h2>
        <p>
          Pairing is done from the app. When you add a car, the app puts the controller
          into a 60-second <strong>pairing window</strong> and its light blinks. Power on
          your plates during that window and each one <strong>joins automatically</strong>
          — there's no list to pick from. The light stops blinking and stays solid once
          pairing finishes and a plate is connected.
        </p>

        <h2>Moving a plate to a different controller</h2>
        <p>
          Tap the button on the <strong>plate</strong> itself once. It forgets its current
          controller and joins whichever controller has a pairing window open. Start
          pairing on the new controller from the app first, then tap the plate.
        </p>

        <h2>If something isn't working</h2>
        <p>
          Most problems are fixed by pairing again from the app. If that doesn't help, the
          buttons on the hardware reset things. They do different things depending on how
          long you hold them.
        </p>

        <h3>Controller button</h3>
        <ul>
          <li><strong>Tap once</strong> — the controller starts fresh: it reopens a pairing
            window but also takes on a new identity, so you'll need to <strong>add the car
            again in the app</strong>. Its existing plates stay paired.</li>
          <li><strong>Hold for 5&nbsp;seconds</strong> — full reset. The controller forgets
            everything, including its paired plates, and you'll need to add the car again.</li>
        </ul>

        <h3>Plate button</h3>
        <ul>
          <li><strong>Tap once</strong> — forget its controller and re-pair with whichever
            controller has a pairing window open.</li>
          <li><strong>Hold for 5&nbsp;seconds</strong> — full reset. This also clears the
            plate's flip calibration, so it may need re-calibrating.</li>
        </ul>

        <h2>Why the plates sometimes feel slower</h2>
        <p>
          While your phone is connected to the controller, the plates respond quickly so
          flipping the L feels instant. When your phone is disconnected they slow right
          down to save battery — this is normal.
        </p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton,
} from '@ionic/vue'
</script>

<style scoped>
.help {
  max-width: 640px;
  margin: 0 auto;
  line-height: 1.55;
}
.help h2 {
  font-size: 18px;
  margin: 22px 0 6px;
}
.help h3 {
  font-size: 15px;
  margin: 14px 0 4px;
}
.help ol, .help ul {
  padding-left: 20px;
  margin: 6px 0;
}
.help li {
  margin: 4px 0;
}
</style>
