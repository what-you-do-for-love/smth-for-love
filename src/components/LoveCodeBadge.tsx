'use client';

import { useState } from 'react';
import { Copy, Check, KeyRound } from 'lucide-react';

type Props = {
    code: string;
    /** Inline (small pill inside a header) or block (full card). */
    variant?: 'inline' | 'block';
};

export default function LoveCodeBadge({ code, variant = 'block' }: Props) {
    const [copied, setCopied] = useState(false);

    if (!code) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    if (variant === 'inline') {
        return (
            <button
                onClick={handleCopy}
                title="Copy your love code"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-pink-100 hover:bg-pink-50 transition-all shadow-sm"
            >
                <KeyRound className="h-3.5 w-3.5 text-pink-400" />
                <span className="text-xs font-black text-pink-600 tracking-widest">{code}</span>
                {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                ) : (
                    <Copy className="h-3 w-3 text-gray-400" />
                )}
            </button>
        );
    }

    return (
        <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl border border-pink-100 p-4 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow shadow-pink-200 flex-shrink-0">
                <KeyRound className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-0.5">
                    Your Love Code
                </p>
                <p className="text-base font-black text-gray-900 tracking-widest">{code}</p>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                    Share with your partner so they can find you
                </p>
            </div>
            <button
                onClick={handleCopy}
                title="Copy love code"
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-pink-100 text-xs font-bold text-pink-600 hover:bg-pink-50 transition-all shadow-sm"
            >
                {copied ? (
                    <>
                        <Check className="h-3.5 w-3.5 text-green-500" />
                        Copied
                    </>
                ) : (
                    <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                    </>
                )}
            </button>
        </div>
    );
}
