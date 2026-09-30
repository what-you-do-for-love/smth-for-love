'use client';

import Link from 'next/link';

export default function OfflinePage() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-200 mb-4">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="white"
                        className="h-8 w-8"
                    >
                        <path d="M12 21s-7-4.35-7-10a4 4 0 017-2.65A4 4 0 0119 11c0 5.65-7 10-7 10z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-black text-gray-900">Bạn đang ngoại tuyến</h1>
                <p className="text-sm text-gray-500 mt-2">
                    Không có kết nối internet. Vui lòng kiểm tra mạng và thử lại.
                </p>
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold hover:from-pink-600 hover:to-rose-600 transition-all shadow shadow-pink-200"
                >
                    Thử lại
                </Link>
            </div>
        </div>
    );
}
