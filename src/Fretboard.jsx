import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import './Fretboard.css';
import { getNoteAt, getNoteWithOctave, TUNING, MARKERS, DOUBLE_MARKERS, NOTES } from './utils/music';

const FRET_COUNT = 22; // 0 (Open) to 22

export default function Fretboard() {
    const [revealed, setRevealed] = useState({});
    const [isLoaded, setIsLoaded] = useState(false);

    // Game State
    const [gameActive, setGameActive] = useState(false);
    const [targetNote, setTargetNote] = useState(null);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [gameFeedback, setGameFeedback] = useState({}); // { 's-f': 'success' | 'error' }

    const synthRef = useRef(null);

    useEffect(() => {
        // Initialize Sampler
        const sampler = new Tone.Sampler({
            urls: {
                "E2": "E2.wav",
                "A2": "A2.wav",
                "D3": "D3.wav",
                "G3": "G3.wav",
                "B3": "B3.wav",
                "E4": "E4.wav",
            },
            release: 1,
            baseUrl: "https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples/guitar-acoustic/",
            onload: () => {
                setIsLoaded(true);
                console.log("Samples loaded!");
            }
        }).toDestination();

        // Add Reverb
        const reverb = new Tone.Reverb({
            decay: 3,
            preDelay: 0.01,
            wet: 0.3
        }).toDestination();

        sampler.connect(reverb);
        sampler.volume.value = -5;

        synthRef.current = sampler;

        return () => {
            if (synthRef.current) synthRef.current.dispose();
        };
    }, []);

    const playNote = async (note) => {
        await Tone.start(); // Ensure AudioContext is ready
        if (synthRef.current && isLoaded) {
            synthRef.current.triggerAttackRelease(note, "2n");
        }
    };



    // Game Logic
    const generateTarget = useCallback(() => {
        const randomNote = NOTES[Math.floor(Math.random() * NOTES.length)];
        setTargetNote(randomNote);
    }, []);

    const startGame = () => {
        setRevealed({});
        setScore(0);
        setStreak(0);
        setGameActive(true);
        setGameFeedback({});
        generateTarget();
    };

    const stopGame = () => {
        setGameActive(false);
        setTargetNote(null);
        setGameFeedback({});
        setRevealed({});
    };

    const toggleNote = (stringIndex, fretIndex) => {
        const key = `${stringIndex}-${fretIndex}`;
        const noteName = getNoteAt(stringIndex, fretIndex);
        const fullNote = getNoteWithOctave(stringIndex, fretIndex);

        if (gameActive) {
            if (noteName === targetNote) {
                // Correct!
                playNote(fullNote);
                setGameFeedback(prev => ({ ...prev, [key]: 'success' }));
                setScore(s => s + 100 + (streak * 10)); // Bonus for streak
                setStreak(s => s + 1);

                // Show note temporarily
                setRevealed(prev => ({ ...prev, [key]: true }));

                // Next round after brief delay
                setTimeout(() => {
                    setRevealed(prev => {
                        const next = { ...prev };
                        delete next[key];
                        return next;
                    });
                    setGameFeedback(prev => {
                        const next = { ...prev };
                        delete next[key];
                        return next;
                    });
                    generateTarget();
                }, 800);

            } else {
                // Wrong!
                setGameFeedback(prev => ({ ...prev, [key]: 'error' }));
                setStreak(0);
                setScore(s => Math.max(0, s - 50));

                // Clear error feedback after shake
                setTimeout(() => {
                    setGameFeedback(prev => {
                        const next = { ...prev };
                        delete next[key]; // Keep revealed state as is?
                        return next;
                    });
                }, 500);
            }
        } else {
            // Normal Exploration Mode
            // Play sound if revealing
            const isCurrentlyRevealed = !!revealed[key];
            if (!isCurrentlyRevealed) {
                playNote(fullNote);
            }

            setRevealed(prev => {
                const next = { ...prev };
                if (next[key]) {
                    delete next[key];
                } else {
                    next[key] = true;
                }
                return next;
            });
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



    const hideAll = () => setRevealed({});

    return (
        <div className="fretboard-wrapper">

            {gameActive ? (
                <div className="game-hud">
                    <div className="score-board">
                        <div className="score-stats">Score: <span style={{ color: '#fff' }}>{score}</span></div>
                        <div className="score-stats">Streak: <span style={{ color: '#2dd4bf' }}>{streak}x</span></div>
                    </div>
                    <div className="target-note">
                        FIND: <span style={{ color: '#2dd4bf' }}>{targetNote}</span>
                    </div>
                    <button className="btn" onClick={stopGame} style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                        Stop Game
                    </button>
                </div>
            ) : (
                <div className="controls">
                    <button className="btn" onClick={startGame} disabled={!isLoaded} style={!isLoaded ? { opacity: 0.5 } : {}}>
                        {isLoaded ? 'Start "Note Hunter" Game' : 'Loading...'}
                    </button>
                    <button className="btn" onClick={hideAll}>
                        Hide All Notes
                    </button>
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

                    {/* Strings */}
                    {TUNING.map((_, sIndex) => (
                        <div
                            key={`string-line-${sIndex}`}
                            className="string-line"
                            style={{
                                gridColumn: '1 / -1',
                                gridRow: sIndex + 1,
                                height: `${1 + sIndex * 0.6}px`,
                                position: 'relative',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                zIndex: 2
                            }}
                        />
                    ))}

                    {/* Note Grid */}
                    {TUNING.map((stringData, stringIndex) => {
                        return Array.from({ length: FRET_COUNT + 1 }).map((_, fretIndex) => {
                            const note = getNoteAt(stringIndex, fretIndex);
                            const key = `${stringIndex}-${fretIndex}`;
                            const revealedState = isRevealed(stringIndex, fretIndex);
                            const feedbackState = getFeedback(stringIndex, fretIndex);

                            return (
                                <div
                                    key={key}
                                    className="note-cell"
                                    style={{ gridRow: stringIndex + 1, gridColumn: fretIndex + 1 }}
                                    onClick={() => toggleNote(stringIndex, fretIndex)}
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
