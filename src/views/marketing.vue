<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="hero">
        <div class="lplate">L</div>
        <h1 class="title">L&nbsp;Flip</h1>
        <p class="tag">The pocket logbook for learner drivers.</p>
        <p class="sub">Tap to start. Drive. We log the rest — hours, GPS, day vs&nbsp;night and supervisor — automatically.</p>

        <div class="cta">
          <a class="store" href="#" @click.prevent="comingSoon">App&nbsp;Store</a>
          <a class="store" href="#" @click.prevent="comingSoon">Google&nbsp;Play</a>
        </div>
        <div class="phone-only">
          <span class="phone-only__icon">📱</span>
          <p class="phone-only__text">
            <strong>Drives can only be logged in the phone app.</strong>
            Logging uses your phone's GPS (and Bluetooth for smart L-plates), so it
            can't run in a browser. This page is just a preview — install L&nbsp;Flip
            on your phone to start logging.
          </p>
        </div>
      </div>

      <div class="features">
        <div class="card">
          <div class="icon icon-blue">📍</div>
          <h3>GPS auto-tracking</h3>
          <p>Every trip mapped without lifting a finger.</p>
        </div>
        <div class="card">
          <div class="icon icon-dark">🌙</div>
          <h3>Day &amp; night counter</h3>
          <p>Hits the 10-hour night requirement before you do.</p>
        </div>
        <div class="card">
          <div class="icon icon-green">✓</div>
          <h3>Supervisor sign-off</h3>
          <p>Linked to your licensed driver — no paperwork.</p>
        </div>
        <div class="card">
          <div class="icon icon-yellow">AI</div>
          <h3>AI driving tips</h3>
          <p>Chat-based coaching tuned to your real data.</p>
        </div>
      </div>

      <div class="footer">
        <ion-button expand="block" class="back" @click="router.push('/tabs')">← Back to the app</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent, IonButton } from '@ionic/vue'
import { useRouter } from 'vue-router'
const router = useRouter()

const comingSoon = () => {
  alert('L Flip is still in development and not ready for release yet. If you\'d like a demo, please email the developer at porthole-heave-owl@duck.com.')
}
</script>

<style scoped>
ion-content {
  --background: #f4f5f9;
}

/* ===== Hero — navy "official logbook" band ===== */
.hero {
  text-align: center;
  padding: 64px 24px 56px;
  color: #fff;
  background: #1a2a5e;
}

/* a real Australian L-plate: yellow square, black L */
.lplate {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  border-radius: 12px;
  background: var(--lp-yellow);
  color: var(--lp-dark);
  font-size: 60px;
  font-weight: 900;
  font-family: Arial, Helvetica, sans-serif;
  line-height: 1;
  box-shadow: 0 8px 24px rgba(0,0,0,0.35);
  margin-bottom: 20px;
}

.title {
  font-size: 56px;
  font-weight: 800;
  margin: 0 0 8px;
  letter-spacing: -1.5px;
}
.tag {
  font-size: 21px;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--lp-yellow);
}
.sub {
  font-size: 16px;
  max-width: 420px;
  margin: 0 auto 28px;
  opacity: 0.85;
  line-height: 1.5;
}

.cta {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.store {
  background: var(--lp-yellow);
  color: var(--lp-dark);
  padding: 12px 22px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 700;
  font-size: 15px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.store:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0,0,0,0.3);
}
/* phone-only notice — makes it clear logging needs the app, not the web */
.phone-only {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  text-align: left;
  max-width: 420px;
  margin: 4px auto 0;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
}
.phone-only__icon {
  font-size: 22px;
  line-height: 1.4;
}
.phone-only__text {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
  opacity: 0.92;
}
.phone-only__text strong {
  display: block;
  margin-bottom: 3px;
  color: var(--lp-yellow);
  font-size: 14px;
}

/* ===== Features — clean document-style cards ===== */
.features {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  padding: 24px 20px 8px;
  max-width: 1100px;
  margin: 0 auto;
}

/* mobile: centered 2 x 2 grid */
@media (max-width: 640px) {
  .features {
    grid-template-columns: repeat(2, 1fr);
    max-width: 460px;
  }
}
.card {
  background: #fff;
  border: 1px solid #d7dbe8;
  border-top: 3px solid #1a2a5e;
  border-radius: 6px;
  padding: 20px;
  color: #1a1a1a;
}
.card h3 {
  margin: 12px 0 6px;
  font-size: 17px;
  color: #1a2a5e;
}
.card p {
  margin: 0;
  font-size: 14px;
  color: #555;
  line-height: 1.45;
}

.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  font-size: 22px;
  font-weight: 800;
}
.icon-blue   { background: var(--lp-blue);   color: #fff; }
.icon-dark   { background: var(--lp-dark);   color: #fff; }
.icon-green  { background: var(--lp-green);  color: #fff; }
.icon-yellow { background: var(--lp-yellow); color: var(--lp-dark); font-size: 16px; }

/* ===== Footer ===== */
.footer {
  max-width: 760px;
  margin: 0 auto;
}
.back {
  margin: 24px 20px 32px;
  --border-radius: 8px;
  font-weight: 700;
}
</style>
