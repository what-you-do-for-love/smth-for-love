'use client';

import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import TopNav from './TopNav';
import { LanguageProvider } from '@/i18n/LanguageProvider';

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Auth pages get a clean, full-bleed layout (no shell).
    const isAuthRoute =
        pathname === '/login' ||
        pathname === '/register' ||
        pathname === '/forgot-password' ||
        pathname === '/change-password';

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
            <TopNav />
            <main className="mx-auto max-w-[1440px] w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-12 md:pb-8">
                {children}
            </main>
        </LanguageProvider>
    );
}
