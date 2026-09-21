'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { clearAuth } from '@/lib/ultis';

/**
 * Returns a logout handler that clears cookies + token and redirects to /login.
 * Use in any authenticated page or a top-bar logout button.
 */
export function useLogout() {
    const router = useRouter();

    return () => {
        clearAuth();
        toast.success('Signed out');
        router.replace('/login');
    };
}
