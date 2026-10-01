'use client';

import { notificationApi } from '@/api/notificationApi';
import { getUserId } from '@/lib/ultis';

/**
 * Helpers around the browser's Push API + our backend. Idempotent — safe to call
 * multiple times (e.g. on every page load).
 */

const PERMISSION_GRANTED = 'granted';
const PERMISSION_DENIED = 'denied';

/**
 * Request permission and subscribe this device. Returns true if a subscription is
 * now active and registered with the backend.
 */
export async function ensurePushSubscribed(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!('serviceWorker' in navigator)) return false;
    if (!('PushManager' in window)) return false;

    const permission = await Notification.requestPermission();
    if (permission !== PERMISSION_GRANTED) return false;

    const uid = getUserId();
    if (!uid) return false;
    const requesterId = parseInt(uid, 10);
    if (!Number.isFinite(requesterId) || requesterId <= 0) return false;

    const reg = await navigator.serviceWorker.ready;

    // If we already have a subscription for this origin, reuse it.
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
        const { publicKey } = await notificationApi.getPublicKey();
        sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
    }

    const json = sub.toJSON();
    const keys = (json.keys ?? {}) as Record<string, string>;
    const keysJson = JSON.stringify({
        p256dh: keys.p256dh ?? '',
        auth: keys.auth ?? '',
    });

    await notificationApi.registerDevice({
        requesterId,
        endpoint: sub.endpoint,
        keysJson,
        userAgent: navigator.userAgent,
    });

    return true;
}

/**
 * Unsubscribe this device. Idempotent — silently does nothing if there's no
 * subscription or no server-side registration.
 */
export async function disablePush(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;

    try {
        await notificationApi.unregisterDevice(sub.endpoint);
    } catch {
        // ignore — server may not know about this endpoint
    }
    await sub.unsubscribe();
}

/**
 * Browser push permission state, or 'unsupported' if Push isn't available.
 */
export function pushPermissionState(): 'granted' | 'denied' | 'default' | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        return 'unsupported';
    }
    return Notification.permission;
}

export function isPushDenied(): boolean {
    return pushPermissionState() === PERMISSION_DENIED;
}

export function isPushGranted(): boolean {
    return pushPermissionState() === PERMISSION_GRANTED;
}

// ---- helpers ----

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const output = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
    return output;
}