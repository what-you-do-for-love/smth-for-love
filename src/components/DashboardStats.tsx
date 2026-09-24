'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Gift, MapPin, NotebookPen } from 'lucide-react';
import { giftApi, memoryApi, cityVisitApi, anniversaryApi } from '@/api';
import { getUserId } from '@/lib/ultis';
import { Anniversary } from '@/types';
import { useLanguage, useT } from '@/i18n/LanguageProvider';

interface Stats {
    memories: number;
    gifts: number;
    cities: number;
    daysTogether: number | null;
}

const EMPTY: Stats = { memories: 0, gifts: 0, cities: 0, daysTogether: null };

export default function DashboardStats() {
    const t = useT();
    const { locale } = useLanguage();
    const [stats, setStats] = useState<Stats>(EMPTY);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const uid = getUserId();
        if (!uid) {
            setLoading(false);
            return;
        }
        const parsed = parseInt(uid, 10);

        Promise.allSettled([
            memoryApi.getForUser(parsed),
            giftApi.getForUser(parsed),
            cityVisitApi.getForUser(parsed),
            anniversaryApi.getForUser(parsed),
        ])
            .then(([memRes, giftRes, cityRes, annRes]) => {
                const ann = annRes.status === 'fulfilled' ? (annRes.value as Anniversary | null) : null;
                setStats({
                    memories: memRes.status === 'fulfilled' ? memRes.value.length : 0,
                    gifts: giftRes.status === 'fulfilled' ? giftRes.value.length : 0,
                    cities: cityRes.status === 'fulfilled' ? cityRes.value.length : 0,
                    daysTogether: ann?.daysTogether ?? null,
                });
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
                href="/memories"
                icon={<NotebookPen className="h-4 w-4" />}
                label={t('dashboard.statsMemories')}
                value={stats.memories}
                loading={loading}
                accent="pink"
                locale={locale}
            />
            <StatCard
                href="/gifts"
                icon={<Gift className="h-4 w-4" />}
                label={t('dashboard.statsGifts')}
                value={stats.gifts}
                loading={loading}
                accent="rose"
                locale={locale}
            />
            <StatCard
                href="/cities"
                icon={<MapPin className="h-4 w-4" />}
                label={t('dashboard.statsPlaces')}
                value={stats.cities}
                loading={loading}
                accent="fuchsia"
                locale={locale}
            />
            <AnniversaryStatCard daysTogether={stats.daysTogether} loading={loading} locale={locale} />
        </div>
    );
}

type Accent = 'pink' | 'rose' | 'fuchsia' | 'amber';

const ACCENTS: Record<Accent, { iconWrap: string; icon: string; value: string }> = {
    pink: {
        iconWrap: 'bg-pink-100',
        icon: 'text-pink-500',
        value: 'text-pink-600',
    },
    rose: {
        iconWrap: 'bg-rose-100',
        icon: 'text-rose-500',
        value: 'text-rose-600',
    },
    fuchsia: {
        iconWrap: 'bg-fuchsia-100',
        icon: 'text-fuchsia-500',
        value: 'text-fuchsia-600',
    },
    amber: {
        iconWrap: 'bg-amber-100',
        icon: 'text-amber-500',
        value: 'text-amber-600',
    },
};

function StatCard({
    href,
    icon,
    label,
    value,
    loading,
    accent,
    locale,
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    value: number | null;
    loading: boolean;
    accent: Accent;
    locale: string;
}) {
    const a = ACCENTS[accent];
    return (
        <Link
            href={href}
            className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-pink-200 transition-all p-4"
        >
            <div className="flex items-center gap-2">
                <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${a.iconWrap} ${a.icon} group-hover:scale-110 transition-transform`}
                >
                    {icon}
                </span>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    {label}
                </span>
            </div>
            <p className={`mt-2 text-2xl font-black leading-none ${a.value}`}>
                {loading ? (
                    <span className="inline-block h-7 w-10 rounded bg-gray-100 animate-pulse" />
                ) : (
                    new Intl.NumberFormat(locale).format(value ?? 0)
                )}
            </p>
        </Link>
    );
}

function AnniversaryStatCard({
    daysTogether,
    loading,
    locale,
}: {
    daysTogether: number | null;
    loading: boolean;
    locale: string;
}) {
    const t = useT();
    const a = ACCENTS.amber;
    return (
        <Link
            href="/anniversary"
            className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all p-4"
        >
            <div className="flex items-center gap-2">
                <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${a.iconWrap} ${a.icon} group-hover:scale-110 transition-transform`}
                >
                    <CalendarDays className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    {t('dashboard.statsDays')}
                </span>
            </div>
            <p className={`mt-2 text-2xl font-black leading-none ${a.value}`}>
                {loading ? (
                    <span className="inline-block h-7 w-10 rounded bg-gray-100 animate-pulse" />
                ) : daysTogether !== null ? (
                    new Intl.NumberFormat(locale).format(daysTogether)
                ) : (
                    <span className="text-sm text-gray-400 font-bold">{t('anniversary.notYet')}</span>
                )}
            </p>
        </Link>
    );
}
