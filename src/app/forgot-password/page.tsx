'use client';

import { useState } from 'react';
import { authApi } from '@/api';
import { Heart, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            setError('Please enter your email address');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const res = await authApi.forgotPassword(email.trim());
            if (res.message) {
                setSent(true);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Something went wrong';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] w-full flex items-center justify-center bg-gradient-to-br from-pink-100 via-rose-50 to-red-100 p-4">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <Heart className="absolute text-pink-200 opacity-30" style={{ top: '10%', left: '5%', width: 48, height: 48 }} />
                <Heart className="absolute text-rose-200 opacity-20" style={{ bottom: '15%', right: '10%', width: 64, height: 64 }} />
            </div>

            <div className="relative w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 shadow-lg shadow-pink-200 mb-4">
                        <Heart className="w-8 h-8 text-white fill-white" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Love</h1>
                </div>

                <div className="bg-white rounded-3xl shadow-xl shadow-pink-100/50 border border-pink-100 p-8">
                    {sent ? (
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mb-4">
                                <CheckCircle className="w-7 h-7 text-emerald-500" />
                            </div>
                            <h2 className="text-xl font-black text-gray-900 mb-2">Check Your Email</h2>
                            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                                If an account with that email exists, we&apos;ve sent a password reset link.
                            </p>
                            <a
                                href="/login"
                                className="inline-flex items-center gap-2 text-pink-500 hover:text-pink-600 font-bold text-sm transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to sign in
                            </a>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6">
                                <h2 className="text-xl font-black text-gray-900">Forgot Password?</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Enter your email and we&apos;ll send you a reset link.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5" htmlFor="email">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            id="email"
                                            type="email"
                                            autoComplete="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all"
                                        />
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
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-sm shadow-lg shadow-pink-200 hover:from-pink-600 hover:to-rose-600 disabled:opacity-60 transition-all"
                                >
                                    {loading ? 'Sending...' : 'Send Reset Link'}
                                </button>

                                <div className="text-center">
                                    <a
                                        href="/login"
                                        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back to sign in
                                    </a>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
