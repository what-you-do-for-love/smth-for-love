'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, MapPin, Gift, Sparkles, Home } from 'lucide-react';
import AccountMenu from './AccountMenu';
import MessagesBell from './MessagesBell';
import NotificationsBell from './NotificationsBell';
import MoreMenu from './MoreMenu';
import { useLanguage } from '@/i18n/LanguageProvider';

// Icons are shared between languages, but labels follow the dictionary.
const NAV_ICONS = [
    { href: '/dashboard', icon: Home, labelKey: 'nav.dashboard' },
    { href: '/memories', icon: Sparkles, labelKey: 'nav.memories' },
    { href: '/anniversary', icon: Heart, labelKey: 'nav.anniversary' },
    { href: '/cities', icon: MapPin, labelKey: 'nav.places' },
    { href: '/gifts', icon: Gift, labelKey: 'nav.gifts' },
] as const;

// On narrow screens we surface the first three (most-used) inline and put the
// remaining two behind a hamburger menu — otherwise the row overflows on
// 360px-class phones. The split mirrors what most mobile apps do for the
// "more" overflow.
const PRIMARY_NAV_HREFS = new Set<string>(['/dashboard', '/memories', '/anniversary']);

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
 * - Mobile (<md, i.e. ≤767px): brand icon + 3 primary nav icons + hamburger
 *   overflow + right widgets. The top row can't fit all 5 nav icons on a 360px
 *   phone, so Places + Gifts move into a dropdown (MoreMenu).
 * - md+ (≥768px): brand + name · 5 nav pills with icon + label · right widgets.
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
                    flex items-center gap-2 sm:gap-3
                "
            >
                {/* Brand — icon-only on small phones (e.g. iPhone 13, 390px),
                    icon + name once there's room (≥420px). */}
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 group flex-shrink-0"
                >
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow shadow-pink-200 flex-shrink-0">
                        <Heart className="h-4 w-4 text-white fill-white" />
                    </div>
                    <span className="hidden min-[420px]:inline text-base font-black text-gray-900 tracking-tight whitespace-nowrap">
                        {t('brand.name')}
                    </span>
                </Link>

                {/* Nav links — centered between brand and avatar. The 5 links
                    collapse to 3 inline icons + a hamburger overflow on mobile
                    so the row stays within ~360px without horizontal overflow. */}
                <nav
                    className="flex-1 min-w-0 flex items-center justify-center gap-1 lg:gap-2"
                    aria-label="Primary"
                >
                    {NAV_ICONS.filter((item) => PRIMARY_NAV_HREFS.has(item.href)).map((item) => {
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
                                    md:hidden
                                `}
                            >
                                <Icon className="h-4 w-4" />
                            </Link>
                        );
                    })}

                    {/* Mobile: the hamburger holds Places + Gifts. Hidden on md+
                        because the full pill row below takes its place. */}
                    <MoreMenu />

                    {/* md+ (~768px): full pill row with icon + label. Fits the
                        roomy ≥768px layout; the narrower <md layout uses the
                        3-icon + hamburger combo instead. */}
                    <div className="hidden md:flex items-center gap-1 lg:gap-2">
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
                                        ${pillBase}
                                    `}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* Notification + account */}
                <div className="flex-shrink-0 flex items-center gap-1 sm:gap-2">
                    <MessagesBell />
                    <NotificationsBell />
                    <AccountMenu />
                </div>
            </div>
        </header>
    );
}
