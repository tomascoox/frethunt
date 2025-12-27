import React from 'react';

export default function Layout({
    children,
    showMenu, setShowMenu,
    showSettings, setShowSettings,
    activeGameMode, setActiveGameMode,
    proMode, setProMode,
    fretCount, setFretCount,
    totalXP, setTotalXP
}) {

    // Helper to switch mode
    const switchGameMode = (mode) => {
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
                        onMouseEnter={e => e.target.style.filter = 'none'}
                        onMouseLeave={e => e.target.style.filter = 'grayscale(100%) opacity(0.5)'}
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

            {/* SETTINGS MODAL */}
            {showSettings && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: '#1e293b', padding: '40px', borderRadius: '20px', border: '1px solid #475569', width: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#fff' }}>GAME SETTINGS</h2>
                            <button onClick={() => setShowSettings(false)} className="btn" style={{ fontSize: '1.5rem', background: 'transparent', border: 'none', color: '#94a3b8' }}>✕</button>
                        </div>

                        {/* PRO MODE TOGGLE */}
                        <div style={{ marginBottom: '20px', padding: '20px', background: proMode ? 'rgba(34, 197, 94, 0.1)' : '#0f172a', borderRadius: '10px', border: proMode ? '1px solid #22c55e' : '1px solid #334155', transition: 'all 0.3s' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: proMode ? '#22c55e' : '#fff' }}>PRO MODE (UNLOCK ALL)</span>
                                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
                                    <input
                                        type="checkbox"
                                        checked={proMode}
                                        onChange={(e) => setProMode(e.target.checked)}
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                    />
                                    <span style={{
                                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                        backgroundColor: proMode ? '#22c55e' : '#ccc', borderRadius: '34px', transition: '.4s'
                                    }}>
                                        <span style={{
                                            position: 'absolute', content: '""', height: '26px', width: '26px', left: '4px', bottom: '4px',
                                            backgroundColor: 'white', borderRadius: '50%', transition: '.4s',
                                            transform: proMode ? 'translateX(26px)' : 'translateX(0)'
                                        }}></span>
                                    </span>
                                </label>
                            </div>
                            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Enable all features including full fretboard access and advanced games.</p>
                        </div>

                        {/* FRET COUNT SLIDER */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: '#fff', marginBottom: '10px' }}>Fret Count: {fretCount}</label>
                            <input
                                type="range"
                                min="12"
                                max="24"
                                value={fretCount}
                                onChange={(e) => setFretCount(parseInt(e.target.value))}
                                style={{ width: '100%', accentColor: '#3b82f6', height: '6px', borderRadius: '3px' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', color: '#64748b', fontSize: '0.8rem' }}>
                                <span>12</span>
                                <span>24</span>
                            </div>
                        </div>

                        {/* DANGER ZONE */}
                        <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #334155' }}>
                            <button
                                className="btn"
                                onClick={() => { if (confirm('Reset all XP and progress?')) { setTotalXP(0); localStorage.setItem('fretboardXP', 0); setShowSettings(false); } }}
                                style={{ width: '100%', backgroundColor: '#ef4444', color: 'white', padding: '12px', fontSize: '0.9rem' }}
                            >
                                RESET PROGRESS (XP: {totalXP})
                            </button>
                        </div>
                    </div>
                </div>
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
                {/* FOOTER TEXT */}
                <div style={{
                    padding: '8px 0',
                    color: '#475569',
                    fontSize: '0.8rem',
                    textAlign: 'center',
                    width: '100%'
                }}>
                    Guitar Tools v1.0 created by Studio Joox AB
                </div>

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
