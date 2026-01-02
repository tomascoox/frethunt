'use client';

import React, { useState, useEffect } from 'react';
import { saveToolAction, bulkImportToolsAction, deleteAllToolsAction } from '@/app/actions';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { BulkImportModal } from '@/components/BulkImportModal';
import { GameMode, AccidentalMode } from '@/types';

export default function AdminToolsPage() {
    // --- ADMIN STATE ---
    const [dbTools, setDbTools] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);

    // --- LAYOUT STATE (Navbar Integration) ---
    const [activeGameMode, setActiveGameMode] = useState<GameMode>('memory');
    const [showSettings, setShowSettings] = useState(false);
    const [proMode, setProMode] = useState(false);
    const [fretCount, setFretCount] = useState(13);
    const [totalXP, setTotalXP] = useState(0);
    const [accidentalMode, setAccidentalMode] = useState<AccidentalMode>('sharp');

    // AUTH & HYDRATION
    useEffect(() => {
        checkAuth();

        // Hydrate layout settings (optional but nice for consistency)
        if (typeof window !== 'undefined') {
            setProMode(localStorage.getItem('fretboardProMode') === 'true');
            setTotalXP(parseInt(localStorage.getItem('fretboardXP') || '0'));
            setAccidentalMode((localStorage.getItem('fretboardAccidentalMode') as AccidentalMode) || 'sharp');
        }
    }, []);

    async function checkAuth() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email === 'tomas@joox.se') {
            setAuthorized(true);
            fetchDbTools();
        } else {
            window.location.href = '/';
        }
    }

    // --- HELPERS ---
    async function handleDeleteAll() {
        if (!window.confirm('WARNING: THIS WILL DELETE ALL TOOLS PERMANENTLY.\n\nAre you absolutely sure?')) return;

        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return alert("Not authenticated");

        const fd = new FormData();
        fd.append('access_token', token);

        setLoading(true);
        const res = await deleteAllToolsAction(null, fd);
        alert(res.message);
        if (res.success) fetchDbTools();
        setLoading(false);
    }

    async function fetchDbTools() {
        setLoading(true);
        const { data, error } = await supabase
            .from('tools')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) {
            setDbTools(data);
        }
        setLoading(false);
    }

    async function deleteTool(slug: string) {
        if (!confirm(`Are you sure you want to DELETE /${slug}? This cannot be undone.`)) return;

        const { error } = await supabase
            .from('tools')
            .delete()
            .eq('slug', slug);

        if (error) {
            alert('Error deleting: ' + error.message);
        } else {
            fetchDbTools();
        }
    }

    // Loading State (before Layout or inside?) - Inside is better for UX
    if (!authorized) return <div className="h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono">Checking Access...</div>;

    return (
        <Layout
            activeGameMode={activeGameMode}
            setActiveGameMode={setActiveGameMode}
            showSettings={showSettings}
            setShowSettings={setShowSettings}
            proMode={proMode}
            setProMode={(val) => { setProMode(val); if (typeof window !== 'undefined') localStorage.setItem('fretboardProMode', String(val)); }}
            fretCount={fretCount}
            setFretCount={setFretCount}
            totalXP={totalXP}
            setTotalXP={setTotalXP}
            accidentalMode={accidentalMode}
            setAccidentalMode={(val) => { setAccidentalMode(val); if (typeof window !== 'undefined') localStorage.setItem('fretboardAccidentalMode', val); }}
        >
            <div className="w-full text-slate-100 p-8 overflow-y-auto" style={{ height: 'calc(100vh - 70px)' }}> {/* Adjust height for Navbar */}
                <div className="max-w-6xl mx-auto pb-32"> {/* Extra padding bottom for footer/ads */}
                    <header className="mb-8 flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-black text-amber-500 mb-2">My Tools</h1>
                            <p className="text-slate-400">
                                You have <b>{dbTools.length}</b> live landing pages.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleDeleteAll}
                                className="px-4 py-2 bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800 rounded font-bold text-xs tracking-widest transition-all"
                            >
                                ☠️ DELETE ALL
                            </button>
                            <button
                                onClick={() => setShowBulkImport(true)}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold text-sm shadow-lg transition-all flex items-center gap-2"
                            >
                                ⚡ BULK IMPORT
                            </button>
                            <Link href="/" className="px-4 py-2 bg-slate-800 rounded hover:bg-slate-700 font-bold border border-slate-700 text-sm flex items-center">
                                + NEW TOOL
                            </Link>
                        </div>
                    </header>

                    {/* TABLE */}
                    <div className="bg-slate-800 rounded-xl overflow-hidden shadow-2xl border border-slate-700">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold">
                                <tr>
                                    <th className="p-4 w-1/3">Slug / URL</th>
                                    <th className="p-4 w-1/2">Title & Desc</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {loading ? (
                                    <tr><td colSpan={3} className="p-8 text-center text-slate-500">Loading Database...</td></tr>
                                ) : dbTools.length === 0 ? (
                                    <tr><td colSpan={3} className="p-8 text-center text-slate-500">No tools found. Go create one!</td></tr>
                                ) : dbTools.map((tool) => (
                                    <tr key={tool.slug} className="hover:bg-slate-700/50 transition-colors group">
                                        <td className="p-4 align-top">
                                            <Link
                                                href={`/${tool.slug}`}
                                                target="_blank"
                                                className="text-blue-400 hover:text-blue-300 font-mono break-all font-bold flex items-center gap-2 text-sm"
                                            >
                                                /{tool.slug}
                                            </Link>
                                            <div className="text-[10px] text-slate-500 mt-1">
                                                Created: {new Date(tool.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="text-slate-200 font-bold">{tool.title}</div>
                                            <div className="text-slate-400 text-xs mt-1 leading-relaxed max-w-xl">{tool.description}</div>
                                        </td>
                                        <td className="p-4 align-top text-right space-x-3">
                                            <Link
                                                href={`/${tool.slug}?edit=true`}
                                                className="inline-block px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-bold border border-slate-600"
                                                title="Open tool to edit settings"
                                            >
                                                OPEN / EDIT
                                            </Link>
                                            <button
                                                onClick={() => deleteTool(tool.slug)}
                                                className="text-red-400 hover:text-red-300 hover:underline text-xs font-bold"
                                            >
                                                DELETE
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>


            <BulkImportModal
                open={showBulkImport}
                onClose={() => setShowBulkImport(false)}
                onSuccess={fetchDbTools}
            />
        </Layout >
    );
}
