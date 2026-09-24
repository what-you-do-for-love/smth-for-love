'use client';

import { useEffect, useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getCookie, getUserName } from '@/lib/ultis';
import { Heart } from 'lucide-react';
import MemoriesSection from '@/components/MemoriesSection';
import { useT } from '@/i18n/LanguageProvider';

export default function MemoriesPage() {
    const isAuthed = useRequireAuth();
    const t = useT();

    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => setMounted(true), []);

    if (!mounted || !isAuthed) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-pink-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    const displayName = getCookie('name') || getUserName() || t('common.you');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-5 sm:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-pink-50/50">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-200 flex-shrink-0">
                        <Heart className="h-5 w-5 sm:h-6 sm:h-6 sm:w-6 text-white fill-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                            {t('memories.title')}
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
                            {t('memories.subtitle', { name: displayName })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Memories section */}
            <div className="bg-white p-5 sm:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-pink-50/50">
                <MemoriesSection />
            </div>
        </div>
    );
}
