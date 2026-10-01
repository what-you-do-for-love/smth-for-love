'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Bell, BellRing, CheckCheck, Heart, Loader2 } from 'lucide-react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getUserId } from '@/lib/ultis';
import { useT } from '@/i18n/LanguageProvider';
import { notificationApi } from '@/api';
import { useSignalR } from '@/hooks/useSignalR';
import { useOneSignal } from '@/hooks/useOneSignal';
import { emitUnreadNotifications } from '@/lib/unreadBus';
import type { AppNotification, NotificationKind } from '@/types';

type Filter = 'all' | 'unread';
type PushState = 'unknown' | 'unsupported' | 'denied' | 'granted' | 'default';

export default function NotificationsPage() {
    const isAuthed = useRequireAuth();
    const t = useT();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [myId, setMyId] = useState(0);
    const [list, setList] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>('all');
    const [unreadCount, setUnreadCount] = useState(0);
    const [pushState, setPushState] = useState<PushState>('unknown');

    const oneSignal = useOneSignal(mounted && isAuthed && myId > 0 ? myId : null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => setMounted(true), []);

    useEffect(() => {
        const uid = getUserId();
        setMyId(uid ? parseInt(uid, 10) : 0);
    }, []);

    useEffect(() => {
        setPushState(oneSignal.pushState);
    }, [oneSignal.pushState]);

    const fetchAll = useCallback(async () => {
        if (!myId) return;
        setLoading(true);
        try {
            const [notis, uc] = await Promise.all([
                notificationApi.list(myId, 0, 100),
                notificationApi.unreadCount(myId).catch(() => ({ unreadCount: 0 })),
            ]);
            setList(Array.isArray(notis) ? notis : []);
            const next = uc?.unreadCount ?? 0;
            setUnreadCount(next);
            emitUnreadNotifications(next);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : t('common.failed'));
        } finally {
            setLoading(false);
        }
    }, [myId, t]);

    useEffect(() => {
        if (mounted && isAuthed && myId) fetchAll();
    }, [mounted, isAuthed, myId, fetchAll]);

    // Realtime — append new notifications as they arrive.
    useSignalR({
        enabled: mounted && isAuthed && !!myId,
        onEvent: (event) => {
            if (event.type === 'notification:received') {
                setList((prev) =>
                    prev.some((n) => n.id === event.payload.id) ? prev : [event.payload, ...prev],
                );
                setUnreadCount((n) => {
                    const next = n + 1;
                    emitUnreadNotifications(next);
                    return next;
                });
            }
        },
    });

    const visible = useMemo(
        () => (filter === 'unread' ? list.filter((n) => !n.isRead) : list),
        [list, filter],
    );

    const handleMarkRead = async (id: number) => {
        if (!myId) return;
        try {
            await notificationApi.markRead(id, myId);
            let decremented = 0;
            setList((prev) =>
                prev.map((n) => {
                    if (n.id !== id) return n;
                    if (n.isRead) return n;
                    decremented = 1;
                    return { ...n, isRead: true, dateRead: new Date().toISOString() };
                }),
            );
            if (decremented) {
                setUnreadCount((c) => {
                    const next = Math.max(0, c - 1);
                    emitUnreadNotifications(next);
                    return next;
                });
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : t('common.failed'));
        }
    };

    const handleMarkAllRead = async () => {
        if (!myId) return;
        try {
            await notificationApi.markAllRead(myId);
            setList((prev) =>
                prev.map((n) =>
                    n.isRead ? n : { ...n, isRead: true, dateRead: new Date().toISOString() },
                ),
            );
            setUnreadCount(0);
            emitUnreadNotifications(0);
            toast.success(t('noti.markAllRead'));
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : t('common.failed'));
        }
    };

    const handleEnablePush = async () => {
        // Show OneSignal's native slide-down prompt. On iOS Safari (PWA) this
        // is the system permission prompt; on Chrome/Edge/Firefox it's the
        // browser's.
        const granted = await oneSignal.showPermissionPrompt();
        if (granted && myId > 0) {
            await oneSignal.registerWithBackend(myId);
        }
        setPushState(oneSignal.pushState);
        toast.success(granted ? t('noti.pushEnabled') : t('noti.pushDenied'));
    };

    const handleOpen = (n: AppNotification) => {
        if (!n.isRead) void handleMarkRead(n.id);
        try {
            const data = n.dataJson ? JSON.parse(n.dataJson) : null;
            if (data?.conversationId) {
                router.push(`/messages?c=${data.conversationId}`);
                return;
            }
            if (data?.requestId) {
                router.push('/connection-requests');
                return;
            }
        } catch {
            // ignore
        }
    };

    if (!mounted || !isAuthed) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-pink-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white border border-gray-100 text-gray-600 hover:bg-pink-50 hover:text-gray-900"
                    aria-label={t('common.back')}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <div className="min-w-0 flex-1">
                    <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        {t('noti.title')}
                        {unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-pink-500 text-white text-xs font-black">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">{t('noti.subtitle')}</p>
                </div>
                {list.some((n) => !n.isRead) && (
                    <button
                        onClick={handleMarkAllRead}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-pink-50"
                    >
                        <CheckCheck className="h-3 w-3" />
                        {t('noti.markAllRead')}
                    </button>
                )}
            </div>

            {/* Push subscription banner — surfaces on iPhone Safari PWA where
                the Web Push API is unsupported by OneSignal so users would
                otherwise silently miss new-message notifications. */}
            <PushBanner state={pushState} onEnable={handleEnablePush} t={t} />

            {/* Filter tabs */}
            <div className="inline-flex p-1 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <FilterTab
                    label={t('noti.tabAll')}
                    active={filter === 'all'}
                    onClick={() => setFilter('all')}
                />
                <FilterTab
                    label={`${t('noti.tabUnread')}${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
                    active={filter === 'unread'}
                    onClick={() => setFilter('unread')}
                />
            </div>

            {/* List */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-pink-50/50 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <Loader2 className="h-6 w-6 text-pink-500 animate-spin" />
                    </div>
                ) : visible.length === 0 ? (
                    <div className="p-12 text-center">
                        <Bell className="h-10 w-10 text-pink-300 mx-auto" />
                        <p className="text-sm font-bold text-gray-900 mt-3">
                            {t('noti.emptyTitle')}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{t('noti.emptyDesc')}</p>
                    </div>
                ) : (
                    <ul>
                        {visible.map((n) => (
                            <li
                                key={n.id}
                                className={`border-b border-gray-100 last:border-b-0 transition-colors ${
                                    n.isRead ? 'bg-white' : 'bg-pink-50/30'
                                }`}
                            >
                                <button
                                    onClick={() => handleOpen(n)}
                                    className="w-full text-left p-4 flex items-start gap-3 hover:bg-pink-50/50"
                                >
                                    <NotificationIcon kind={n.type} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="font-bold text-gray-900 truncate">{n.title}</p>
                                            <span className="text-[10px] text-gray-400 flex-shrink-0">
                                                {fmtRelative(n.dateCreated)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-1">{n.body}</p>
                                    </div>
                                    {!n.isRead && (
                                        <span className="mt-1 inline-block w-2 h-2 rounded-full bg-pink-500 flex-shrink-0" />
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

// ---- local subcomponents ----

function FilterTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                active
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow shadow-pink-200'
                    : 'text-gray-600 hover:text-gray-900'
            }`}
        >
            {label}
        </button>
    );
}

function NotificationIcon({ kind }: { kind: NotificationKind }) {
    const cls = 'h-5 w-5 text-pink-500';
    if (kind === 'relationship_accepted' || kind === 'relationship_requested') {
        return <Heart className={cls} fill="currentColor" />;
    }
    if (kind === 'new_message') return <Bell className={cls} />;
    return <BellRing className={cls} />;
}

function PushBanner({
    state,
    onEnable,
    t,
}: {
    state: PushState;
    onEnable: () => void | Promise<void>;
    t: (key: string, params?: Record<string, string | number>) => string;
}) {
    if (state === 'unknown' || state === 'granted') return null;
    if (state === 'unsupported') {
        return (
            <div className="bg-white rounded-3xl border border-gray-100 p-4 text-xs text-gray-500">
                {t('noti.pushUnsupported')}
            </div>
        );
    }
    const blocked = state === 'denied';
    return (
        <div className="bg-white rounded-3xl border border-gray-100 p-4 flex items-center gap-3 shadow-xl shadow-pink-50/50">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center flex-shrink-0">
                <BellRing className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm">{t('noti.enablePush')}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                    {blocked ? t('noti.pushDenied') : t('noti.enablePushDesc')}
                </p>
            </div>
            {!blocked && state === 'default' && (
                <button
                    onClick={onEnable}
                    className="px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold hover:from-pink-600 hover:to-rose-600"
                >
                    {t('common.save')}
                </button>
            )}
        </div>
    );
}

function fmtRelative(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const diffMs = Date.now() - d.getTime();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return 'vừa xong';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} phút`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} giờ`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day} ngày`;
    return d.toLocaleDateString();
}