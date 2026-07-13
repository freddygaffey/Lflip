<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Terms of Use</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="legal">
        <p class="meta">Last updated: 13 July 2026</p>

        <p>
          These terms apply to the L Flip app, website (lflip.pebnum.com) and
          related hardware ("the service"). By creating an account or using the
          service you agree to them. If you are under 18, a parent or guardian
          should agree to these terms on your behalf.
        </p>

        <h2>1. Not an official logbook</h2>
        <p>
          L Flip helps you track driving practice, but it is
          <strong>not an official record</strong> and is not affiliated with any
          government or licensing authority. You are responsible for meeting your
          state or territory's official logbook and supervised-driving
          requirements. Do not rely on L Flip as your only record — data can be
          lost, and hours logged here may not be accepted by your licensing
          authority.
        </p>

        <h2>2. Safety first</h2>
        <p>
          Never look at, touch, or interact with the app while driving. Set up
          your trip before you start and end it after you have parked. Follow all
          road rules and the directions of your supervising driver.
        </p>

        <h2>3. Your account</h2>
        <ul>
          <li>Give accurate information and keep your password secret. You are responsible for activity on your account.</li>
          <li>Only add a supervising driver's name and licence number with their permission.</li>
          <li>Log your trips honestly. Falsifying practice hours may be an offence under your state's licensing laws.</li>
        </ul>

        <h2>4. Acceptable use</h2>
        <p>Don't misuse the service. That includes attempting to access other
          users' data, probing or disrupting our servers, automating requests or
          scraping, circumventing rate limits (including AI usage limits), or
          using the service for anything unlawful.</p>

        <h2>5. AI assistant</h2>
        <p>
          The AI assistant can make mistakes. Its answers are general information,
          not legal, licensing, or driving advice — always check official sources
          for licensing rules. What the assistant can access, and where your
          messages go, is described in the Privacy Policy.
        </p>

        <h2>6. Hardware</h2>
        <p>
          L Flip hardware (the smart L-plate) is provided as-is for use with the
          app. It does not replace the physical L-plate display requirements of
          your state or territory unless it lawfully meets them — check your
          local rules.
        </p>

        <h2>7. Your content</h2>
        <p>
          Your trips, chats and other data remain yours. You give us permission to
          store and process them only as needed to run the service, as described
          in the Privacy Policy.
        </p>

        <h2>8. Ending your account</h2>
        <p>
          You can stop using the service at any time and ask us to delete your
          account and data. We may suspend or close accounts that break these
          terms or abuse the service.
        </p>

        <h2>9. Disclaimers and liability</h2>
        <p>
          The service is provided free of charge and "as is". To the extent
          permitted by law, we exclude all warranties and are not liable for any
          loss arising from your use of the service, including lost or inaccurate
          trip data. Nothing in these terms excludes rights you have under the
          Australian Consumer Law that cannot be excluded.
        </p>

        <h2>10. Changes</h2>
        <p>
          We may update these terms; the date at the top shows the current
          version. If you keep using the service after a change, you accept the
          updated terms.
        </p>

        <h2>11. Governing law</h2>
        <p>
          These terms are governed by the laws of the Australian Capital
          Territory, Australia.
        </p>

        <h2>Contact</h2>
        <p>Questions about these terms? Email
          <a :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a>.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
} from '@ionic/vue'
import { CONTACT_EMAIL } from './classes/legal'
</script>

<style scoped>
.legal {
  max-width: 640px;
  margin: 0 auto;
  line-height: 1.55;
}
.legal h2 {
  font-size: 1.1rem;
  margin-top: 1.6em;
}
.legal .meta {
  color: var(--ion-color-medium);
  font-size: 0.85rem;
}
.legal ul {
  padding-left: 1.2em;
}
</style>
