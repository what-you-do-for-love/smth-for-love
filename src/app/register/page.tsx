'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/api';
import { setCookie } from '@/lib/ultis';
import { Heart, Lock, User, Mail, Eye, EyeOff, UserCircle } from 'lucide-react';

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        userName: '',
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!form.userName.trim() || !form.password) {
            setError('Username and password are required');
            return;
        }
        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const res = await authApi.register({
                userName: form.userName.trim(),
                name: form.name.trim(),
                email: form.email.trim(),
                password: form.password,
            });

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

                router.push('/dashboard');
            } else {
                setError(res.message || 'Registration failed');
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] w-full flex items-center justify-center bg-gradient-to-br from-pink-100 via-rose-50 to-red-100 p-4">
            {/* Floating hearts */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <Heart className="absolute text-pink-200 opacity-30" style={{ top: '10%', right: '10%', width: 48, height: 48 }} />
                <Heart className="absolute text-rose-200 opacity-20" style={{ top: '25%', left: '5%', width: 64, height: 64 }} />
                <Heart className="absolute text-red-200 opacity-25" style={{ bottom: '20%', right: '15%', width: 40, height: 40 }} />
                <Heart className="absolute text-pink-200 opacity-20" style={{ bottom: '10%', left: '10%', width: 56, height: 56 }} />
            </div>

            <div className="relative w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 shadow-lg shadow-pink-200 mb-4">
                        <Heart className="w-8 h-8 text-white fill-white" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Love</h1>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Create your account</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-pink-100/50 border border-pink-100 p-8">
                    <h2 className="text-xl font-black text-gray-900 mb-6 text-center">Sign Up</h2>

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            {/* Username */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5" htmlFor="userName">
                                    Username *
                                </label>
                                <div className="relative">
                                    <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        id="userName"
                                        name="userName"
                                        type="text"
                                        autoComplete="username"
                                        placeholder="Username"
                                        value={form.userName}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5" htmlFor="name">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <UserCircle className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        autoComplete="name"
                                        placeholder="Your name"
                                        value={form.name}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5" htmlFor="email">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    value={form.email}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5" htmlFor="password">
                                Password *
                            </label>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    placeholder="Min. 6 characters"
                                    value={form.password}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all"
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

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5" htmlFor="confirmPassword">
                                Confirm Password *
                            </label>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    placeholder="Repeat password"
                                    value={form.confirmPassword}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all"
                                />
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm font-bold text-red-600">
                                {error}
                            </div>
                        )}

                        {/* Submit */}
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
                                    Creating account...
                                </span>
                            ) : 'Create Account'}
                        </button>
                    </form>

                    <div className="mt-5 text-center">
                        <span className="text-sm font-medium text-gray-500">
                            Already have an account?{' '}
                            <a href="/login" className="text-pink-500 hover:text-pink-600 transition-colors font-bold">
                                Sign in
                            </a>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
