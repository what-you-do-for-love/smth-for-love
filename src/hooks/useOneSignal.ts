'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import OneSignal from 'react-onesignal';
import { api } from '@/api/api';

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ?? '';

type PushState = 'unknown' | 'unsupported' | 'denied' | 'granted' | 'default';

/** Map raw `Notification.permission` to our internal state. */
function nativeToState(native: NotificationPermission): PushState {
    switch (native) {
        case 'granted':
            return 'granted';
        case 'denied':
            return 'denied';
        default:
            return 'default';
    }
}

/**
 * Try to read the OneSignal permission state. Reads `permissionNative` (the
 * native `Notification.permission` string) when OneSignal is wired up, and
 * falls back to the raw browser API when OneSignal is not yet ready.
 */
function readNativePermission(): NotificationPermission | null {
    try {
        const ns = OneSignal?.Notifications?.permissionNative;
        if (ns) return ns;
    } catch {
        // ignore
    }
    if (typeof window !== 'undefined' && typeof window.Notification !== 'undefined') {
        return window.Notification.permission;
    }
    return null;
}

export function useOneSignal(userId: number | null) {
    const [pushState, setPushState] = useState<PushState>('unknown');
    const initialized = useRef(false);
    // Guard so we only attempt the auto-prompt once per page-load.
    const autoPromptAttempted = useRef(false);

    useEffect(() => {
        // Always read the raw browser permission first — it's synchronous and
        // works even if OneSignal SDK fails to load (network blocked, ad-blocker,
        // iOS PWA restrictions, etc.). This ensures the banner reflects reality
        // immediately instead of staying in the 'unknown' skeleton forever.
        const initialNative = readNativePermission();
        if (initialNative) setPushState(nativeToState(initialNative));

        // Also poll for ~10s in case the browser exposes `Notification` lazily
        // (Safari PWA on iOS has been seen to do this).
        let elapsed = 0;
        const interval = window.setInterval(() => {
            elapsed += 500;
            const native = readNativePermission();
            if (native) setPushState(nativeToState(native));
            if (elapsed >= 10_000) window.clearInterval(interval);
        }, 500);

        if (!ONESIGNAL_APP_ID) {
            return () => window.clearInterval(interval);
        }

        if (initialized.current) return () => window.clearInterval(interval);
        initialized.current = true;

        OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            // We manage the prompt ourselves so we only ask after a BE-check.
            autoRegister: false,
            autoResubscribe: false,
        })
            .then(() => {
                const native = readNativePermission() ?? 'default';
                setPushState(nativeToState(native));
            })
            .catch(() => {
                // SDK failed to load. Fall back to whatever the raw browser
                // permission is. Only mark 'unsupported' if even that is gone.
                const native = readNativePermission();
                if (native) {
                    setPushState(nativeToState(native));
                } else {
                    setPushState('unsupported');
                }
            });

        return () => window.clearInterval(interval);
    }, []);

    /**
     * Detect iOS Safari (incl. standalone/PWA mode). On iOS the OneSignal
     * slide-down prompt cannot fire the native permission dialog — Apple's
     * policy requires us to call `Notification.requestPermission()` directly
     * from a user gesture. We branch the prompt flow accordingly.
     */
    function isIosSafari(): boolean {
        if (typeof navigator === 'undefined') return false;
        const ua = navigator.userAgent;
        const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
        const isWebkit = /WebKit/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
        return isIos && isWebkit;
    }

    /**
     * Request notification permission. On iOS Safari (incl. PWA) we call the
     * native `Notification.requestPermission()` directly — OneSignal's slide-
     * down prompt doesn't work there because Apple only allows the system
     * dialog when invoked from a user gesture without any SDK in between.
     * Elsewhere we use OneSignal's slide-down for the nicest UX.
     * Returns true if the user granted permission.
     */
    const showPermissionPrompt = useCallback(async (): Promise<boolean> => {
        const apply = (native: NotificationPermission | null) => {
            const state = nativeToState(native ?? 'default');
            setPushState(state);
            return state === 'granted';
        };

        // iOS Safari (incl. standalone PWA) — native prompt only.
        if (isIosSafari()) {
            try {
                if (typeof window !== 'undefined' && typeof window.Notification !== 'undefined') {
                    const result = await window.Notification.requestPermission();
                    return apply(result);
                }
                return false;
            } catch {
                return false;
            }
        }

        if (!initialized.current) return false;
        try {
            await OneSignal.Slidedown.promptPush();
            return apply(readNativePermission());
        } catch {
            return false;
        }
    }, []);

    /**
     * Look up whether our BE already has a OneSignal subscription row for this
     * user. Used by the caller to decide whether to auto-show the slide-down
     * prompt after login.
     */
    const checkBackendSubscription = useCallback(async (uid: number): Promise<boolean> => {
        try {
            const json = await api.get<{ exists: boolean }>(
                `/api/pushsubscriptions/onesignal/exists?userId=${uid}`,
            );
            return json?.exists === true;
        } catch {
            return false;
        }
    }, []);

    /**
     * Tag the device with our userId + push the OneSignal player_id to our BE.
     * Idempotent — safe to call multiple times.
     */
    const registerWithBackend = useCallback(async (uid: number): Promise<void> => {
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
            OneSignal.User.addTag('userId', String(uid));

            // External ID lets OneSignal identify the user across sessions.
            // login() also establishes a server-side alias for the userId.
            await OneSignal.login(String(uid));

            // Persist the player_id on our BE so we can target this device.
            // BE's RegisterOneSignalDeviceAsync is idempotent on player_id.
            await api.post<void>('/api/pushsubscriptions/onesignal', {
                requesterId: uid,
                subscriptionId,
            });
        } catch (err) {
            console.warn('[OneSignal] registerWithBackend failed:', err);
        }
    }, []);

    /**
     * iOS-Safari-safe variant. On iOS we MUST call the native
     * `Notification.requestPermission()` from a user gesture — OneSignal's
     * `promptPush()` is a no-op. After the user grants, we still rely on
     * OneSignal to deliver (it registers the device on its side via the
     * SDK loaded from `OneSignal.init`). Then we register the player_id
     * with our BE.
     */
    const registerIosPush = useCallback(async (uid: number): Promise<boolean> => {
        if (typeof window === 'undefined' || typeof window.Notification === 'undefined') {
            return false;
        }
        try {
            const result = await window.Notification.requestPermission();
            const granted = result === 'granted';
            setPushState(granted ? 'granted' : 'denied');
            if (granted) {
                await registerWithBackend(uid);
            }
            return granted;
        } catch {
            return false;
        }
    }, [registerWithBackend]);

    /**
     * Auto-prompt flow: called once after login. If the BE has no OneSignal
     * subscription row for this user and the browser hasn't already granted
     * (or denied) permission, show the slide-down. Otherwise do nothing.
     *
     * Returns `true` when the user just granted permission so the caller can
     * proceed to register the device.
     */
    const autoPromptIfMissing = useCallback(async (uid: number): Promise<boolean> => {
        if (autoPromptAttempted.current) return false;
        autoPromptAttempted.current = true;
        if (!initialized.current) return false;

        const native = readNativePermission() ?? 'default';
        const state = nativeToState(native);
        // Already granted or hard-denied by the browser — nothing to ask.
        if (state === 'granted' || state === 'denied') {
            setPushState(state);
            return false;
        }

        let exists = false;
        try {
            exists = await checkBackendSubscription(uid);
        } catch {
            exists = false;
        }
        // BE already has a subscription for this user — no prompt needed.
        if (exists) {
            setPushState('default');
            return false;
        }

        // Neither browser nor BE has a record — ask the user.
        return await showPermissionPrompt();
    }, [checkBackendSubscription, showPermissionPrompt]);

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

    /**
     * Disable push for this device + drop the BE subscription row so we stop
     * targeting the user. Also flips the browser permission UI back to the
     * "default" state so the user can re-enable later from the same banner.
     * Idempotent.
     */
    const disablePush = useCallback(async (uid: number): Promise<boolean> => {
        if (!initialized.current) return false;
        try {
            // Capture player_id BEFORE opting out — after optOut the SDK may
            // clear it.
            const playerId = OneSignal.User.PushSubscription.id;
            try {
                // Opt the user out so OneSignal stops sending pushes and the
                // browser permission state resets to 'default'.
                await OneSignal.User.PushSubscription.optOut();
            } catch {
                // ignore — optOut may fail on browsers that don't support it
            }

            if (uid > 0) {
                try {
                    // Drop the BE row. We send the player_id so the BE only
                    // removes this specific device row, not every row the user
                    // might have (e.g. desktop + mobile).
                    if (playerId) {
                        await api.delete<void>(
                            `/api/pushsubscriptions/onesignal?userId=${uid}&playerId=${encodeURIComponent(playerId)}`,
                        );
                    } else {
                        await api.delete<void>(
                            `/api/pushsubscriptions/onesignal?userId=${uid}`,
                        );
                    }
                } catch (err) {
                    console.warn('[OneSignal] BE unregister failed:', err);
                }
            }

            const native = readNativePermission() ?? 'default';
            setPushState(nativeToState(native));
            return true;
        } catch (err) {
            console.warn('[OneSignal] disablePush failed:', err);
            return false;
        }
    }, []);

    return {
        pushState,
        showPermissionPrompt,
        registerIosPush,
        registerWithBackend,
        autoPromptIfMissing,
        disablePush,
        removeFromBackend,
    };
}