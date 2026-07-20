// ai wrote this clas
import { ref } from 'vue'
import { api } from './api'

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

    async pull_chats() {
        const res = await api.get('/api/chats')
        if (res.status !== 200) return
        this.chats.value = res.data
    }

    async create_chat(chat_name: string | null = null) {
        const res = await api.post('/api/chats', { chat_name })
        if (res.status !== 200) return null
        const chat: Chat = res.data
        await this.pull_chats()
        return chat
    }

    async delete_chat(id: number) {
        const res = await api.delete(`/api/chats/${id}`)
        if (res.status !== 200) return
        await this.pull_chats()
    }

    async pull_messages(chat_id: number) {
        const res = await api.get(`/api/chats/${chat_id}/messages`)
        if (res.status !== 200) return
        this.messages.value = res.data
    }

    // sends the prompt to the ai auth server, which logs both the
    // user's message and the ai's reply on the main server itself.
    // X-Api-Url tells the ai server which main backend to call back into.
    // returns the raw response so the caller can tell a usage-limit (429) apart
    // from a real send failure and message the user accurately
    async send_message(chat_id: number, prompt: string) {
        const res = await api.post(`${AI_URL}/api/ai/chat`, { chat_id, prompt }, { 'X-Api-Url': API_URL })
        if (res.status === 200) await this.pull_messages(chat_id)
        return res
    }
}

export const chatsStore = new Chats()
