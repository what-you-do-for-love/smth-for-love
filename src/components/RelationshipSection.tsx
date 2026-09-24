'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { relationshipApi } from '@/api';
import { getUserId } from '@/lib/ultis';
import { MyRelationship, Relationship, User } from '@/types';
import {
    Heart,
    Search,
    UserPlus,
    X,
    Check,
    RefreshCw,
    Users,
    ExternalLink,
    AlertCircle,
} from 'lucide-react';
import { useT } from '@/i18n/LanguageProvider';

// ---- Pending request card ----
function PendingCard({
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
    const t = useT();
    const sender = rel.user1;
    const isLoading = accepting === rel.id || rejecting === rel.id;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow shadow-orange-200 flex-shrink-0">
                    <Users className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-gray-900 truncate">{sender?.name}</p>
                    <p className="text-xs text-gray-400 font-medium truncate">@{sender?.userName}</p>
                    <p className="text-xs text-amber-600 font-medium mt-0.5">
                        {t('relationship.theySent', { name: sender?.name ?? '' })}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 sm:justify-end">
                <button
                    onClick={() => onReject(rel.id)}
                    disabled={isLoading}
                    title={t('relationship.respondReject')}
                    className="h-9 w-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all disabled:opacity-40"
                >
                    <X className="h-4 w-4" />
                </button>
                <button
                    onClick={() => onAccept(rel.id)}
                    disabled={isLoading}
                    title={t('relationship.respondAccept')}
                    className="h-9 w-9 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center text-white shadow shadow-pink-200 hover:from-pink-600 hover:to-rose-600 transition-all disabled:opacity-40"
                >
                    {isLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                        <Check className="h-4 w-4" />
                    )}
                </button>
            </div>
        </div>
    );
}

// ---- Find-by-love-code panel ----
function FindByCodePanel({
    myUserId,
    onRequestSent,
}: {
    myUserId: number;
    onRequestSent: () => void;
}) {
    const t = useT();
    const [code, setCode] = useState('');
    const [foundUser, setFoundUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState('');

    const handleCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        setCode(val);
        setFoundUser(null);
        setNotFound(false);
        setError('');
    };

    const handleSearch = useCallback(async () => {
        if (code.length !== 6) {
            setError(t('relationship.codeRequired'));
            return;
        }
        setLoading(true);
        setNotFound(false);
        setFoundUser(null);
        setError('');
        try {
            const user = await relationshipApi.getByLoveCode(code);
            setFoundUser(user);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('common.unknown');
            if (msg.toLowerCase().includes('not found')) {
                setNotFound(true);
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    }, [code, t]);

    const handleSendRequest = async () => {
        if (!foundUser) return;
        setSending(true);
        try {
            await relationshipApi.sendRequest({ senderId: myUserId, receiverId: foundUser.id });
            toast.success(t('relationship.sentRequestTo', { name: foundUser.name }));
            setCode('');
            setFoundUser(null);
            onRequestSent();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('relationship.requestFailed');
            toast.error(msg);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={code}
                        onChange={handleCodeInput}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder={t('relationship.codePlaceholder')}
                        maxLength={6}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-bold placeholder-gray-400 tracking-widest text-center uppercase focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    disabled={loading || code.length !== 6}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold shadow shadow-pink-200 hover:from-pink-600 hover:to-rose-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {t('partner.findPartner')}
                </button>
            </div>

            {error && (
                <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> {error}
                </p>
            )}

            {notFound && (
                <p className="text-xs text-gray-400 font-medium italic text-center py-2">
                    {t('common.unknown')}
                </p>
            )}

            {foundUser && (
                <div className="bg-white rounded-2xl border border-pink-100 p-4 flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center flex-shrink-0">
                        <Heart className="h-5 w-5 text-white fill-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate">{foundUser.name}</p>
                        <p className="text-xs text-gray-400 font-medium">@{foundUser.userName}</p>
                        {foundUser.partnerId && (
                            <p className="text-xs text-rose-400 font-medium mt-0.5 flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" /> Already connected
                            </p>
                        )}
                    </div>
                    {!foundUser.partnerId ? (
                        <button
                            onClick={handleSendRequest}
                            disabled={sending}
                            className="flex-shrink-0 px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold shadow shadow-pink-200 hover:from-pink-600 hover:to-rose-600 transition-all disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {sending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                            {t('relationship.sendRequest')}
                        </button>
                    ) : (
                        <span className="flex-shrink-0 text-xs text-gray-400 font-medium italic px-2">{t('common.unknown')}</span>
                    )}
                </div>
            )}
        </div>
    );
}

// ---- Main Relationship section ----
export default function RelationshipSection() {
    const t = useT();
    const [myId, setMyId] = useState<number>(0);
    const [isReady, setIsReady] = useState(false);

    // Read userId only on the client to avoid SSR/CSR mismatch.
    useEffect(() => {
        const userId = getUserId();
        setMyId(userId ? parseInt(userId, 10) : 0);
        setIsReady(true);
    }, []);

    const [myRelationship, setMyRelationship] = useState<MyRelationship | null>(null);
    const [pendingRequests, setPendingRequests] = useState<Relationship[]>([]);
    const [loadingMy, setLoadingMy] = useState(true);
    const [accepting, setAccepting] = useState<number | null>(null);
    const [rejecting, setRejecting] = useState<number | null>(null);

    const fetchAll = useCallback(async () => {
        if (!myId) return;
        setLoadingMy(true);
        try {
            const [rel, pending] = await Promise.all([
                relationshipApi.getMyRelationship(myId),
                relationshipApi.getPendingRequests(myId),
            ]);
            setMyRelationship(rel);
            setPendingRequests(pending);
        } catch (err: unknown) {
            console.error('Failed to fetch relationship data:', err);
        } finally {
            setLoadingMy(false);
        }
    }, [myId]);

    useEffect(() => {
        if (isReady && myId) {
            fetchAll();
        }
    }, [isReady, myId, fetchAll]);

    const handleAccept = async (relId: number) => {
        setAccepting(relId);
        try {
            await relationshipApi.respondToRequest(relId, { responderId: myId, accept: true });
            toast.success(t('relationship.accepted'));
            await fetchAll();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('relationship.failedAccept');
            toast.error(msg);
        } finally {
            setAccepting(null);
        }
    };

    const handleReject = async (relId: number) => {
        setRejecting(relId);
        try {
            await relationshipApi.respondToRequest(relId, { responderId: myId, accept: false });
            toast.success(t('relationship.declined'));
            await fetchAll();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('relationship.failedReject');
            toast.error(msg);
        } finally {
            setRejecting(null);
        }
    };

    if (loadingMy) {
        return (
            <div className="flex items-center justify-center py-12">
                <svg className="animate-spin h-7 w-7 text-pink-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    const hasPending = pendingRequests.length > 0;

    return (
        <div className="space-y-6">
            {/* Pending requests summary (full list lives at /connection-requests) */}
            {hasPending && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-amber-500" />
                            <h2 className="text-sm font-black text-gray-700">
                                {t('relationship.incomingRequests')}
                                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-amber-400 text-white text-[10px] font-black">
                                    {pendingRequests.length}
                                </span>
                            </h2>
                        </div>
                        <Link
                            href="/connection-requests"
                            className="text-[11px] font-bold text-pink-500 hover:text-pink-600 hover:underline"
                        >
                            {t('relationship.viewAll')}
                        </Link>
                    </div>

                    {/* Show first 2 inline; the rest are reachable on the dedicated page */}
                    <div className="space-y-2">
                        {pendingRequests.slice(0, 2).map((rel) => (
                            <PendingCard
                                key={rel.id}
                                rel={rel}
                                onAccept={handleAccept}
                                onReject={handleReject}
                                accepting={accepting}
                                rejecting={rejecting}
                            />
                        ))}
                        {pendingRequests.length > 2 && (
                            <Link
                                href="/connection-requests"
                                className="block text-center text-xs font-bold text-pink-500 hover:text-pink-600 py-2"
                            >
                                {t('relationship.moreInInbox', { count: pendingRequests.length - 2 })}
                            </Link>
                        )}
                    </div>
                </div>
            )}

            {/* Find your partner (only when no connection yet) */}
            {!myRelationship?.partner && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-pink-500" />
                        <h2 className="text-sm font-black text-gray-700">{t('relationship.findYourPartner')}</h2>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-4">
                        <p className="text-xs text-gray-500 font-medium">
                            {t('relationship.findHelp')}
                        </p>
                        <FindByCodePanel myUserId={myId} onRequestSent={fetchAll} />
                    </div>
                </div>
            )}
        </div>
    );
}
