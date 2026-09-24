'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getUserId, getCookie } from '@/lib/ultis';
import {
    Heart,
    Calendar,
    Trash2,
    Camera,
    X,
    Loader2,
    Pencil,
    Image as ImageIcon,
    Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { anniversaryApi, relationshipApi, uploadApi } from '@/api';
import { Anniversary } from '@/types';
import { useLanguage, useT } from '@/i18n/LanguageProvider';

// ---- Date helpers ----

function toInputDate(iso?: string | null): string {
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

function formatPrettyDate(locale: string, iso?: string | null): string {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(d);
    } catch {
        return iso ?? '';
    }
}

function formatShortDate(locale: string, iso?: string | null): string {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(d);
    } catch {
        return iso ?? '';
    }
}

function ordinal(n: number): string {
    const abs = Math.abs(Math.round(n));
    const mod100 = abs % 100;
    const mod10 = abs % 10;
    let suffix = 'th';
    if (mod100 < 11 || mod100 > 13) {
        if (mod10 === 1) suffix = 'st';
        else if (mod10 === 2) suffix = 'nd';
        else if (mod10 === 3) suffix = 'rd';
    }
    return `${abs}${suffix}`;
}

/**
 * For the milestone headline we display the *number of anniversaries celebrated*
 * rather than the number of full years. The first anniversary of a 2024 love
 * start lands on 2025, so on that day `years` is 1 — we want "1st Anniversary".
 *
 * Special case: the love start day itself ("0 years") is the "Day 0" — we
 * surface that as a separate welcome line, so the ordinal stays out of the way.
 */
function ordinalLabelForMilestone(years: number, _isToday: boolean): string {
    // `years` already equals the count of anniversaries for today / future dates.
    // If years === 0 and it's not today, the next milestone is the 1st anniversary.
    return ordinal(years === 0 ? 1 : years);
}

/**
 * Returns the date of the next anniversary of `startIso` relative to `now`.
 *
 *   startIso: 2022-03-18
 *   now:      2026-04-10 → returns 2027-03-18 (4 full years have passed, but
 *   not yet 5, so the "5th" milestone lands on the next occurrence).
 *
 * If today already matches start's month/day, returns today (the milestone
 * is today).
 */
function nextAnniversaryDate(startIso: string, now: Date): Date {
    const start = new Date(startIso);
    if (isNaN(start.getTime())) return new Date(NaN);

    const candidate = new Date(
        now.getFullYear(),
        start.getMonth(),
        start.getDate(),
    );

    // If today is the exact date or it's already past it this year, jump one year.
    const todayKey =
        now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    const candidateKey =
        candidate.getFullYear() * 10000 +
        (candidate.getMonth() + 1) * 100 +
        candidate.getDate();
    if (candidateKey < todayKey) {
        candidate.setFullYear(candidate.getFullYear() + 1);
    }
    return candidate;
}

/**
 * Years / months / days between two dates, mirroring the dashboard helper
 * so we keep a consistent breakdown style across the app.
 */
function yearsMonthsDays(fromIso: string, toIso: string) {
    const from = new Date(fromIso);
    const to = new Date(toIso);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return { years: 0, months: 0, days: 0 };
    }
    let years = to.getFullYear() - from.getFullYear();
    let months = to.getMonth() - from.getMonth();
    let days = to.getDate() - from.getDate();
    if (days < 0) {
        const prevMonthLastDay = new Date(to.getFullYear(), to.getMonth(), 0).getDate();
        days += prevMonthLastDay;
        months -= 1;
    }
    if (months < 0) {
        months += 12;
        years -= 1;
    }
    return {
        years: Math.max(0, years),
        months: Math.max(0, months),
        days: Math.max(0, days),
    };
}

/** Floor a date diff to full days (UTC midnight math, no DST drift). */
function daysBetween(a: Date, b: Date): number {
    const ms = 24 * 60 * 60 * 1000;
    const aUtc = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const bUtc = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((bUtc - aUtc) / ms);
}

// ---- PartnerNoteChip ----

function PartnerNoteChip({
    label,
    note,
    color,
}: {
    label: string;
    note: string | null;
    color: 'pink' | 'rose';
}) {
    return (
        <div
            className={`rounded-2xl border p-4 ${
                color === 'pink'
                    ? 'bg-pink-50 border-pink-100'
                    : 'bg-rose-50 border-rose-100'
            }`}
        >
            <p
                className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                    color === 'pink' ? 'text-pink-400' : 'text-rose-400'
                }`}
            >
                {label}
            </p>
            {note ? (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {note}
                </p>
            ) : (
                <p className="text-xs text-gray-400 italic">No note yet</p>
            )}
        </div>
    );
}

// ---- EditNoteInline ----

function EditNoteInline({
    label,
    value,
    onChange,
    placeholder,
    color,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    color: 'pink' | 'rose';
}) {
    return (
        <div
            className={`rounded-2xl border p-4 ${
                color === 'pink'
                    ? 'bg-pink-50 border-pink-100'
                    : 'bg-rose-50 border-rose-100'
            }`}
        >
            <label
                className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${
                    color === 'pink' ? 'text-pink-400' : 'text-rose-400'
                }`}
            >
                {label}
            </label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-xl border border-white bg-white text-sm text-gray-800 font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 resize-none transition-all"
            />
        </div>
    );
}

export default function AnniversaryPage() {
    const isAuthed = useRequireAuth();
    const { t } = useLanguage();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const [anniversary, setAnniversary] = useState<Anniversary | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [editing, setEditing] = useState(false);
    const heroFileRef = useRef<HTMLInputElement>(null);

    // Core fields
    const [loveStartDate, setLoveStartDate] = useState('');
    const [weddingDate, setWeddingDate] = useState('');
    // Partner notes (what each partner writes)
    const [myNote, setMyNote] = useState('');       // current user's note
    const [partnerNote, setPartnerNote] = useState(''); // partner's note

    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const userId = getUserId();
    const displayName = getCookie('name') || 'Friend';
    const [partnerName, setPartnerName] = useState<string | null>(null);

    // Load existing anniversary + partner name on mount.
    useEffect(() => {
        if (!mounted || !isAuthed || !userId) return;
        anniversaryApi
            .getForUser(parseInt(userId, 10))
            .then((data: Anniversary | null) => {
                setAnniversary(data);
                if (data) {
                    setLoveStartDate(toInputDate(data.loveStartDate));
                    setWeddingDate(toInputDate(data.weddingDate ?? undefined));
                    // userANote = current user's own note, userBNote = partner's note
                    setMyNote(data.userANote ?? '');
                    setPartnerNote(data.userBNote ?? '');
                    setImageUrl(data.imageUrl);
                }
            })
            .catch((err: unknown) =>
                toast.error(err instanceof Error ? err.message : t('common.failed')),
            )
            .finally(() => setLoading(false));

        // Best-effort partner lookup. Failures are non-fatal — we just fall
        // back to a generic "Partner's note" label.
        relationshipApi
            .getMyRelationship(parseInt(userId, 10))
            .then((rel) => setPartnerName(rel?.partner?.name ?? null))
            .catch(() => setPartnerName(null));
    }, [mounted, isAuthed, userId, t]);

    // Clean up preview URL on unmount.
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const resetEditing = () => {
        if (anniversary) {
            setLoveStartDate(toInputDate(anniversary.loveStartDate));
            setWeddingDate(toInputDate(anniversary.weddingDate ?? undefined));
            setMyNote(anniversary.userANote ?? '');
            setPartnerNote(anniversary.userBNote ?? '');
            setImageUrl(anniversary.imageUrl);
        }
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPendingFile(null);
        setPreviewUrl(null);
        setEditing(false);
    };

    const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPendingFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleClearImage = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPendingFile(null);
        setPreviewUrl(null);
        setImageUrl(null);
    };

    const handleSave = async () => {
        if (!userId) return;
        if (!loveStartDate) {
            toast.error(t('anniversary.loveStartRequired'));
            return;
        }

        setSaving(true);
        try {
            let finalUrl: string | null = imageUrl ?? null;
            if (pendingFile) {
                setUploading(true);
                try {
                    const [uploaded] = await uploadApi.uploadRaw([pendingFile]);
                    finalUrl = uploaded?.url ?? null;
                } catch {
                    toast.warning(t('anniversary.uploadFailed'));
                }
                setUploading(false);
            }

            const updated = await anniversaryApi.upsert({
                requesterId: parseInt(userId, 10),
                loveStartDate: fromInputDate(loveStartDate),
                weddingDate: weddingDate ? fromInputDate(weddingDate) : null,
                imageUrl: finalUrl,
                // userANote / userBNote are written to the correct field server-side
                userANote: myNote.trim() || null,
                userBNote: partnerNote.trim() || null,
            });

            setAnniversary(updated);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPendingFile(null);
            setPreviewUrl(null);
            setEditing(false);
            toast.success(t('anniversary.saved'));
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('common.failed');
            toast.error(msg);
        } finally {
            setSaving(false);
            setUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!userId) return;
        if (!confirm(t('anniversary.deleteConfirm'))) return;
        try {
            await anniversaryApi.remove(parseInt(userId, 10));
            setAnniversary(null);
            setLoveStartDate('');
            setWeddingDate('');
            setMyNote('');
            setPartnerNote('');
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPendingFile(null);
            setPreviewUrl(null);
            setImageUrl(null);
            setEditing(false);
            toast.success(t('anniversary.deleted'));
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('common.failed');
            toast.error(msg);
        }
    };

    if (!mounted || !isAuthed) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <svg
                    className="animate-spin h-8 w-8 text-pink-500"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                </svg>
            </div>
        );
    }

    const heroSrc = previewUrl || imageUrl;

    // Show inputs only when:
    //   (a) there's no anniversary yet (initial create), OR
    //   (b) the user explicitly clicked Edit.
    const showForm = !anniversary || editing;

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="bg-white p-5 sm:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-pink-50/50">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-200 flex-shrink-0">
                        <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-white fill-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                            {t('anniversary.title')}
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
                            {t('anniversary.subtitle', { name: displayName })}
                        </p>
                    </div>

                    {/* Small actions — only when an anniversary exists and we're not editing */}
                    {anniversary && !editing && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => setEditing(true)}
                                aria-label={t('anniversary.editBtn')}
                                title={t('common.edit')}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-pink-500 hover:border-pink-200 hover:bg-pink-50 transition-colors"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                aria-label={t('anniversary.deleteBtn')}
                                title={t('common.delete')}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="bg-white p-12 rounded-3xl border border-gray-100 flex items-center justify-center">
                    <Loader2 className="h-7 w-7 text-pink-500 animate-spin" />
                </div>
            ) : (
                <>
                    {/* Hero photo — single image, full viewport height */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-pink-50/50 overflow-hidden">
                        <div className="w-full h-[100dvh] bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center relative">
                            {heroSrc ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={heroSrc}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display =
                                            'none';
                                    }}
                                />
                            ) : (
                                <div className="text-center px-6">
                                    <ImageIcon className="h-10 w-10 text-pink-300 mx-auto" />
                                    <p className="text-sm text-pink-400 font-bold mt-2">
                                        {showForm
                                            ? t('anniversary.addPhotoPrompt')
                                            : t('anniversary.noPhotoYet')}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Photo actions (only while editing) */}
                        {showForm && (
                            <div className="px-5 sm:px-8 py-3 border-t border-gray-100 flex flex-wrap items-center gap-2 bg-gray-50/50">
                                <button
                                    type="button"
                                    onClick={() => heroFileRef.current?.click()}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs font-bold cursor-pointer hover:bg-gray-50"
                                >
                                    <Camera className="h-3.5 w-3.5 text-pink-500" />
                                    {heroSrc ? t('anniversary.replacePhoto') : t('anniversary.addPhoto')}
                                </button>
                                <input
                                    ref={heroFileRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handlePickFile}
                                />
                                {heroSrc && (
                                    <button
                                        type="button"
                                        onClick={handleClearImage}
                                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                        {t('anniversary.removePhoto')}
                                    </button>
                                )}
                                <p className="text-[11px] text-gray-400 ml-auto">
                                    {t('anniversary.photoHelp')}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Edit / display: split columns below hero */}
                    {showForm ? (
                        <FormSection
                            loveStartDate={loveStartDate}
                            weddingDate={weddingDate}
                            myNote={myNote}
                            partnerNote={partnerNote}
                            partnerName={partnerName}
                            setLoveStartDate={setLoveStartDate}
                            setWeddingDate={setWeddingDate}
                            setMyNote={setMyNote}
                            setPartnerNote={setPartnerNote}
                            anniversary={anniversary}
                            saving={saving}
                            uploading={uploading}
                            onCancel={resetEditing}
                            onSave={handleSave}
                        />
                    ) : (
                        <DisplaySection
                            anniversary={anniversary}
                            partnerName={partnerName}
                        />
                    )}

                    {/* Next milestone — countdown + "X year / X month" breakdown */}
                    {!showForm && (
                        <NextMilestone anniversary={anniversary} />
                    )}
                </>
            )}
        </div>
    );
}

// ---- Display mode ----

function DisplaySection({
    anniversary,
    partnerName,
}: {
    anniversary: Anniversary;
    partnerName: string | null;
}) {
    const t = useT();
    const { locale } = useLanguage();
    const partnerLabel = partnerName
        ? t('anniversary.partnerNote', { name: partnerName })
        : t('anniversary.partnerNoteNoName');
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left — Love started + partner's note */}
            <div className="space-y-3">
                {/* Love started date */}
                <div className="bg-white rounded-2xl border border-pink-100 p-5 shadow-sm">
                    <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest mb-1">
                        {t('anniversary.loveStarted')}
                    </p>
                    <p className="text-base sm:text-lg font-black text-gray-900">
                        {formatPrettyDate(locale, anniversary.loveStartDate)}
                    </p>
                </div>

                {/* Partner's note */}
                <PartnerNoteChip
                    label={partnerLabel}
                    note={anniversary.userANote}
                    color="pink"
                />
            </div>

            {/* Right — Wedding date + your note */}
            <div className="space-y-3">
                {/* Wedding date */}
                <div className="bg-white rounded-2xl border border-rose-100 p-5 shadow-sm">
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">
                        {t('anniversary.weddingDate')}
                    </p>
                    {anniversary.weddingDate ? (
                        <p className="text-base sm:text-lg font-black text-gray-900">
                            {formatPrettyDate(locale, anniversary.weddingDate)}
                        </p>
                    ) : (
                        <p className="text-sm text-gray-400 italic">
                            {t('anniversary.notYet')}
                        </p>
                    )}
                </div>

                {/* Your note */}
                <PartnerNoteChip
                    label={t('anniversary.myNote', { name: t('common.you') })}
                    note={anniversary.userBNote}
                    color="rose"
                />
            </div>
        </div>
    );
}

// ---- Edit / create form ----

function FormSection({
    loveStartDate,
    weddingDate,
    myNote,
    partnerNote,
    partnerName,
    setLoveStartDate,
    setWeddingDate,
    setMyNote,
    setPartnerNote,
    anniversary,
    saving,
    uploading,
    onCancel,
    onSave,
}: {
    loveStartDate: string;
    weddingDate: string;
    myNote: string;
    partnerNote: string;
    partnerName: string | null;
    setLoveStartDate: (v: string) => void;
    setWeddingDate: (v: string) => void;
    setMyNote: (v: string) => void;
    setPartnerNote: (v: string) => void;
    anniversary: Anniversary | null;
    saving: boolean;
    uploading: boolean;
    onCancel: () => void;
    onSave: () => void;
}) {
    const t = useT();
    const isEditing = !!anniversary;
    const partnerLabel = partnerName
        ? t('anniversary.partnerNote', { name: partnerName })
        : t('anniversary.partnerNoteNoName');
    const partnerPlaceholder = partnerName
        ? t('anniversary.fieldPartnerPlaceholder', { name: partnerName })
        : t('anniversary.fieldNotesPlaceholder');

    return (
        <div className="bg-white p-5 sm:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-pink-50/50 space-y-4">
            {/* Date fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        <Calendar className="inline h-3 w-3 mr-1" />
                        {t('anniversary.fieldLoveStart')} *
                    </label>
                    <input
                        type="date"
                        value={loveStartDate}
                        onChange={(e) => setLoveStartDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        <Calendar className="inline h-3 w-3 mr-1" />
                        {t('anniversary.fieldWedding')}
                    </label>
                    <input
                        type="date"
                        value={weddingDate}
                        onChange={(e) => setWeddingDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all"
                    />
                </div>
            </div>

            {/* Partner notes — split the same way as display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Left column */}
                <EditNoteInline
                    label={partnerLabel}
                    value={partnerNote}
                    onChange={setPartnerNote}
                    placeholder={partnerPlaceholder}
                    color="pink"
                />
                {/* Right column */}
                <EditNoteInline
                    label={t('anniversary.myNote', { name: t('common.you') })}
                    value={myNote}
                    onChange={setMyNote}
                    placeholder={t('anniversary.fieldNotesPlaceholder')}
                    color="rose"
                />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2">
                {isEditing && (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={saving || uploading}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 disabled:opacity-50"
                    >
                        {t('common.cancel')}
                    </button>
                )}
                <button
                    type="button"
                    onClick={onSave}
                    disabled={saving || uploading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold shadow shadow-pink-200 hover:from-pink-600 hover:to-rose-600 disabled:opacity-60 transition-all"
                >
                    {saving || uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="h-4 w-4" />
                    )}
                    {isEditing ? t('common.save') : t('anniversary.addBtn')}
                </button>
            </div>
        </div>
    );
}

// ---- Next milestone countdown ----

function NextMilestone({ anniversary }: { anniversary: Anniversary }) {
    const t = useT();
    // Pin "now" to the start of the day so the breakdown is stable across
    // re-renders (otherwise opening the page at 23:59 then again at 00:01
    // would shift the milestone by a day).
    const now = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const love = useMemo(() => {
        if (!anniversary?.loveStartDate) return null;
        const next = nextAnniversaryDate(anniversary.loveStartDate, now);
        if (isNaN(next.getTime())) return null;
        const daysAway = daysBetween(now, next);
        const ymd = yearsMonthsDays(anniversary.loveStartDate, next.toISOString());
        return { next, daysAway, years: ymd.years, months: ymd.months, days: ymd.days };
    }, [anniversary?.loveStartDate, now]);

    const wedding = useMemo(() => {
        if (!anniversary?.weddingDate) return null;
        const next = nextAnniversaryDate(anniversary.weddingDate, now);
        if (isNaN(next.getTime())) return null;
        const daysAway = daysBetween(now, next);
        const ymd = yearsMonthsDays(anniversary.weddingDate, next.toISOString());
        return { next, daysAway, years: ymd.years, months: ymd.months, days: ymd.days };
    }, [anniversary?.weddingDate, now]);

    if (!love && !wedding) return null;

    return (
        <div className="bg-white p-5 sm:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-pink-50/50">
            <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-pink-500" />
                <h2 className="text-sm font-black text-gray-700">
                    {t('anniversary.nextMilestone')}
                </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {love && (
                    <MilestoneCard
                        kind="love"
                        nextDate={love.next}
                        years={love.years}
                        months={love.months}
                        daysAway={love.daysAway}
                    />
                )}
                {wedding && (
                    <MilestoneCard
                        kind="wedding"
                        nextDate={wedding.next}
                        years={wedding.years}
                        months={wedding.months}
                        daysAway={wedding.daysAway}
                    />
                )}
            </div>
        </div>
    );
}

function MilestoneCard({
    kind,
    nextDate,
    years,
    months,
    daysAway,
}: {
    kind: 'love' | 'wedding';
    nextDate: Date;
    years: number;
    months: number;
    daysAway: number;
}) {
    const t = useT();
    const { locale } = useLanguage();
    const isLove = kind === 'love';
    const titleLabel = isLove ? t('anniversary.loveTitle') : t('anniversary.weddingTitle');
    const headline = isLove
        ? t('anniversary.headlineLove')
        : t('anniversary.headlineWedding');
    const pillBg = isLove
        ? 'from-pink-500 to-rose-500'
        : 'from-rose-500 to-fuchsia-500';
    const accentText = isLove ? 'text-pink-500' : 'text-rose-500';

    const isToday = daysAway === 0;
    const isTomorrow = daysAway === 1;
    const countdownLabel = isToday
        ? t('anniversary.todayLabel')
        : isTomorrow
            ? t('anniversary.tomorrowLabel')
            : t('anniversary.inDays', { n: daysAway.toLocaleString(locale) });

    // Build the "X years / X months" chips, dropping zero entries.
    const chips: Array<{ value: number; label: string }> = [];
    if (years > 0) {
        chips.push({ value: years, label: years === 1 ? t('anniversary.unitYear') : t('anniversary.unitYears') });
    }
    if (months > 0) {
        chips.push({ value: months, label: months === 1 ? t('anniversary.unitMonth') : t('anniversary.unitMonths') });
    }
    if (daysAway > 0 || chips.length === 0) {
        chips.push({ value: daysAway, label: daysAway === 1 ? t('anniversary.unitDay') : t('anniversary.unitDays') });
    }

    return (
        <div
            className={`relative overflow-hidden rounded-2xl border ${
                isLove ? 'border-pink-100' : 'border-rose-100'
            } bg-gradient-to-br from-white via-pink-50/30 to-rose-50/40 p-5`}
        >
            {/* Badge */}
            <div className="flex items-center justify-between gap-2 mb-3">
                <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r ${pillBg} text-white text-[10px] font-black uppercase tracking-widest shadow-sm`}
                >
                    <Heart className="h-3 w-3 fill-white" />
                    {titleLabel}
                </span>
                <span className="text-[11px] font-bold text-gray-500">
                    {formatShortDate(locale, nextDate.toISOString())}
                </span>
            </div>

            {/* Ordinal milestone headline */}
            <p className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
                <span className={accentText}>
                    {ordinalLabelForMilestone(years, isToday)}
                </span>{' '}
                {headline}
            </p>

            {isToday && years > 0 && (
                <p className="mt-1 text-sm font-bold text-pink-600">
                    {t('anniversary.happyNth', { n: ordinal(years) })}
                </p>
            )}

            {isToday && years === 0 && (
                <p className="mt-1 text-sm font-bold text-pink-600">
                    {t('anniversary.storyStartsToday')}
                </p>
            )}

            {/* Countdown line */}
            <p className="mt-2 text-xs font-bold text-gray-500">
                {isToday
                    ? t('anniversary.celebrating')
                    : `${countdownLabel} · ${formatPrettyDate(locale, nextDate.toISOString())}`}
            </p>

            {/* Breakdown chips */}
            <div className="mt-4 flex flex-wrap gap-1.5">
                {chips.map((c) => (
                    <span
                        key={c.label}
                        className={`inline-flex items-baseline gap-1 px-2.5 py-1 rounded-full border ${
                            isLove
                                ? 'bg-pink-50 border-pink-200'
                                : 'bg-rose-50 border-rose-200'
                        }`}
                    >
                        <span className="text-base font-black text-gray-900 leading-none">
                            {c.value}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            {c.label}
                        </span>
                    </span>
                ))}
            </div>

            {/* Soft corner gradient */}
            <div
                aria-hidden
                className={`pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full blur-2xl opacity-40 bg-gradient-to-br ${pillBg}`}
            />
        </div>
    );
}
