'use client';

import * as SignalR from '@microsoft/signalr';
import { useEffect, useRef, useState } from 'react';
import { getUserId } from '@/lib/ultis';
import type { AppNotification, Message } from '@/types';

const API_HOST = process.env.NEXT_PUBLIC_API_HOST;

export type SignalREvent =
    | { type: 'message:received'; payload: Message }
    | { type: 'typing'; payload: { conversationId: number; senderId: number; senderName: string } }
    | { type: 'conversation:read'; payload: { conversationId: number; readerId: number; lastReadMessageId: number } }
    | { type: 'notification:received'; payload: AppNotification }
    | { type: 'presence:changed'; payload: { userId: number; isOnline: boolean } }
    | { type: 'presence:me'; payload: { isOnline: boolean } };

export type SignalRHandler = (event: SignalREvent) => void;

interface Options {
    onEvent: SignalRHandler;
    /** Pause the connection — useful when not authed or when the tab is hidden. */
    enabled?: boolean;
}

/**
 * Module-scope connection state. We share one HubConnection per user across every
 * subscriber on the page (bells, /messages page, /notifications page).
 *
 * Notes
 * - `startPromise` is the single in-flight attempt. New subscribers always await
 *   the same promise — they never trigger parallel `start()` calls, which is what
 *   was spamming the console with `Failed to fetch` retries on every component mount.
 * - On failure we wait with exponential backoff before the next attempt (capped).
 *   This matches the SignalR built-in reconnect strategy but applies to the very
 *   first connection too, so a BE that isn't running yet doesn't get hammered.
 * - All `console.warn` calls are gated behind `__SIGNALR_DEBUG__` (off in prod) so
 *   a temporary network blip never floods the browser console.
 */
let activeConnection: SignalR.HubConnection | null = null;
let activeUserId: number | null = null;
let startPromise: Promise<SignalR.HubConnection | null> | null = null;
let nextRetryDelayMs = 2_000;
const MAX_RETRY_DELAY_MS = 30_000;
const subscribers = new Set<SignalRHandler>();

/**
 * Conversations the current UI has asked us to join. We re-send JoinConversation
 * after a SignalR reconnect because the BE's `conv:{id}` group membership is
 * tied to the (new) `ConnectionId` — a reconnect gives us a fresh connection
 * that isn't in any conversation group, so realtime broadcasts silently miss
 * this user until they manually re-open the chat.
 */
const activeConversationIds = new Set<number>();

const DEBUG = false; // flip to true for verbose SignalR diagnostics

function debugLog(...args: unknown[]) {
    if (DEBUG) console.warn('[signalr]', ...args);
}

function hubUrl(userId: number) {
    // Pass the same auth header convention used by the REST client. The SignalR
    // client itself upgrades http(s) → ws(s) for the live socket.
    return `${API_HOST}/hubs/chat?userId=${userId}`;
}

function buildConnection(userId: number): SignalR.HubConnection {
    const conn = new SignalR.HubConnectionBuilder()
        .withUrl(hubUrl(userId), {
            headers: { 'X-User-Id': String(userId) },
        })
        .withAutomaticReconnect({
            nextRetryDelayInMilliseconds: (ctx) => {
                // 0, 2, 5, 10, 30, 30, 30 … seconds
                if (ctx.previousRetryCount === 0) return 2_000;
                if (ctx.previousRetryCount === 1) return 5_000;
                if (ctx.previousRetryCount === 2) return 10_000;
                return 30_000;
            },
        })
        .configureLogging(SignalR.LogLevel.Warning)
        .build();

    conn.on('message:received', (payload) => dispatch({ type: 'message:received', payload }));
    conn.on('typing', (payload) => dispatch({ type: 'typing', payload }));
    conn.on('conversation:read', (payload) => dispatch({ type: 'conversation:read', payload }));
    conn.on('notification:received', (payload) =>
        dispatch({ type: 'notification:received', payload }),
    );
    conn.on('presence:changed', (payload) => dispatch({ type: 'presence:changed', payload }));
    conn.on('presence:me', (payload) => dispatch({ type: 'presence:me', payload }));

    // After a reconnect we have a fresh ConnectionId, so the BE no longer
    // routes `conv:{id}` group broadcasts to us. Re-join every conversation
    // the UI has currently subscribed to.
    conn.onreconnected(async () => {
        debugLog('reconnected — rejoining', activeConversationIds.size, 'conversation group(s)');
        for (const id of activeConversationIds) {
            try {
                await conn.invoke('JoinConversation', id);
            } catch (err) {
                debugLog('rejoin failed for', id, err);
            }
        }
    });

    return conn;
}

async function tryStart(userId: number): Promise<SignalR.HubConnection | null> {
    // Reuse existing live connection.
    if (activeConnection && activeUserId === userId) {
        if (activeConnection.state === SignalR.HubConnectionState.Connected) return activeConnection;
    }

    // Stale connection for a different (or logged-out) user — tear it down.
    if (activeConnection && activeUserId !== userId) {
        try {
            await activeConnection.stop();
        } catch {
            // ignore
        }
        activeConnection = null;
        activeUserId = null;
    }

    const conn = buildConnection(userId);

    try {
        await conn.start();
        activeConnection = conn;
        activeUserId = userId;
        nextRetryDelayMs = 2_000;
        debugLog('connected');
        return conn;
    } catch (err) {
        // Demote to debug — `Failed to fetch` is expected when the BE isn't running
        // locally; spamming `console.warn` obscures real issues.
        debugLog('start failed (will retry in', nextRetryDelayMs, 'ms):', err);

        // Best-effort cleanup.
        try {
            await conn.stop();
        } catch {
            // ignore
        }
        return null;
    }
}

function start(userId: number): Promise<SignalR.HubConnection | null> {
    if (startPromise) return startPromise;

    // Reset the backoff for a fresh cycle. (Without this, a previous failure cycle
    // that maxed out `nextRetryDelayMs` would make every subsequent cycle wait
    // 30s before its first attempt.)
    nextRetryDelayMs = 2_000;

    startPromise = (async () => {
        // Loop until we either connect or give up for this cycle. Giving up means
        // we return null; the next mount / re-render will trigger `start()` again.
        let attempt = 0;
        // Cap total attempts per cycle to ~5 minutes (sum of backoffs).
        const maxAttempts = 10;

        while (attempt < maxAttempts) {
            const conn = await tryStart(userId);
            if (conn) return conn;

            attempt++;
            if (attempt >= maxAttempts) break;

            await new Promise((r) => setTimeout(r, nextRetryDelayMs));
            nextRetryDelayMs = Math.min(nextRetryDelayMs * 2, MAX_RETRY_DELAY_MS);
        }

        return null;
    })();

    // Reset the shared promise once it settles so subsequent calls can re-attempt.
    startPromise.finally(() => {
        startPromise = null;
    });

    return startPromise;
}

function dispatch(event: SignalREvent) {
    for (const handler of subscribers) {
        try {
            handler(event);
        } catch (err) {
            debugLog('handler threw:', err);
        }
    }
}

async function stopConnection() {
    if (activeConnection) {
        try {
            await activeConnection.stop();
        } catch {
            // ignore
        }
        activeConnection = null;
        activeUserId = null;
    }
    startPromise = null;
}

export function useSignalR({ onEvent, enabled = true }: Options) {
    const [isConnected, setIsConnected] = useState(false);
    const handlerRef = useRef(onEvent);

    // Keep the latest callback in a ref so we don't tear down the SignalR
    // connection every time the parent re-renders.
    useEffect(() => {
        handlerRef.current = onEvent;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!enabled) return;

        const uid = getUserId();
        if (!uid) return;
        const userId = parseInt(uid, 10);
        if (!Number.isFinite(userId) || userId <= 0) return;

        const handler: SignalRHandler = (event) => handlerRef.current(event);
        subscribers.add(handler);

        start(userId).then((conn) => {
            setIsConnected(conn?.state === SignalR.HubConnectionState.Connected);
        });

        // Periodic state sync — cheap; just reflects SignalR's internal state.
        const tick = setInterval(() => {
            if (activeConnection) {
                setIsConnected(activeConnection.state === SignalR.HubConnectionState.Connected);
            }
        }, 5_000);

        return () => {
            subscribers.delete(handler);
            clearInterval(tick);
            // Connection stays alive — other subscribers may still need it. We only
            // tear it down when the last subscriber unmounts AND we go idle for a while.
            if (subscribers.size === 0) {
                setTimeout(() => {
                    if (subscribers.size === 0) stopConnection();
                }, 30_000);
            }
        };
    }, [enabled]);

    return { isConnected, joinConversation, leaveConversation, sendTyping };
}

function ensureStarted(userId: number): Promise<SignalR.HubConnection | null> {
    // Reuse an existing live connection immediately.
    if (activeConnection && activeUserId === userId) {
        if (activeConnection.state === SignalR.HubConnectionState.Connected) {
            return Promise.resolve(activeConnection);
        }
    }
    // Otherwise kick off (or reuse) the in-flight start promise. Returning
    // this lets callers `await ensureStarted(...)` to know when it's safe to
    // invoke hub methods.
    return start(userId);
}

export async function joinConversation(conversationId: number) {
    const uid = getUserId();
    if (!uid) return;
    const userId = parseInt(uid, 10);
    if (!Number.isFinite(userId) || userId <= 0) return;

    // Track this conversation so the onreconnected handler can re-join us
    // after a transient network drop (SignalR's WebSocket reconnects with a
    // fresh ConnectionId and loses all group memberships).
    activeConversationIds.add(conversationId);

    // If the SignalR connection isn't ready yet (e.g. we just opened the chat
    // thread right after a page reload, before the bell has had time to wire
    // up the shared connection), wait for it. Otherwise the hub invocation
    // would race the connection and silently fail — the user would never be
    // added to the `conv:{id}` group, so they'd stop seeing their own sent
    // messages AND any messages broadcast by the partner.
    const conn = await ensureStarted(userId);
    if (!conn) {
        debugLog('join skipped: connection not established');
        return;
    }
    try {
        await conn.invoke('JoinConversation', conversationId);
    } catch (err) {
        debugLog('join failed:', err);
    }
}

export async function leaveConversation(conversationId: number) {
    activeConversationIds.delete(conversationId);
    const conn = activeConnection;
    if (!conn || conn.state !== SignalR.HubConnectionState.Connected) return;
    try {
        await conn.invoke('LeaveConversation', conversationId);
    } catch {
        // ignore
    }
}

export async function sendTyping(conversationId: number) {
    const conn = activeConnection;
    if (!conn || conn.state !== SignalR.HubConnectionState.Connected) return;
    try {
        await conn.invoke('Typing', conversationId);
    } catch {
        // ignore
    }
}