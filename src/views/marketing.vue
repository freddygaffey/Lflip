<template>
  <ion-page>
    <ion-content :fullscreen="true" class="bg">
      <div class="hero">
        <div class="badge">L</div>
        <h1 class="title">L&nbsp;Plate</h1>
        <p class="tag">The pocket logbook for learner drivers.</p>
        <p class="sub">Tap to start. Drive. We log the rest — hours, GPS, day vs night, supervisor — automatically.</p>

        <div class="cta">
          <a class="store" href="#">📱 App Store</a>
          <a class="store" href="#">▶ Google Play</a>
        </div>
        <p class="hint">You're on the web preview — grab the app on your phone to start logging.</p>
      </div>

      <div class="features">
        <div class="card">
          <div class="emoji">📍</div>
          <h3>GPS auto-tracking</h3>
          <p>Every trip mapped without lifting a finger.</p>
        </div>
        <div class="card">
          <div class="emoji">🌙</div>
          <h3>Day &amp; night counter</h3>
          <p>Hits the 10-hour night requirement before you do.</p>
        </div>
        <div class="card">
          <div class="emoji">👨‍🏫</div>
          <h3>Supervisor sign-off</h3>
          <p>Linked to your licensed driver — no paperwork.</p>
        </div>
        <div class="card">
          <div class="emoji">🤖</div>
          <h3>AI driving tips</h3>
          <p>Chat-based coaching tuned to your real data.</p>
        </div>
      </div>

      <ion-button expand="block" class="back" @click="router.back()">← Back to the app</ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent, IonButton } from '@ionic/vue'
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<style scoped>
.bg {
  --background: linear-gradient(160deg, #ff4d6d 0%, #7209b7 55%, #3a0ca3 100%);
}
.hero {
  text-align: center;
  padding: 64px 24px 32px;
  color: #fff;
}
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  border-radius: 24px;
  background: #ffd60a;
  color: #1a1a2e;
  font-size: 52px;
  font-weight: 900;
  font-family: Impact, sans-serif;
  box-shadow: 0 12px 40px rgba(0,0,0,0.35);
  margin-bottom: 20px;
}
.title {
  font-size: 64px;
  font-weight: 900;
  margin: 0 0 8px;
  letter-spacing: -2px;
  text-shadow: 0 4px 24px rgba(0,0,0,0.3);
}
.tag {
  font-size: 22px;
  font-weight: 600;
  margin: 0 0 12px;
  opacity: 0.95;
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
  margin-bottom: 12px;
}
.store {
  background: #000;
  color: #fff;
  padding: 12px 20px;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 700;
  font-size: 15px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.35);
  transition: transform 0.15s ease;
}
.store:hover { transform: translateY(-2px); }
.hint {
  font-size: 13px;
  opacity: 0.7;
  margin-top: 16px;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  padding: 16px 20px 8px;
}
.card {
  background: rgba(255,255,255,0.12);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 18px;
  padding: 20px;
  color: #fff;
}
.card h3 { margin: 8px 0 6px; font-size: 18px; }
.card p { margin: 0; font-size: 14px; opacity: 0.85; line-height: 1.4; }
.emoji { font-size: 32px; }

.back {
  margin: 24px 20px 32px;
  --background: rgba(255,255,255,0.9);
  --color: #3a0ca3;
  --border-radius: 14px;
  font-weight: 700;
}
</style>
