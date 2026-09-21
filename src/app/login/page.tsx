'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/api';
import { setCookie, clearAuth } from '@/lib/ultis';
import { Heart, Lock, User, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

function LoginInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectPath = searchParams.get('redirect') || '/dashboard';

    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Defensive: if somehow already logged in, send to redirect target
        const existingId = document.cookie.match(/(?:^|;\s*)userId=([^;]*)/)?.[1];
        if (existingId) {
            router.replace(redirectPath);
        }
    }, [router, redirectPath]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userName.trim() || !password) {
            setError('Please enter username and password');
            return;
        }

        setLoading(true);
        setError('');
        // Clear any stale session before attempting login
        clearAuth();

        try {
            const res = await authApi.login({ userName: userName.trim(), password });

            if (res.success && res.user) {
                setCookie('userId', String(res.user.id), 30);
                setCookie('userName', res.user.userName, 30);
                setCookie('role', res.user.role, 30);
                setCookie('name', res.user.name, 30);
                setCookie('department', res.user.department || '', 30);
                setCookie('isSuperAdmin', String(res.isSuperAdmin || false), 30);
                setCookie('loveCode', res.user.loveCode || '', 30);
                try {
                    localStorage.setItem('token', res.token);
                } catch {}

                toast.success(`Welcome back, ${res.user.name || res.user.userName}!`);
                router.replace(redirectPath);
            } else {
                setError(res.message || 'Login failed');
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Login failed. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] w-full flex items-center justify-center bg-gradient-to-br from-pink-100 via-rose-50 to-red-100 p-4">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <Heart className="absolute text-pink-200 opacity-30" style={{ top: '10%', left: '5%', width: 48, height: 48 }} />
                <Heart className="absolute text-rose-200 opacity-20" style={{ top: '20%', right: '10%', width: 64, height: 64 }} />
                <Heart className="absolute text-red-200 opacity-25" style={{ bottom: '30%', left: '15%', width: 40, height: 40 }} />
                <Heart className="absolute text-pink-200 opacity-20" style={{ bottom: '15%', right: '20%', width: 56, height: 56 }} />
                <Heart className="absolute text-rose-200 opacity-15" style={{ top: '60%', left: '8%', width: 36, height: 36 }} />
                <Heart className="absolute text-red-200 opacity-20" style={{ top: '40%', right: '5%', width: 44, height: 44 }} />
            </div>

            <div className="relative w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 shadow-lg shadow-pink-200 mb-4">
                        <Heart className="w-8 h-8 text-white fill-white" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Love</h1>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Welcome back</p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl shadow-pink-100/50 border border-pink-100 p-8">
                    <h2 className="text-xl font-black text-gray-900 mb-6 text-center">Sign In</h2>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5" htmlFor="username">
                                Username
                            </label>
                            <div className="relative">
                                <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    id="username"
                                    type="text"
                                    autoComplete="username"
                                    placeholder="Enter your username"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5" htmlFor="password">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm font-bold text-red-600">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-sm shadow-lg shadow-pink-200 hover:from-pink-600 hover:to-rose-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 flex items-center justify-between text-sm font-medium">
                        <a href="/forgot-password" className="text-pink-500 hover:text-pink-600 transition-colors">
                            Forgot password?
                        </a>
                        <a href="/register" className="text-pink-500 hover:text-pink-600 transition-colors">
                            Create account
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[100dvh] flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-pink-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        }>
            <LoginInner />
        </Suspense>
    );
}
