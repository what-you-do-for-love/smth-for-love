'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import TopNav from './TopNav';
import { LanguageProvider } from '@/i18n/LanguageProvider';
import { useOneSignal } from '@/hooks/useOneSignal';
import { getUserId } from '@/lib/ultis';

function AutoRegisterPush({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuthRoute =
        pathname === '/login' ||
        pathname === '/register' ||
        pathname === '/forgot-password' ||
        pathname === '/change-password';

    // Only attempt registration on routes behind the auth wall.
    const userId = isAuthRoute ? null : Number(getUserId() ?? 0) || null;
    const oneSignal = useOneSignal(userId);

    useEffect(() => {
        if (!userId) return;
        // Drive the OneSignal auto-flow exactly once per page-load:
        //   1. ask BE whether this user already has a subscription row,
        //   2. if not, show the slide-down prompt (browser grants → we ship
        //      the player_id to BE; browser denies → we record `denied` and
        //      stop),
        //   3. if BE already has a row OR the browser already granted, skip the
        //      prompt and just re-register (idempotent — covers the case where
        //      the player_id rotated since last visit).
        let cancelled = false;
        (async () => {
            const granted = await oneSignal.autoPromptIfMissing(userId);
            if (cancelled || !granted) return;
            await oneSignal.registerWithBackend(userId);
        })();
        return () => {
            cancelled = true;
        };
    }, [userId, oneSignal]);

    return <>{children}</>;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Auth pages get a clean, full-bleed layout (no shell).
    const isAuthRoute =
        pathname === '/login' ||
        pathname === '/register' ||
        pathname === '/forgot-password' ||
        pathname === '/change-password';

    // Pages that want to occupy the full viewport below the TopNav (e.g. the
    // chat panel in /messages which needs internal scrolling). They render
    // their own padding so we don't double-up.
    const isFullBleed = pathname === '/messages';

    if (isAuthRoute) {
        return (
            <LanguageProvider>
                <Toaster richColors position="top-right" />
                {children}
            </LanguageProvider>
        );
    }

    return (
        <LanguageProvider>
            <Toaster richColors position="top-right" />
            <AutoRegisterPush>
                <TopNav />
                <main
                    className={
                        isFullBleed
                            ? 'mx-auto max-w-[1440px] w-full'
                            : 'mx-auto max-w-[1440px] w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-12 md:pb-8'
                    }
                >
                    {children}
                </main>
            </AutoRegisterPush>
        </LanguageProvider>
    );
}
