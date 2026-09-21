import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const PUBLIC_ROUTES = new Set<string>([
    '/login',
    '/register',
    '/forgot-password',
]);

// Static asset / file extensions — never redirected
const PUBLIC_FILE_REGEX = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?|ttf|otf|eot)$/;

export function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    // Skip Next.js internals, API routes, and static files
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname === '/favicon.ico' ||
        PUBLIC_FILE_REGEX.test(pathname)
    ) {
        return NextResponse.next();
    }

    const userIdCookie = request.cookies.get('userId');
    const isAuthenticated = !!userIdCookie?.value;

    // Unauthenticated user trying to reach a protected route → /login
    if (!isAuthenticated && !PUBLIC_ROUTES.has(pathname)) {
        const loginUrl = new URL('/login', request.url);
        // Preserve where the user was trying to go, so we can bounce them back after login
        if (pathname !== '/') {
            loginUrl.searchParams.set('redirect', pathname + search);
        }
        return NextResponse.redirect(loginUrl);
    }

    // Authenticated user visiting an auth page (login/register/forgot) → /dashboard
    if (isAuthenticated && PUBLIC_ROUTES.has(pathname)) {
        const dashboardUrl = new URL('/dashboard', request.url);
        return NextResponse.redirect(dashboardUrl);
    }

    // Authenticated user visiting root → /dashboard
    if (isAuthenticated && pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        // Run on everything except Next.js internals and static assets
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    ],
};
