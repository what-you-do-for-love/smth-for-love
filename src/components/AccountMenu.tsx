'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import {
    ChevronDown,
    LogOut,
    KeyRound,
    Camera,
    Check,
    Trash2,
    Copy,
    Globe,
} from 'lucide-react';
import {
    getCookie,
    getUserId,
    getUserLoveCode,
    getUserName,
    clearAuth,
} from '@/lib/ultis';
import { userAvatarApi, uploadApi } from '@/api';
import { UserAvatar } from '@/types';
import { useLanguage } from '@/i18n/LanguageProvider';

/**
 * Top-right account menu. Replaces the legacy per-page header.
 * - Click the avatar to open the dropdown
 * - Dropdown contains: name+role header, love code (click to copy), change avatar,
 *   avatar history, change password, sign out
 */
export default function AccountMenu() {
    const router = useRouter();
    const pathname = usePathname();
    const { lang, setLang, t, languages } = useLanguage();
    const [mounted, setMounted] = useState(false);
    const [open, setOpen] = useState(false);
    const [showAvatars, setShowAvatars] = useState(false);
    const [avatar, setAvatar] = useState<UserAvatar | null>(null);
    const [avatars, setAvatars] = useState<UserAvatar[]>([]);
    const [uploading, setUploading] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // SSR-safe cookie reads.
    useEffect(() => {
        setMounted(true);
    }, []);

    // Close dropdown on outside click.
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
                setShowAvatars(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Close dropdown on route change.
    useEffect(() => {
        setOpen(false);
        setShowAvatars(false);
    }, [pathname]);

    // Fetch current avatar (best-effort; non-fatal if missing).
    useEffect(() => {
        if (!mounted) return;
        const userId = getUserId();
        if (!userId) return;
        userAvatarApi
            .getCurrent(parseInt(userId, 10))
            .then(setAvatar)
            .catch(() => setAvatar(null));
    }, [mounted]);

    const fetchHistory = async () => {
        const userId = getUserId();
        if (!userId) return;
        try {
            const list = await userAvatarApi.getForUser(parseInt(userId, 10));
            setAvatars(list);
        } catch (err) {
            console.warn('Failed to load avatar history', err);
        }
    };

    const handleToggle = () => {
        const next = !open;
        setOpen(next);
        if (next) fetchHistory();
    };

    const handleSignOut = () => {
        clearAuth();
        toast.success(t('account.signedOut'));
        router.replace('/login');
    };

    const handleCopyLoveCode = async () => {
        if (!loveCode) return;
        try {
            await navigator.clipboard.writeText(loveCode);
            setCodeCopied(true);
            toast.success(t('account.loveCodeCopied', { code: loveCode }));
            setTimeout(() => setCodeCopied(false), 2000);
        } catch {
            toast.error(t('account.copyFailed'));
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        const userId = getUserId();
        if (!userId) return;
        setUploading(true);
        try {
            await uploadApi.uploadAvatar(parseInt(userId, 10), parseInt(userId, 10), file);
            toast.success(t('account.avatarUpdated'));
            // Re-fetch current + history.
            const current = await userAvatarApi
                .getCurrent(parseInt(userId, 10))
                .catch(() => null);
            setAvatar(current);
            await fetchHistory();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('account.uploadFailed');
            toast.error(msg);
        } finally {
            setUploading(false);
        }
    };

    const handleSetCurrent = async (avatarId: number) => {
        const userId = getUserId();
        if (!userId) return;
        try {
            const updated = await userAvatarApi.setCurrent(
                parseInt(userId, 10),
                avatarId,
                parseInt(userId, 10),
            );
            setAvatar(updated);
            toast.success(t('account.avatarUpdated'));
            await fetchHistory();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed';
            toast.error(msg);
        }
    };

    const handleDeleteAvatar = async (avatarId: number) => {
        const userId = getUserId();
        if (!userId) return;
        if (!confirm(t('account.deleteAvatarConfirm'))) return;
        try {
            await userAvatarApi.remove(parseInt(userId, 10), avatarId, parseInt(userId, 10));
            toast.success(t('account.avatarRemoved'));
            await fetchHistory();
            const current = await userAvatarApi
                .getCurrent(parseInt(userId, 10))
                .catch(() => null);
            setAvatar(current);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed';
            toast.error(msg);
        }
    };

    if (!mounted) {
        return (
            <div className="h-10 w-10 rounded-full bg-gray-100 animate-pulse" aria-hidden />
        );
    }

    const displayName = getCookie('name') || getUserName() || 'Friend';
    const loveCode = getUserLoveCode();
    const role = getCookie('role') || 'User';

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={handleToggle}
                className="inline-flex items-center gap-2 pl-1.5 pr-2.5 sm:pr-3 py-1.5 rounded-full bg-white border border-gray-200 hover:border-pink-200 hover:shadow-md transition-all"
                aria-haspopup="menu"
                aria-expanded={open}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={avatar?.imageUrl || '/default-avatar.svg'}
                    alt=""
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = '/default-avatar.svg';
                    }}
                    className="h-7 w-7 rounded-full object-cover bg-pink-100"
                />
                <span className="hidden sm:block text-xs font-black text-gray-700 truncate max-w-[120px]">
                    {displayName}
                </span>
                <ChevronDown
                    className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                        open ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {open && (
                <div
                    role="menu"
                    className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2"
                >
                    {/* Header: avatar + name + role */}
                    <div className="p-4 bg-gradient-to-br from-pink-50 to-rose-50 border-b border-pink-100">
                        <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={avatar?.imageUrl || '/default-avatar.svg'}
                                alt=""
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                        '/default-avatar.svg';
                                }}
                                className="h-12 w-12 rounded-full object-cover bg-pink-100 border-2 border-white shadow"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-gray-900 truncate">
                                    {displayName}
                                </p>
                                <p className="text-[11px] text-gray-500 truncate">
                                    {role}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-2">
                        {loveCode && (
                            <button
                                type="button"
                                onClick={handleCopyLoveCode}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-700 hover:bg-pink-50 transition-colors"
                                role="menuitem"
                            >
                                <KeyRound className="h-4 w-4 text-pink-500" />
                                <span className="flex-1 text-left">{t('account.loveCode')}</span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-pink-50 border border-pink-100">
                                    <span className="text-xs font-black text-pink-600 tracking-widest">
                                        {loveCode}
                                    </span>
                                    {codeCopied ? (
                                        <Check className="h-3 w-3 text-green-500" />
                                    ) : (
                                        <Copy className="h-3 w-3 text-gray-400" />
                                    )}
                                </span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleUploadClick}
                            disabled={uploading}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-700 hover:bg-pink-50 transition-colors disabled:opacity-50"
                            role="menuitem"
                        >
                            <Camera className="h-4 w-4 text-pink-500" />
                            {uploading ? t('account.uploading') : t('account.changeAvatar')}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />

                        <Link
                            href="/change-password"
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-700 hover:bg-pink-50 transition-colors"
                            role="menuitem"
                        >
                            <KeyRound className="h-4 w-4 text-pink-500" />
                            {t('account.changePassword')}
                        </Link>

                        <button
                            type="button"
                            onClick={() => setShowAvatars((v) => !v)}
                            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-700 hover:bg-pink-50 transition-colors"
                            role="menuitem"
                        >
                            <span className="inline-flex items-center gap-3">
                                <Camera className="h-4 w-4 text-pink-500" />
                                {t('account.avatarHistory')}
                            </span>
                            <ChevronDown
                                className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                                    showAvatars ? 'rotate-180' : ''
                                }`}
                            />
                        </button>

                        {showAvatars && (
                            <div className="mt-1 p-2 bg-gray-50 rounded-xl max-h-56 overflow-y-auto">
                                {avatars.length === 0 ? (
                                    <p className="text-[11px] text-gray-400 italic text-center py-3">
                                        {t('account.noPastAvatars')}
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-4 gap-2">
                                        {avatars.map((a) => (
                                            <div
                                                key={a.id}
                                                className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square bg-white"
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={a.imageUrl}
                                                    alt=""
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display =
                                                            'none';
                                                    }}
                                                    className="w-full h-full object-cover"
                                                />
                                                {a.isCurrent && (
                                                    <span className="absolute top-1 left-1 bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                                        <Check className="h-2.5 w-2.5" />
                                                    </span>
                                                )}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                    {!a.isCurrent && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSetCurrent(a.id)}
                                                            title={t('account.setAsCurrent')}
                                                            aria-label={t('account.setAsCurrent')}
                                                            className="h-7 w-7 rounded-md bg-white text-emerald-600 flex items-center justify-center"
                                                        >
                                                            <Check className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteAvatar(a.id)}
                                                        title={t('account.deleteAvatar')}
                                                        aria-label={t('account.deleteAvatar')}
                                                        className="h-7 w-7 rounded-md bg-white text-red-500 flex items-center justify-center"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Language switcher */}
                        <div className="my-1 border-t border-gray-100" />
                        <div
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl"
                            role="menuitem"
                        >
                            <Globe className="h-4 w-4 text-pink-500 flex-shrink-0" />
                            <span className="text-sm font-bold text-gray-700 flex-1 text-left">
                                {t('lang.label')}
                            </span>
                            <div
                                role="radiogroup"
                                aria-label={t('lang.label')}
                                className="inline-flex items-center gap-0.5 bg-gray-100 rounded-full p-0.5"
                            >
                                {languages.map((l) => {
                                    const active = l.code === lang;
                                    return (
                                        <button
                                            key={l.code}
                                            type="button"
                                            role="radio"
                                            aria-checked={active}
                                            aria-label={l.label}
                                            title={l.label}
                                            onClick={() => setLang(l.code)}
                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black transition-all ${
                                                active
                                                    ? 'bg-white text-pink-600 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            <span aria-hidden>{l.flag}</span>
                                            <span>{l.shortLabel}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="my-1 border-t border-gray-100" />

                        <button
                            type="button"
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                            role="menuitem"
                        >
                            <LogOut className="h-4 w-4" />
                            {t('account.signOut')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
