'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { memoryApi, uploadApi } from '@/api';
import { getUserId } from '@/lib/ultis';
import { Memory } from '@/types';
import PhotoLightbox, { LightboxImage } from './PhotoLightbox';
import { useLanguage, useT } from '@/i18n/LanguageProvider';
import {
    Heart,
    Plus,
    Pencil,
    Trash2,
    X,
    Calendar,
    Image as ImageIcon,
    MessageCircle,
    RefreshCw,
    Save,
    Sparkles,
    Link as LinkIcon,
    Send,
    Upload,
} from 'lucide-react';

// ---- Helpers ----

function formatDate(locale: string, iso: string): string {
    try {
        const d = new Date(iso);
        return new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(d);
    } catch {
        return iso;
    }
}

function toInputDate(iso: string): string {
    // datetime-local input needs "yyyy-MM-dd"
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    } catch {
        return '';
    }
}

function fromInputDate(value: string): string {
    if (!value) return new Date().toISOString();
    // value is "yyyy-MM-dd"; treat as UTC midnight for stability
    return new Date(`${value}T00:00:00Z`).toISOString();
}

// ---- Add/Edit modal ----

/**
 * A image the user has attached to the form but hasn't necessarily uploaded yet.
 * `status` tracks where this candidate is in the lifecycle.
 */
export type ImageCandidate = {
    /** Stable id used for React keys and array indexing. */
    id: string;
    /** Local file when the user just picked it; undefined once uploaded. */
    file?: File;
    /** Cloudinary URL once status === 'done'. */
    url?: string;
    /** Object URL for preview, when we have a local file. */
    previewUrl: string;
    status: 'pending' | 'uploading' | 'done' | 'failed';
    errorMessage?: string;
};

type MemoryFormValues = {
    title: string;
    description: string;
    dateHappened: string; // yyyy-MM-dd for input
    imageCandidates: ImageCandidate[];
};

const EMPTY_FORM: MemoryFormValues = {
    title: '',
    description: '',
    dateHappened: '',
    imageCandidates: [],
};

function MemoryFormModal({
    open,
    initial,
    onCancel,
    onSave,
    saving,
}: {
    open: boolean;
    initial: Memory | null;
    onCancel: () => void;
    onSave: (values: MemoryFormValues) => Promise<void>;
    saving: boolean;
}) {
    const t = useT();
    const [values, setValues] = useState<MemoryFormValues>(EMPTY_FORM);

    useEffect(() => {
        if (!open) return;
        if (initial) {
            setValues({
                title: initial.title,
                description: initial.description,
                dateHappened: toInputDate(initial.dateHappened),
                // Editing does not reload existing image IDs here — keep empty.
                imageCandidates: [],
            });
        } else {
            setValues({ ...EMPTY_FORM, dateHappened: toInputDate(new Date().toISOString()) });
        }
    }, [open, initial]);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!values.title.trim()) {
            toast.error(t('memories.titleRequired'));
            return;
        }
        await onSave(values);
    };

    const handleRemoveNewImage = (id: string) => {
        setValues((v) => {
            const next = v.imageCandidates.filter((c) => c.id !== id);
            // Revoke any object URL we're discarding to avoid leaks.
            const removed = v.imageCandidates.find((c) => c.id === id);
            if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
            return { ...v, imageCandidates: next };
        });
    };

    const handlePickFiles = (files: File[]) => {
        if (files.length === 0) return;
        setValues((v) => ({
            ...v,
            imageCandidates: [
                ...v.imageCandidates,
                ...files.map((f) => ({
                    id: `${Date.now()}-${f.name}-${Math.random().toString(36).slice(2, 8)}`,
                    file: f,
                    previewUrl: URL.createObjectURL(f),
                    status: 'pending' as const,
                })),
            ],
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-pink-100">
                <div className="sticky top-0 bg-white px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-lg font-black text-gray-900">
                            {initial ? t('memories.formTitleEdit') : t('memories.formTitleNew')}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="h-9 w-9 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50 flex items-center justify-center"
                        title={t('common.close')}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            {t('memories.fieldTitle')}
                        </label>
                        <input
                            type="text"
                            value={values.title}
                            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
                            placeholder={t('memories.fieldTitlePlaceholder')}
                            maxLength={200}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            {t('memories.fieldDate')}
                        </label>
                        <div className="relative">
                            <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="date"
                                value={values.dateHappened}
                                onChange={(e) =>
                                    setValues((v) => ({ ...v, dateHappened: e.target.value }))
                                }
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            {t('memories.fieldDescription')}
                        </label>
                        <textarea
                            value={values.description}
                            onChange={(e) =>
                                setValues((v) => ({ ...v, description: e.target.value }))
                            }
                            placeholder={t('memories.fieldDescPlaceholder')}
                            rows={4}
                            maxLength={4000}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all resize-none"
                        />
                    </div>

                    {!initial && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                {t('memories.fieldImages')}
                            </label>
                            <label className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-pink-200 bg-pink-50/50 text-pink-600 text-sm font-bold cursor-pointer hover:bg-pink-50 transition-colors">
                                <Upload className="h-4 w-4" />
                                {t('memories.pickImages')}
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files ?? []);
                                        e.target.value = '';
                                        handlePickFiles(files);
                                    }}
                                />
                            </label>

                            {values.imageCandidates.length > 0 && (
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                    {values.imageCandidates.map((cand) => (
                                        <div
                                            key={cand.id}
                                            className="relative group rounded-lg overflow-hidden border border-gray-100 aspect-square bg-gray-50"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={cand.previewUrl}
                                                alt=""
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                            {/* Status badge (only shown while uploading / failed — done is the natural image state) */}
                                            {cand.status === 'uploading' && (
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[11px] font-bold">
                                                    {t('memories.uploading')}
                                                </div>
                                            )}
                                            {cand.status === 'failed' && (
                                                <div className="absolute inset-0 bg-red-500/70 flex items-center justify-center text-white text-[11px] font-bold px-1 text-center">
                                                    {t('memories.failedBadge')}
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveNewImage(cand.id)}
                                                className="absolute top-1 right-1 h-6 w-6 rounded-md bg-white/90 text-red-500 hover:bg-red-50 flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
                                                title={t('common.delete')}
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

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
                                <RefreshCw className="h-4 w-4 animate-spin" />
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

// ---- Detail panel (notes + images management) ----

function MemoryDetailPanel({
    memory,
    requesterId,
    onClose,
    onChanged,
    onImageClick,
}: {
    memory: Memory;
    requesterId: number;
    onClose: () => void;
    onChanged: () => void;
    onImageClick: (index: number) => void;
}) {
    const t = useT();
    const { locale } = useLanguage();
    const [noteText, setNoteText] = useState('');
    const [addingNote, setAddingNote] = useState(false);
    const [pendingImages, setPendingImages] = useState<ImageCandidate[]>([]);
    const [savingImages, setSavingImages] = useState(false);
    const [busy, setBusy] = useState(false);

    // Revoke object URLs when the panel unmounts so we don't leak them.
    useEffect(() => {
        return () => {
            pendingImages.forEach((c) => c.previewUrl && URL.revokeObjectURL(c.previewUrl));
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
                status: 'pending' as const,
            })),
        ]);
    };

    const handleRemovePending = (id: string) => {
        setPendingImages((prev) => {
            const removed = prev.find((c) => c.id === id);
            if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
            return prev.filter((c) => c.id !== id);
        });
    };

    const handleSaveImages = async () => {
        const pending = pendingImages.filter((c) => c.status !== 'done' && c.file);
        if (pending.length === 0) return;

        setSavingImages(true);
        const progressId = toast.loading(t('memories.uploadingProgress', { current: 0, total: pending.length }));
        const failedNames: string[] = [];
        let uploaded = 0;

        for (let i = 0; i < pending.length; i++) {
            const cand = pending[i];
            if (!cand.file) continue;
            toast.loading(t('memories.uploadingProgress', { current: i + 1, total: pending.length }), { id: progressId });
            try {
                const result = await uploadApi.uploadRaw([cand.file]);
                const url = result[0]?.url;
                if (url) {
                    await memoryApi.addImage(memory.id, requesterId, { imageUrl: url });
                    uploaded++;
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : t('account.uploadFailed');
                failedNames.push(cand.file?.name ?? 'image');
                console.warn(`Upload failed for ${cand.file?.name}:`, msg);
            }
        }

        // Drop successfully uploaded candidates; keep failed ones so the user
        // can retry or remove them.
        setPendingImages((prev) => prev.filter((c) => c.status === 'failed'));

        if (failedNames.length === 0) {
            toast.success(t('memories.imagesAdded', { count: uploaded }), { id: progressId });
        } else if (uploaded === 0) {
            toast.error(t('memories.imagesAllFailed'), { id: progressId });
        } else {
            toast.warning(
                t('memories.imagesAddedPartial', { added: uploaded, failed: failedNames.length }),
                { id: progressId },
            );
        }

        setSavingImages(false);
        onChanged();
    };

    const handleAddNote = async () => {
        const content = noteText.trim();
        if (!content) return;
        setAddingNote(true);
        try {
            await memoryApi.addNote(memory.id, { senderId: requesterId, content });
            setNoteText('');
            toast.success(t('memories.noteAdded'));
            onChanged();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('memories.noteAddFailed');
            toast.error(msg);
        } finally {
            setAddingNote(false);
        }
    };

    const handleDeleteNote = async (noteId: number) => {
        setBusy(true);
        try {
            await memoryApi.removeNote(noteId, requesterId);
            toast.success(t('memories.noteRemoved'));
            onChanged();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('memories.noteRemoveFailed');
            toast.error(msg);
        } finally {
            setBusy(false);
        }
    };

    const handleRemoveImage = async (imageId: number) => {
        setBusy(true);
        try {
            await memoryApi.removeImage(memory.id, imageId, requesterId);
            toast.success(t('memories.imageRemoved'));
            onChanged();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('memories.imageRemoveFailed');
            toast.error(msg);
        } finally {
            setBusy(false);
        }
    };

    const isOwner = memory.ownerId === requesterId;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl sm:max-w-3xl max-h-[90vh] overflow-y-auto border border-pink-100">
                <div className="sticky top-0 bg-white px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 z-10">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow flex-shrink-0">
                            <Heart className="h-5 w-5 text-white fill-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-base sm:text-lg font-black text-gray-900 truncate">
                                {memory.title}
                            </h2>
                            <p className="text-[11px] sm:text-xs text-gray-500 truncate">
                                by {memory.ownerName ?? t('common.you')} · {formatDate(locale, memory.dateHappened)}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-9 w-9 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50 flex items-center justify-center flex-shrink-0"
                        title={t('common.close')}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-5 sm:p-6 space-y-6">
                    {memory.description && (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {memory.description}
                        </p>
                    )}

                    {/* Images */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <ImageIcon className="h-4 w-4 text-pink-500" />
                            <h3 className="text-sm font-black text-gray-700">
                                {t('memories.images', { count: memory.images.length })}
                            </h3>
                        </div>

                        {memory.images.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                                {memory.images.map((img, idx) => (
                                    <div
                                        key={img.id}
                                        className="relative group rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 aspect-square"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <button
                                            type="button"
                                            onClick={() => onImageClick(idx)}
                                            className="absolute inset-0 z-0"
                                            aria-label={t('common.openPhotoViewer')}
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
                                                handleRemoveImage(img.id);
                                            }}
                                            disabled={busy}
                                            className="absolute top-1.5 right-1.5 z-10 h-7 w-7 rounded-lg bg-white/90 text-red-500 hover:bg-red-50 flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
                                            title={t('common.removeImage')}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 italic">{t('memories.noImages')}</p>
                        )}

                        {/* Attach images (deferred until the user clicks Save) */}
                        <div className="mt-3 space-y-2">
                            <label className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-dashed border-pink-200 bg-pink-50/50 text-pink-600 text-sm font-bold cursor-pointer hover:bg-pink-50 transition-colors">
                                <Upload className="h-4 w-4" />
                                {t('memories.pickImages')}
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files ?? []);
                                        e.target.value = '';
                                        handlePickFiles(files);
                                    }}
                                />
                            </label>

                            {pendingImages.length > 0 && (
                                <>
                                    <div className="grid grid-cols-3 gap-2">
                                        {pendingImages.map((cand) => (
                                            <div
                                                key={cand.id}
                                                className="relative group rounded-lg overflow-hidden border border-gray-100 aspect-square bg-gray-50"
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={cand.previewUrl}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                                {cand.status === 'failed' && (
                                                    <div className="absolute inset-0 bg-red-500/70 flex items-center justify-center text-white text-[11px] font-bold">
                                                        {t('memories.failedBadge')}
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemovePending(cand.id)}
                                                    disabled={savingImages}
                                                    className="absolute top-1 right-1 h-6 w-6 rounded-md bg-white/90 text-red-500 hover:bg-red-50 flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
                                                    title={t('common.delete')}
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSaveImages}
                                        disabled={savingImages || pendingImages.every((c) => c.status === 'failed')}
                                        className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold shadow shadow-pink-200 hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {savingImages ? (
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4" />
                                        )}
                                        {t('memories.saveImages')}
                                    </button>
                                </>
                            )}
                        </div>
                    </section>

                    {/* Notes */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <MessageCircle className="h-4 w-4 text-pink-500" />
                            <h3 className="text-sm font-black text-gray-700">
                                {t('memories.notes', { count: memory.notes.length })}
                            </h3>
                        </div>

                        {memory.notes.length > 0 ? (
                            <ul className="space-y-2">
                                {memory.notes.map((note) => {
                                    const mine = note.senderId === requesterId;
                                    const ownerDelete = isOwner;
                                    const canDelete = mine || ownerDelete;
                                    return (
                                        <li
                                            key={note.id}
                                            className="bg-gray-50 rounded-2xl border border-gray-100 p-3"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-black text-gray-700">
                                                            {note.senderName ?? t('memories.someone')}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400">
                                                            {formatDate(locale, note.dateCreated)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                                                        {note.content}
                                                    </p>
                                                </div>
                                                {canDelete && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteNote(note.id)}
                                                        disabled={busy}
                                                        className="h-7 w-7 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center flex-shrink-0"
                                                        title={t('common.delete')}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="text-xs text-gray-400 italic">{t('memories.noNotes')}</p>
                        )}

                        {/* Add note */}
                        <div className="mt-3 flex flex-col sm:flex-row sm:items-start gap-2">
                            <textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                rows={2}
                                maxLength={2000}
                                placeholder={t('memories.notePlaceholder')}
                                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all resize-none w-full"
                            />
                            <button
                                type="button"
                                onClick={handleAddNote}
                                disabled={addingNote || !noteText.trim()}
                                className="h-auto px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold shadow shadow-pink-200 hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 flex items-center justify-center gap-1.5 w-full sm:w-auto"
                            >
                                {addingNote ? (
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Send className="h-3.5 w-3.5" />
                                )}
                                {t('memories.sendBtn')}
                            </button>
                        </div>
                    </section>

                    {!isOwner && (
                        <p className="text-[11px] text-gray-400 italic text-center pt-2">
                            {t('memories.ownerOnlyHint')}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ---- Memory card ----

function MemoryCard({
    memory,
    requesterId,
    onOpen,
    onEdit,
    onDelete,
    onImageClick,
}: {
    memory: Memory;
    requesterId: number;
    onOpen: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onImageClick: (index: number) => void;
}) {
    const t = useT();
    const { locale } = useLanguage();
    const isOwner = memory.ownerId === requesterId;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
            {memory.images.length > 0 ? (
                <button
                    type="button"
                    onClick={() => onImageClick(0)}
                    className="relative aspect-[4/3] bg-gray-50 w-full block group"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={memory.images[0].imageUrl}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                    {/* Hover overlay hint */}
                    <span className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 text-pink-600 text-xs font-black shadow">
                            <ImageIcon className="h-3.5 w-3.5" />
                            {t('memories.viewPhotos')}
                        </span>
                    </span>
                    {memory.images.length > 1 && (
                        <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[11px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />+{memory.images.length - 1}
                        </span>
                    )}
                </button>
            ) : (
                <button
                    type="button"
                    onClick={onOpen}
                    className="aspect-[4/3] bg-gradient-to-br from-pink-50 to-rose-50 w-full flex items-center justify-center"
                >
                    <Heart className="h-10 w-10 text-pink-300 fill-pink-300" />
                </button>
            )}

            <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-black text-gray-900 truncate flex-1">
                        {memory.title}
                    </h3>
                    {isOwner && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                                type="button"
                                onClick={onEdit}
                                className="h-7 w-7 rounded-lg text-gray-400 hover:text-pink-500 hover:bg-pink-50 flex items-center justify-center"
                                title={t('common.edit')}
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={onDelete}
                                className="h-7 w-7 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center"
                                title={t('common.delete')}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-pink-500 uppercase tracking-wider">
                    <Calendar className="h-3 w-3" />
                    {formatDate(locale, memory.dateHappened)}
                </div>

                {memory.description && (
                    <p className="mt-2 text-xs text-gray-600 line-clamp-2 break-words">
                        {memory.description}
                    </p>
                )}

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-medium">
                    <span className="truncate">
                        {t('memories.byAuthor', { name: memory.ownerName ?? t('common.you') })}
                    </span>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {memory.notes.length > 0 && (
                            <span className="flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                {memory.notes.length}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={onOpen}
                            className="text-pink-500 hover:text-pink-600 font-bold"
                        >
                            {t('memories.view')} →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---- Main Memories section ----

export default function MemoriesSection() {
    const t = useT();
    const [myId, setMyId] = useState<number>(0);
    const [isReady, setIsReady] = useState(false);

    // Read userId only on the client to avoid SSR/CSR mismatch.
    useEffect(() => {
        const userId = getUserId();
        setMyId(userId ? parseInt(userId, 10) : 0);
        setIsReady(true);
    }, []);

    const [memories, setMemories] = useState<Memory[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [editing, setEditing] = useState<Memory | null>(null);
    const [opening, setOpening] = useState<Memory | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);

    // PhotoLightbox state: which memory is being viewed and which image index is active.
    const [lightbox, setLightbox] = useState<{
        images: LightboxImage[];
        index: number;
    } | null>(null);

    const openLightboxFor = useCallback((memory: Memory, index: number) => {
        setLightbox({
            images: memory.images.map((img) => ({
                id: img.id,
                url: img.imageUrl,
                caption: memory.title,
            })),
            index: Math.max(0, Math.min(index, memory.images.length - 1)),
        });
    }, []);

    const fetchAll = useCallback(async () => {
        if (!myId) return;
        setLoading(true);
        try {
            const list = await memoryApi.getForUser(myId);
            setMemories(list);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('memories.failedLoad');
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }, [myId, t]);

    useEffect(() => {
        if (isReady && myId) fetchAll();
    }, [isReady, myId, fetchAll]);

    const handleCreate = async (values: MemoryFormValues) => {
        setSaving(true);
        try {
            const { title, description, dateHappened, imageCandidates } = values;

            const pending = imageCandidates.filter((c) => c.status !== 'done');
            const alreadyDone = imageCandidates.filter((c) => c.status === 'done' && c.url);

            // Surface upload progress via Sonner. We update the same toast id as
            // each file completes so the user sees "Uploading 2 of 5..." instead
            // of a pile of stacked toasts.
            const progressToastId =
                pending.length > 0 ? toast.loading(t('memories.uploadingProgress', { current: 0, total: pending.length })) : '';

            const uploadedUrls: string[] = alreadyDone.map((c) => c.url!).filter(Boolean);
            const failedNames: string[] = [];

            for (let i = 0; i < pending.length; i++) {
                const cand = pending[i];
                if (!cand.file) continue;
                toast.loading(t('memories.uploadingProgress', { current: i + 1, total: pending.length }), { id: progressToastId });
                try {
                    const [result] = await uploadApi.uploadRaw([cand.file]);
                    uploadedUrls.push(result.url);
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : t('account.uploadFailed');
                    failedNames.push(cand.file?.name ?? 'image');
                    console.warn(`Upload failed for ${cand.file?.name}:`, msg);
                }
            }

            if (pending.length > 0) {
                if (failedNames.length === 0) {
                    toast.success(t('memories.uploadedAll', { count: pending.length }), {
                        id: progressToastId,
                    });
                } else if (uploadedUrls.length === 0) {
                    toast.error(t('memories.uploadedAllFailed'), { id: progressToastId });
                    return;
                } else {
                    toast.warning(
                        t('memories.uploadedPartial', { uploaded: uploadedUrls.length, failed: failedNames.length }),
                        { id: progressToastId },
                    );
                }
            }

            await memoryApi.create({
                ownerId: myId,
                title: title.trim(),
                description: description.trim(),
                dateHappened: fromInputDate(dateHappened),
                imageUrls: uploadedUrls,
            });
            toast.success(t('memories.created'));
            setCreateOpen(false);
            // Revoke any preview URLs that survived the round-trip.
            imageCandidates.forEach((c) => c.previewUrl && URL.revokeObjectURL(c.previewUrl));
            await fetchAll();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('memories.failedCreate');
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (values: MemoryFormValues) => {
        if (!editing) return;
        setSaving(true);
        try {
            await memoryApi.update(editing.id, {
                requesterId: myId,
                title: values.title.trim(),
                description: values.description.trim(),
                dateHappened: fromInputDate(values.dateHappened),
            });
            toast.success(t('memories.updated'));
            setEditing(null);
            await fetchAll();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('memories.failedUpdate');
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (memory: Memory) => {
        if (!confirm(t('memories.deleteConfirm', { title: memory.title }))) return;
        setDeleting(memory.id);
        try {
            await memoryApi.remove(memory.id, myId);
            toast.success(t('memories.deleted'));
            await fetchAll();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('memories.failedDelete');
            toast.error(msg);
        } finally {
            setDeleting(null);
        }
    };

    const handleDetailChanged = async () => {
        await fetchAll();
        // Re-open with the freshest version of the current detail
        const fresh = memories.find((m) => m.id === opening?.id);
        if (fresh) setOpening(fresh);
    };

    if (!isReady || loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <svg className="animate-spin h-7 w-7 text-pink-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-pink-500" />
                    <h2 className="text-sm font-black text-gray-700">
                        {t('memories.ourMemories')}
                        {memories.length > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-pink-400 text-white text-[10px] font-black">
                                {memories.length}
                            </span>
                        )}
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold shadow shadow-pink-200 hover:from-pink-600 hover:to-rose-600 transition-all"
                >
                    <Plus className="h-4 w-4" />
                    {t('memories.newMemory')}
                </button>
            </div>

            {memories.length === 0 ? (
                <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-pink-100 mb-3">
                        <Heart className="h-6 w-6 text-pink-500 fill-pink-500" />
                    </div>
                    <p className="text-sm font-bold text-gray-700">{t('memories.emptyTitle')}</p>
                    <p className="text-xs text-gray-500 mt-1 mb-4">
                        {t('memories.emptyDesc')}
                    </p>
                    <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold shadow shadow-pink-200 hover:from-pink-600 hover:to-rose-600"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        {t('memories.addMemory')}
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {memories.map((m) => (
                        <MemoryCard
                            key={m.id}
                            memory={m}
                            requesterId={myId}
                            onOpen={() => setOpening(m)}
                            onEdit={() => setEditing(m)}
                            onDelete={() => handleDelete(m)}
                            onImageClick={(idx) => openLightboxFor(m, idx)}
                        />
                    ))}
                </div>
            )}

            {/* Create modal */}
            <MemoryFormModal
                open={createOpen}
                initial={null}
                saving={saving}
                onCancel={() => setCreateOpen(false)}
                onSave={handleCreate}
            />

            {/* Edit modal */}
            <MemoryFormModal
                open={editing !== null}
                initial={editing}
                saving={saving}
                onCancel={() => setEditing(null)}
                onSave={handleUpdate}
            />

            {/* Detail modal */}
            {opening && (
                <MemoryDetailPanel
                    memory={opening}
                    requesterId={myId}
                    onClose={() => setOpening(null)}
                    onChanged={handleDetailChanged}
                    onImageClick={(idx) => openLightboxFor(opening, idx)}
                />
            )}

            {deleting !== null && (
                <div className="sr-only" aria-hidden>
                    {/* loading state tracker for delete */}
                </div>
            )}

            {/* Photo lightbox */}
            {lightbox && (
                <PhotoLightbox
                    images={lightbox.images}
                    index={lightbox.index}
                    onClose={() => setLightbox(null)}
                    onIndexChange={(i) => setLightbox((prev) => (prev ? { ...prev, index: i } : prev))}
                />
            )}
        </div>
    );
}
