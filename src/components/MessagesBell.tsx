'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';
import { notificationApi, messageApi } from '@/api';
import { useSignalR } from '@/hooks/useSignalR';
import { getUserId } from '@/lib/ultis';
import { emitUnreadMessages, onUnreadMessages } from '@/lib/unreadBus';

/**
 * Bell for unread messages across all conversations. Polls the per-thread unread
 * sum every 60s AND listens to SignalR `notification:received` events with type
 * `new_message` for instant updates.
 */
export default function MessagesBell() {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(true);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => setMounted(true), []);

    // Live updates — increment on new-message notifications.
    useSignalR({
        enabled: mounted,
        onEvent: (event) => {
            if (event.type === 'notification:received' && event.payload.type === 'new_message') {
                setUnread((n) => n + 1);
            }
        },
    });

    useEffect(() => {
        if (!mounted) return;
        const uid = getUserId();
        if (!uid) {
            setLoading(false);
            return;
        }
        const requesterId = parseInt(uid, 10);

        const fetchUnread = async () => {
            try {
                const convos = await messageApi.listConversations(requesterId);
                const total = Array.isArray(convos)
                    ? convos.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0)
                    : 0;
                setUnread(total);
                emitUnreadMessages(total);
            } catch {
                // silent
            } finally {
                setLoading(false);
            }
        };

        fetchUnread();
        const id = setInterval(fetchUnread, 60_000);
        const offSync = onUnreadMessages((u) => setUnread(u));
        return () => {
            clearInterval(id);
            offSync();
        };
    }, [mounted]);

    if (!mounted) {
        return (
            <span
                aria-hidden
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 animate-pulse"
            />
        );
    }

    const isActive = pathname?.startsWith('/messages') ?? false;
    const linkInactive =
        'inline-flex items-center justify-center h-9 w-9 rounded-full transition-all flex-shrink-0 text-gray-600 hover:bg-pink-50 hover:text-gray-900';
    const linkActive =
        'inline-flex items-center justify-center h-9 w-9 rounded-full transition-all flex-shrink-0 bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow shadow-pink-200 hover:from-pink-600 hover:to-rose-600';

    return (
        <Link
            href="/messages"
            aria-label={`Messages${unread > 0 ? ` (${unread} unread)` : ''}`}
            aria-current={isActive ? 'page' : undefined}
            className={`relative ${isActive ? linkActive : linkInactive}`}
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <MessageCircle className="h-4 w-4" />
            )}
            {unread > 0 && (
                <span
                    className={`absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black border-2 border-white shadow ${
                        isActive ? 'bg-white text-pink-600' : 'bg-amber-400 text-white'
                    }`}
                    aria-hidden
                >
                    {unread > 99 ? '99+' : unread}
                </span>
            )}
        </Link>
    );
}