import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChatConversation, ChatMessage } from '@/types/domain'

export class ChatRepository {
    constructor(private readonly client: SupabaseClient<any, any, any>) { }

    /**
     * Obtener todas las conversaciones del usuario
     */
    async listConversations(userId: string): Promise<ChatConversation[]> {
        const { data, error } = await this.client
            .from('chat_conversations')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })

        if (error) throw error
        return data || []
    }

    /**
     * Crear una nueva conversación
     */
    async createConversation(userId: string, title: string): Promise<ChatConversation> {
        const { data, error } = await this.client
            .from('chat_conversations')
            .insert([{ user_id: userId, title }])
            .select()
            .single()

        if (error) throw error
        return data
    }

    /**
     * Obtener una conversación específica
     */
    async getConversation(conversationId: string, userId: string): Promise<ChatConversation | null> {
        const { data, error } = await this.client
            .from('chat_conversations')
            .select('*')
            .eq('id', conversationId)
            .eq('user_id', userId)
            .single()

        if (error) {
            if (error.code === 'PGRST116') return null // Not found
            throw error
        }
        return data
    }

    /**
     * Obtener mensajes de una conversación
     */
    async getMessages(conversationId: string, limit: number = 50): Promise<ChatMessage[]> {
        const { data, error } = await this.client
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .limit(limit)

        if (error) throw error
        return data || []
    }

    /**
     * Guardar un mensaje
     */
    async saveMessage(
        conversationId: string,
        role: 'user' | 'assistant' | 'system',
        content: string,
        toolInvocations?: any
    ): Promise<ChatMessage> {
        const { data, error } = await this.client
            .from('chat_messages')
            .insert([{
                conversation_id: conversationId,
                role,
                content,
                tool_invocations: toolInvocations,
            }])
            .select()
            .single()

        if (error) throw error
        return data
    }

    /**
     * Actualizar título de conversación
     */
    async updateConversationTitle(conversationId: string, userId: string, title: string): Promise<void> {
        const { error } = await this.client
            .from('chat_conversations')
            .update({ title })
            .eq('id', conversationId)
            .eq('user_id', userId)

        if (error) throw error
    }

    /**
     * Eliminar conversación (y sus mensajes por CASCADE)
     */
    async deleteConversation(conversationId: string, userId: string): Promise<void> {
        const { error } = await this.client
            .from('chat_conversations')
            .delete()
            .eq('id', conversationId)
            .eq('user_id', userId)

        if (error) throw error
    }

    /**
     * Buscar en mensajes
     */
    async searchMessages(userId: string, query: string, limit: number = 20): Promise<ChatMessage[]> {
        const { data, error } = await this.client
            .from('chat_messages')
            .select(`
        *,
        chat_conversations!inner(user_id)
      `)
            .eq('chat_conversations.user_id', userId)
            .ilike('content', `%${query}%`)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) throw error
        return data || []
    }
}
