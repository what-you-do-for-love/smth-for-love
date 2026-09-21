'use client';

import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Auth pages get a clean, full-bleed layout (no max-width container)
    const isAuthRoute =
        pathname === '/login' ||
        pathname === '/register' ||
        pathname === '/forgot-password' ||
        pathname === '/change-password';

    if (isAuthRoute) {
        return (
            <>
                <Toaster richColors position="top-right" />
                {children}
            </>
        );
    }

    return (
        <>
            <Toaster richColors position="top-right" />
            <main className="mx-auto max-w-[1440px] w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-6">
                {children}
            </main>
        </>
    );
}
