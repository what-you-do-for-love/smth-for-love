'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Check,
    Heart,
    Loader2,
    RefreshCw,
    Sparkles,
    Users,
    X,
} from 'lucide-react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getUserId } from '@/lib/ultis';
import { relationshipApi } from '@/api';
import { MyRelationship, Relationship } from '@/types';

export default function ConnectionRequestsPage() {
    const isAuthed = useRequireAuth();
    const [mounted, setMounted] = useState(false);
    const [myId, setMyId] = useState<number>(0);
    const [myRelationship, setMyRelationship] = useState<MyRelationship | null>(null);
    const [pendingRequests, setPendingRequests] = useState<Relationship[]>([]);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState<number | null>(null);
    const [rejecting, setRejecting] = useState<number | null>(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => setMounted(true), []);

    useEffect(() => {
        const uid = getUserId();
        setMyId(uid ? parseInt(uid, 10) : 0);
    }, []);

    const fetchAll = useCallback(async () => {
        if (!myId) return;
        setLoading(true);
        try {
            const [rel, pending] = await Promise.all([
                relationshipApi.getMyRelationship(myId).catch(() => null),
                relationshipApi.getPendingRequests(myId).catch(() => []),
            ]);
            setMyRelationship(rel);
            setPendingRequests(pending);
        } catch (err: unknown) {
            console.error('Failed to load requests:', err);
            toast.error(err instanceof Error ? err.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, [myId]);

    useEffect(() => {
        if (mounted && isAuthed && myId) fetchAll();
    }, [mounted, isAuthed, myId, fetchAll]);

    const handleAccept = async (relId: number) => {
        setAccepting(relId);
        try {
            await relationshipApi.respondToRequest(relId, { responderId: myId, accept: true });
            toast.success('Request accepted!');
            await fetchAll();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to accept');
        } finally {
            setAccepting(null);
        }
    };

    const handleReject = async (relId: number) => {
        setRejecting(relId);
        try {
            await relationshipApi.respondToRequest(relId, { responderId: myId, accept: false });
            toast.success('Request declined');
            await fetchAll();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to reject');
        } finally {
            setRejecting(null);
        }
    };

    if (!mounted || !isAuthed) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="h-7 w-7 text-pink-500 animate-spin" />
            </div>
        );
    }

    const hasPartner = myRelationship?.partner != null;
    const hasPending = pendingRequests.length > 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-5 sm:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-pink-50/50">
                <div className="flex items-start gap-3">
                    <Link
                        href="/dashboard"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-pink-50 hover:border-pink-300 transition-all flex-shrink-0"
                        aria-label="Back to dashboard"
                    >
                        <ArrowLeft className="h-4 w-4 text-gray-700" />
                    </Link>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-pink-500" />
                            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                                Connection Requests
                            </h1>
                            {hasPending && (
                                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-400 text-white text-[10px] font-black">
                                    {pendingRequests.length}
                                </span>
                            )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
                            People who want to pair with you
                        </p>
                    </div>
                </div>
            </div>

            {loading ? (
                <SkeletonList />
            ) : hasPending ? (
                <RequestList
                    items={pendingRequests}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    accepting={accepting}
                    rejecting={rejecting}
                />
            ) : (
                <EmptyState hasPartner={hasPartner} partnerName={myRelationship?.partner?.name} />
            )}
        </div>
    );
}

function RequestList({
    items,
    onAccept,
    onReject,
    accepting,
    rejecting,
}: {
    items: Relationship[];
    onAccept: (id: number) => void;
    onReject: (id: number) => void;
    accepting: number | null;
    rejecting: number | null;
}) {
    return (
        <div className="bg-white p-5 sm:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-pink-50/50">
            <ul className="space-y-3">
                {items.map((rel) => (
                    <PendingRow
                        key={rel.id}
                        rel={rel}
                        onAccept={onAccept}
                        onReject={onReject}
                        accepting={accepting}
                        rejecting={rejecting}
                    />
                ))}
            </ul>
        </div>
    );
}

function PendingRow({
    rel,
    onAccept,
    onReject,
    accepting,
    rejecting,
}: {
    rel: Relationship;
    onAccept: (id: number) => void;
    onReject: (id: number) => void;
    accepting: number | null;
    rejecting: number | null;
}) {
    const sender = rel.user1;
    const isLoading = accepting === rel.id || rejecting === rel.id;

    return (
        <li className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm hover:border-pink-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow shadow-orange-200 flex-shrink-0">
                    <Users className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-gray-900 truncate">{sender?.name}</p>
                    <p className="text-xs text-gray-400 font-medium truncate">@{sender?.userName}</p>
                    <p className="text-xs text-amber-600 font-medium mt-0.5 flex items-center gap-1">
                        <Heart className="h-3 w-3 fill-amber-500 text-amber-500" />
                        wants to connect with you
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 sm:justify-end">
                <button
                    type="button"
                    onClick={() => onReject(rel.id)}
                    disabled={isLoading}
                    title="Reject"
                    aria-label="Reject request"
                    className="h-10 w-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all disabled:opacity-40"
                >
                    {rejecting === rel.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                        <X className="h-4 w-4" />
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => onAccept(rel.id)}
                    disabled={isLoading}
                    title="Accept"
                    aria-label="Accept request"
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold shadow shadow-pink-200 hover:from-pink-600 hover:to-rose-600 transition-all disabled:opacity-40"
                >
                    {accepting === rel.id ? (
                        <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Accepting…
                        </>
                    ) : (
                        <>
                            <Check className="h-4 w-4" />
                            Accept
                        </>
                    )}
                </button>
            </div>
        </li>
    );
}

function EmptyState({
    hasPartner,
    partnerName,
}: {
    hasPartner: boolean;
    partnerName?: string | null;
}) {
    return (
        <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-xl shadow-pink-50/50 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-rose-100 mb-4">
                <Heart className="h-7 w-7 text-pink-500 fill-pink-500" />
            </div>
            <p className="text-base font-black text-gray-900">No pending requests</p>
            <p className="text-xs text-gray-500 mt-1.5 max-w-xs mx-auto">
                {hasPartner
                    ? `You're already connected with ${partnerName ?? 'your partner'}. ✨`
                    : 'Share your love code so others can find and connect with you.'}
            </p>
            <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold shadow shadow-pink-200 hover:from-pink-600 hover:to-rose-600 transition-all"
            >
                <Sparkles className="h-3.5 w-3.5" />
                Back to dashboard
            </Link>
        </div>
    );
}

function SkeletonList() {
    return (
        <div className="bg-white p-5 sm:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-pink-50/50">
            <ul className="space-y-3">
                {[0, 1, 2].map((i) => (
                    <li
                        key={i}
                        className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100"
                    >
                        <div className="h-12 w-12 rounded-full bg-gray-100 animate-pulse" />
                        <div className="flex-1 space-y-1.5">
                            <div className="h-3 w-32 rounded bg-gray-100 animate-pulse" />
                            <div className="h-2.5 w-20 rounded bg-gray-100 animate-pulse" />
                        </div>
                        <div className="flex gap-2">
                            <div className="h-10 w-10 rounded-xl bg-gray-100 animate-pulse" />
                            <div className="h-10 w-24 rounded-xl bg-gray-100 animate-pulse" />
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
