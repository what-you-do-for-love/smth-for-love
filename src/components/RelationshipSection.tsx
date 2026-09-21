'use client';

import { useEffect, useState, useCallback } from 'react';
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
    Sparkles,
    Users,
    Copy,
    ExternalLink,
    AlertCircle,
} from 'lucide-react';

// ---- Small partner card shown in the header ----
function PartnerCard({ partner }: { partner: MyRelationship['partner'] }) {
    const [copied, setCopied] = useState(false);

    const copyCode = () => {
        if (!partner) return;
        navigator.clipboard.writeText(partner.loveCode).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl border border-pink-100 p-5 flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-200 flex-shrink-0">
                <Heart className="h-7 w-7 text-white fill-white" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-pink-500 uppercase tracking-wider mb-0.5">Your Partner</p>
                <p className="text-base font-black text-gray-900 truncate">{partner?.name}</p>
                <p className="text-xs text-gray-400 font-medium">@{partner?.userName}</p>
            </div>
            {partner && (
                <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="bg-white rounded-xl px-3 py-1.5 border border-pink-100 flex items-center gap-1.5">
                        <span className="text-sm font-black text-pink-600 tracking-widest">{partner.loveCode}</span>
                        <button
                            onClick={copyCode}
                            title="Copy love code"
                            className="text-gray-400 hover:text-pink-500 transition-colors"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

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
    const sender = rel.user1;
    const isLoading = accepting === rel.id || rejecting === rel.id;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow shadow-orange-200 flex-shrink-0">
                <Users className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-gray-900 truncate">{sender?.name}</p>
                <p className="text-xs text-gray-400 font-medium">@{sender?.userName}</p>
                <p className="text-xs text-amber-600 font-medium mt-0.5">wants to connect with you</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <button
                    onClick={() => onReject(rel.id)}
                    disabled={isLoading}
                    title="Reject"
                    className="h-9 w-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all disabled:opacity-40"
                >
                    <X className="h-4 w-4" />
                </button>
                <button
                    onClick={() => onAccept(rel.id)}
                    disabled={isLoading}
                    title="Accept"
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
            setError('Love code must be 6 characters');
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
            const msg = err instanceof Error ? err.message : 'Not found';
            if (msg.toLowerCase().includes('not found')) {
                setNotFound(true);
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    }, [code]);

    const handleSendRequest = async () => {
        if (!foundUser) return;
        setSending(true);
        try {
            await relationshipApi.sendRequest({ senderId: myUserId, receiverId: foundUser.id });
            toast.success(`Request sent to ${foundUser.name}!`);
            setCode('');
            setFoundUser(null);
            onRequestSent();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to send';
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
                        placeholder="Enter 6-digit love code"
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
                    Find
                </button>
            </div>

            {error && (
                <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> {error}
                </p>
            )}

            {notFound && (
                <p className="text-xs text-gray-400 font-medium italic text-center py-2">
                    No user found with that love code
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
                            Send Request
                        </button>
                    ) : (
                        <span className="flex-shrink-0 text-xs text-gray-400 font-medium italic px-2">unavailable</span>
                    )}
                </div>
            )}
        </div>
    );
}

// ---- Main Relationship section ----
export default function RelationshipSection() {
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
            toast.success('Request accepted!');
            await fetchAll();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to accept';
            toast.error(msg);
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
            const msg = err instanceof Error ? err.message : 'Failed to reject';
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

    const hasPartner = myRelationship?.partner != null;
    const hasPending = pendingRequests.length > 0;

    return (
        <div className="space-y-6">
            {/* Partner card or Find panel */}
            {hasPartner ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-pink-500" />
                        <h2 className="text-sm font-black text-gray-700">Your Connection</h2>
                    </div>
                    <PartnerCard partner={myRelationship!.partner} />
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-pink-500" />
                        <h2 className="text-sm font-black text-gray-700">Find Your Partner</h2>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <p className="text-xs text-gray-500 font-medium">
                            Enter your partner&apos;s 6-character love code to send a connection request.
                        </p>
                        <FindByCodePanel myUserId={myId} onRequestSent={fetchAll} />
                    </div>
                </div>
            )}

            {/* Pending requests */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-amber-500" />
                    <h2 className="text-sm font-black text-gray-700">
                        Incoming Requests
                        {hasPending && (
                            <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-amber-400 text-white text-[10px] font-black">
                                {pendingRequests.length}
                            </span>
                        )}
                    </h2>
                </div>

                {!hasPending ? (
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 text-center">
                        <p className="text-xs text-gray-400 font-medium italic">No pending requests</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {pendingRequests.map((rel) => (
                            <PendingCard
                                key={rel.id}
                                rel={rel}
                                onAccept={handleAccept}
                                onReject={handleReject}
                                accepting={accepting}
                                rejecting={rejecting}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
