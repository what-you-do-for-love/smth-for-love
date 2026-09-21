'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/api';
import { getUserId } from '@/lib/ultis';
import { Heart, Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ChangePasswordPage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const [form, setForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const id = getUserId();
        if (!id) {
            router.push('/login');
            return;
        }
        setUserId(id);
    }, [router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!form.currentPassword || !form.newPassword) {
            setError('Current and new password are required');
            return;
        }
        if (form.newPassword !== form.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (form.newPassword.length < 6) {
            setError('New password must be at least 6 characters');
            return;
        }
        if (form.currentPassword === form.newPassword) {
            setError('New password must be different from current');
            return;
        }

        if (!userId) return;
        setLoading(true);

        try {
            const res = await authApi.changePassword({
                userId: parseInt(userId),
                currentPassword: form.currentPassword,
                newPassword: form.newPassword,
            });
            if (res.success) {
                setSuccess(true);
            } else {
                setError(res.message || 'Failed to change password');
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to change password';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    if (!userId) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center">
                <svg className="animate-spin h-6 w-6 text-pink-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] w-full flex items-center justify-center bg-gradient-to-br from-pink-100 via-rose-50 to-red-100 p-4">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <Heart className="absolute text-pink-200 opacity-30" style={{ top: '10%', right: '10%', width: 48, height: 48 }} />
                <Heart className="absolute text-rose-200 opacity-20" style={{ bottom: '15%', left: '5%', width: 64, height: 64 }} />
            </div>

            <div className="relative w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 shadow-lg shadow-pink-200 mb-4">
                        <Heart className="w-8 h-8 text-white fill-white" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Love</h1>
                </div>

                <div className="bg-white rounded-3xl shadow-xl shadow-pink-100/50 border border-pink-100 p-8">
                    {success ? (
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mb-4">
                                <CheckCircle className="w-7 h-7 text-emerald-500" />
                            </div>
                            <h2 className="text-xl font-black text-gray-900 mb-2">Password Changed</h2>
                            <p className="text-sm text-gray-500 mb-6">Your password has been updated successfully.</p>
                            <a
                                href="/dashboard"
                                className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg hover:from-pink-600 hover:to-rose-600 transition-all"
                            >
                                Go to Dashboard
                            </a>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6">
                                <h2 className="text-xl font-black text-gray-900">Change Password</h2>
                                <p className="text-sm text-gray-500 mt-1">Update your password to keep your account secure.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5" htmlFor="currentPassword">
                                        Current Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            id="currentPassword"
                                            name="currentPassword"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            placeholder="Current password"
                                            value={form.currentPassword}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5" htmlFor="newPassword">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            id="newPassword"
                                            name="newPassword"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            placeholder="Min. 6 characters"
                                            value={form.newPassword}
                                            onChange={handleChange}
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

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5" htmlFor="confirmPassword">
                                        Confirm New Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            placeholder="Repeat new password"
                                            value={form.confirmPassword}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all"
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
                                    {loading ? 'Updating...' : 'Update Password'}
                                </button>

                                <div className="text-center">
                                    <a
                                        href="/dashboard"
                                        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back to dashboard
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
