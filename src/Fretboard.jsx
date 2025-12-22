import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import confetti from 'canvas-confetti';
import './Fretboard.css';

// Standard Tuning: E A D G B e
const TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
const FRET_COUNT = 22; // 0 (Open) to 22
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Pre-calculate note map (String Index -> Fret Index -> Note Name)
const BOARD_MAP = [];

const getNoteFromString = (openNote, fret) => {
    const openNoteIndex = NOTES.indexOf(openNote.slice(0, -1));
    return NOTES[(openNoteIndex + fret) % 12];
};

// Generate the board map
TUNING.forEach((openNote, sIndex) => {
    BOARD_MAP[sIndex] = [];
    for (let f = 0; f <= FRET_COUNT; f++) {
        BOARD_MAP[sIndex][f] = getNoteFromString(openNote, f);
    }
});

// Inlay Markers (Standard 3, 5, 7, 9, 12, 15, 17, 19, 21)
const MARKERS = [3, 5, 7, 9, 15, 17, 19, 21]; // 1-indexed frets
const DOUBLE_MARKERS = [12]; // 1-indexed frets

// Helper to get note name (e.g., 'C', 'F#')
const getNoteAt = (stringIndex, fretIndex) => {
    // stringIndex 0 = Low E, stringIndex 5 = High E
    if (!BOARD_MAP[stringIndex] || !BOARD_MAP[stringIndex][fretIndex]) {
        return '';
    }
    return BOARD_MAP[stringIndex][fretIndex];
};

// Helper to get full note with octave (e.g., 'C4', 'F#3')
const getNoteWithOctave = (stringIndex, fretIndex) => {
    const openNote = TUNING[stringIndex];
    const openNoteName = openNote.slice(0, -1);
    const openNoteOctave = parseInt(openNote.slice(-1), 10);

    // Calculate absolute pitch value (semitones from C0)
    const openSemitones = NOTES.indexOf(openNoteName) + (openNoteOctave * 12);
    const targetSemitones = openSemitones + fretIndex;

    const octave = Math.floor(targetSemitones / 12);
    const noteName = NOTES[targetSemitones % 12];

    return `${noteName}${octave}`;
};


export default function Fretboard() {
    const [revealed, setRevealed] = useState({});
    const [isLoaded, setIsLoaded] = useState(false);

    // --- VISUAL PRESSURE PRACTICE STATE ---
    const [practiceActive, setPracticeActive] = useState(false);
    const [studyMode, setStudyMode] = useState(false);
    const [secondsPerNote, setSecondsPerNote] = useState(5.0);
    const [practiceTargetNote, setPracticeTargetNote] = useState('C');
    const [numberOfStrings, setNumberOfStrings] = useState(6); // New: Limit active strings
    const [currentStringIndex, setCurrentStringIndex] = useState(null); // 5 down to 0
    const [feedbackMsg, setFeedbackMsg] = useState('');
    const [timerProgress, setTimerProgress] = useState(0);
    const [gameFeedback, setGameFeedback] = useState({});
    const [score, setScore] = useState(0);
    const [activeGameMode, setActiveGameMode] = useState(null); // null = Explorer, 'string-walker' = The Game

    const switchGameMode = (mode) => {
        if (practiceActive) stopPractice(); // Stop any running game

        // Always reset study mode & board when switching/closing games
        setStudyMode(false);
        setRevealed({});

        if (activeGameMode === mode) {
            setActiveGameMode(null); // Toggle off if clicked again
        } else {
            setActiveGameMode(mode);
        }
    };

    // High Score State (Load from LocalStorage)
    const [highScore, setHighScore] = useState(() => {
        const saved = localStorage.getItem('fretboardHighScore');
        return saved ? parseInt(saved, 10) : 0;
    });

    const synthRef = useRef(null);
    const timerRef = useRef(null);
    const timeoutsRef = useRef({}); // For managing flash timeouts
    const startTimeRef = useRef(0);

    // FX Synths
    const bellSynth = useRef(null);
    const failSynth = useRef(null);
    const isProcessingRef = useRef(false); // Fix: Add missing ref for click lock
    const isDraggingRef = useRef(false); // For drag-to-play support

    // Global MouseUp to stop dragging safely
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            isDraggingRef.current = false;
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    const stringSynths = useRef([]); // Array of 6 Samplers

    // Initialize Synths
    useEffect(() => {
        // OPTIMIZATION: Zero lookahead for instant response
        Tone.context.lookAhead = 0;

        // Tighter Reverb for snappier feel
        const reverb = new Tone.Reverb({ decay: 2.0, preDelay: 0.001, wet: 0.2 }).toDestination();

        const urls = { "E2": "E2.wav", "A2": "A2.wav", "D3": "D3.wav", "G3": "G3.wav", "B3": "B3.wav", "E4": "E4.wav" };
        const baseUrl = "https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples/guitar-acoustic/";

        const samplers = [];
        let loadedCount = 0;

        for (let i = 0; i < 6; i++) {
            const s = new Tone.Sampler({
                urls: urls,
                baseUrl: baseUrl,
                release: 0.2, // Short release for fast damping
                volume: -10,
                maxPolyphony: 1, // Start monophonic (auto-voice-stealing)
                onload: () => {
                    loadedCount++;
                    if (loadedCount === 6) setIsLoaded(true);
                }
            }).connect(reverb);
            samplers.push(s);
        }
        stringSynths.current = samplers;
        // No single synthRef anymore

        // 2. Bell Synth
        const bell = new Tone.Synth({
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 1 }
        }).toDestination();
        bell.volume.value = -5;
        bellSynth.current = bell;

        // 3. Fail Synth
        const fail = new Tone.Synth({
            oscillator: { type: "sawtooth" },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.5 }
        }).toDestination();
        fail.volume.value = -5;
        failSynth.current = fail;

        // Clean up
        return () => {
            samplers.forEach(s => s.dispose());
            reverb.dispose();
            bell.dispose();
            fail.dispose();
        };
    }, []);



    // STUDY MODE LOGIC
    useEffect(() => {
        if (studyMode) {
            // Find all instances of practiceTargetNote (Restrict to first 12 frets)
            // Highlight notes on Strings 0 (Low E) up to (numberOfStrings - 1)
            const newRevealed = {};
            const stopIndex = numberOfStrings - 1; // e.g. 2 strings -> index 1

            for (let s = 0; s <= stopIndex; s++) { // Iterate from Low E (0) upwards
                for (let f = 0; f <= 12; f++) {
                    if (getNoteAt(s, f) === practiceTargetNote) {
                        newRevealed[`${s}-${f}`] = true;
                    }
                }
            }
            setRevealed(newRevealed);
        }
    }, [studyMode, practiceTargetNote, numberOfStrings]); // Re-run if note changes while studying

    const toggleStudyMode = () => {
        if (studyMode) {
            setStudyMode(false);
            setRevealed({});
        } else {
            setStudyMode(true);
        }
    };
    const activeStringNotes = useRef(new Array(6).fill(null)); // Track notes for legato/release logic


    const playNote = async (note, stringIndex) => {
        await Tone.start();
        const sampler = stringSynths.current[stringIndex];
        if (sampler && isLoaded) {
            // 1. Dampen previous string vibration (Legato)
            const previousNote = activeStringNotes.current[stringIndex];
            if (previousNote) {
                sampler.triggerRelease(previousNote, Tone.now());
            }

            // 2. Strike new note (let it ring naturally)
            sampler.triggerAttack(note, Tone.now());

            activeStringNotes.current[stringIndex] = note;
            return;
        }

        if (false && synthRef.current && isLoaded) {
            // 1. Cut off the previous note ON THIS STRING
            const previousNote = activeStringNotes.current[stringIndex];
            if (previousNote) {
                // If the exact same note is ringing on another string (unison), this might cut it too.
                // But it's a necessary compromise for "same string" realism without 6 sampler instances.
                try {
                    synthRef.current.triggerRelease(previousNote, Tone.now());
                } catch (e) {
                    // Ignore release errors (e.g. if note already stopped)
                }
            }

            // 2. Play new note
            synthRef.current.triggerAttackRelease(note, 2, Tone.now());

            // 3. Track it
            activeStringNotes.current[stringIndex] = note;
        }
    };

    const playBell = () => {
        if (bellSynth.current) bellSynth.current.triggerAttackRelease("E6", "8n", Tone.now());
    };

    const playWinMelody = () => {
        const now = Tone.now();
        if (bellSynth.current) {
            bellSynth.current.triggerAttackRelease("C5", "8n", now);
            bellSynth.current.triggerAttackRelease("E5", "8n", now + 0.1);
            bellSynth.current.triggerAttackRelease("G5", "8n", now + 0.2);
            bellSynth.current.triggerAttackRelease("C6", "4n", now + 0.3);
        }
    };

    const playFail = () => {
        if (failSynth.current) {
            failSynth.current.triggerAttackRelease("C4", "4n"); // Shortened duration
            // Slide pitch down dramatically
            failSynth.current.frequency.rampTo("C1", 0.3); // Faster slide
        }
    };

    // --- TIMER LOGIC ---
    const startTimer = () => {
        startTimeRef.current = Date.now();
        if (timerRef.current) cancelAnimationFrame(timerRef.current);

        const loop = () => {
            const now = Date.now();
            const elapsed = now - startTimeRef.current;
            const duration = secondsPerNote * 1000;
            const pct = Math.min((elapsed / duration) * 100, 100);

            setTimerProgress(pct);

            if (pct >= 100) {
                failGame();
            } else {
                timerRef.current = requestAnimationFrame(loop);
            }
        };
        timerRef.current = requestAnimationFrame(loop);
    };

    const failGame = () => {
        if (timerRef.current) cancelAnimationFrame(timerRef.current);
        setFeedbackMsg('GAME OVER! 💀');
        setPracticeActive(false);
        playFail();
        setTimeout(() => stopPractice(), 2000);
    };

    const startPractice = async () => {
        await Tone.start();
        setStudyMode(false); // Disable study mode if active
        setRevealed({});
        setScore(0);
        setPracticeActive(true);
        setFeedbackMsg('');
        setCurrentStringIndex(0); // START ON LOW E (Index 0)
        isProcessingRef.current = false; // Reset lock
        startTimer();
    };

    const stopPractice = () => {
        if (timerRef.current) cancelAnimationFrame(timerRef.current);
        setPracticeActive(false);
        setCurrentStringIndex(null);
        setFeedbackMsg('');
        setRevealed({});
        setTimerProgress(0);
        setGameFeedback({});
        // High Score is handled in handlePracticeClick to avoid closure staleness
    };

    const handlePracticeClick = (stringIndex, fretIndex) => {
        if (!practiceActive || currentStringIndex === null) return;

        // Anti-Double-Click Guard
        if (isProcessingRef.current) return;

        // Strict Mode Check
        if (stringIndex !== currentStringIndex) return;

        // Ignore clicks past fret 12
        if (fretIndex > 12) return;

        const noteName = getNoteAt(stringIndex, fretIndex);

        if (noteName === practiceTargetNote) {
            // LOCK INPUT IMMEDIATELY (Prevent race conditions)
            isProcessingRef.current = true;

            // SUCCESS
            playBell();
            const fullNote = getNoteWithOctave(stringIndex, fretIndex);
            playNote(fullNote, stringIndex); // Pass stringIndex for polyphony logic

            const key = `${stringIndex}-${fretIndex}`;
            setRevealed(prev => ({ ...prev, [key]: true }));

            // Calculate Points (Synchronously)
            const now = Date.now();
            const elapsed = now - startTimeRef.current;
            const duration = secondsPerNote * 1000;
            const safeDuration = duration > 0 ? duration : 1000;
            const actualPct = Math.min((elapsed / safeDuration) * 100, 100);

            const speedBonus = Math.floor((100 - actualPct) * 5);
            const pointsForThisTurn = 100 + Math.max(0, speedBonus);

            // Advance
            const maxIndex = numberOfStrings - 1;

            if (currentStringIndex < maxIndex) {
                // NEXT STRING
                setScore(s => s + pointsForThisTurn); // Just regular update
                setCurrentStringIndex(prev => prev + 1);

                // Unlock after a short buffer to allow state to settle
                setTimeout(() => {
                    isProcessingRef.current = false;
                    startTimer();
                }, 100);

            } else {
                // FINISHED GAME (Last String)
                if (timerRef.current) cancelAnimationFrame(timerRef.current);

                // 1. Reveal Final Note (Ensure it sticks)
                setRevealed(prev => ({ ...prev, [`${stringIndex}-${fretIndex}`]: true }));

                // 2. Celebration (Protected)
                try {
                    playWinMelody();
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 }
                    });
                } catch (err) {
                    console.error("Effect failed:", err);
                }

                // 3. Final Score Calculation & High Score
                // We access the 'current' score via the updater to be safe
                setScore(currentScore => {
                    const finalTotal = currentScore + pointsForThisTurn;
                    setFeedbackMsg(`CLEARED! (+${finalTotal} PTS) 🎉`);

                    // Simple, synchronous read/write to localStorage
                    const existingHigh = parseInt(localStorage.getItem('fretboardHighScore') || '0', 10);
                    if (finalTotal > existingHigh) {
                        setHighScore(finalTotal);
                        localStorage.setItem('fretboardHighScore', finalTotal);
                    }
                    return finalTotal;
                });

                setCurrentStringIndex(null);

                // 4. Reset after delay
                setTimeout(() => stopPractice(), 4000);
            }
        } else {
            // WRONG NOTE
            const key = `${stringIndex}-${fretIndex}`;
            setGameFeedback(prev => ({ ...prev, [key]: 'error' }));
            setTimeout(() => {
                setGameFeedback(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });
            }, 300);
            setScore(s => Math.max(0, s - 50));
        }
    };

    const toggleNote = (stringIndex, fretIndex) => {
        if (practiceActive) {
            handlePracticeClick(stringIndex, fretIndex);
            return;
        }

        // Normal Exploration Mode (and Study interaction)
        const key = `${stringIndex}-${fretIndex}`;
        const fullNote = getNoteWithOctave(stringIndex, fretIndex);
        const isCurrentlyRevealed = !!revealed[key];

        // Always play sound
        playNote(fullNote, stringIndex);

        if (!studyMode) {
            // EXPLORER MODE: "Flash" the note for 1s

            // 1. Clear existing fade timer if user mashes same note
            if (timeoutsRef.current[key]) {
                clearTimeout(timeoutsRef.current[key]);
            }

            // 2. Show the note
            setRevealed(prev => ({ ...prev, [key]: true }));

            // 3. Set timer to hide it
            timeoutsRef.current[key] = setTimeout(() => {
                setRevealed(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });
                delete timeoutsRef.current[key]; // Cleanup ref
            }, 1500);
        }
    };

    const isRevealed = (s, f) => !!revealed[`${s}-${f}`];
    const getFeedback = (s, f) => gameFeedback[`${s}-${f}`];

    // Generate Inlays using Grid positioning
    const renderInlays = () => {
        return [...MARKERS, ...DOUBLE_MARKERS].map(fret => {
            const colIndex = fret + 1; // Fret N = Grid Col N+1

            if (DOUBLE_MARKERS.includes(fret)) {
                return (
                    <div key={`inlay-${fret}`} style={{
                        gridColumn: colIndex,
                        gridRow: '1 / -1',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '68px', // Match new row height (approx 2 * 34px)
                        zIndex: 0,
                        pointerEvents: 'none'
                    }}>
                        <div className="marker double" style={{ position: 'static', transform: 'none', margin: 0 }}></div>
                        <div className="marker double" style={{ position: 'static', transform: 'none', margin: 0 }}></div>
                    </div>
                );
            } else {
                // Ensure we don't render single markers for double marker frets
                if (DOUBLE_MARKERS.includes(fret)) return null;

                return (
                    <div key={`inlay-${fret}`} className="marker single" style={{
                        gridColumn: colIndex,
                        gridRow: '1 / -1',
                        position: 'relative',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        margin: '0 auto',
                        zIndex: 0
                    }}></div>
                );
            }
        });
    };

    // --- RENDER HELPERS ---
    const hideAll = () => setRevealed({});

    return (
        <div className="fretboard-wrapper">

            {/* HIGH SCORE HUD */}
            <div style={{
                position: 'fixed',
                top: '20px',
                right: '25px',
                background: 'rgba(15, 23, 42, 0.8)',
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid #334155',
                backdropFilter: 'blur(5px)',
                zIndex: 100,
                textAlign: 'right'
            }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '1px' }}>HIGH SCORE</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>{highScore}</div>
            </div>

            {/* GAME SELECTION MENU */}
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '30px' }}>
                <button
                    className="btn"
                    style={{
                        backgroundColor: activeGameMode === 'string-walker' ? '#2dd4bf' : '#1e293b',
                        color: activeGameMode === 'string-walker' ? '#0f172a' : '#94a3b8',
                        borderColor: activeGameMode === 'string-walker' ? '#2dd4bf' : '#334155',
                        fontSize: '1.2rem',
                        padding: '12px 24px',
                        letterSpacing: '1px'
                    }}
                    onClick={() => switchGameMode('string-walker')}
                >
                    STRING-WALKER
                </button>
            </div>

            {/* STRING WALKER GAME HUD */}
            {activeGameMode === 'string-walker' && (
                <div className="game-hud" style={{ flexDirection: 'column', gap: '15px', marginBottom: '50px', background: 'rgba(30, 41, 59, 0.5)', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>

                    {/* Game Instructions Header */}
                    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                        <p style={{ margin: '0', color: '#94a3b8', fontSize: '0.9rem' }}>Find the notes under pressure. Select note, set timer and choose number of strings. Engage study-mode if needed.</p>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {/* Controls */}
                        {!practiceActive ? (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <label style={{ color: '#94a3b8', fontWeight: 600 }}>Note:</label>
                                    <select
                                        value={practiceTargetNote}
                                        onChange={(e) => setPracticeTargetNote(e.target.value)}
                                        className="btn"
                                        style={{ padding: '8px', minWidth: '60px' }}
                                    >
                                        {NOTES.map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>

                                <button
                                    className="btn"
                                    onClick={toggleStudyMode}
                                    style={studyMode ? { backgroundColor: '#2dd4bf', color: '#0f172a', borderColor: '#2dd4bf' } : {}}
                                >
                                    {studyMode ? 'STUDYING' : 'STUDY'}
                                </button>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <label style={{ color: '#94a3b8', fontWeight: 600 }}>Timer (s):</label>
                                    <input
                                        type="range"
                                        min="1" max="10" step="1"
                                        value={secondsPerNote}
                                        onChange={(e) => setSecondsPerNote(Number(e.target.value))}
                                        style={{ width: '100px', accentColor: '#2dd4bf' }}
                                    />
                                    <span style={{ color: '#f8fafc', minWidth: '40px' }}>{secondsPerNote}s</span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <label style={{ color: '#94a3b8', fontWeight: 600 }}>Str:</label>
                                    <select
                                        value={numberOfStrings}
                                        onChange={(e) => setNumberOfStrings(Number(e.target.value))}
                                        className="btn"
                                        style={{ padding: '8px' }}
                                    >
                                        {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>

                                <button className="btn" onClick={startPractice} disabled={!isLoaded}>
                                    {isLoaded ? 'START CHALLENGE' : 'Loading...'}
                                </button>

                                {/* Show Last Score if available */}
                                {score > 0 && (
                                    <div style={{ marginLeft: '15px', color: '#f59e0b', fontWeight: 'bold' }}>
                                        LAST ROUND: {score} PTS
                                    </div>
                                )}
                            </>
                        ) : (
                            // ACTIVE STATE
                            <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>SCORE</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{score}</div>
                                </div>

                                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc' }}>
                                    FIND: <span style={{ color: '#2dd4bf' }}>{practiceTargetNote}</span>
                                </div>

                                {/* VISUAL PIE TIMER */}
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    background: `conic-gradient(#ef4444 ${timerProgress}%, #22c55e 0)`,
                                    boxShadow: '0 0 15px rgba(0,0,0,0.5)',
                                    border: '4px solid #1e293b',
                                    transition: 'background 0.1s linear'
                                }}></div>

                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', minWidth: '150px', textAlign: 'center' }}>
                                    {feedbackMsg ||
                                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                                            <span>ACTIVE:</span>
                                            <span style={{ color: '#facc15', fontSize: '1rem' }}>
                                                {/* Convert index 0 (Low E) to String Name */}
                                                {currentStringIndex !== null ? `STRING ${currentStringIndex + 1} (${TUNING[currentStringIndex].slice(0, -1)})` : ''}
                                            </span>
                                        </div>
                                    }
                                </div>

                                {/* Hide GIVE UP button if game is won/cleared */}
                                {!feedbackMsg.includes('CLEARED') && (
                                    <button className="btn" onClick={stopPractice} style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                                        GIVE UP
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="fretboard-scroll-container">

                <div className="fretboard">
                    {/* Inlays (Background) */}
                    {renderInlays()}

                    {/* Nut Line */}
                    <div className="nut-line" style={{ left: '50px' }}></div>

                    {/* Fret Lines */}
                    {Array.from({ length: FRET_COUNT }).map((_, i) => (
                        <div
                            key={`fret-line-${i + 1}`}
                            className="fret-line"
                            style={{
                                gridColumn: i + 2, // Fret 1 is Col 2
                                gridRow: '1 / -1',
                                position: 'relative',
                                justifySelf: 'end',
                                right: '-1px'
                            }}
                        />
                    ))}

                    {/* Strings Visuals */}
                    {/* Strings Visuals */}
                    {TUNING.map((_, sIndex) => {
                        // VISUAL INVERSION: Low E (0) should be at Bottom (Row 6)
                        const visualRow = 6 - sIndex;
                        const isActive = practiceActive && currentStringIndex === sIndex;
                        const isWound = sIndex <= 2; // Low E, A, D are wound (indices 0, 1, 2)

                        // Thickness: Low E (0) should be thickest. High E (5) thinnest.
                        const thickness = 1 + (5 - sIndex) * 0.6;

                        return (
                            <div
                                key={`string-line-${sIndex}`}
                                className="string-line"
                                style={{
                                    gridColumn: '1 / -1',
                                    gridRow: visualRow,
                                    height: `${thickness}px`,

                                    // Use texture for wound strings, unless active (Gold overrides)
                                    // Or blend them? If active, we probably want pure Gold for visibility.
                                    // Let's use Gold if active, else Texture (for wound) or Grey (for plain).
                                    backgroundColor: isActive ? '#facc15' : (isWound ? 'transparent' : '#aa9992'), // Plain strings silvery
                                    backgroundImage: (!isActive && isWound) ? 'url("/string-closeup.webp")' : 'none',
                                    backgroundRepeat: 'repeat-x',
                                    backgroundSize: 'auto 100%',

                                    boxShadow: isActive ? '0 0 10px #facc15' : '0 1px 2px rgba(0,0,0,0.6)',
                                    position: 'relative',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    zIndex: 2,
                                    transition: 'all 0.3s ease'
                                }}
                            />
                        );
                    })}

                    {/* Note Grid */}
                    {TUNING.map((stringData, stringIndex) => {
                        return Array.from({ length: FRET_COUNT + 1 }).map((_, fretIndex) => {
                            const note = getNoteAt(stringIndex, fretIndex);
                            const key = `${stringIndex}-${fretIndex}`;
                            const revealedState = isRevealed(stringIndex, fretIndex);
                            const feedbackState = getFeedback(stringIndex, fretIndex);

                            // VISUAL INVERSION: Map stringIndex 0 to Row 6.
                            const visualRow = 6 - stringIndex;

                            return (
                                <div
                                    key={key}
                                    className="note-cell"
                                    style={{ gridRow: visualRow, gridColumn: fretIndex + 1 }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        isDraggingRef.current = true;
                                        toggleNote(stringIndex, fretIndex);
                                    }}
                                    onMouseEnter={() => {
                                        if (isDraggingRef.current) {
                                            toggleNote(stringIndex, fretIndex);
                                        }
                                    }}
                                >
                                    <div className={`note-circle ${revealedState ? 'revealed' : ''} ${feedbackState || ''}`}>
                                        {note}
                                    </div>
                                </div>
                            );
                        });
                    })}
                </div>

                {/* Fret Numbers Row */}
                <div className="fret-numbers">
                    {Array.from({ length: FRET_COUNT + 1 }).map((_, i) => {
                        const showNumber = MARKERS.includes(i) || DOUBLE_MARKERS.includes(i);
                        return (
                            <div key={`fret-num-${i}`} className="fret-number-cell">
                                {showNumber ? i : ''}
                            </div>
                        );
                    })}
                </div>

            </div>
        </div>
    );
}
