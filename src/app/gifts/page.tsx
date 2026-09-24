'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Gift as GiftIcon, Trash2, X, ImageIcon, Save, Heart, Search } from 'lucide-react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getUserId, getCookie } from '@/lib/ultis';
import { giftApi, uploadApi, relationshipApi } from '@/api';
import {
    Gift,
    GiftOccasion,
    GIFT_OCCASIONS,
    Partner,
    CreateGiftBody,
    GiftImage,
} from '@/types';
import PhotoLightbox, { LightboxImage } from '@/components/PhotoLightbox';
import { useLanguage, useT } from '@/i18n/LanguageProvider';

function toInputDate(iso?: string): string {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch {
        return '';
    }
}

function fromInputDate(value: string): string {
    if (!value) return new Date().toISOString();
    return new Date(`${value}T00:00:00Z`).toISOString();
}

function formatDate(locale: string, iso: string): string {
    try {
        return new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(new Date(iso));
    } catch {
        return iso;
    }
}

const OCCASION_COLORS: Record<string, string> = {
    Birthday: 'from-amber-400 to-orange-500',
    Anniversary: 'from-pink-400 to-rose-500',
    Christmas: 'from-emerald-400 to-green-500',
    Valentine: 'from-red-400 to-pink-500',
    JustBecause: 'from-violet-400 to-purple-500',
    Other: 'from-slate-400 to-gray-500',
};

export default function GiftsPage() {
    const isAuthed = useRequireAuth();
    const { t, locale } = useLanguage();
    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => setMounted(true), []);

    const userId = getUserId();
    const displayName = getCookie('name') || 'Friend';

    const [items, setItems] = useState<Gift[]>([]);
    const [loading, setLoading] = useState(true);
    const [partner, setPartner] = useState<Partner | null>(null);
    const [opening, setOpening] = useState<Gift | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pendingImages, setPendingImages] = useState<Array<{ id: string; file: File; previewUrl: string }>>([]);

    // PhotoLightbox state
    const [lightbox, setLightbox] = useState<{
        images: LightboxImage[];
        index: number;
    } | null>(null);

    const fetchAll = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const [list, rel] = await Promise.all([
                giftApi.getForUser(parseInt(userId, 10)),
                relationshipApi.getMyRelationship(parseInt(userId, 10)).catch(() => null),
            ]);
            setItems(list);
            setPartner(rel?.partner ?? null);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : t('gifts.failedLoad'));
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (mounted && isAuthed && userId) fetchAll();
    }, [mounted, isAuthed, userId, fetchAll]);

    useEffect(() => {
        return () => {
            pendingImages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handlePickFiles = (files: File[]) => {
        if (files.length === 0) return;
        setPendingImages((prev) => [
            ...prev,
            ...files.map((f) => ({
                id: `${Date.now()}-${f.name}-${Math.random().toString(36).slice(2, 8)}`,
                file: f,
                previewUrl: URL.createObjectURL(f),
            })),
        ]);
    };

    const handleRemovePending = (id: string) => {
        setPendingImages((prev) => {
            const found = prev.find((p) => p.id === id);
            if (found) URL.revokeObjectURL(found.previewUrl);
            return prev.filter((p) => p.id !== id);
        });
    };

    const handleCreate = async (values: Omit<CreateGiftBody, 'ownerId' | 'imageUrls'>) => {
        if (!userId) return;
        setSaving(true);
        try {
            const created = await giftApi.create({
                ...values,
                ownerId: parseInt(userId, 10),
            });

            if (pendingImages.length > 0) {
                // The BE's `/api/gifts/{id}/images/upload-multiple` endpoint
                // uploads via Cloudinary AND attaches the resulting rows to
                // the gift server-side. No additional addImage call is
                // needed — the gift already has its images.
                await uploadApi.uploadGiftImages(
                    created.id,
                    parseInt(userId, 10),
                    pendingImages.map((p) => p.file),
                );
            }

            toast.success(t('gifts.created'));
            setCreateOpen(false);
            pendingImages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
            setPendingImages([]);
            await fetchAll();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('gifts.failedCreate');
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!userId) return;
        // We'll get the gift name through the opening state OR fall back to the items list.
        const giftName = opening?.name ?? items.find((i) => i.id === id)?.name ?? '';
        if (!confirm(t('gifts.deleteConfirm', { name: giftName }))) return;
        try {
            await giftApi.remove(id, parseInt(userId, 10));
            toast.success(t('gifts.deleted'));
            if (opening?.id === id) setOpening(null);
            await fetchAll();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : t('gifts.failedDelete'));
        }
    };

    const handleDeleteImage = async (giftId: number, imageId: number) => {
        if (!userId) return;
        try {
            await giftApi.removeImage(giftId, imageId, parseInt(userId, 10));
            toast.success(t('gifts.removed'));
            await fetchAll();
            const fresh = items.find((i) => i.id === giftId);
            if (fresh) setOpening(fresh);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : t('gifts.failedRemove'));
        }
    };

    if (!mounted || !isAuthed) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="h-7 w-7 text-pink-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-5 sm:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-pink-50/50">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-200 flex-shrink-0">
                        <GiftIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                            {t('gifts.title')}
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
                            {t('gifts.subtitle', { name: displayName })}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold hover:from-pink-600 hover:to-rose-600 transition-all shadow shadow-pink-200"
                    >
                        <Plus className="h-4 w-4" />
                        {t('gifts.addGift')}
                    </button>
                </div>
            </div>

            <div className="bg-white p-5 sm:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-pink-50/50">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-7 w-7 text-pink-500 animate-spin" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-pink-100 mb-3">
                            <GiftIcon className="h-6 w-6 text-pink-500" />
                        </div>
                        <p className="text-sm font-bold text-gray-700">{t('gifts.emptyTitle')}</p>
                        <p className="text-xs text-gray-500 mt-1 mb-4">
                            {t('gifts.emptyDesc')}
                        </p>
                        <button
                            type="button"
                            onClick={() => setCreateOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold shadow shadow-pink-200 hover:from-pink-600 hover:to-rose-600"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            {t('gifts.addGift')}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {items.map((gift) => (
                            <GiftCard key={gift.id} gift={gift} onOpen={() => setOpening(gift)} />
                        ))}
                    </div>
                )}
            </div>

            {createOpen && (
                <GiftFormModal
                    open={createOpen}
                    pendingImages={pendingImages}
                    onPickFiles={handlePickFiles}
                    onRemovePending={handleRemovePending}
                    saving={saving}
                    partner={partner}
                    onCancel={() => {
                        setCreateOpen(false);
                        pendingImages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
                        setPendingImages([]);
                    }}
                    onSave={async (values) => {
                        await handleCreate(values);
                    }}
                />
            )}

            {opening && (
                <GiftDetailModal
                    gift={opening}
                    onClose={() => setOpening(null)}
                    onDeleteImage={(imgId) => handleDeleteImage(opening.id, imgId)}
                    onDelete={() => handleDelete(opening.id)}
                    onImageClick={(idx) =>
                        setLightbox({
                            images: opening.images.map((img) => ({
                                id: img.id,
                                url: img.imageUrl,
                                caption: opening.name,
                            })),
                            index: idx,
                        })
                    }
                />
            )}

            {/* Photo lightbox */}
            {lightbox && (
                <PhotoLightbox
                    images={lightbox.images}
                    index={lightbox.index}
                    onClose={() => setLightbox(null)}
                    onIndexChange={(i) =>
                        setLightbox((prev) => (prev ? { ...prev, index: i } : prev))
                    }
                />
            )}
        </div>
    );
}

// ---- Card ----

function GiftCard({ gift, onOpen }: { gift: Gift; onOpen: () => void }) {
    const t = useT();
    const { locale } = useLanguage();
    const hero = gift.images[0]?.imageUrl;
    const occasionKey = `gifts.occasions.${gift.occasion}`;
    const occasionLabel = t(occasionKey as any, {});
    return (
        <button
            type="button"
            onClick={onOpen}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col text-left"
        >
            <div className="aspect-[4/3] bg-gray-50 relative">
                {hero ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={hero}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                ) : (
                    <div
                        className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${
                            OCCASION_COLORS[gift.occasion] ?? OCCASION_COLORS.Other
                        }`}
                    >
                        <GiftIcon className="h-10 w-10 text-white" />
                    </div>
                )}
                <span className="absolute top-2 left-2 bg-white/90 backdrop-blur text-gray-700 text-[10px] font-black px-2 py-1 rounded-md">
                    {occasionLabel}
                </span>
            </div>
            <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-sm font-black text-gray-900 truncate">{gift.name}</h3>
                <p className="text-xs text-gray-500 truncate">
                    {gift.giverName
                        ? t('gifts.fromGiver', { name: gift.giverName })
                        : ''}
                    {gift.giverName ? ' · ' : ''}
                    {formatDate(locale, gift.dateReceived)}
                </p>
                {gift.description && (
                    <p className="mt-2 text-xs text-gray-600 line-clamp-2 break-words">
                        {gift.description}
                    </p>
                )}
            </div>
        </button>
    );
}

// ---- Create modal ----

function GiftFormModal({
    open,
    pendingImages,
    onPickFiles,
    onRemovePending,
    saving,
    partner,
    onCancel,
    onSave,
}: {
    open: boolean;
    pendingImages: Array<{ id: string; file: File; previewUrl: string }>;
    onPickFiles: (files: File[]) => void;
    onRemovePending: (id: string) => void;
    saving: boolean;
    partner: Partner | null;
    onCancel: () => void;
    onSave: (values: Omit<CreateGiftBody, 'ownerId' | 'imageUrls'>) => Promise<void>;
}) {
    const t = useT();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [dateReceived, setDateReceived] = useState(toInputDate(new Date().toISOString()));
    const [occasion, setOccasion] = useState<GiftOccasion>('Birthday');
    const [giverUserId, setGiverUserId] = useState<number | ''>('');

    useEffect(() => {
        if (!open) return;
        setName('');
        setDescription('');
        setDateReceived(toInputDate(new Date().toISOString()));
        setOccasion('Birthday');
        setGiverUserId('');
    }, [open]);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error(t('gifts.nameRequired'));
            return;
        }
        if (!giverUserId) {
            toast.error(t('gifts.fieldGiver') + ' (bắt buộc)');
            return;
        }
        await onSave({
            name: name.trim(),
            description: description.trim() || null,
            dateReceived: fromInputDate(dateReceived),
            occasion,
            giverUserId: giverUserId as number,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-pink-100">
                <div className="sticky top-0 bg-white px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-black text-gray-900">{t('gifts.formTitleNew')}</h2>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="h-9 w-9 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50 flex items-center justify-center"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            {t('gifts.fieldName')} *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('gifts.fieldNamePlaceholder')}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                {t('gifts.fieldOccasion')}
                            </label>
                            <select
                                value={occasion}
                                onChange={(e) => setOccasion(e.target.value as GiftOccasion)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
                            >
                                {GIFT_OCCASIONS.map((o) => (
                                    <option key={o} value={o}>
                                        {t(`gifts.occasions.${o}` as any, {})}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                {t('gifts.fieldDate')} *
                            </label>
                            <input
                                type="date"
                                value={dateReceived}
                                onChange={(e) => setDateReceived(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            {t('gifts.fieldGiver')}
                        </label>
                        <GiverPicker
                            partner={partner}
                            value={giverUserId}
                            onChange={setGiverUserId}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            {t('gifts.fieldNotes')} (tùy chọn)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            maxLength={2000}
                            placeholder={t('gifts.fieldNotesPlaceholder')}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            {t('gifts.fieldImages')}
                        </label>
                        <label className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-pink-200 bg-pink-50/50 text-pink-600 text-sm font-bold cursor-pointer hover:bg-pink-50">
                            <ImageIcon className="h-4 w-4" />
                            {t('gifts.pickImages')}
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    const files = Array.from(e.target.files ?? []);
                                    e.target.value = '';
                                    onPickFiles(files);
                                }}
                            />
                        </label>
                        {pendingImages.length > 0 && (
                            <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {pendingImages.map((p) => (
                                    <div
                                        key={p.id}
                                        className="relative group rounded-lg overflow-hidden border border-gray-100 aspect-square bg-gray-50"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={p.previewUrl}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => onRemovePending(p.id)}
                                            className="absolute top-1 right-1 h-6 w-6 rounded-md bg-white/90 text-red-500 flex items-center justify-center shadow opacity-0 group-hover:opacity-100"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 w-full sm:w-auto"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold shadow shadow-pink-200 hover:from-pink-600 hover:to-rose-600 disabled:opacity-60 flex items-center justify-center gap-2 w-full sm:w-auto"
                        >
                            {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            {t('common.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ---- Giver picker ----

function GiverPicker({
    partner,
    value,
    onChange,
}: {
    partner: Partner | null;
    value: number | '';
    onChange: (v: number | '') => void;
}) {
    const t = useT();
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<Partner[]>([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (!search) {
            setResults([]);
            return;
        }
        const handle = setTimeout(async () => {
            try {
                setSearching(true);
                const user = await relationshipApi.getByLoveCode(search.trim().toUpperCase());
                setResults([user]);
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 400);
        return () => clearTimeout(handle);
    }, [search]);

    const selectPartner = (p: Partner) => {
        onChange(p.id);
        setSearch('');
        setResults([]);
    };

    if (value !== '') {
        // We need to display the chosen name. The parent owns `partner` (current)
        // and search may yield a custom one — easiest path: render a confirmation
        // chip and let the user clear it.
        return (
            <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-pink-100 bg-pink-50 text-sm font-bold text-pink-700">
                    <Heart className="h-3.5 w-3.5 fill-pink-500 text-pink-500" />
                    {t('gifts.giverUserChip', { id: value })}
                </div>
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="h-9 w-9 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-red-500 flex items-center justify-center"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {partner && (
                <button
                    type="button"
                    onClick={() => selectPartner(partner)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-100 text-sm font-bold text-pink-700 hover:from-pink-100"
                >
                    <Heart className="h-3.5 w-3.5 fill-pink-500 text-pink-500" />
                    {partner.name}
                </button>
            )}
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('gifts.searchPartnerPlaceholder')}
                    maxLength={6}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
                />
            </div>
            {searching && (
                <p className="text-xs text-gray-500">{t('common.loading')}</p>
            )}
            {results.length > 0 && (
                <button
                    type="button"
                    onClick={() => selectPartner(results[0])}
                    className="w-full text-left px-3 py-2 rounded-xl border border-gray-100 bg-white hover:bg-pink-50 text-sm font-bold text-gray-700"
                >
                    {results[0].name} ({results[0].loveCode})
                </button>
            )}
            {search && !searching && results.length === 0 && (
                <p className="text-xs text-gray-400 italic">{t('common.unknown')}</p>
            )}
        </div>
    );
}

// ---- Detail modal ----

function GiftDetailModal({
    gift,
    onClose,
    onDeleteImage,
    onDelete,
    onImageClick,
}: {
    gift: Gift;
    onClose: () => void;
    onDeleteImage: (imageId: number) => void;
    onDelete: () => void;
    onImageClick: (index: number) => void;
}) {
    const t = useT();
    const { locale } = useLanguage();
    const occasionLabel = t(`gifts.occasions.${gift.occasion}` as any, {});
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl sm:max-w-3xl max-h-[90vh] overflow-y-auto border border-pink-100">
                <div className="sticky top-0 bg-white px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 z-10">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-base sm:text-lg font-black text-gray-900 truncate">
                            {gift.name}
                        </h2>
                        <p className="text-[11px] sm:text-xs text-gray-500 truncate">
                            {occasionLabel} · {formatDate(locale, gift.dateReceived)} · {gift.giverName ? t('gifts.fromGiver', { name: gift.giverName }) : t('gifts.giverUnknown')}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-9 w-9 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50 flex items-center justify-center flex-shrink-0"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-5 sm:p-6 space-y-5">
                    {gift.description && (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {gift.description}
                        </p>
                    )}

                    {gift.images.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                            {gift.images.map((img, idx) => (
                                <GiftImageTile
                                    key={img.id}
                                    img={img}
                                    onClick={() => onImageClick(idx)}
                                    onDelete={() => onDeleteImage(img.id)}
                                />
                            ))}
                        </div>
                    )}

                    <div className="pt-2 border-t border-gray-100 flex justify-end">
                        <button
                            type="button"
                            onClick={onDelete}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            {t('gifts.deleteGift')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function GiftImageTile({
    img,
    onClick,
    onDelete,
}: {
    img: GiftImage;
    onClick: () => void;
    onDelete: () => void;
}) {
    const t = useT();
    return (
        <div className="relative group rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 aspect-square">
            <button
                type="button"
                onClick={onClick}
                aria-label={t('common.openPhotoViewer')}
                className="absolute inset-0 z-0"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={img.imageUrl}
                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                }}
            />
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                className="absolute top-1.5 right-1.5 z-10 h-7 w-7 rounded-lg bg-white/90 text-red-500 hover:bg-red-50 flex items-center justify-center shadow opacity-0 group-hover:opacity-100"
            >
                <Trash2 className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
