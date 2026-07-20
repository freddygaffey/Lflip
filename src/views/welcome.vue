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
            <section v-for="(s, i) in slides" :key="i" class="slide" :class="{ 'slide-prefs': s.prefs }">
              <div class="art" :style="{ background: s.bg }">
                <div class="lplate">L</div>
              </div>
              <h1 class="title">{{ s.title }}</h1>
              <p class="tag">{{ s.tag }}</p>
              <p class="body">{{ s.body }}</p>

              <ion-list v-if="s.prefs" class="pref-list" lines="full">
                <ion-item v-for="field in AI_PREF_FIELDS" :key="field.key">
                  <ion-label class="ion-text-wrap">
                    <h3>{{ field.label }}</h3>
                    <p>{{ field.description }}</p>
                  </ion-label>
                  <ion-toggle
                    slot="end"
                    :checked="aiPrefs[field.key]"
                    @ion-change="onPrefToggle(field.key, $event)"
                  ></ion-toggle>
                </ion-item>
              </ion-list>
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
import { ref, computed, onMounted } from 'vue'
import { IonPage, IonContent, IonButton, IonList, IonItem, IonLabel, IonToggle } from '@ionic/vue'
import type { ToggleCustomEvent } from '@ionic/vue'
import { useRouter } from 'vue-router'
import { Preferences } from '@capacitor/preferences'
import { aiPrefsStore, AI_PREF_FIELDS, type AiPrefs } from './classes/aiPrefs'

const aiPrefs = aiPrefsStore.prefs

// everything defaults to off; load whatever the account already has
onMounted(async () => {
  await aiPrefsStore.load_cache()
  aiPrefsStore.pull_cloud()
})

async function onPrefToggle(key: keyof AiPrefs, ev: ToggleCustomEvent) {
  await aiPrefsStore.set(key, ev.detail.checked)
}

const router = useRouter()

// the three intro slides — copy mirrors the marketing page so the app has one voice
const slides = [
  {
    bg: '#1a2a5e',
    title: 'Welcome to L Flip',
    tag: 'The pocket logbook for learner drivers.',
    body: 'Tap to start, drive, and we log the rest — hours, GPS, and day vs night — automatically. No more paper logbook.',
    prefs: false,
  },
  {
    bg: 'var(--lp-green)',
    title: 'Log a trip in three taps',
    tag: 'Start → drive → end.',
    body: 'Enter your odometer and hit Start. When you finish, add your end odometer and weather. Your trip lands on the dashboard and counts toward your required hours.',
    prefs: false,
  },
  {
    bg: 'var(--lp-blue)',
    title: 'Make it yours (optional)',
    tag: 'Cars, supervisors, and smart L-plates.',
    body: 'Add your car to pair L-plate hardware, or save your supervisor for one-tap sign-off. In a hurry? Pick “Guest” at trip start and log a drive right now.',
    prefs: false,
  },
  {
    bg: 'var(--lp-blue)',
    title: 'Your AI assistant',
    tag: 'You choose what it can see.',
    body: 'The assistant answers road-rules questions. It can only use the data you turn on here — everything starts off. You can change this any time in Settings.',
    prefs: true,
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
let touchStartY = 0
function onTouchStart(e: TouchEvent) {
  touchStartX = e.changedTouches[0].clientX
  touchStartY = e.changedTouches[0].clientY
}
function onTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - touchStartX
  const dy = e.changedTouches[0].clientY - touchStartY
  if (Math.abs(dx) < 40) return
  // the AI slide scrolls, so ignore gestures that are mostly vertical -
  // otherwise scrolling the toggles jumps to the next slide
  if (Math.abs(dy) > Math.abs(dx)) return
  if (dx < 0) next()
  else prev()
}
</script>

<style scoped>
.welcome-content {
  /* tokens so this screen can follow the system theme instead of being
     permanently light - the text used to stay dark on a dark background */
  --wc-surface: #f4f5f9;
  --wc-title: #1a2a5e;
  --wc-body: #4b5563;
  --wc-muted: #6b7280;
  --wc-dot: #c7ccda;
  --wc-border: #d7dae2;
  --background: var(--wc-surface);
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
  background: var(--wc-dot);
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
  color: var(--wc-muted);
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
  /* without min-height:0 a flex child refuses to shrink below its content, so
     a tall slide overflowed the screen instead of scrolling inside it */
  min-height: 0;
  overflow: hidden;
  display: flex;
  align-items: stretch;
}
.track {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide {
  flex: 0 0 100%;
  height: 100%;
  text-align: center;
  padding: 8px 8px 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  /* "safe" keeps the top reachable when the content is taller than the box;
     plain centring clips the start and you can never scroll back up to it */
  justify-content: safe center;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.slide > * {
  flex-shrink: 0;
}

/* the AI (prefs) slide has five toggles, so shrink its header to make them all
   fit on one screen without scrolling */
.slide-prefs .art { width: min(88px, 16vh); height: min(88px, 16vh); margin-bottom: 10px; }
.slide-prefs .lplate { width: min(56px, 10vh); height: min(56px, 10vh); font-size: min(40px, 8vh); }
.slide-prefs .title { font-size: 22px; }
.slide-prefs .tag { font-size: 15px; margin-bottom: 4px; }
.slide-prefs .body { font-size: 13px; margin-bottom: 6px; }

/* the AI slide carries a toggle list, so it needs to scroll and read left-aligned */
.pref-list {
  text-align: left;
  margin-top: 4px;
  background: transparent;
}
/* this screen is deliberately light in both themes, so its text colours are
   fixed rather than inherited - otherwise dark mode turns them white on white */
.pref-list ion-item {
  --background: transparent;
  --color: var(--wc-title);
  --border-color: var(--wc-border);
  --padding-start: 0;
  margin-bottom: 0;
}
.pref-list h3 {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
  color: var(--wc-title);
}
.pref-list p {
  font-size: 13px;
  margin: 2px 0 0;
  color: var(--wc-body);
}

.art {
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(168px, 34vh);
  height: min(168px, 34vh);
  border-radius: 28px;
  margin: 0 auto clamp(12px, 3vh, 32px);
  flex-shrink: 0;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.22);
}
/* a real Australian L-plate: yellow square, black L */
.lplate {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: min(104px, 21vh);
  height: min(104px, 21vh);
  border-radius: 14px;
  background: var(--lp-yellow);
  color: var(--lp-dark);
  font-size: min(74px, 15vh);
  font-weight: 900;
  font-family: Arial, Helvetica, sans-serif;
  line-height: 1;
}
.title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin: 0 0 8px;
  color: var(--wc-title);
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
  color: var(--wc-body);
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
  --color: var(--wc-muted);
  font-weight: 600;
}

@media (prefers-color-scheme: dark) {
  .welcome-content {
    --wc-surface: #121212;
    --wc-title: #eceef5;
    --wc-body: #b6bcc9;
    --wc-muted: #9aa1ae;
    --wc-dot: #3a404c;
    --wc-border: #343a45;
  }
}
</style>
