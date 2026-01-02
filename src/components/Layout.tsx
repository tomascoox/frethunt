'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { GameMode, AccidentalMode } from '../types';
import { supabase } from '@/lib/supabase';

interface LayoutProps {
    children: React.ReactNode;
    activeGameMode: GameMode;
    setActiveGameMode: (mode: GameMode) => void;

    showSettings: boolean;
    setShowSettings: (show: boolean) => void;
    proMode: boolean;
    setProMode: (mode: boolean) => void;
    fretCount: number;
    setFretCount: (count: number) => void;
    totalXP: number;
    setTotalXP: (xp: number) => void;
    accidentalMode: AccidentalMode;
    setAccidentalMode: (mode: AccidentalMode) => void;
    pageTitle?: string;
}

export default function Layout({
    children,

    showSettings, setShowSettings,
    activeGameMode, setActiveGameMode,
    proMode, setProMode,
    fretCount, setFretCount,
    totalXP, setTotalXP,
    accidentalMode, setAccidentalMode,
    pageTitle
}: LayoutProps) {

    const [isAdmin, setIsAdmin] = useState(false);

    React.useEffect(() => {
        supabase.auth.getUser().then(({ data }: any) => {
            if (data.user && data.user.email === 'tomas@joox.se') setIsAdmin(true);
        });
    }, []);



    return (
        <>
            {/* GLOBAL NAVBAR */}
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0,
                height: '70px',
                background: 'rgba(15, 23, 42, 0.95)',
                borderBottom: '1px solid #334155',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 20px',
                zIndex: 1000,
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}>
                {/* LEFT: BRAND */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <Link href="/" style={{ textDecoration: 'none' }}>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: '#f8fafc', letterSpacing: '1px', fontStyle: 'italic', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <span>Fret<span style={{ color: '#3b82f6' }}>Hunt</span></span>
                            {pageTitle && (
                                <span className="hidden sm:flex items-center ml-3 text-lg font-normal not-italic text-slate-500">
                                    <span className="mx-2">|</span>
                                    <span className="text-slate-100">{pageTitle}</span>
                                </span>
                            )}
                        </h1>
                    </Link>
                </div>

                {/* RIGHT: SETTINGS */}
                <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
                    <div id="navbar-actions"></div>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        style={{ background: 'transparent', border: 'none', fontSize: '1.8rem', cursor: 'pointer', filter: 'grayscale(100%) opacity(0.5)', transition: 'all 0.2s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.filter = 'none'}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.filter = 'grayscale(100%) opacity(0.5)'}
                        title="Settings"
                    >
                        ⚙️
                    </button>
                </div>
            </div>

            {/* SPACER FOR FIXED NAVBAR */}
            <div style={{ height: '90px' }} />

            {/* SETTINGS SIDEBAR (RIGHT DRAWER) - ALWAYS RENDERED FOR ANIMATION */}
            <div style={{
                position: 'fixed', top: '70px', right: 0, width: '280px', bottom: 0,
                background: '#1e293b', borderLeft: '1px solid #334155',
                zIndex: 3000, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px',
                boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
                transform: showSettings ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)', // Smooth iOS-like ease
                visibility: showSettings ? 'visible' : 'hidden' // Hide from screen readers/tab when closed
            }}>
                <div className="flex justify-between items-center pb-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-slate-100 italic tracking-wider">SETTINGS</h2>
                    <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white text-2xl">×</button>
                </div>

                {/* ACCIDENTALS TOGGLE - GLOBAL */}
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <label className="text-xs font-bold text-slate-400 tracking-widest mb-3 block">ACCIDENTALS</label>
                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                        <button
                            onClick={() => setAccidentalMode('sharp')}
                            className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${accidentalMode === 'sharp'
                                ? 'bg-purple-600 text-white shadow-lg'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            SHARPS ♯
                        </button>
                        <button
                            onClick={() => setAccidentalMode('flat')}
                            className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${accidentalMode === 'flat'
                                ? 'bg-purple-600 text-white shadow-lg'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            FLATS ♭
                        </button>
                    </div>
                </div>

                {/* PRO MODE REMOVED */}

                {/* FRET COUNT SLIDER */}
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <label className="text-xs font-bold text-slate-400 tracking-widest mb-3 block flex justify-between">
                        <span>BOARD SIZE</span>
                        <span className="text-white">{fretCount} FRETS</span>
                    </label>
                    <input
                        type="range"
                        min="12" max="24"
                        value={fretCount}
                        onChange={(e) => setFretCount(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                </div>

                {/* SPACER pushes content up */}
                <div className="mt-auto"></div>

                {/* ADMIN LINK (Only visible to Admin) */}
                {isAdmin && (
                    <div className="pt-4 border-t border-slate-800">
                        <Link href="/admin/tools" className="block w-full text-center py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded transition-colors shadow-lg">
                            URL ADMIN
                        </Link>
                    </div>
                )}
            </div>

            {/* CLICK OUTSIDE FOR SETTINGS (Backdrop Fade) */}
            <div
                onClick={() => setShowSettings(false)}
                style={{
                    position: 'fixed', top: '70px', left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: 1998,
                    opacity: showSettings ? 1 : 0,
                    pointerEvents: showSettings ? 'auto' : 'none',
                    transition: 'opacity 0.3s ease'
                }}
            />

            {/* MAIN CONTENT WRAPPER */}
            <div style={{
                width: '100%',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden', // Let children manage their own scroll (e.g. Fretboard)
                paddingBottom: '120px' // Space for Footer + Ad
            }}>
                {children}
            </div>

            {/* FIXED BOTTOM AD & FOOTER CONTAINER */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: '#0f172a', // Match bg
                borderTop: '1px solid #334155',
                zIndex: 2000, // Top of everything except maybe Modals (which are 2000 too, usually ok)
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end'
            }}>


                {/* ADSENSE UNIT */}
                <div style={{
                    width: '100%',
                    height: 'auto',
                    minHeight: '60px', // Typical mobile banner
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#1e293b' // Dark placeholder background
                }}>
                    {/* <ins className="adsbygoogle"
                         style={{ display: 'block' }}
                         data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                         data-ad-slot="XXXXXXXXXX"
                         data-ad-format="auto"
                         data-full-width-responsive="true"></ins> */}
                    <span style={{ color: '#334155', fontSize: '0.7rem', letterSpacing: '2px' }}>AD SPACE</span>
                </div>
            </div>
        </>
    );
}
