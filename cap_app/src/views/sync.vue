<script setup lang="ts">

export type Car = {
  id: number
  nickname: string
  plate: string | null
  ble_device_name: string | null
  ble_service_uuid: string | null
  has_pairing_secret: boolean
}

export type Sv = {
  id: number
  nickname: string
  licence_no: string | null
}
</script>