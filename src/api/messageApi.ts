import { api } from './api';
import type {
    Conversation,
    Message,
    CreateDirectConversationBody,
    CreateGroupConversationBody,
    SendMessageBody,
    MarkConversationReadBody,
} from '../types';

export const messageApi = {
    // ---- Conversations ----

    /** List conversations for the requester, newest activity first. */
    listConversations: async (requesterId: number): Promise<Conversation[]> => {
        return api.get<Conversation[]>(`/api/conversations?requesterId=${requesterId}`);
    },

    /** Get one conversation with full detail (members + last message + unread). */
    getConversation: async (conversationId: number, requesterId: number): Promise<Conversation> => {
        return api.get<Conversation>(`/api/conversations/${conversationId}?requesterId=${requesterId}`);
    },

    /** Get-or-create the 1:1 DM with another user. Idempotent. */
    createOrGetDirect: async (body: CreateDirectConversationBody): Promise<Conversation> => {
        return api.post<Conversation>('/api/conversations/direct', body);
    },

    /** Create a group conversation. */
    createGroup: async (body: CreateGroupConversationBody): Promise<Conversation> => {
        return api.post<Conversation>('/api/conversations/group', body);
    },

    // ---- Messages ----

    /** Paged history for a conversation. */
    getMessages: async (
        conversationId: number,
        requesterId: number,
        skip = 0,
        take = 50,
    ): Promise<Message[]> => {
        return api.get<Message[]>(
            `/api/messages/conversation/${conversationId}?requesterId=${requesterId}&skip=${skip}&take=${take}`,
        );
    },

    /** Send a message. Optional clientMessageId to make this idempotent. */
    sendMessage: async (body: SendMessageBody): Promise<Message> => {
        return api.post<Message>('/api/messages', body);
    },

    /** Mark a conversation as read up to lastReadMessageId. */
    markRead: async (body: MarkConversationReadBody): Promise<{ lastReadMessageId: number }> => {
        return api.post<{ lastReadMessageId: number }>('/api/messages/read', body);
    },

    /** Soft-delete a message (sender only). */
    deleteMessage: async (messageId: number, requesterId: number): Promise<void> => {
        return api.delete<void>(`/api/messages/${messageId}?requesterId=${requesterId}`);
    },
};