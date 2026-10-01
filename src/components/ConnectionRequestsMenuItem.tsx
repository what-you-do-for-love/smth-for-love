'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { relationshipApi } from '@/api';
import { getUserId } from '@/lib/ultis';
import { useT } from '@/i18n/LanguageProvider';

/**
 * Drop-in replacement for the old ConnectionRequestsBell: lives inside the
 * AccountMenu dropdown as a regular menu item with a count badge. Keeps the same
 * poll cadence (60s) and uses the same API.
 */
export default function ConnectionRequestsMenuItem() {
    const t = useT();
    const [mounted, setMounted] = useState(false);
    const [count, setCount] = useState(0);
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
                // silent
            } finally {
                setLoading(false);
            }
        };

        fetchCount();
        const id = setInterval(fetchCount, 60_000);
        return () => clearInterval(id);
    }, [mounted]);

    return (
        <Link
            href="/connection-requests"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-700 hover:bg-pink-50 transition-colors"
            role="menuitem"
        >
            <Heart className="h-4 w-4 text-pink-500" />
            <span className="flex-1 text-left">{t('relationship.incomingRequests')}</span>
            {loading ? (
                <Loader2 className="h-3.5 w-3.5 text-pink-400 animate-spin" />
            ) : count > 0 ? (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-amber-400 text-white text-[10px] font-black">
                    {count > 99 ? '99+' : count}
                </span>
            ) : null}
        </Link>
    );
}