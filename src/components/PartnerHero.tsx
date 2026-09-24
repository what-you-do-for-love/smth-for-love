'use client';

import { useEffect, useState, useCallback } from 'react';
import { relationshipApi } from '@/api';
import { getUserId } from '@/lib/ultis';
import { MyRelationship } from '@/types';
import { Check, Copy, Heart, Loader2, Sparkles, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useT } from '@/i18n/LanguageProvider';

/**
 * Partner hero card shown at the top of the dashboard.
 *
 * Three states:
 *  - loading: pink shimmer + spinner
 *  - has partner: avatar + name + username + copyable love code + "Manage" link
 *  - no partner: dashed CTA card with "Connect with someone" prompt
 */
export default function PartnerHero() {
    const t = useT();
    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => setMounted(true), []);

    const [myRelationship, setMyRelationship] = useState<MyRelationship | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!mounted) return;
        const uid = getUserId();
        if (!uid) {
            setLoading(false);
            return;
        }
        const parsed = parseInt(uid, 10);
        const load = async () => {
            try {
                const rel = await relationshipApi.getMyRelationship(parsed);
                setMyRelationship(rel);
            } catch {
                setMyRelationship(null);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [mounted]);

    const partner = myRelationship?.partner;

    const handleCopy = useCallback(async () => {
        if (!partner) return;
        try {
            await navigator.clipboard.writeText(partner.loveCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // silent
        }
    }, [partner]);

    if (!mounted) return null;

    if (loading) {
        return (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-xl shadow-pink-50/50">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
                        <div className="h-4 w-32 rounded bg-gray-100 animate-pulse" />
                        <div className="h-2.5 w-20 rounded bg-gray-100 animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-xl shadow-pink-50/50">
            <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-pink-500" />
                <h2 className="text-sm font-black text-gray-700">{t('partner.title')}</h2>
            </div>

            {partner ? (
                <PartnerHeader
                    name={partner.name}
                    userName={partner.userName}
                    loveCode={partner.loveCode}
                    copied={copied}
                    onCopy={handleCopy}
                />
            ) : (
                <NoPartnerHeader />
            )}
        </div>
    );
}

function PartnerHeader({
    name,
    userName,
    loveCode,
    copied,
    onCopy,
}: {
    name: string | null;
    userName: string | null;
    loveCode: string;
    copied: boolean;
    onCopy: () => void;
}) {
    const t = useT();
    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-200 flex-shrink-0">
                    <Heart className="h-6 w-6 sm:h-7 sm:w-7 text-white fill-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-base sm:text-lg font-black text-gray-900 truncate">
                        {name ?? t('partner.unknown')}
                    </p>
                    <p className="text-xs text-gray-400 font-medium truncate">
                        @{userName ?? '—'}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <button
                    type="button"
                    onClick={onCopy}
                    title={t('partner.copyLoveCode')}
                    aria-label={t('partner.copyLoveCode')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-50 border border-pink-100 hover:bg-pink-100 transition-all"
                >
                    <span className="text-sm font-black text-pink-600 tracking-widest">
                        {loveCode}
                    </span>
                    {copied ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                        <Copy className="h-3.5 w-3.5 text-gray-400" />
                    )}
                </button>
            </div>
        </div>
    );
}

function NoPartnerHeader() {
    const t = useT();
    return (
        <Link
            href="/connection-requests"
            className="block rounded-2xl border-2 border-dashed border-pink-200 bg-gradient-to-br from-pink-50/50 to-rose-50/50 p-5 text-center hover:border-pink-300 hover:bg-pink-50 transition-all"
        >
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm mb-2">
                <UserPlus className="h-5 w-5 text-pink-500" />
            </div>
            <p className="text-sm font-black text-gray-900">{t('partner.noPartnerTitle')}</p>
            <p className="text-xs text-gray-500 mt-1">{t('partner.noPartnerDesc')}</p>
            <span className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 rounded-lg bg-white text-pink-500 text-xs font-bold border border-pink-200">
                <Heart className="h-3 w-3 fill-pink-500" />
                {t('partner.findPartner')}
            </span>
        </Link>
    );
}
