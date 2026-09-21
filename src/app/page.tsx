'use client';

// The proxy redirects `/` → `/dashboard` for signed-in users and `/` → `/login`
// for signed-out users, so this page should rarely render. We keep a tiny
// spinner as a safety net in case the redirect is preempted.
export default function Home() {
    return (
        <div className="min-h-[100dvh] flex items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-pink-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
        </div>
    );
}
