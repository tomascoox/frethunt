'use client';
import React, { useState } from 'react';
import { GameMode, AccidentalMode } from '../types';

interface LayoutProps {
    children: React.ReactNode;
    activeGameMode: GameMode;
    setActiveGameMode: (mode: GameMode) => void;
    showMenu: boolean;
    setShowMenu: (show: boolean) => void;
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
}

export default function Layout({
    children,
    showMenu, setShowMenu,
    showSettings, setShowSettings,
    activeGameMode, setActiveGameMode,
    proMode, setProMode,
    fretCount, setFretCount,
    totalXP, setTotalXP,
    accidentalMode, setAccidentalMode
}: LayoutProps) {

    // Helper to switch mode
    const switchGameMode = (mode: GameMode) => {
        setActiveGameMode(mode);
        setShowMenu(false);
    };

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
                {/* LEFT: HAMBURGER + BRAND */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        style={{
                            background: 'transparent', border: 'none', color: '#f8fafc',
                            fontSize: '1.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center'
                        }}
                    >
                        ☰
                    </button>

                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: '#f8fafc', letterSpacing: '1px', fontStyle: 'italic' }}>
                        Guitar <span style={{ color: '#3b82f6' }}>Tools</span>
                    </h1>
                </div>

                {/* RIGHT: SETTINGS */}
                <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
                    <button
                        onClick={() => setShowSettings(true)}
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

            {/* HAMBURGER MENU DRAWER */}
            {showMenu && (
                <div style={{
                    position: 'fixed', top: '70px', left: 0, width: '280px', bottom: 0,
                    background: '#1e293b', borderRight: '1px solid #334155',
                    zIndex: 1999, padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px',
                    boxShadow: '10px 0 30px rgba(0,0,0,0.5)',
                    animation: 'slideIn 0.2s ease-out'
                }}>
                    {process.env.NODE_ENV === 'development' && (
                        <>
                            <button
                                onClick={() => switchGameMode('chord-designer')}
                                className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-all border ${activeGameMode === 'chord-designer' ? 'bg-rose-500 text-white border-rose-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'}`}
                            >
                                TRIADS
                            </button>

                            <button
                                onClick={() => switchGameMode('string-walker')}
                                className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-all border ${activeGameMode === 'string-walker' ? 'bg-teal-500 text-slate-900 border-teal-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'}`}
                            >
                                STRING WALKER
                            </button>

                            <button
                                onClick={() => switchGameMode('triad-hunt')}
                                className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-all border ${activeGameMode === 'triad-hunt' ? 'bg-violet-500 text-white border-violet-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'}`}
                            >
                                TRIAD HUNT
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => switchGameMode('memory')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-all border ${activeGameMode === 'memory' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'}`}
                    >
                        NOTE HUNT
                    </button>

                    <style>{`@keyframes slideIn { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
                </div>
            )}

            {/* CLICK OUTSIDE TO CLOSE - Simple Overlay */}
            {showMenu && (
                <div
                    onClick={() => setShowMenu(false)}
                    style={{ position: 'fixed', top: '70px', left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1998 }}
                />
            )}

            {/* SETTINGS SIDEBAR (RIGHT DRAWER) */}
            {showSettings && (
                <div style={{
                    position: 'fixed', top: '70px', right: 0, width: '280px', bottom: 0,
                    background: '#1e293b', borderLeft: '1px solid #334155',
                    zIndex: 1999, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px',
                    boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
                    animation: 'slideInRight 0.2s ease-out'
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

                    {/* PRO MODE TOGGLE */}
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
                        <div>
                            <span className={`block font-bold text-sm ${proMode ? 'text-emerald-400' : 'text-slate-300'}`}>PRO MODE</span>
                            <span className="text-[0.65rem] text-slate-500 font-bold block mt-1">UNLOCK ALL FEATURES</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={proMode} onChange={(e) => setProMode(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>

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

                    {/* DANGER ZONE */}
                    <div className="mt-auto pt-4 border-t border-slate-800">
                        <button
                            onClick={() => { if (confirm('Reset all XP and progress?')) { setTotalXP(0); localStorage.setItem('fretboardXP', '0'); setShowSettings(false); } }}
                            className="w-full py-3 rounded-lg bg-red-900/20 text-red-500 text-xs font-bold border border-red-900/50 hover:bg-red-900/40 hover:text-red-400 transition-colors"
                        >
                            RESET PROGRESS
                        </button>
                    </div>

                    <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
                </div>
            )}

            {/* CLICK OUTSIDE FOR SETTINGS */}
            {showSettings && (
                <div
                    onClick={() => setShowSettings(false)}
                    style={{ position: 'fixed', top: '70px', left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1998 }}
                />
            )}

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
