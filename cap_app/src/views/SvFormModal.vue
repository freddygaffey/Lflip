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
import { svsStore, type Sv } from './classes/svs'

const props = defineProps<{ sv: Sv | null }>()

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
  if (!form.value.id) return
  await svsStore.delete_sv(form.value.id)
  dismiss('delete', { id: form.value.id })
}

const save = async () => {
  const payload: Sv = {
    id: form.value.id ?? 0,
    nickname: form.value.nickname,
    licence_no: form.value.licence_no || null,
    last_used: props.sv?.last_used ?? null,
  }
  if (form.value.id) await svsStore.update_sv(payload)
  else await svsStore.add_sv(payload)
  dismiss('save', payload)
}
</script>
