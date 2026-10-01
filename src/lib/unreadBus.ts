/**
 * Tiny browser-event bus for cross-component notifications. Used by the bells
 * in the top nav to stay in sync with the /notifications and /messages pages.
 *
 * Why not Redux/Zustand for this one counter?
 *  - It's literally one number per bell.
 *  - The bells already live on every page; the pages live on a few.
 *  - A custom DOM event gives us free decoupled fire-and-forget semantics with
 *    no extra dependencies.
 */

export const UNREAD_NOTIFICATIONS_EVENT = 'love:unread-notifications';
export const UNREAD_MESSAGES_EVENT = 'love:unread-messages';

type UnreadDetail = { unread: number };

export function emitUnreadNotifications(unread: number) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent<UnreadDetail>(UNREAD_NOTIFICATIONS_EVENT, { detail: { unread } }),
    );
}

export function emitUnreadMessages(unread: number) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent<UnreadDetail>(UNREAD_MESSAGES_EVENT, { detail: { unread } }),
    );
}

export function onUnreadNotifications(handler: (unread: number) => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    const wrapped = (e: Event) => {
        const detail = (e as CustomEvent<UnreadDetail>).detail;
        if (detail && typeof detail.unread === 'number') handler(detail.unread);
    };
    window.addEventListener(UNREAD_NOTIFICATIONS_EVENT, wrapped);
    return () => window.removeEventListener(UNREAD_NOTIFICATIONS_EVENT, wrapped);
}

export function onUnreadMessages(handler: (unread: number) => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    const wrapped = (e: Event) => {
        const detail = (e as CustomEvent<UnreadDetail>).detail;
        if (detail && typeof detail.unread === 'number') handler(detail.unread);
    };
    window.addEventListener(UNREAD_MESSAGES_EVENT, wrapped);
    return () => window.removeEventListener(UNREAD_MESSAGES_EVENT, wrapped);
}
