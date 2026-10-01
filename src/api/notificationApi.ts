import { api } from './api';
import type { AppNotification, UnreadCount, PushPublicKey, RegisterDeviceBody } from '../types';

export const notificationApi = {
    /** Paged notification list. */
    list: async (userId: number, skip = 0, take = 50): Promise<AppNotification[]> => {
        return api.get<AppNotification[]>(
            `/api/notifications?userId=${userId}&skip=${skip}&take=${take}`,
        );
    },

    /** Unread count for the bell badge. Cheap; safe to poll. */
    unreadCount: async (userId: number): Promise<UnreadCount> => {
        return api.get<UnreadCount>(`/api/notifications/unread-count?userId=${userId}`);
    },

    /** Mark one notification read (must belong to the requester). */
    markRead: async (notificationId: number, requesterId: number): Promise<void> => {
        return api.post<void>(
            `/api/notifications/${notificationId}/read?requesterId=${requesterId}`,
            {},
        );
    },

    /** Mark every unread notification for the user as read. */
    markAllRead: async (userId: number): Promise<UnreadCount> => {
        return api.post<UnreadCount>(`/api/notifications/read-all?userId=${userId}`, {});
    },

    // ---- Web push ----

    /** Fetch the VAPID public key the browser must use to subscribe. */
    getPublicKey: async (): Promise<PushPublicKey> => {
        return api.get<PushPublicKey>('/api/pushsubscriptions/public-key');
    },

    /** Register / refresh a device subscription for the user. */
    registerDevice: async (body: RegisterDeviceBody): Promise<void> => {
        return api.post<void>('/api/pushsubscriptions', body);
    },

    /** Unregister a device subscription (called by FE on logout / unsubscribe). */
    unregisterDevice: async (endpoint: string): Promise<void> => {
        return api.delete<void>(
            `/api/pushsubscriptions?endpoint=${encodeURIComponent(endpoint)}`,
        );
    },
};