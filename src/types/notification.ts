/**
 * Notification + web push subscription types. Mirrors
 * `Love.Core.Entities.Business.MessagingDTOs.cs` on the backend.
 */

/** Notification kind discriminator. Keep in sync with backend `NotificationTypes`. */
export type NotificationKind =
    | 'new_message'
    | 'relationship_accepted'
    | 'relationship_requested'
    | 'anniversary_soon'
    | 'memory_shared'
    | 'gift_received';

export interface AppNotification {
    id: number;
    type: NotificationKind;
    title: string;
    body: string;
    dataJson?: string | null;
    isRead: boolean;
    dateCreated: string;
    dateRead?: string | null;
}

export interface UnreadCount {
    unreadCount: number;
}

export interface PushPublicKey {
    publicKey: string;
    subject?: string | null;
}

export interface RegisterDeviceBody {
    requesterId: number;
    endpoint: string;
    keysJson: string;
    userAgent?: string;
}