'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    CalendarDays,
    Cake,
    Heart,
    Loader2,
    Sparkles,
} from 'lucide-react';
import { anniversaryApi } from '@/api';
import { getUserId } from '@/lib/ultis';
import { Anniversary } from '@/types';
import { toast } from 'sonner';
import {
    buildUpcomingMilestones,
    UpcomingMilestone,
} from '@/lib/anniversaryMilestones';
import { useLanguage, useT } from '@/i18n/LanguageProvider';

interface AnniversaryBreakdown {
    years: number;
    months: number;
    days: number;
}

/**
 * Splits the difference between two dates into years / months / days,
 * accounting for the actual day-of-month so 2024-02-29 → 2025-03-01 returns
 * 1 year 1 day, not 1 year 1 month.
 */
function yearsMonthsDays(fromIso: string, nowIso: string): AnniversaryBreakdown {
    const from = new Date(fromIso);
    const now = new Date(nowIso);
    if (isNaN(from.getTime()) || isNaN(now.getTime())) {
        return { years: 0, months: 0, days: 0 };
    }

    let years = now.getFullYear() - from.getFullYear();
    let months = now.getMonth() - from.getMonth();
    let days = now.getDate() - from.getDate();

    if (days < 0) {
        // Borrow one month from `months`. Use day 0 of the *next* month
        // which JS gives as the last day of the current month.
        const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
        days += prevMonthLastDay;
        months -= 1;
    }
    if (months < 0) {
        months += 12;
        years -= 1;
    }
    return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days) };
}

export default function AnniversaryCard() {
    const t = useT();
    const { locale } = useLanguage();
    const isAuthed = !!getUserId();
    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => setMounted(true), []);

    const [data, setData] = useState<Anniversary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!mounted || !isAuthed) return;
        const uid = getUserId();
        if (!uid) return;
        anniversaryApi
            .getForUser(parseInt(uid, 10))
            .then((d) => setData(d))
            .catch((err) => {
                // 404 → null is handled inside the api; any other error gets a toast.
                toast.error(err instanceof Error ? err.message : t('ac.loadFailed'));
                setData(null);
            })
            .finally(() => setLoading(false));
    }, [mounted, isAuthed, t]);

    const breakdown = useMemo(() => {
        if (!data?.loveStartDate) return null;
        return yearsMonthsDays(data.loveStartDate, new Date().toISOString());
    }, [data?.loveStartDate]);

    if (!mounted || !isAuthed) return null;

    const formatPrettyDate = (iso?: string | null): string => {
        if (!iso) return '';
        try {
            const d = new Date(iso);
            if (isNaN(d.getTime())) return '';
            return d.toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch {
            return iso ?? '';
        }
    };

    return (
        <div className="bg-white p-5 sm:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-pink-50/50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-pink-500" />
                    <h2 className="text-sm font-black text-gray-700">{t('ac.title')}</h2>
                </div>
                <Link
                    href="/anniversary"
                    className="text-[11px] font-bold text-pink-500 hover:text-pink-600 hover:underline"
                >
                    {t('ac.manage')}
                </Link>
            </div>

            {loading ? (
                <div className="py-8 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-pink-500 animate-spin" />
                </div>
            ) : !data || !data.loveStartDate ? (
                <EmptyState />
            ) : (
                <Content data={data} breakdown={breakdown} formatPrettyDate={formatPrettyDate} />
            )}
        </div>
    );
}

function EmptyState() {
    const t = useT();
    return (
        <Link
            href="/anniversary"
            className="block rounded-2xl border-2 border-dashed border-pink-200 bg-gradient-to-br from-pink-50/50 to-rose-50/50 p-6 text-center hover:border-pink-300 hover:bg-pink-50 transition-all"
        >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm mb-3">
                <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />
            </div>
            <p className="text-sm font-black text-gray-900">{t('ac.emptyTitle')}</p>
            <p className="text-xs text-gray-500 mt-1">
                {t('ac.emptyDesc')}
            </p>
            <span className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 rounded-lg bg-white text-pink-500 text-xs font-bold border border-pink-200">
                <Sparkles className="h-3 w-3" />
                {t('ac.createCta')}
            </span>
        </Link>
    );
}

function Content({
    data,
    breakdown,
    formatPrettyDate,
}: {
    data: Anniversary;
    breakdown: AnniversaryBreakdown | null;
    formatPrettyDate: (iso?: string | null) => string;
}) {
    const t = useT();
    const { locale } = useLanguage();
    const daysTogether = data.daysTogether ?? 0;
    const nextLoveDays = data.daysUntilNextLoveAnniversary;
    const nextWeddingDays = data.daysUntilNextWeddingAnniversary;
    const showLoveToday = nextLoveDays === 0;
    const showWeddingToday = nextWeddingDays === 0;

    const daysFmt = new Intl.NumberFormat(locale);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.1fr] gap-4">
            {/* Left — hero image + day count */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-pink-100 via-pink-50 to-rose-100 min-h-[180px] flex items-center justify-center">
                {data.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={data.imageUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                ) : (
                    <Heart className="h-10 w-10 text-pink-300 fill-pink-200" />
                )}
                {/* Soft gradient overlay so the white card reads cleanly */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />

                <div className="relative z-10 px-5 py-4 text-white self-end w-full">
                    <p className="text-[10px] font-black uppercase tracking-widest text-pink-100">
                        {t('ac.togetherFor')}
                    </p>
                    <p className="text-3xl sm:text-4xl font-black leading-none mt-1">
                        {daysFmt.format(daysTogether)}
                        <span className="text-sm font-bold text-pink-100 ml-1">{t('ac.daysUnit')}</span>
                    </p>
                </div>
            </div>

            {/* Right — breakdown + dates */}
            <div className="space-y-3">
                {/* Years / months / days chips */}
                {breakdown && (
                    <div className="flex flex-wrap gap-1.5">
                        <Chip value={breakdown.years} label={t('anniversary.unitYears')} />
                        <Chip value={breakdown.months} label={t('anniversary.unitMonths')} />
                        <Chip value={breakdown.days} label={t('anniversary.unitDays')} />
                    </div>
                )}

                {/* Upcoming milestones — next years/months/weeks/days anniversary */}
                {data.loveStartDate && (
                    <UpcomingMilestones loveStartDateIso={data.loveStartDate} />
                )}

                {/* Love start date */}
                <DateRow
                    icon={<Heart className="h-3.5 w-3.5 text-pink-500 fill-pink-500" />}
                    label={t('ac.inLoveSince')}
                    value={formatPrettyDate(data.loveStartDate)}
                    accent="pink"
                />

                {/* Next love anniversary countdown */}
                {nextLoveDays !== undefined && nextLoveDays !== null && (
                    <NextCountdown
                        days={nextLoveDays}
                        kind="love"
                        isToday={showLoveToday}
                    />
                )}

                {/* Wedding date */}
                {data.weddingDate ? (
                    <>
                        <DateRow
                            icon={<Cake className="h-3.5 w-3.5 text-rose-500" />}
                            label={t('ac.weddingDay')}
                            value={formatPrettyDate(data.weddingDate)}
                            accent="rose"
                        />
                        {nextWeddingDays !== undefined && nextWeddingDays !== null && (
                            <NextCountdown
                                days={nextWeddingDays}
                                kind="wedding"
                                isToday={showWeddingToday}
                            />
                        )}
                    </>
                ) : (
                    <p className="text-[11px] text-gray-400 italic px-1">
                        {t('ac.noWedding')}
                    </p>
                )}
            </div>
        </div>
    );
}

function Chip({ value, label }: { value: number; label: string }) {
    return (
        <span className="inline-flex items-baseline gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-100 to-rose-100 border border-pink-200">
            <span className="text-base font-black text-gray-900 leading-none">{value}</span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        </span>
    );
}

function DateRow({
    icon,
    label,
    value,
    accent,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    accent: 'pink' | 'rose';
}) {
    const border = accent === 'pink' ? 'border-pink-100' : 'border-rose-100';
    const labelColor = accent === 'pink' ? 'text-pink-400' : 'text-rose-400';
    return (
        <div className={`flex items-center gap-2 rounded-xl bg-white border ${border} px-3 py-2`}>
            <div className="h-7 w-7 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className={`text-[10px] font-black uppercase tracking-widest ${labelColor}`}>
                    {label}
                </p>
                <p className="text-sm font-black text-gray-900 truncate">{value}</p>
            </div>
        </div>
    );
}

function NextCountdown({
    days,
    kind,
    isToday,
}: {
    days: number;
    kind: 'love' | 'wedding';
    isToday: boolean;
}) {
    const t = useT();
    const { locale } = useLanguage();
    const label =
        kind === 'love'
            ? t('ac.nextLoveAnniversary')
            : t('ac.nextWeddingAnniversary');
    const isTomorrow = days === 1;
    const daysFmt = new Intl.NumberFormat(locale);
    const prettyDays = isToday
        ? t('ms.today')
        : isTomorrow
            ? t('ms.tomorrow')
            : t('ms.inDays', { n: daysFmt.format(days) });

    const tone = isToday
        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border-transparent'
        : kind === 'love'
            ? 'bg-pink-50 border-pink-100 text-pink-700'
            : 'bg-rose-50 border-rose-100 text-rose-700';

    const icon = (
        <CalendarDays
            className={`h-3.5 w-3.5 ${isToday ? 'text-white' : kind === 'love' ? 'text-pink-500' : 'text-rose-500'}`}
        />
    );

    return (
        <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${tone}`}>
            <div className="h-7 w-7 rounded-lg bg-white/70 flex items-center justify-center flex-shrink-0">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p
                    className={`text-[10px] font-black uppercase tracking-widest ${
                        isToday ? 'text-white/80' : kind === 'love' ? 'text-pink-400' : 'text-rose-400'
                    }`}
                >
                    {label}
                </p>
                <p className={`text-sm font-black ${isToday ? 'text-white' : 'text-gray-900'}`}>
                    {prettyDays}
                </p>
            </div>
        </div>
    );
}

function UpcomingMilestones({ loveStartDateIso }: { loveStartDateIso: string }) {
    const t = useT();
    const [now, setNow] = useState<Date>(() => new Date());

    // Refresh every minute so "Today 🎉" lights up the moment the day rolls over.
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 60_000);
        return () => clearInterval(id);
    }, []);

    const items = useMemo(
        () => buildUpcomingMilestones(loveStartDateIso, now, 4),
        [loveStartDateIso, now],
    );

    if (items.length === 0) return null;

    return (
        <div className="rounded-xl bg-gradient-to-br from-pink-50/60 to-rose-50/60 border border-pink-100 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="h-3 w-3 text-pink-500" />
                <p className="text-[10px] font-black uppercase tracking-widest text-pink-400">
                    {t('ac.upcomingMilestones')}
                </p>
            </div>
            <ul className="space-y-1.5">
                {items.map((m) => (
                    <MilestoneRow key={`${m.countdownUnit}-${m.value}`} milestone={m} />
                ))}
            </ul>
        </div>
    );
}

function MilestoneRow({ milestone }: { milestone: UpcomingMilestone }) {
    const t = useT();
    const { locale } = useLanguage();
    const isToday = milestone.daysRemaining === 0;
    const value = new Intl.NumberFormat(locale).format(milestone.value);
    const unit = milestone.countdownUnit;

    const subtitle =
        unit === 'years'
            ? t('ms.yearsAnniversary', { n: value })
            : unit === 'months'
                ? t('ms.monthsAnniversary', { n: value })
                : unit === 'weeks'
                    ? t('ms.weeksAnniversary', { n: value })
                    : t('ms.daysAnniversary', { n: value });

    const shortLabel =
        unit === 'years'
            ? t('ms.yearShort')
            : unit === 'months'
                ? t('ms.monthShort')
                : unit === 'weeks'
                    ? t('ms.weekShort')
                    : t('ms.dayShort');

    const daysFmt = new Intl.NumberFormat(locale);
    const prettyDays = isToday
        ? t('ms.today')
        : milestone.daysRemaining === 1
            ? t('ms.tomorrow')
            : t('ms.inDays', { n: daysFmt.format(milestone.daysRemaining) });

    return (
        <li
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                isToday
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'
                    : 'bg-white/70 border border-white'
            }`}
        >
            <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-black ${
                    isToday
                        ? 'bg-white/25 text-white'
                        : 'bg-pink-100 text-pink-600'
                }`}
            >
                {shortLabel}
            </span>
            <span
                className={`text-xs font-black flex-1 truncate ${
                    isToday ? 'text-white' : 'text-gray-900'
                }`}
            >
                {subtitle}
            </span>
            <span
                className={`text-[10px] font-bold ${
                    isToday ? 'text-white/90' : 'text-pink-500'
                }`}
            >
                {prettyDays}
            </span>
        </li>
    );
}
