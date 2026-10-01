'use client';

import { useEffect } from 'react';

/**
 * Registers two service workers:
 *  1. /sw.js — PWA caching / offline support (our own).
 *  2. /OneSignalSDKWorker.js — OneSignal push notification delivery.
 *
 * Both are silent on errors — SW failure shouldn't break the app.
 */
export function ServiceWorkerRegistrar() {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const isSecure =
            window.location.protocol === 'https:' ||
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';
        if (!isSecure) return;

        const onLoad = () => {
            // 1. PWA service worker
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker
                    .register('/sw.js', { scope: '/' })
                    .then((registration) => {
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing;
                            if (!newWorker) return;
                            newWorker.addEventListener('statechange', () => {
                                if (
                                    newWorker.state === 'installed' &&
                                    navigator.serviceWorker.controller
                                ) {
                                    console.info(
                                        '[sw] Update available, will activate on next load.',
                                    );
                                }
                            });
                        });
                    })
                    .catch((err) => {
                        console.warn('[sw] Registration failed:', err);
                    });
            }

            // 2. OneSignal service worker (required for push notifications on iPhone
            // and cross-browser support). Safe to register even if the appId isn't
            // configured yet — OneSignal handles that gracefully.
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker
                    .register('/OneSignalSDKWorker.js')
                    .catch((err) => {
                        // Silently ignore — OneSignal handles missing worker gracefully
                    });
            }
        };

        if (document.readyState === 'complete') {
            onLoad();
        } else {
            window.addEventListener('load', onLoad, { once: true });
        }
    }, []);

    return null;
}
