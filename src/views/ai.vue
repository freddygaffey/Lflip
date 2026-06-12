<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start" v-if="activeChat">
          <ion-button @click="activeChat = null">
            <ion-icon :icon="arrowBack"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ activeChat ? (activeChat.chat_name || 'AI Chat') : 'AI Chat' }}</ion-title>
        <ion-buttons slot="end" v-if="!activeChat">
          <ion-button @click="newChat">
            <ion-icon :icon="add"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <!-- chat list -->
      <ion-list v-if="!activeChat">
        <ion-item v-for="chat in chatsStore.chats.value" :key="chat.id" button @click="openChat(chat)">
          <ion-label>{{ chat.chat_name || 'Untitled chat' }}</ion-label>
        </ion-item>
        <ion-item button @click="newChat">
          <ion-label>Click to start a new chat</ion-label>
        </ion-item>
      </ion-list>

      <!-- messages -->
      <div v-else class="messages">
        <div v-for="m in chatsStore.messages.value" :key="m.id"
             class="bubble" :class="m.is_ai ? 'bubble-ai' : 'bubble-user'">
          {{ m.content }}
        </div>
        <div v-if="sending" class="bubble bubble-ai">
          <ion-spinner name="dots"></ion-spinner>
        </div>
      </div>
    </ion-content>

    <ion-footer v-if="activeChat">
      <ion-toolbar>
        <ion-textarea
          v-model="prompt"
          placeholder="Ask about road rules, your trips, or licence info..."
          :auto-grow="true"
          :disabled="sending"
        ></ion-textarea>
        <ion-buttons slot="end">
          <ion-button :disabled="sending || !prompt.trim()" @click="send">
            <ion-icon :icon="send_icon"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonFooter,
  IonButton, IonButtons, IonIcon, IonList, IonItem, IonLabel,
  IonTextarea, IonSpinner,
} from '@ionic/vue'
import { add, arrowBack, send as send_icon } from 'ionicons/icons'
import { ref, onMounted } from 'vue'
import { chatsStore, type Chat } from './classes/chats'

const activeChat = ref<Chat | null>(null)
const prompt = ref('')
const sending = ref(false)

onMounted(async () => {
  await chatsStore.pull_chats()
})

async function openChat(chat: Chat) {
  activeChat.value = chat
  await chatsStore.pull_messages(chat.id)
}

async function newChat() {
  const chat = await chatsStore.create_chat()
  if (!chat) {
    alert('Could not start a new chat. Check your connection and try again.')
    return
  }
  await openChat(chat)
}

async function send() {
  if (!activeChat.value || !prompt.value.trim()) return
  const text = prompt.value.trim()
  prompt.value = ''
  sending.value = true
  try {
    const result = await chatsStore.send_message(activeChat.value.id, text)
    if (!result) {
      alert('Message failed to send. Check your connection and try again.')
    }
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.messages {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}
.bubble {
  max-width: 75%;
  padding: 8px 12px;
  border-radius: 16px;
  white-space: pre-wrap;
}
.bubble-user {
  align-self: flex-end;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  border-bottom-right-radius: 4px;
}
.bubble-ai {
  align-self: flex-start;
  background: var(--ion-color-light);
  color: var(--ion-color-light-contrast);
  border-bottom-left-radius: 4px;
}
</style>
