'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, X, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/i18n/LanguageProvider';

export type LightboxImage = {
    /** Stable id used for keys */
    id: string | number;
    /** Cloudinary (or any) URL */
    url: string;
    /** Optional caption shown below the photo */
    caption?: string;
};

/**
 * Facebook-style photo viewer.
 *
 * - Fixed full-viewport overlay, dark backdrop with subtle blur.
 * - Prev / Next arrows that wrap around when more than 1 image is passed.
 * - Counter pill in the top center.
 * - Counter dot strip at the bottom when > 1 image.
 * - Download button (uses an anchor + revokeObjectURL trick).
 * - Click backdrop or X to close.
 * - ArrowLeft / ArrowRight / Escape keyboard shortcuts.
 * - Body scroll locked while open.
 */
export default function PhotoLightbox({
    images,
    index,
    onClose,
    onIndexChange,
}: {
    images: LightboxImage[];
    index: number;
    onClose: () => void;
    onIndexChange: (next: number) => void;
}) {
    const t = useT();
    const [zoom, setZoom] = useState(1);
    const [dragging, setDragging] = useState(false);

    const total = images.length;
    const safeIndex = total > 0 ? Math.min(Math.max(index, 0), total - 1) : 0;
    const current = total > 0 ? images[safeIndex] : null;

    const goPrev = useCallback(
        () => onIndexChange((safeIndex - 1 + total) % total),
        [onIndexChange, safeIndex, total],
    );
    const goNext = useCallback(
        () => onIndexChange((safeIndex + 1) % total),
        [onIndexChange, safeIndex, total],
    );

    // Lock body scroll while open
    useEffect(() => {
        if (total === 0) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [total]);

    // Reset zoom when image changes
    useEffect(() => {
        setZoom(1);
    }, [safeIndex]);

    // Keyboard navigation
    useEffect(() => {
        if (total === 0) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowLeft') goPrev();
            else if (e.key === 'ArrowRight') goNext();
            else if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 0.25, 3));
            else if (e.key === '-') setZoom((z) => Math.max(z - 0.25, 1));
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [goNext, goPrev, onClose, total]);

    const handleDownload = useCallback(async () => {
        if (!current) return;
        try {
            const res = await fetch(current.url, { mode: 'cors' });
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const ext = blob.type.split('/')[1]?.split(';')[0] ?? 'jpg';
            a.href = objectUrl;
            a.download = `photo-${current.id}.${ext}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(objectUrl);
        } catch {
            // Fallback: open the image in a new tab so user can save manually.
            window.open(current.url, '_blank', 'noopener,noreferrer');
            toast.error(t('lightbox.downloadBlocked'));
        }
    }, [current, t]);

    // Wheel zoom (simple, single-axis)
    const onWheel = (e: React.WheelEvent) => {
        if (e.deltaY < 0) setZoom((z) => Math.min(z + 0.1, 3));
        else setZoom((z) => Math.max(z - 0.1, 1));
    };

    if (total === 0 || !current) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm animate-in fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Top bar */}
            <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between gap-2 p-3 sm:p-5 bg-gradient-to-b from-black/60 to-transparent">
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold tracking-wide">
                        {safeIndex + 1} / {total}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setZoom((z) => Math.max(z - 0.25, 1))}
                        disabled={zoom <= 1}
                        title={t('lightbox.zoomOut')}
                        aria-label={t('lightbox.zoomOut')}
                        className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center disabled:opacity-30 transition-colors"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                        disabled={zoom >= 3}
                        title={t('lightbox.zoomIn')}
                        aria-label={t('lightbox.zoomIn')}
                        className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center disabled:opacity-30 transition-colors"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={handleDownload}
                        title={t('lightbox.download')}
                        aria-label={t('lightbox.download')}
                        className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                    >
                        <Download className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        title={t('lightbox.close')}
                        aria-label={t('lightbox.close')}
                        className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Prev / Next arrows (only when multiple images) */}
            {total > 1 && (
                <>
                    <button
                        type="button"
                        onClick={goPrev}
                        aria-label={t('lightbox.prev')}
                        className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-10 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                    >
                        <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" />
                    </button>
                    <button
                        type="button"
                        onClick={goNext}
                        aria-label={t('lightbox.next')}
                        className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-10 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                    >
                        <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" />
                    </button>
                </>
            )}

            {/* Image area */}
            <div
                className="absolute inset-0 flex items-center justify-center select-none"
                onWheel={onWheel}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    key={current.id}
                    src={current.url}
                    alt={current.caption ?? `Photo ${safeIndex + 1}`}
                    draggable={false}
                    onMouseDown={() => setDragging(true)}
                    onMouseUp={() => setDragging(false)}
                    onMouseLeave={() => setDragging(false)}
                    onClick={(e) => {
                        // Single click toggles 1x → 2x on the image itself.
                        if (dragging) return;
                        if (e.target !== e.currentTarget) return;
                        setZoom((z) => (z > 1 ? 1 : 2));
                    }}
                    className="max-h-[85vh] max-w-[92vw] object-contain shadow-2xl transition-transform duration-200 ease-out"
                    style={{
                        transform: `scale(${zoom})`,
                        cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in',
                    }}
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = '0.3';
                    }}
                />
            </div>

            {/* Caption + dot pager */}
            <div className="absolute bottom-0 inset-x-0 z-10 flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-5 bg-gradient-to-t from-black/70 to-transparent">
                {current.caption && (
                    <p className="text-white text-xs sm:text-sm font-bold text-center max-w-xl drop-shadow">
                        {current.caption}
                    </p>
                )}
                {total > 1 && (
                    <div className="flex items-center gap-1.5">
                        {images.map((img, i) => (
                            <button
                                key={img.id}
                                type="button"
                                onClick={() => onIndexChange(i)}
                                aria-label={`Go to photo ${i + 1}`}
                                className={`h-1.5 rounded-full transition-all ${
                                    i === safeIndex
                                        ? 'w-6 bg-white'
                                        : 'w-1.5 bg-white/40 hover:bg-white/70'
                                }`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
