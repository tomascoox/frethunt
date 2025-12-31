'use client'

import { useActionState } from 'react';
import { sendLoginLink } from '@/app/actions';
import Link from 'next/link';

// NOTE: In older React/Next versions, this might be 'useFormState' from 'react-dom'
// But since we are on Next 16+, 'useActionState' from 'react' is the new standard.

export default function LoginPage() {
    const [state, formAction, isPending] = useActionState(sendLoginLink, { message: '', success: false });

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 w-full max-w-sm shadow-2xl">
                <h1 className="text-2xl font-black text-amber-500 mb-6 text-center">FretHunt Login</h1>

                {state.success ? (
                    <div className="bg-green-900/20 border border-green-800 text-green-400 p-4 rounded text-center animate-in fade-in zoom-in duration-300">
                        <p className="font-bold mb-2">Check your email!</p>
                        <p className="text-xs">We sent a Magic Link to you.</p>
                        <Link href="/" className="block mt-4 text-slate-400 hover:text-white text-xs underline">
                            Back to Home
                        </Link>
                    </div>
                ) : (
                    <form action={formAction} className="flex flex-col gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                            <input
                                name="email"
                                type="email"
                                required
                                placeholder="you@example.com"
                                className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:border-amber-500 outline-none transition-colors"
                            />
                        </div>

                        {state.message && !state.success && (
                            <div className="text-red-400 text-xs bg-red-950/20 p-2 rounded">
                                {state.message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isPending}
                            className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-lg shadow-amber-900/20"
                        >
                            {isPending ? 'Sending...' : 'Send Magic Link'}
                        </button>
                    </form>
                )}
            </div>
            <Link href="/" className="mt-8 text-slate-600 hover:text-slate-400 text-xs transition-colors">
                ← Back to FretHunt
            </Link>
        </div>
    );
}
