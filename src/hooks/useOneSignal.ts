'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import OneSignal from 'react-onesignal';

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ?? '';

type PushState = 'unknown' | 'unsupported' | 'denied' | 'granted' | 'default';

export function useOneSignal(userId: number | null) {
    const [pushState, setPushState] = useState<PushState>('unknown');
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        if (!ONESIGNAL_APP_ID) return;
        initialized.current = true;

        OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            // We manage our own slidedown so the user can opt-in via the banner.
            autoRegister: false,
            autoResubscribe: false,
        })
            .then(() => {
                // OneSignal.init attaches the SDK; query the current state.
                try {
                    const granted = OneSignal.Notifications.permission;
                    setPushState(granted ? 'granted' : 'default');
                } catch {
                    setPushState('default');
                }
            })
            .catch(() => {
                setPushState('unsupported');
            });
    }, []);

    /**
     * Show OneSignal's native slide-down prompt. On iPhone Safari PWA this is
     * the OS prompt; on other browsers it's the in-page slidedown.
     * Returns true if the user granted permission.
     */
    const showPermissionPrompt = useCallback(async (): Promise<boolean> => {
        if (!initialized.current) return false;
        try {
            await OneSignal.Slidedown.promptPush();
            const granted = OneSignal.Notifications.permission;
            setPushState(granted ? 'granted' : 'denied');
            return granted;
        } catch {
            return false;
        }
    }, []);

    /**
     * Tag the device with our userId + push the OneSignal player_id to our BE.
     * Called after the user grants permission.
     */
    const registerWithBackend = useCallback(
        async (userId: number): Promise<void> => {
            if (!initialized.current) return;
            try {
                // Wait until we actually have a player_id — OneSignal may take a moment
                // after permission grant to assign one.
                let subscriptionId = OneSignal.User.PushSubscription.id;
                if (!subscriptionId) {
                    for (let i = 0; i < 10 && !subscriptionId; i++) {
                        await new Promise((r) => setTimeout(r, 200));
                        subscriptionId = OneSignal.User.PushSubscription.id;
                    }
                }
                if (!subscriptionId) return;

                // Tag the device with our userId for analytics / segmentation
                OneSignal.User.addTag('userId', String(userId));

                // External ID lets OneSignal identify the user across sessions.
                // login() also establishes a server-side alias for the userId.
                await OneSignal.login(String(userId));

                // Persist the player_id on our BE so we can target this device
                await fetch('/api/pushsubscriptions/onesignal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        requesterId: userId,
                        subscriptionId,
                    }),
                });
            } catch (err) {
                console.warn('[OneSignal] registerWithBackend failed:', err);
            }
        },
        [],
    );

    /**
     * Clear the user's external ID. Call on logout.
     */
    const removeFromBackend = useCallback(async (): Promise<void> => {
        if (!initialized.current) return;
        try {
            await OneSignal.logout();
            OneSignal.User.removeAlias('external_id');
        } catch {
            // ignore
        }
    }, []);

    return {
        pushState,
        showPermissionPrompt,
        registerWithBackend,
        removeFromBackend,
    };
}