'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, MapPin, Star, Trash2, X, ImageIcon, Save, Heart } from 'lucide-react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getUserId, getCookie } from '@/lib/ultis';
import { cityVisitApi, uploadApi } from '@/api';
import { CityVisit, CreateCityVisitBody, CityVisitImage } from '@/types';
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

function Stars({ value, onChange, readOnly }: { value: number; onChange?: (v: number) => void; readOnly?: boolean }) {
    return (
        <div className="inline-flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
                <button
                    key={n}
                    type="button"
                    disabled={readOnly}
                    onClick={() => onChange?.(n === value ? 0 : n)}
                    className={`p-0.5 ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                >
                    <Star
                        className={`h-4 w-4 ${
                            n <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                        }`}
                    />
                </button>
            ))}
        </div>
    );
}

export default function CitiesPage() {
    const isAuthed = useRequireAuth();
    const { t, locale } = useLanguage();
    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => setMounted(true), []);

    const userId = getUserId();
    const displayName = getCookie('name') || 'Friend';
    const [items, setItems] = useState<CityVisit[]>([]);
    const [loading, setLoading] = useState(true);
    const [opening, setOpening] = useState<CityVisit | null>(null);
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
            const list = await cityVisitApi.getForUser(parseInt(userId, 10));
            setItems(list);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : t('cities.failedLoad'));
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

    const handleCreate = async (values: Omit<CreateCityVisitBody, 'ownerId' | 'imageUrls'>) => {
        if (!userId) return;
        setSaving(true);
        try {
            // Create first so we can attach images to a real row.
            const created = await cityVisitApi.create({
                ...values,
                ownerId: parseInt(userId, 10),
            });

            if (pendingImages.length > 0) {
                // The BE's `/api/cities/{id}/images/upload-multiple` endpoint
                // uploads via Cloudinary AND attaches the resulting rows to
                // the city visit server-side. No additional addImage call
                // is needed — the city already has its images.
                await uploadApi.uploadCityVisitImages(
                    created.id,
                    parseInt(userId, 10),
                    pendingImages.map((p) => p.file),
                );
            }

            toast.success('City visit created');
            setCreateOpen(false);
            pendingImages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
            setPendingImages([]);
            await fetchAll();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to create';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!userId) return;
        if (!confirm('Delete this city visit?')) return;
        try {
            await cityVisitApi.remove(id, parseInt(userId, 10));
            toast.success('City visit deleted');
            if (opening?.id === id) setOpening(null);
            await fetchAll();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete');
        }
    };

    const handleDeleteImage = async (visitId: number, imageId: number) => {
        if (!userId) return;
        try {
            await cityVisitApi.removeImage(visitId, imageId, parseInt(userId, 10));
            toast.success('Image removed');
            await fetchAll();
            const fresh = items.find((i) => i.id === visitId);
            if (fresh) setOpening(fresh);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed');
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
                        <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                            {t('cities.title')}
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
                            {t('cities.subtitle', { name: displayName })}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold hover:from-pink-600 hover:to-rose-600 transition-all shadow shadow-pink-200"
                    >
                        <Plus className="h-4 w-4" />
                        {t('cities.addPlace')}
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
                            <MapPin className="h-6 w-6 text-pink-500" />
                        </div>
                        <p className="text-sm font-bold text-gray-700">{t('cities.emptyTitle')}</p>
                        <p className="text-xs text-gray-500 mt-1 mb-4">
                            {t('cities.emptyDesc')}
                        </p>
                        <button
                            type="button"
                            onClick={() => setCreateOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold shadow shadow-pink-200 hover:from-pink-600 hover:to-rose-600"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            {t('cities.addPlace')}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {items.map((city) => (
                            <CityCard key={city.id} city={city} onOpen={() => setOpening(city)} />
                        ))}
                    </div>
                )}
            </div>

            {createOpen && (
                <CityFormModal
                    open={createOpen}
                    pendingImages={pendingImages}
                    onPickFiles={handlePickFiles}
                    onRemovePending={handleRemovePending}
                    saving={saving}
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
                <CityDetailModal
                    city={opening}
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

function CityCard({ city, onOpen }: { city: CityVisit; onOpen: () => void }) {
    const t = useT();
    const { locale } = useLanguage();
    const hero = city.images[0]?.imageUrl;
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
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-50">
                        <MapPin className="h-10 w-10 text-pink-300" />
                    </div>
                )}
                {city.isFavorite && (
                    <span className="absolute top-2 right-2 bg-white/90 backdrop-blur text-pink-600 text-[10px] font-black px-2 py-1 rounded-md inline-flex items-center gap-1">
                        <Heart className="h-3 w-3 fill-pink-500 text-pink-500" /> {t('cities.favorite')}
                    </span>
                )}
            </div>
            <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-sm font-black text-gray-900 truncate">{city.name}</h3>
                <p className="text-xs text-gray-500 truncate">{city.country}</p>
                <div className="mt-2 flex items-center justify-between">
                    <Stars value={city.rating} readOnly />
                    <span className="text-[11px] text-gray-400 font-medium">
                        {formatDate(locale, city.dateVisited)}
                    </span>
                </div>
            </div>
        </button>
    );
}

// ---- Create modal ----

function CityFormModal({
    open,
    pendingImages,
    onPickFiles,
    onRemovePending,
    saving,
    onCancel,
    onSave,
}: {
    open: boolean;
    pendingImages: Array<{ id: string; file: File; previewUrl: string }>;
    onPickFiles: (files: File[]) => void;
    onRemovePending: (id: string) => void;
    saving: boolean;
    onCancel: () => void;
    onSave: (values: Omit<CreateCityVisitBody, 'ownerId' | 'imageUrls'>) => Promise<void>;
}) {
    const t = useT();
    const [name, setName] = useState('');
    const [country, setCountry] = useState('');
    const [dateVisited, setDateVisited] = useState(toInputDate(new Date().toISOString()));
    const [rating, setRating] = useState(0);
    const [highlights, setHighlights] = useState('');
    const [isFavorite, setIsFavorite] = useState(false);

    useEffect(() => {
        if (!open) return;
        setName('');
        setCountry('');
        setDateVisited(toInputDate(new Date().toISOString()));
        setRating(0);
        setHighlights('');
        setIsFavorite(false);
    }, [open]);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !country.trim()) {
            toast.error(t('cities.nameRequired') + ' / ' + t('cities.fieldCountry'));
            return;
        }
        await onSave({
            name: name.trim(),
            country: country.trim(),
            dateVisited: fromInputDate(dateVisited),
            rating,
            highlights: highlights.trim() || null,
            isFavorite,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-pink-100">
                <div className="sticky top-0 bg-white px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-black text-gray-900">{t('cities.formTitleNew')}</h2>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="h-9 w-9 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50 flex items-center justify-center"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                {t('cities.fieldName')} *
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Da Nang"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                {t('cities.fieldCountry')} *
                            </label>
                            <input
                                type="text"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                placeholder="Vietnam"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                {t('cities.fieldDate')} *
                            </label>
                            <input
                                type="date"
                                value={dateVisited}
                                onChange={(e) => setDateVisited(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                {t('cities.fieldRating')}
                            </label>
                            <div className="h-[42px] flex items-center">
                                <Stars value={rating} onChange={setRating} />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            {t('cities.fieldHighlights')}
                        </label>
                        <textarea
                            value={highlights}
                            onChange={(e) => setHighlights(e.target.value)}
                            rows={3}
                            maxLength={2000}
                            placeholder={t('cities.fieldHighlightsPlaceholder')}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 resize-none"
                        />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isFavorite}
                            onChange={(e) => setIsFavorite(e.target.checked)}
                            className="h-4 w-4 rounded text-pink-500 focus:ring-pink-300"
                        />
                        <span className="text-sm font-bold text-gray-700">{t('cities.favoriteToggle')}</span>
                    </label>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            {t('cities.fieldImages')}
                        </label>
                        <label className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-pink-200 bg-pink-50/50 text-pink-600 text-sm font-bold cursor-pointer hover:bg-pink-50">
                            <ImageIcon className="h-4 w-4" />
                            {t('cities.pickImages')}
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

// ---- Detail modal ----

function CityDetailModal({
    city,
    onClose,
    onDeleteImage,
    onDelete,
    onImageClick,
}: {
    city: CityVisit;
    onClose: () => void;
    onDeleteImage: (imageId: number) => void;
    onDelete: () => void;
    onImageClick: (index: number) => void;
}) {
    const t = useT();
    const { locale } = useLanguage();
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl sm:max-w-3xl max-h-[90vh] overflow-y-auto border border-pink-100">
                <div className="sticky top-0 bg-white px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 z-10">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-base sm:text-lg font-black text-gray-900 truncate">
                            {city.name}
                        </h2>
                        <p className="text-[11px] sm:text-xs text-gray-500 truncate">
                            {city.country} · {formatDate(locale, city.dateVisited)}
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
                    <div className="flex items-center justify-between">
                        <Stars value={city.rating} readOnly />
                        {city.isFavorite && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-pink-100 text-pink-600 text-[11px] font-black">
                                <Heart className="h-3 w-3 fill-pink-500 text-pink-500" /> {t('cities.favorite')}
                            </span>
                        )}
                    </div>

                    {city.highlights && (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {city.highlights}
                        </p>
                    )}

                    {city.images.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                            {city.images.map((img, idx) => (
                                <CityImage
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
                            {t('cities.deletePlace')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CityImage({
    img,
    onClick,
    onDelete,
}: {
    img: CityVisitImage;
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
