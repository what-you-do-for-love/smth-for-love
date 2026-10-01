'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, MapPin, Gift } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageProvider';

/**
 * Mobile-only overflow menu. On narrow screens (<lg) the TopNav can't fit
 * all five nav icons without overflowing horizontally, so it surfaces the
 * two least-used ones (Places + Gifts) here. Tapping the hamburger opens a
 * dropdown anchored to its own button.
 *
 * Visibility on lg+ is hidden — desktop users see every nav icon inline.
 */
const OVERFLOW_ITEMS = [
    { href: '/cities', icon: MapPin, labelKey: 'nav.places' },
    { href: '/gifts', icon: Gift, labelKey: 'nav.gifts' },
] as const;

export default function MoreMenu() {
    const pathname = usePathname();
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Close on outside click + Escape.
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const isActive = (href: string) =>
        pathname === href || pathname.startsWith(href + '/');

    return (
        <div ref={containerRef} className="relative md:hidden">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={t('common.more')}
                className="inline-flex items-center justify-center h-8 w-8 rounded-full transition-all flex-shrink-0 text-gray-600 hover:bg-pink-50 hover:text-gray-900"
            >
                <Menu className="h-4 w-4" />
            </button>

            {open && (
                <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 rounded-2xl bg-white border border-gray-100 shadow-xl shadow-pink-50/50 p-1.5 z-50 flex gap-1"
                >
                    {OVERFLOW_ITEMS.map(({ href, icon: Icon, labelKey }) => {
                        const active = isActive(href);
                        const label = t(labelKey);
                        return (
                            <Link
                                key={href}
                                href={href}
                                role="menuitem"
                                onClick={() => setOpen(false)}
                                aria-current={active ? 'page' : undefined}
                                className={`
                                    flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-[11px] font-bold
                                    transition-colors flex-1 min-w-0
                                    ${active
                                        ? 'bg-pink-50/60 text-gray-900'
                                        : 'text-gray-700 hover:bg-pink-50/40'
                                    }
                                `}
                            >
                                <Icon className="h-4 w-4 text-pink-500" />
                                <span className="text-center leading-tight">{label}</span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}