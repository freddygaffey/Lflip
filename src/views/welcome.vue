<template>
  <ion-page>
    <ion-content :fullscreen="true" class="welcome-content">
      <div class="welcome-wrap">
        <!-- top bar: dots + skip -->
        <div class="top-bar">
          <div class="dots">
            <span
              v-for="(s, i) in slides"
              :key="i"
              class="dot"
              :class="{ active: i === index }"
              @click="goTo(i)"
            ></span>
          </div>
          <button v-if="!isLast" class="skip" @click="finish">Skip</button>
          <span v-else class="skip-spacer"></span>
        </div>

        <!-- swipeable slide track -->
        <div
          class="viewport"
          @touchstart="onTouchStart"
          @touchend="onTouchEnd"
        >
          <div class="track" :style="{ transform: `translateX(-${index * 100}%)` }">
            <section v-for="(s, i) in slides" :key="i" class="slide">
              <div class="art" :style="{ background: s.bg }">
                <div v-if="s.plate" class="lplate">L</div>
                <div v-else class="emoji">{{ s.emoji }}</div>
              </div>
              <h1 class="title">{{ s.title }}</h1>
              <p class="tag">{{ s.tag }}</p>
              <p class="body">{{ s.body }}</p>
            </section>
          </div>
        </div>

        <!-- bottom controls -->
        <div class="controls">
          <ion-button
            v-if="index > 0"
            fill="clear"
            class="back-btn"
            @click="prev"
          >Back</ion-button>
          <span v-else class="back-spacer"></span>

          <ion-button v-if="!isLast" class="next-btn" @click="next">Next</ion-button>
          <ion-button v-else class="next-btn" @click="finish">Get Started</ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { IonPage, IonContent, IonButton } from '@ionic/vue'
import { useRouter } from 'vue-router'
import { Preferences } from '@capacitor/preferences'

const router = useRouter()

// the three intro slides — copy mirrors the marketing page so the app has one voice
const slides = [
  {
    plate: true,
    emoji: '',
    bg: '#1a2a5e',
    title: 'Welcome to L Flip',
    tag: 'The pocket logbook for learner drivers.',
    body: 'Tap to start, drive, and we log the rest — hours, GPS, and day vs night — automatically. No more paper logbook.',
  },
  {
    plate: false,
    emoji: '🚗',
    bg: 'var(--lp-green)',
    title: 'Log a trip in three taps',
    tag: 'Start → drive → end.',
    body: 'Enter your odometer and hit Start. When you finish, add your end odometer and weather. Your trip lands on the dashboard and counts toward your required hours.',
  },
  {
    plate: false,
    emoji: '🔗',
    bg: 'var(--lp-blue)',
    title: 'Make it yours (optional)',
    tag: 'Cars, supervisors, and smart L-plates.',
    body: 'Add your car to pair L-plate hardware, or save your supervisor for one-tap sign-off. In a hurry? Pick “Guest” at trip start and log a drive right now.',
  },
] as const

const index = ref(0)
const isLast = computed(() => index.value === slides.length - 1)

function goTo(i: number) {
  index.value = i
}
function next() {
  if (index.value < slides.length - 1) index.value++
}
function prev() {
  if (index.value > 0) index.value--
}

// consume the flag registration set. once it's gone the intro can't come back,
// even though signing out clears preferences.
async function finish() {
  await Preferences.remove({ key: 'needsOnboarding' })
  router.replace('/tabs/dashboard')
}

// lightweight horizontal swipe (no Swiper dependency needed on Ionic 8)
let touchStartX = 0
function onTouchStart(e: TouchEvent) {
  touchStartX = e.changedTouches[0].clientX
}
function onTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - touchStartX
  if (Math.abs(dx) < 40) return
  if (dx < 0) next()
  else prev()
}
</script>

<style scoped>
.welcome-content {
  --background: #f4f5f9;
}

.welcome-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 480px;
  margin: 0 auto;
  padding: 12px 20px calc(20px + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

/* ===== top bar ===== */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
}
.dots {
  display: flex;
  gap: 8px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #c7ccda;
  transition: width 0.2s ease, background 0.2s ease;
  cursor: pointer;
}
.dot.active {
  width: 22px;
  border-radius: 4px;
  background: var(--lp-blue);
}
.skip {
  background: none;
  border: none;
  color: #6b7280;
  font-size: 15px;
  font-weight: 600;
  padding: 6px 4px;
  cursor: pointer;
}
.skip-spacer,
.back-spacer {
  visibility: hidden;
}

/* ===== slides ===== */
.viewport {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
}
.track {
  display: flex;
  width: 100%;
  transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide {
  flex: 0 0 100%;
  text-align: center;
  padding: 8px 8px 0;
  box-sizing: border-box;
}

.art {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 168px;
  height: 168px;
  border-radius: 28px;
  margin: 0 auto 32px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.22);
}
/* a real Australian L-plate: yellow square, black L */
.lplate {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 104px;
  height: 104px;
  border-radius: 14px;
  background: var(--lp-yellow);
  color: var(--lp-dark);
  font-size: 74px;
  font-weight: 900;
  font-family: Arial, Helvetica, sans-serif;
  line-height: 1;
}
.emoji {
  font-size: 82px;
  line-height: 1;
}

.title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin: 0 0 8px;
  color: #1a2a5e;
}
.tag {
  font-size: 17px;
  font-weight: 700;
  margin: 0 0 14px;
  color: var(--lp-blue);
}
.body {
  font-size: 15.5px;
  line-height: 1.55;
  color: #4b5563;
  max-width: 380px;
  margin: 0 auto;
}

/* ===== controls ===== */
.controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
}
.next-btn {
  --border-radius: 10px;
  font-weight: 700;
  min-width: 132px;
}
.back-btn {
  --color: #6b7280;
  font-weight: 600;
}
</style>
