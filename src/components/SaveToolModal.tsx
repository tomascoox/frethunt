'use client';
import { useState, useEffect } from 'react';
import { saveToolAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface SaveToolModalProps {
    open: boolean;
    onClose: () => void;
    currentSettings: any;
    initialData?: { slug: string; title: string; description: string; content?: string };
}

export function SaveToolModal({ open, onClose, currentSettings, initialData }: SaveToolModalProps) {
    const router = useRouter();
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState('');

    // Reset message & get token when opening
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
        formData.append('gameSettings', JSON.stringify(currentSettings));

        // Call Server Action
        const result = await saveToolAction(null, formData);

        setLoading(false);
        setMessage(result.message);
        setIsSuccess(result.success);

        if (result.success && initialData) {
            setTimeout(() => {
                router.push('/admin/tools');
            }, 1000);
        }
    }

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white text-xl"
                >
                    ✕
                </button>

                <h2 className="text-xl font-bold text-white mb-1">
                    {initialData ? 'Update Tool' : 'Save New Tool'}
                </h2>
                <p className="text-slate-400 text-xs mb-6">
                    {initialData ? 'Modifying existing configuration.' : 'Create a permanent landing page.'}
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input type="hidden" name="access_token" value={token} />
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">URL Slug</label>
                        <input
                            name="slug"
                            required
                            pattern="[a-z0-9-]+"
                            placeholder="e.g. learn-notes-first-position"
                            defaultValue={initialData?.slug}
                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm focus:border-amber-500 outline-none"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Lowercase, numbers, hyphens only.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Page Title (H1)</label>
                        <input
                            name="title"
                            required
                            placeholder="e.g. Master the First Position"
                            defaultValue={initialData?.title}
                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm focus:border-amber-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Meta Description</label>
                        <textarea
                            name="description"
                            required
                            rows={2}
                            placeholder="Brief description for search engines..."
                            defaultValue={initialData?.description}
                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm focus:border-amber-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Page Content (HTML Allowed)</label>
                        <textarea
                            name="content"
                            rows={8}
                            placeholder="<p>Write your article here...</p>"
                            defaultValue={initialData?.content}
                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm focus:border-amber-500 outline-none font-mono"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Rendered below the game. Use HTML tags for formatting.</p>
                    </div>



                    {message && (
                        <div className={`p-3 rounded text-xs font-bold ${isSuccess ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`mt-2 py-3 rounded font-bold text-sm tracking-wide transition-all ${loading
                            ? 'bg-slate-700 text-slate-400 cursor-wait'
                            : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20'
                            }`}
                    >
                        {loading ? 'SAVING...' : (initialData ? 'UPDATE TOOL' : 'PUBLISH PAGE')}
                    </button>
                </form>
            </div>
        </div>
    );
}
