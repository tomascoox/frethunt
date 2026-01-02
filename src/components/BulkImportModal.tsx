'use client';
import { useState, useEffect } from 'react';
import { bulkImportToolsAction } from '@/app/actions';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface BulkImportModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function BulkImportModal({ open, onClose, onSuccess }: BulkImportModalProps) {
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState('');

    useEffect(() => {
        if (open) {
            setMessage('');
            setIsSuccess(false);
            supabase.auth.getSession().then(({ data }: any) => {
                if (data.session) setToken(data.session.access_token);
            });
        }
    }, [open]);

    if (!open) return null;

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const formData = new FormData(e.currentTarget);
        // append token manually if not in form (hidden input handles it usually, but double check)

        try {
            const result = await bulkImportToolsAction(null, formData);
            setMessage(result.message);
            setIsSuccess(result.success);

            if (result.success) {
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 1500);
            }
        } catch (err: any) {
            setMessage("Upload Failed: " + err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg p-8 relative flex flex-col">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white text-xl"
                >
                    ✕
                </button>

                <h2 className="text-2xl font-bold text-white mb-2">
                    Bulk Import Tools
                </h2>
                <p className="text-slate-400 text-sm mb-6">
                    Upload a <code>.json</code> file containing an array of tool objects.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <input type="hidden" name="access_token" value={token} />

                    <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-8 flex flex-col items-center justify-center transition-colors bg-slate-950/50">
                        <input
                            type="file"
                            name="file"
                            accept=".json"
                            required
                            className="block w-full text-sm text-slate-400
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-indigo-600 file:text-white
                                hover:file:bg-indigo-500 cursor-pointer"
                        />
                    </div>

                    {message && (
                        <div className={`p-4 rounded text-sm font-bold text-center ${isSuccess ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                            {message}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded font-bold text-sm text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                            CANCEL
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-6 py-2 rounded font-bold text-sm tracking-wide transition-all ${loading
                                ? 'bg-slate-700 text-slate-400 cursor-wait'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20'
                                }`}
                        >
                            {loading ? 'UPLOADING...' : 'UPLOAD JSON'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
