'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, MapPin, Gift, Sparkles, Home } from 'lucide-react';
import AccountMenu from './AccountMenu';
import ConnectionRequestsBell from './ConnectionRequestsBell';
import { useLanguage } from '@/i18n/LanguageProvider';

// Icons are shared between languages, but labels follow the dictionary.
const NAV_ICONS = [
    { href: '/dashboard', icon: Home, labelKey: 'nav.dashboard' },
    { href: '/memories', icon: Sparkles, labelKey: 'nav.memories' },
    { href: '/anniversary', icon: Heart, labelKey: 'nav.anniversary' },
    { href: '/cities', icon: MapPin, labelKey: 'nav.places' },
    { href: '/gifts', icon: Gift, labelKey: 'nav.gifts' },
] as const;

const iconOnlyBase =
    'inline-flex items-center justify-center h-9 w-9 rounded-full transition-all flex-shrink-0';
const pillBase =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all';
const linkInactive = 'text-gray-600 hover:bg-pink-50 hover:text-gray-900';
const linkActive =
    'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow shadow-pink-200 hover:from-pink-600 hover:to-rose-600';

/**
 * Single-row top navigation.
 * - Brand left · nav links middle · avatar right
 * - Mobile: icons only, all 5 fit on one row.
 * - Desktop (≥lg): icon + label, centered between brand and avatar.
 */
export default function TopNav() {
    const pathname = usePathname();
    const { t } = useLanguage();

    const isActive = (href: string) =>
        href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname === href || pathname.startsWith(href + '/');

    return (
        <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-gray-100">
            <div
                className="
                    mx-auto max-w-[1440px] w-full
                    h-14 px-4 sm:px-6 lg:px-8
                    flex items-center gap-3
                "
            >
                {/* Brand */}
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 group flex-shrink-0"
                >
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow shadow-pink-200 flex-shrink-0">
                        <Heart className="h-4 w-4 text-white fill-white" />
                    </div>
                    <span className="text-base font-black text-gray-900 tracking-tight">
                        {t('brand.name')}
                    </span>
                </Link>

                {/* Nav links — centered between brand and avatar */}
                <nav
                    className="flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2"
                    aria-label="Primary"
                >
                    {NAV_ICONS.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        const label = t(item.labelKey);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={active ? 'page' : undefined}
                                aria-label={label}
                                title={label}
                                className={`
                                    ${active ? linkActive : linkInactive}
                                    ${iconOnlyBase}
                                    lg:hidden
                                    xl:inline-flex
                                    xl:w-auto
                                    xl:h-auto
                                    xl:px-3
                                    xl:py-1.5
                                    xl:gap-1.5
                                `}
                            >
                                <Icon className="h-4 w-4 xl:h-4 xl:w-4" />
                                <span className="hidden xl:inline">
                                    {label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Notification + account */}
                <div className="flex-shrink-0 flex items-center gap-2">
                    <ConnectionRequestsBell />
                    <AccountMenu />
                </div>
            </div>
        </header>
    );
}
