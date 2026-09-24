'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { relationshipApi } from '@/api';
import { getUserId } from '@/lib/ultis';

/**
 * Bell icon that lives in the TopNav next to the AccountMenu.
 * Shows a badge with the count of pending incoming connection requests,
 * and links to /connection-requests.
 *
 * Polls every 60s so the count stays fresh on long-lived sessions.
 */
export default function ConnectionRequestsBell() {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [count, setCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!mounted) return;
        const uid = getUserId();
        if (!uid) {
            setLoading(false);
            return;
        }
        const parsed = parseInt(uid, 10);

        const fetchCount = async () => {
            try {
                const list = await relationshipApi.getPendingRequests(parsed);
                setCount(Array.isArray(list) ? list.length : 0);
            } catch {
                // silent — keep last-known count
            } finally {
                setLoading(false);
            }
        };

        fetchCount();
        const id = setInterval(fetchCount, 60_000);
        return () => clearInterval(id);
    }, [mounted]);

    if (!mounted) {
        return (
            <span
                aria-hidden
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 animate-pulse"
            />
        );
    }

    const isActive = pathname === '/connection-requests';
    const linkInactive =
        'inline-flex items-center justify-center h-9 w-9 rounded-full transition-all flex-shrink-0 text-gray-600 hover:bg-pink-50 hover:text-gray-900';
    const linkActive =
        'inline-flex items-center justify-center h-9 w-9 rounded-full transition-all flex-shrink-0 bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow shadow-pink-200 hover:from-pink-600 hover:to-rose-600';

    return (
        <Link
            href="/connection-requests"
            aria-label={`Connection requests${count > 0 ? ` (${count} pending)` : ''}`}
            aria-current={isActive ? 'page' : undefined}
            className={`relative ${isActive ? linkActive : linkInactive}`}
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Bell className="h-4 w-4" />
            )}
            {count > 0 && (
                <span
                    className={`absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black border-2 border-white shadow ${
                        isActive
                            ? 'bg-white text-pink-600'
                            : 'bg-amber-400 text-white'
                    }`}
                    aria-hidden
                >
                    {count > 99 ? '99+' : count}
                </span>
            )}
        </Link>
    );
}
