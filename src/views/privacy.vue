<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Privacy Policy</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="legal">
        <p class="meta">Last updated: 13 July 2026</p>

        <p>
          L Flip ("we", "us") is a driving practice logger for Australian learner
          drivers, available at lflip.pebnum.com and as a mobile app. This policy
          explains what personal information we collect, why we collect it, and
          what happens to it. We've tried to keep it in plain English.
        </p>

        <h2>What we collect</h2>
        <p><strong>Account details.</strong> When you register we collect your
          first and last name, email address, and a password. Your password is
          never stored in readable form — we keep only a salted hash
          (PBKDF2-SHA256).</p>
        <p><strong>Licence details.</strong> You can optionally provide your
          state/territory and learner licence number.</p>
        <p><strong>Supervisor details.</strong> When you add a supervising
          driver, we store their full name and licence number.
          <strong>Only enter a supervisor's details with their permission</strong> —
          you are giving us someone else's personal information.</p>
        <p><strong>Car details.</strong> A nickname and number plate for each car
          you add, plus Bluetooth pairing details if the car is paired with L Flip
          hardware.</p>
        <p><strong>Trip logs.</strong> Start and end times, odometer readings,
          day/night, weather, and which car and supervisor were used.</p>
        <p><strong>Location (GPS).</strong> While you are recording a drive, the
          app records your GPS position (latitude, longitude and speed) about once
          per second, so your route can be shown on a map and your driving
          conditions summarised. Location is only recorded during an active trip
          recording — never in the background — and only after you grant the
          location permission on your device. Recorded routes are stored with your
          trip on our server.</p>
        <p><strong>AI chat messages.</strong> If you use the AI assistant, your
          messages and the assistant's replies are stored with your account.</p>

        <h2>The AI assistant and your data</h2>
        <p>
          The assistant can only see the categories of your data that you switch
          on in Settings (trip logs, GPS routes, cars, supervisor first names,
          your identity details). Everything is <strong>off by default</strong>.
        </p>
        <p>
          Your chat messages, and any data categories you have enabled, are sent
          to the AI model that powers the assistant. That model is hosted through
          Ollama and may be processed on Ollama's cloud infrastructure. Don't put
          information in the chat that you wouldn't want processed by a
          third-party AI service.
        </p>
        <p>
          If you enable GPS access for the assistant, trip coordinates may also be
          sent to the Australian Bureau of Statistics' public geocoding service
          (geo.abs.gov.au) to classify where you drove (e.g. city vs regional).
          Only coordinates are sent — never your name or account details.
        </p>

        <h2>Cookies, local storage and tracking</h2>
        <p>
          On the web we set a single cookie (<code>auth_token</code>) to keep you
          signed in. It is HTTP-only and secure, and is not used for tracking or
          advertising. The app also caches your trips and preferences on your own
          device so it works offline.
        </p>
        <p>
          We use <strong>no analytics, advertising, or tracking services</strong>
          of any kind. Map tiles are loaded from OpenStreetMap, which (like any
          web server) receives your IP address when tiles load.
        </p>

        <h2>Who can see your data</h2>
        <p>We never sell your data or share it for marketing. Your data is only
          handled by the services that run L Flip:</p>
        <ul>
          <li>Cloudflare — hosts the web app and provides security for our domain.</li>
          <li>Our server hosting provider — runs the server and database that store your account and trips.</li>
          <li>Ollama — hosts the AI model, as described above, only if you use the assistant.</li>
          <li>Australian Bureau of Statistics geocoding — receives coordinates only, as described above.</li>
          <li>OpenStreetMap — serves map images.</li>
        </ul>

        <h2>How we protect it</h2>
        <p>
          All traffic to our servers is encrypted with HTTPS. Passwords are
          hashed, sign-in attempts are rate-limited, and session cookies are
          HTTP-only so scripts can't read them. No system is perfectly secure,
          but we follow standard good practice.
        </p>

        <h2>Keeping and deleting your data</h2>
        <p>
          We keep your data while your account exists. You can delete individual
          trips, cars and supervisors in the app at any time; deleting a trip also
          deletes its GPS route. Deleting an AI chat hides it from your account;
          contact us if you want individual chats fully erased sooner. You can
          delete your entire account — including all trips, GPS routes, cars,
          supervisors, chats and your licence details — in Settings → Delete
          Account. Deletion is immediate and permanent.
        </p>

        <h2>Your rights</h2>
        <p>
          You can ask us at any time to see the personal information we hold about
          you, correct it, or delete it. Contact us at the address below and we
          will respond as soon as we can. If you're unhappy with how we handle
          your information you can also complain to the Office of the Australian
          Information Commissioner (oaic.gov.au).
        </p>

        <h2>Users under 18</h2>
        <p>
          Most L Flip users are learner drivers and may be under 18. We collect
          only what the app needs to work, and we don't use it for advertising or
          profiling. If you are under 18, please make sure a parent or guardian is
          okay with you using L Flip.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          If we change this policy we will update this page and the date at the
          top. Significant changes will be flagged in the app.
        </p>

        <h2>Contact</h2>
        <p>Questions, or want your data corrected or deleted? Email
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
