'use client';

import { useEffect, useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useLogout } from '@/hooks/useLogout';
import { getUserName, getCookie, getUserLoveCode } from '@/lib/ultis';
import { Heart, LogOut, Settings, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import LoveCodeBadge from '@/components/LoveCodeBadge';
import MemoriesSection from '@/components/MemoriesSection';

export default function MemoriesPage() {
    const isAuthed = useRequireAuth();
    const logout = useLogout();

    // SSR-safe cookie reads: cookies only exist on the client.
    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => setMounted(true), []);

    if (!mounted || !isAuthed) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-pink-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    const displayName = getCookie('name') || getUserName() || 'Friend';
    const loveCode = getUserLoveCode();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-pink-50/50">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-200">
                            <Heart className="h-6 w-6 text-white fill-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                                    Memories
                                </h1>
                                {loveCode && <LoveCodeBadge code={loveCode} variant="inline" />}
                            </div>
                            <p className="text-sm text-gray-500 font-medium mt-1">
                                Hi, {displayName} — every moment we&apos;ve shared.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Dashboard
                        </Link>
                        <Link
                            href="/change-password"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors"
                        >
                            <Settings className="h-4 w-4" />
                            Change password
                        </Link>
                        <button
                            onClick={logout}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold hover:from-pink-600 hover:to-rose-600 transition-all"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign out
                        </button>
                    </div>
                </div>
            </div>

            {/* Memories section */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-pink-50/50">
                <MemoriesSection />
            </div>
        </div>
    );
}
