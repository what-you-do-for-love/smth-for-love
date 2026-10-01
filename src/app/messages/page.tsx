'use client';

import { useEffect, useState, useCallback, useRef, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Check,
    CheckCheck,
    Heart,
    Loader2,
    MessageCircle,
    Send,
    Trash2,
    UserPlus,
} from 'lucide-react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getUserId } from '@/lib/ultis';
import { useT } from '@/i18n/LanguageProvider';
import { messageApi, relationshipApi } from '@/api';
import { useSignalR, joinConversation, leaveConversation, sendTyping } from '@/hooks/useSignalR';
import { emitUnreadMessages } from '@/lib/unreadBus';
import type { Conversation, Message, MyRelationship } from '@/types';

const PAGE_SIZE = 20;
// How far above the visible top the IntersectionObserver should treat the
// sentinel as "intersecting". With ~50px bubbles, 200px ≈ 3-4 messages — i.e.,
// the loader fires when the user is approaching the oldest message in the
// rendered list, exactly like reaching message #17 of a 20-message page.
const PRELOAD_ROOT_MARGIN_PX = 200;

type Phase = 'idle' | 'loading' | 'error';

export default function MessagesPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-[60vh] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-pink-500 animate-spin" />
                </div>
            }
        >
            <MessagesPageInner />
        </Suspense>
    );
}

function MessagesPageInner() {
    const isAuthed = useRequireAuth();
    const t = useT();
    const router = useRouter();
    const params = useSearchParams();

    const [mounted, setMounted] = useState(false);
    const [myId, setMyId] = useState(0);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [phase, setPhase] = useState<Phase>('idle');
    const [activeId, setActiveId] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [partner, setPartner] = useState<MyRelationship | null>(null);
    const [typingFrom, setTypingFrom] = useState<{ name: string; until: number } | null>(null);
    const [partnerOnline, setPartnerOnline] = useState<Record<number, boolean>>({});
    const [dmCode, setDmCode] = useState('');
    const [startingDm, setStartingDm] = useState(false);

    // Pagination state — older messages are prepended, newest are appended via SignalR.
    const [hasMoreOlder, setHasMoreOlder] = useState(true);
    const [loadingOlder, setLoadingOlder] = useState(false);
    // Tracks the count we've requested from the server so the next "load older"
    // call asks for `PAGE_SIZE * loadedPages`. Reset whenever activeId changes.
    const [loadedPages, setLoadedPages] = useState(0);
    // Bumped on every conversation open to force the scroll-reset effect to fire
    // exactly once (deps `[activeId]` alone wouldn't, since `setLoadedPages(0)`
    // happens inside an effect that runs in the same render commit).
    const [scrollResetKey, setScrollResetKey] = useState(0);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const messagesScrollRef = useRef<HTMLDivElement | null>(null);
    const olderSentinelRef = useRef<HTMLDivElement | null>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Guard against re-entering the infinite-scroll handler while a fetch is
    // already in flight (IntersectionObserver fires repeatedly at the threshold).
    const loadOlderLockRef = useRef(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => setMounted(true), []);

    useEffect(() => {
        const uid = getUserId();
        setMyId(uid ? parseInt(uid, 10) : 0);
    }, []);

    // ---- conversations ----

    const fetchConversations = useCallback(async () => {
        if (!myId) return;
        setPhase('loading');
        try {
            const list = await messageApi.listConversations(myId);
            setConversations(Array.isArray(list) ? list : []);
            setPhase('idle');
        } catch (err: unknown) {
            setPhase('error');
            toast.error(err instanceof Error ? err.message : t('messages.loadFailed'));
        }
    }, [myId, t]);

    useEffect(() => {
        if (mounted && isAuthed && myId) fetchConversations();
    }, [mounted, isAuthed, myId, fetchConversations]);

    // Hydrate partner info so we can show the partner's name in the empty state CTA.
    useEffect(() => {
        if (!myId) return;
        relationshipApi
            .getMyRelationship(myId)
            .then((rel) => setPartner(rel))
            .catch(() => setPartner(null));
    }, [myId]);

    // Honor ?c={conversationId} from push notifications / deep links.
    useEffect(() => {
        const c = params?.get('c');
        if (c) {
            const id = parseInt(c, 10);
            if (Number.isFinite(id)) setActiveId(id);
        }
    }, [params]);

    // ---- active conversation messages ----

    // Initial load: only the newest PAGE_SIZE messages. Older history is fetched
    // lazily as the user scrolls up. We always store the array oldest→newest
    // (ascending by DateSent), regardless of what order the BE returns — the BE
    // serves DESC and we reverse here. Keeping an ASC array means realtime
    // appends and the `scrollIntoView(messagesEndRef)` bottom-anchor still work
    // exactly like a normal chat.
    const fetchMessages = useCallback(
        async (cid: number) => {
            if (!myId) return;
            try {
                const list = await messageApi.getMessages(cid, myId, 0, PAGE_SIZE);
                const arr = Array.isArray(list) ? list : [];
                // BE returns newest-first (DESC). Flip to oldest-first (ASC).
                const asc = [...arr].reverse();
                setMessages(asc);
                setLoadedPages(1);
                // If we got a short page, we've hit the beginning of history.
                setHasMoreOlder(asc.length >= PAGE_SIZE);
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : t('messages.loadFailed'));
            }
        },
        [myId, t],
    );

    // Loads the next page of older messages and prepends them. Called when the
    // user scrolls up near the top of the rendered list.
    const loadOlderMessages = useCallback(async () => {
        if (!activeId || !myId) return;
        if (!hasMoreOlder || loadingOlder || loadOlderLockRef.current) return;

        loadOlderLockRef.current = true;
        setLoadingOlder(true);

        // Capture scroll geometry BEFORE we mutate the list so we can restore
        // it after React adds them — otherwise the user's view jumps down by
        // the height of the newly prepended messages.
        const scroller = messagesScrollRef.current;
        const prevScrollHeight = scroller?.scrollHeight ?? 0;
        const prevScrollTop = scroller?.scrollTop ?? 0;
        const prevOffsetFromBottom =
            scroller ? prevScrollHeight - prevScrollTop - scroller.clientHeight : 0;

        const skip = loadedPages * PAGE_SIZE;
        try {
            const list = await messageApi.getMessages(activeId, myId, skip, PAGE_SIZE);
            const arr = Array.isArray(list) ? list : [];
            if (arr.length === 0) {
                setHasMoreOlder(false);
                return;
            }
            // BE returns newest-first (DESC). Flip to oldest-first before prepend.
            const asc = [...arr].reverse();
            // Prepend older messages, deduping by id. Without dedup, messages
            // already in state (e.g. delivered via SignalR before they were
            // loaded via paging) would cause a duplicate-key React warning.
            // We keep stable order: the oldest paged message first, then the
            // existing list (which is oldest→newest).
            setMessages((prev) => {
                const seen = new Set<number>();
                const merged: Message[] = [];
                for (const m of asc) {
                    if (!seen.has(m.id)) {
                        seen.add(m.id);
                        merged.push(m);
                    }
                }
                for (const m of prev) {
                    if (!seen.has(m.id)) {
                        seen.add(m.id);
                        merged.push(m);
                    }
                }
                return merged;
            });
            setLoadedPages((p) => p + 1);
            setHasMoreOlder(asc.length >= PAGE_SIZE);

            // Restore the user's visual position. After prepending, scrollHeight
            // grows by exactly the height of the new messages. Adding the same
            // delta to scrollTop keeps the same messages anchored at the top of
            // the viewport.
            requestAnimationFrame(() => {
                const scrollerAfter = messagesScrollRef.current;
                if (!scrollerAfter) return;
                const newScrollHeight = scrollerAfter.scrollHeight;
                const delta = newScrollHeight - prevScrollHeight;
                scrollerAfter.scrollTop = prevScrollTop + delta;
                // Sanity: if the user was near the bottom, keep them there so
                // a fresh message arriving doesn't cause a jump.
                const newOffsetFromBottom =
                    newScrollHeight - scrollerAfter.scrollTop - scrollerAfter.clientHeight;
                if (prevOffsetFromBottom < 80 && newOffsetFromBottom > 200) {
                    scrollerAfter.scrollTop =
                        newScrollHeight - scrollerAfter.clientHeight - prevOffsetFromBottom;
                }
            });
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : t('messages.loadFailed'));
        } finally {
            setLoadingOlder(false);
            loadOlderLockRef.current = false;
        }
    }, [activeId, myId, hasMoreOlder, loadingOlder, loadedPages, t]);

    useEffect(() => {
        if (!activeId) {
            setMessages([]);
            setHasMoreOlder(true);
            setLoadedPages(0);
            setScrollResetKey((k) => k + 1);
            return;
        }
        // Optimistically zero out this conversation's unread in local state so
        // the bell and the tile's badge both clear immediately. The next list
        // fetch will reconcile with the server.
        setConversations((prev) =>
            prev.map((c) => (c.id === activeId ? { ...c, unreadCount: 0 } : c)),
        );
        setScrollResetKey((k) => k + 1);
        fetchMessages(activeId);
        joinConversation(activeId);
        return () => {
            leaveConversation(activeId);
        };
    }, [activeId, fetchMessages]);

    // ---- realtime ----

    useSignalR({
        enabled: mounted && isAuthed && !!myId,
        onEvent: (event) => {
            if (event.type === 'message:received') {
                const msg = event.payload;
                // Refresh the conversation list (lastMessage + order) and append
                // the message if we're inside the conversation.
                setConversations((prev) => {
                    const next = prev.map((c) =>
                        c.id === msg.conversationId ? { ...c, lastMessage: msg } : c,
                    );
                    return next.sort(
                        (a, b) =>
                            new Date(b.dateUpdated).getTime() -
                            new Date(a.dateUpdated).getTime(),
                    );
                });
                if (activeId === msg.conversationId) {
                    setMessages((prev) =>
                        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
                    );
                    // Mark read in the background.
                    if (msg.senderId !== myId) {
                        void messageApi
                            .markRead({
                                requesterId: myId,
                                conversationId: msg.conversationId,
                                lastReadMessageId: msg.id,
                            })
                            .catch(() => undefined);
                    }
                }
            } else if (event.type === 'typing') {
                if (activeId === event.payload.conversationId && event.payload.senderId !== myId) {
                    setTypingFrom({ name: event.payload.senderName, until: Date.now() + 3000 });
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => setTypingFrom(null), 3000);
                }
            } else if (event.type === 'conversation:read') {
                if (event.payload.conversationId === activeId) {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.senderId === myId && m.id <= event.payload.lastReadMessageId
                                ? { ...m, isReadByMe: true, readByOthersCount: 1 }
                                : m,
                        ),
                    );
                }
            } else if (event.type === 'presence:changed') {
                setPartnerOnline((p) => ({ ...p, [event.payload.userId]: event.payload.isOnline }));
            }
        },
    });

    // Auto-scroll to bottom on new messages (SignalR append). We only auto-scroll
    // when the user is already near the bottom — otherwise someone scrolling up
    // through history gets yanked to the latest message each time. rAF makes
    // sure the messages are actually in the DOM before we measure + scroll.
    useEffect(() => {
        const scroller = messagesScrollRef.current;
        if (!scroller) return;
        const offsetFromBottom =
            scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
        if (offsetFromBottom < 200) {
            requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            });
        }
    }, [messages, typingFrom]);

    // When the user switches to a different conversation, jump straight to the
    // latest message. We don't depend on the auto-scroll effect because that one
    // only scrolls when already near the bottom — after a switch the scroll
    // position is whatever the previous conversation left it at.
    useEffect(() => {
        if (!activeId) return;
        // Wait one frame so React has rendered the new messages + sentinel.
        requestAnimationFrame(() => {
            const scroller = messagesScrollRef.current;
            if (!scroller) return;
            scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'auto' });
        });
    }, [activeId, scrollResetKey]);

    // Infinite-scroll-up: watch the sentinel at the top of the messages list.
    // When it becomes visible, fetch the next older page. The sentinel is only
    // rendered when `hasMoreOlder` is true, so reaching the top of history
    // naturally stops the fetches.
    useEffect(() => {
        const sentinel = olderSentinelRef.current;
        const scroller = messagesScrollRef.current;
        if (!sentinel || !scroller) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        void loadOlderMessages();
                    }
                }
            },
            { root: scroller, rootMargin: `${PRELOAD_ROOT_MARGIN_PX}px 0px 0px 0px`, threshold: 0 },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [loadOlderMessages, activeId]);

    // Broadcast total unread to the bell in the navbar. Recomputes whenever the
    // conversation list mutates (open / read / new message) so the badge stays
    // in sync with the page even when the user is on /messages.
    useEffect(() => {
        if (!mounted) return;
        const total = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
        emitUnreadMessages(total);
    }, [conversations, mounted]);

    // ---- send ----

    const handleSend = async () => {
        if (!activeId || !myId) return;
        const content = draft.trim();
        if (!content) return;

        const clientMessageId = `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        setSending(true);
        try {
            await messageApi.sendMessage({
                senderId: myId,
                conversationId: activeId,
                content,
                clientMessageId,
            });
            setDraft('');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : t('messages.sendFailed'));
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (msgId: number) => {
        if (!myId) return;
        if (!confirm(t('messages.deleteConfirm'))) return;
        try {
            await messageApi.deleteMessage(msgId, myId);
            setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content: '', isDeleted: true } : m)));
            toast.success(t('messages.deleted'));
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : t('common.failed'));
        }
    };

    const handleStartDm = async () => {
        if (!myId) return;
        const code = dmCode.trim();
        if (code.length !== 6) {
            toast.error(t('relationship.codeRequired'));
            return;
        }
        setStartingDm(true);
        try {
            const user = await relationshipApi.getByLoveCode(code.toUpperCase());
            const convo = await messageApi.createOrGetDirect({
                requesterId: myId,
                otherUserId: user.id,
            });
            toast.success(t('messages.dmCreated'));
            setDmCode('');
            await fetchConversations();
            setActiveId(convo.id);
            router.replace(`/messages?c=${convo.id}`);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : t('common.failed'));
        } finally {
            setStartingDm(false);
        }
    };

    // ---- derived ----

    const activeConvo = useMemo(
        () => conversations.find((c) => c.id === activeId) ?? null,
        [conversations, activeId],
    );

    const otherUserId = activeConvo?.otherUserId ?? null;
    const partnerName = activeConvo?.otherUserName ?? t('common.friendFallback');
    const isOtherOnline = otherUserId ? partnerOnline[otherUserId] : false;

    // ---- render ----

    if (!mounted || !isAuthed) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-pink-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100dvh-3.5rem)] -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 -mb-12 md:-mb-8">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 pt-2 pb-3 flex-shrink-0">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white border border-gray-100 text-gray-600 hover:bg-pink-50 hover:text-gray-900"
                    aria-label={t('common.back')}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <div className="min-w-0 flex-1">
                    <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                        {t('messages.title')}
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {partner?.partner?.name
                            ? t('messages.subtitle', { name: partner.partner.name })
                            : t('messages.emptyDesc')}
                    </p>
                </div>
            </div>

            {/* Two-column layout. On mobile, hide the list when a conversation is open. */}
            <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 flex-1 min-h-0">
                {/* Conversations list */}
                <aside
                    className={`bg-white rounded-3xl border border-gray-100 shadow-xl shadow-pink-50/50 overflow-hidden flex flex-col ${
                        activeId ? 'hidden md:flex' : 'flex'
                    }`}
                >
                    {/* Start-DM form */}
                    <div className="p-3 border-b border-gray-100 bg-pink-50/40">
                        <div className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4 text-pink-500 flex-shrink-0" />
                            <input
                                value={dmCode}
                                onChange={(e) => setDmCode(e.target.value.toUpperCase())}
                                placeholder={t('messages.searchPlaceholder')}
                                maxLength={6}
                                className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-pink-300"
                            />
                            <button
                                onClick={handleStartDm}
                                disabled={startingDm || dmCode.length !== 6}
                                className="px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold hover:from-pink-600 hover:to-rose-600 disabled:opacity-50"
                            >
                                {startingDm ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <MessageCircle className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {phase === 'loading' && conversations.length === 0 && (
                            <div className="p-8 flex justify-center">
                                <Loader2 className="h-6 w-6 text-pink-500 animate-spin" />
                            </div>
                        )}
                        {phase === 'idle' && conversations.length === 0 && (
                            <div className="p-8 text-center">
                                <Heart className="h-8 w-8 text-pink-300 mx-auto" />
                                <p className="text-sm font-bold text-gray-900 mt-2">
                                    {t('messages.emptyTitle')}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {t('messages.emptyDesc')}
                                </p>
                            </div>
                        )}
                        {conversations.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => {
                                    setActiveId(c.id);
                                    router.replace(`/messages?c=${c.id}`);
                                }}
                                className={`w-full flex items-start gap-3 p-3 text-left transition-colors hover:bg-pink-50/40 ${
                                    activeId === c.id ? 'bg-pink-50/60' : ''
                                }`}
                            >
                                <Avatar
                                    name={c.otherUserName ?? t('common.unknown')}
                                    url={c.otherUserAvatarUrl}
                                    size={44}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-bold text-gray-900 truncate">
                                            {c.otherUserName ?? t('common.unknown')}
                                        </span>
                                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                                            {fmtTime(c.lastMessage?.dateSent ?? c.dateUpdated)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate mt-0.5">
                                        {c.lastMessage?.senderId === myId
                                            ? `${t('messages.you')}: `
                                            : ''}
                                        {c.lastMessage?.content ?? '…'}
                                    </p>
                                </div>
                                {c.unreadCount > 0 && (
                                    <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-pink-500 text-white text-[10px] font-black">
                                        {c.unreadCount > 99 ? '99+' : c.unreadCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Chat panel */}
                <section
                    className={`bg-white rounded-3xl border border-gray-100 shadow-xl shadow-pink-50/50 flex flex-col overflow-hidden ${
                        activeId ? 'flex' : 'hidden md:flex'
                    }`}
                >
                    {!activeConvo ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <Heart className="h-10 w-10 text-pink-300 mx-auto" />
                                <p className="text-sm font-bold text-gray-900 mt-2">
                                    {t('messages.startDm')}
                                </p>
                                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                                    {t('messages.startDmHint')}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Chat header */}
                            <header className="flex items-center gap-3 p-3 border-b border-gray-100 bg-pink-50/30">
                                <button
                                    onClick={() => setActiveId(null)}
                                    className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-full bg-white border border-gray-100 text-gray-600 hover:bg-pink-50"
                                    aria-label={t('common.back')}
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </button>
                                <Avatar
                                    name={partnerName}
                                    url={activeConvo.otherUserAvatarUrl}
                                    size={40}
                                    online={isOtherOnline}
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-gray-900 truncate">
                                        {partnerName}
                                    </p>
                                    <p className="text-[11px] text-gray-500">
                                        {isOtherOnline ? (
                                            <span className="text-green-600 font-bold">
                                                ● {t('messages.online')}
                                            </span>
                                        ) : (
                                            t('messages.offline')
                                        )}
                                    </p>
                                </div>
                            </header>

                            {/* Messages list — internal scroll only. Paged in chunks of
                                PAGE_SIZE; older history is fetched as the user scrolls up. */}
                            <div
                                ref={messagesScrollRef}
                                className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2 bg-gray-50/40"
                            >
                                {/* Infinite-scroll sentinel sits at the very top of
                                    the list. When the user scrolls up enough that
                                    it enters the viewport, we kick off the next
                                    older page. With `PRELOAD_ROOT_MARGIN_PX` (200px)
                                    this fires when there are ~3 messages above the
                                    viewport top — i.e., when the user is reaching
                                    message index ~17 of the rendered list. */}
                                {hasMoreOlder && (
                                    <div
                                        ref={(el) => {
                                            olderSentinelRef.current = el;
                                        }}
                                        className="flex justify-center py-1"
                                        aria-hidden
                                    >
                                        {loadingOlder && (
                                            <Loader2 className="h-4 w-4 text-pink-400 animate-spin" />
                                        )}
                                    </div>
                                )}
                                {!hasMoreOlder && messages.length > 0 && (
                                    <div className="text-center text-[11px] text-gray-400 py-1">
                                        {t('messages.startOfConversation')}
                                    </div>
                                )}
                                {messages.length === 0 ? (
                                    <div className="text-center py-8 text-sm text-gray-500">
                                        {t('messages.noMessages')}
                                    </div>
                                ) : (
                                    messages.map((m) => (
                                        <MessageBubble
                                            key={m.id}
                                            message={m}
                                            mine={m.senderId === myId}
                                            onDelete={() => handleDelete(m.id)}
                                            t={t}
                                        />
                                    ))
                                )}
                                {typingFrom && (
                                    <div className="text-xs text-gray-500 italic px-2">
                                        {t('messages.typing', { name: typingFrom.name })}
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Composer */}
                            <footer className="p-3 border-t border-gray-100 bg-white">
                                <div className="flex items-end gap-2">
                                    <textarea
                                        value={draft}
                                        onChange={(e) => {
                                            setDraft(e.target.value);
                                            if (activeId) sendTyping(activeId);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                void handleSend();
                                            }
                                        }}
                                        placeholder={t('messages.inputPlaceholder')}
                                        rows={1}
                                        className="flex-1 resize-none px-3 py-2 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 max-h-32"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={sending || !draft.trim()}
                                        className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white disabled:opacity-50 hover:from-pink-600 hover:to-rose-600"
                                        aria-label={t('messages.sendBtn')}
                                    >
                                        {sending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </footer>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}

// ---- local subcomponents ----

function Avatar({
    name,
    url,
    size = 40,
    online,
}: {
    name: string;
    url?: string | null;
    size?: number;
    online?: boolean;
}) {
    const initials = useMemo(() => {
        const parts = name.split(' ').filter(Boolean);
        if (parts.length === 0) return '?';
        if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }, [name]);

    return (
        <div className="relative flex-shrink-0">
            {url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                        src={url}
                        alt={name}
                        width={size}
                        height={size}
                        className="rounded-full object-cover"
                        style={{ width: size, height: size }}
                    />
                ) : (
                    <div
                        className="rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-black"
                        style={{ width: size, height: size, fontSize: size * 0.4 }}
                    >
                        {initials}
                    </div>
                )}
            {online && (
                <span
                    className="absolute bottom-0 right-0 inline-block rounded-full bg-green-500 border-2 border-white"
                    style={{ width: size * 0.28, height: size * 0.28 }}
                />
            )}
        </div>
    );
}

function MessageBubble({
    message,
    mine,
    onDelete,
    t,
}: {
    message: Message;
    mine: boolean;
    onDelete: () => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}) {
    return (
        <div className={`flex group ${mine ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`relative max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm ${
                    mine
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-br-sm'
                        : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm'
                }`}
            >
                {message.isDeleted ? (
                    <span className="italic opacity-70 text-xs">{t('messages.deleted')}</span>
                ) : (
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                )}
                <div
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                        mine ? 'text-white/80' : 'text-gray-400'
                    }`}
                >
                    <span>{fmtTime(message.dateSent)}</span>
                    {mine &&
                        (message.isReadByMe ? (
                            <CheckCheck className="h-3 w-3" aria-label={t('messages.read')} />
                        ) : (
                            <Check className="h-3 w-3" aria-label={t('messages.delivered')} />
                        ))}
                </div>
                {mine && !message.isDeleted && (
                    <button
                        onClick={onDelete}
                        className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center h-6 w-6 rounded-full bg-white border border-gray-100 text-gray-400 hover:text-rose-500 shadow-sm"
                        aria-label={t('messages.deleteConfirm')}
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                )}
            </div>
        </div>
    );
}

function fmtTime(iso: string | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const sameDay =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
    if (sameDay) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const sameYear = d.getFullYear() === now.getFullYear();
    return sameYear
        ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : d.toLocaleDateString();
}