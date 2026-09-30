'use client';

import { useEffect } from 'react';

/**
 * Registers /sw.js once the page has loaded. Silent on errors — SW failure
 * shouldn't break the app, just disable offline support.
 */
export function ServiceWorkerRegistrar() {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator)) return;
        // Only register on https or localhost — browsers reject SW over http.
        const isSecure =
            window.location.protocol === 'https:' ||
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';
        if (!isSecure) return;

        const onLoad = () => {
            navigator.serviceWorker
                .register('/sw.js', { scope: '/' })
                .then((registration) => {
                    // Optional: listen for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (!newWorker) return;
                        newWorker.addEventListener('statechange', () => {
                            if (
                                newWorker.state === 'installed' &&
                                navigator.serviceWorker.controller
                            ) {
                                // A new SW is installed and waiting — could show a toast.
                                // Kept silent here to avoid surprising users.
                                console.info('[sw] Update available, will activate on next load.');
                            }
                        });
                    });
                })
                .catch((err) => {
                    console.warn('[sw] Registration failed:', err);
                });
        };

        if (document.readyState === 'complete') {
            onLoad();
        } else {
            window.addEventListener('load', onLoad, { once: true });
        }
    }, []);

    return null;
}
