// ai wrote this clas
import { ref } from 'vue'
import { CapacitorHttp } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const API_URL = import.meta.env.VITE_API_URL
const AI_URL = import.meta.env.VITE_AI_URL

export type Chat = {
    id: number
    chat_name: string | null
    created_at: number | null
}

export type ChatMessage = {
    id: number
    is_ai: boolean
    content: string
    tokens_used: number | null
    timestamp: number | null
}

class Chats {
    chats = ref<Chat[]>([])
    messages = ref<ChatMessage[]>([])

    private async headers() {
        const { value: token } = await Preferences.get({ key: 'auth_token' })
        return { Authorization: `Bearer ${token}` }
    }

    async pull_chats() {
        const headers = await this.headers()
        const res = await CapacitorHttp.get({ url: `${API_URL}/api/chats`, headers })
        if (res.status !== 200) return
        this.chats.value = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
    }

    async create_chat(chat_name: string | null = null) {
        const headers = { ...(await this.headers()), 'Content-Type': 'application/json' }
        const res = await CapacitorHttp.post({ url: `${API_URL}/api/chats`, headers, data: { chat_name } })
        if (res.status !== 200) return null
        const chat: Chat = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
        await this.pull_chats()
        return chat
    }

    async delete_chat(id: number) {
        const headers = await this.headers()
        const res = await CapacitorHttp.delete({ url: `${API_URL}/api/chats/${id}`, headers })
        if (res.status !== 200) return
        await this.pull_chats()
    }

    async pull_messages(chat_id: number) {
        const headers = await this.headers()
        const res = await CapacitorHttp.get({ url: `${API_URL}/api/chats/${chat_id}/messages`, headers })
        if (res.status !== 200) return
        this.messages.value = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
    }

    // sends the prompt to the ai auth server, which logs both the
    // user's message and the ai's reply on the main server itself
    async send_message(chat_id: number, prompt: string) {
        const headers = { ...(await this.headers()), 'Content-Type': 'application/json', 'X-Api-Url': API_URL }
        const res = await CapacitorHttp.post({
            url: `${AI_URL}/api/ai/chat`,
            headers,
            data: { chat_id, prompt },
        })
        if (res.status !== 200) return null
        await this.pull_messages(chat_id)
        return typeof res.data === 'string' ? JSON.parse(res.data) : res.data
    }
}

export const chatsStore = new Chats()
