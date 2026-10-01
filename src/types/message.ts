/**
 * Messaging types. Mirrors `Love.Core.Entities.Business.MessagingDTOs.cs` on the
 * backend. Keep the snake_case fields aligned with the C# DTOs.
 */

export interface ConversationMember {
    userId: number;
    userName?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
    dateJoined: string; // ISO
    lastSeenAt?: string | null; // ISO
}

export interface Conversation {
    id: number;
    title?: string | null;
    isDirect: boolean;
    dateCreated: string;
    dateUpdated: string;
    members: ConversationMember[];

    // Convenience for DMs (set when isDirect=true).
    otherUserId?: number | null;
    otherUserName?: string | null;
    otherUserAvatarUrl?: string | null;

    lastMessage?: Message | null;
    unreadCount: number;
    isMuted: boolean;
}

export interface Message {
    id: number;
    conversationId: number;
    senderId: number;
    senderName?: string | null;
    senderAvatarUrl?: string | null;
    content: string;
    dateSent: string; // ISO
    clientMessageId?: string | null;
    isReadByMe: boolean;
    readByOthersCount: number;
    /** Set by FE after a soft-delete round-trip to render a placeholder. */
    isDeleted?: boolean;
}

export interface CreateDirectConversationBody {
    requesterId: number;
    otherUserId: number;
}

export interface CreateGroupConversationBody {
    requesterId: number;
    title: string;
    memberIds: number[];
}

export interface SendMessageBody {
    senderId: number;
    conversationId: number;
    content: string;
    clientMessageId?: string;
}

export interface MarkConversationReadBody {
    requesterId: number;
    conversationId: number;
    lastReadMessageId: number;
}