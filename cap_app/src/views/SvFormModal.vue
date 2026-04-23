<!--  this file is ai genarated -->
<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start" v-if="form.id">
        <ion-button color="danger" @click="del">Delete</ion-button>
      </ion-buttons>
      <ion-title>{{ form.id ? 'Edit supervisor' : 'Add supervisor' }}</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="dismiss('cancel')">Cancel</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding">
    <ion-input
      v-model="form.nickname"
      label="Nickname"
      label-placement="stacked"
    />
    <ion-input
      v-model="form.licence_no"
      label="Licence number"
      label-placement="stacked"
    />

    <ion-button
      expand="block"
      class="ion-margin-top"
      @click="save"
      :disabled="!form.nickname.trim()"
    >
      Save
    </ion-button>
  </ion-content>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  modalController,
  alertController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonInput,
} from '@ionic/vue'
import { Preferences } from '@capacitor/preferences'
import { CapacitorHttp } from '@capacitor/core'

type Sv = {
  id?: number
  nickname: string
  licence_no: string | null
}

const props = defineProps<{ sv: Sv | null }>()
const API_URL = import.meta.env.VITE_API_URL

const form = ref({
  id: props.sv?.id,
  nickname: props.sv?.nickname ?? '',
  licence_no: props.sv?.licence_no ?? '',
})

const dismiss = (role: string, data?: any) =>
  modalController.dismiss(data, role)

const del = async () => {
  if (!form.value.id) return
  const alert_ = await alertController.create({
    header: 'Delete supervisor?',
    message: form.value.nickname,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Delete', role: 'destructive', handler: doDelete },
    ],
  })
  await alert_.present()
}

const doDelete = async () => {
  const { value: token } = await Preferences.get({ key: 'auth_token' })
  const res = await CapacitorHttp.delete({
    url: `${API_URL}/api/sv/${form.value.id}`,
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 200) {
    const { value: cached } = await Preferences.get({ key: 'svs' })
    const list = cached ? JSON.parse(cached) : []
    const next = list.filter((s: any) => s.id !== form.value.id)
    await Preferences.set({ key: 'svs', value: JSON.stringify(next) })
    dismiss('delete', { id: form.value.id })
  } else console.error('delete failed', res.status, res.data)
}

const save = async () => {
  const { value: token } = await Preferences.get({ key: 'auth_token' })
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  const payload = {
    nickname: form.value.nickname,
    licence_no: form.value.licence_no || null,
  }

  const isEdit = !!form.value.id
  const res = isEdit
    ? await CapacitorHttp.patch({
        url: `${API_URL}/api/sv/${form.value.id}`,
        headers,
        data: payload,
      })
    : await CapacitorHttp.post({
        url: `${API_URL}/api/sv`,
        headers,
        data: payload,
      })

  if (res.status === 200) {
    const saved = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
    const { value: cached } = await Preferences.get({ key: 'svs' })
    const list = cached ? JSON.parse(cached) : []
    const next = list.filter((s: any) => s.id !== form.value.id)
    next.push(saved)
    await Preferences.set({ key: 'svs', value: JSON.stringify(next) })
    dismiss('save', saved)
  } else console.error('save failed', res.status, res.data)
}
</script>
