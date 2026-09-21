'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUserId } from '@/lib/ultis';

/**
 * Client-side auth guard. The proxy already redirects unauthenticated
 * users, but this hook provides defense-in-depth for client-only flows
 * (e.g. soft navigations inside the SPA).
 */
export function useRequireAuth(redirectTo: string = '/login'): boolean {
    const router = useRouter();
    const userId = typeof document !== 'undefined' ? getUserId() : null;

    useEffect(() => {
        if (!userId) {
            const currentPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';
            const target = redirectTo + (currentPath && currentPath !== '/' ? `?redirect=${encodeURIComponent(currentPath)}` : '');
            router.replace(target);
        }
    }, [userId, router, redirectTo]);

    return !!userId;
}
