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
          Your smart L-plates are made of a <strong>controller</strong> (the box you
          pair your phone to) and one or two <strong>plates</strong> (the L-plates
          themselves). The controller talks to your phone over Bluetooth and tells
          the plates when to show the L.
        </p>

        <h2>Pairing for the first time</h2>
        <ol>
          <li>Put the controller into <strong>pairing mode</strong> — tap the button
            on the controller once (or use the pairing control in the app). Its light
            blinks for about 60&nbsp;seconds.</li>
          <li>Turn on any plates you want to pair. While the light is blinking, each
            powered-on plate <strong>joins automatically</strong> — there's no list to
            pick from.</li>
          <li>The light turns solid once at least one plate has joined. That's it.</li>
        </ol>

        <h2>Moving a plate to a different controller</h2>
        <p>
          Tap the button on the <strong>plate</strong> itself once. It forgets its
          current controller and joins whichever controller is in pairing mode. Put
          the new controller into pairing mode first (step 1 above), then tap the
          plate.
        </p>

        <h2>If something isn't working</h2>
        <p>Most problems are fixed by re-pairing. The buttons do different things
          depending on how long you hold them:</p>

        <h3>Controller button</h3>
        <ul>
          <li><strong>Tap once</strong> — open pairing mode for 60&nbsp;seconds.</li>
          <li><strong>Hold for 5&nbsp;seconds</strong> — full reset. The controller
            forgets everything and starts fresh, so you'll need to add the car again
            in the app.</li>
        </ul>

        <h3>Plate button</h3>
        <ul>
          <li><strong>Tap once</strong> — forget its controller and re-pair.</li>
          <li><strong>Hold for 5&nbsp;seconds</strong> — full reset. This also clears
            the plate's flip calibration, so it may need re-calibrating.</li>
        </ul>

        <h2>Why the plates sometimes feel slower</h2>
        <p>
          While your phone is connected to the controller, the plates respond quickly
          so flipping the L feels instant. When your phone is disconnected, they slow
          down on purpose to save battery — this is normal.
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
