'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import OneSignal from 'react-onesignal';

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ?? '';

/** The shape we store on the BE so it can route via OneSignal. */
export interface OneSignalSubscription {
    subscriptionId: string; // OneSignal player_id / device.id
    externalUserId?: string; // our userId
}

type PushState = 'unknown' | 'unsupported' | 'denied' | 'granted' | 'default';

export function useOneSignal(userId: number | null) {
    const [pushState, setPushState] = useState<PushState>('unknown');
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        if (!ONESIGNAL_APP_ID) return;
        initialized.current = true;

        OneSignal.init({ appId: ONESIGNAL_APP_ID })
            .then(() => {
                setPushState(Notification.permission as PushState);
            })
            .catch(() => {
                setPushState('unsupported');
            });
    }, []);

    /**
     * Show the OneSignal native permission prompt.
     * Returns true if the user granted permission.
     */
    const showPermissionPrompt = useCallback(async (): Promise<boolean> => {
        if (!initialized.current) return false;
        try {
            // If already granted, this resolves immediately.
            // If default, it shows the browser/OS native prompt.
            const result = await OneSignal.showSlidedownPermissionPrompt();
            setPushState(Notification.permission as PushState);
            return result;
        } catch {
            return false;
        }
    }, []);

    /**
     * Register this device's OneSignal player_id with our BE under `userId`.
     * Called after the user grants permission so we can target them later.
     */
    const registerWithBackend = useCallback(
        async (userId: number): Promise<void> => {
            if (!initialized.current) return;
            try {
                const userId2 = await OneSignal.getUserId();
                if (!userId2) return;

                // Tag the device with our userId so BE can look up by userId
                await OneSignal.addTag('userId', String(userId));

                // External ID lets OneSignal identify the user across sessions
                await OneSignal.setExternalUserId(String(userId));

                // Persist the player_id on our BE so we can send to this device
                await fetch('/api/pushsubscriptions/onesignal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        requesterId: userId,
                        subscriptionId: userId2,
                    }),
                });
            } catch (err) {
                console.warn('[OneSignal] registerWithBackend failed:', err);
            }
        },
        [],
    );

    /**
     * Remove the external user ID from OneSignal. Call on logout.
     */
    const removeFromBackend = useCallback(async (): Promise<void> => {
        if (!initialized.current) return;
        try {
            await OneSignal.removeExternalUserId();
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
