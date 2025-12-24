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

/*
  TRIAD SHAPES DEFINITION
  Formats: { s: stringIndex, f: fretIndex }
  String Indices: 0=LowE, 1=A, 2=D, 3=G, 4=B, 5=HighE
*/
const TRIAD_SHAPES = {
    'A-Major': {
        'top': [ // G, B, e (3, 4, 5)
            { name: '1st Inv', notes: [{ s: 3, f: 6 }, { s: 4, f: 5 }, { s: 5, f: 5 }] },  // Pos 1
            { name: '2nd Inv', notes: [{ s: 3, f: 9 }, { s: 4, f: 10 }, { s: 5, f: 9 }] }, // Pos 2
            { name: 'Root Pos', notes: [{ s: 3, f: 14 }, { s: 4, f: 14 }, { s: 5, f: 12 }] } // Pos 3
        ],
        'middle': [ // D, G, B (2, 3, 4)
            { name: 'Root Pos', notes: [{ s: 2, f: 7 }, { s: 3, f: 6 }, { s: 4, f: 5 }] },   // Pos 1
            { name: '1st Inv', notes: [{ s: 2, f: 11 }, { s: 3, f: 9 }, { s: 4, f: 10 }] }, // Pos 2
            { name: '2nd Inv', notes: [{ s: 2, f: 14 }, { s: 3, f: 14 }, { s: 4, f: 14 }] } // Pos 3
        ],
        'bottom': [ // A, D, G (1, 2, 3)
            { name: '2nd Inv', notes: [{ s: 1, f: 7 }, { s: 2, f: 7 }, { s: 3, f: 6 }] },    // Pos 1
            { name: 'Root Pos', notes: [{ s: 1, f: 12 }, { s: 2, f: 11 }, { s: 3, f: 9 }] }, // Pos 2
            { name: '1st Inv', notes: [{ s: 1, f: 16 }, { s: 2, f: 14 }, { s: 3, f: 14 }] }  // Pos 3
        ]
    },
    'F#-Minor': { // F#, A, C#
        'top': [ // G, B, e (3, 4, 5)
            { name: '1st Inv', notes: [{ s: 3, f: 2 }, { s: 4, f: 2 }, { s: 5, f: 2 }] },   // Pos 1
            { name: '2nd Inv', notes: [{ s: 3, f: 6 }, { s: 4, f: 7 }, { s: 5, f: 5 }] },   // Pos 2
            { name: 'Root Pos', notes: [{ s: 3, f: 11 }, { s: 4, f: 10 }, { s: 5, f: 9 }] } // Pos 3
        ],
        'middle': [ // D, G, B (2, 3, 4)
            { name: 'Root Pos', notes: [{ s: 2, f: 4 }, { s: 3, f: 2 }, { s: 4, f: 2 }] },   // Pos 1
            { name: '1st Inv', notes: [{ s: 2, f: 7 }, { s: 3, f: 6 }, { s: 4, f: 7 }] },   // Pos 2
            { name: '2nd Inv', notes: [{ s: 2, f: 11 }, { s: 3, f: 11 }, { s: 4, f: 10 }] } // Pos 3
        ],
        'bottom': [ // A, D, G (1, 2, 3)
            { name: '2nd Inv', notes: [{ s: 1, f: 4 }, { s: 2, f: 4 }, { s: 3, f: 2 }] },    // Pos 1
            { name: 'Root Pos', notes: [{ s: 1, f: 9 }, { s: 2, f: 7 }, { s: 3, f: 6 }] },   // Pos 2
            { name: '1st Inv', notes: [{ s: 1, f: 12 }, { s: 2, f: 11 }, { s: 3, f: 11 }] }  // Pos 3
        ]
    }
};


export default function Fretboard() {
    const [revealed, setRevealed] = useState({});
    const [isLoaded, setIsLoaded] = useState(false);

    // --- VISUAL PRESSURE PRACTICE STATE ---
    const [practiceActive, setPracticeActive] = useState(false);
    const [studyMode, setStudyMode] = useState(false);
    const [secondsPerNote, setSecondsPerNote] = useState(5); // Changed default from 5.0
    const [practiceTargetNote, setPracticeTargetNote] = useState('A'); // Changed default from 'C'
    const [numberOfStrings, setNumberOfStrings] = useState(6); // New: Limit active strings
    const [currentStringIndex, setCurrentStringIndex] = useState(null); // 5 down to 0
    const [feedbackMsg, setFeedbackMsg] = useState('');
    const [timerProgress, setTimerProgress] = useState(0);
    const [gameFeedback, setGameFeedback] = useState({});
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3); // New: Arcade state
    const livesRef = useRef(3); // Ref to avoid stale closures in timer loop
    useEffect(() => { livesRef.current = lives; }, [lives]);

    const [streak, setStreak] = useState(0); // New: Arcade state
    const [highScore, setHighScore] = useState(() => {
        const saved = localStorage.getItem('fretboardHighScore');
        return saved ? parseInt(saved, 10) : 0;
    });
    const [diamonds, setDiamonds] = useState([]); // Flying XP Diamonds
    const xpRef = useRef(null); // Target for diamonds
    const [totalXP, setTotalXP] = useState(() => {
        const saved = localStorage.getItem('fretboardTotalXP');
        return saved ? parseInt(saved, 10) : 0;
    });

    // Persist XP
    useEffect(() => {
        localStorage.setItem('fretboardTotalXP', totalXP);
    }, [totalXP]);
    const [activeGameMode, setActiveGameMode] = useState(null); // null = Explorer, 'string-walker' = The Game

    // MEMORY GAME STATE
    const [memoryGameActive, setMemoryGameActive] = useState(false);
    const [memoryGameOver, setMemoryGameOver] = useState(false);
    const [sessionXP, setSessionXP] = useState(0); // Track XP gained in this session
    const [memoryTarget, setMemoryTarget] = useState(null); // { s, f, note: 'C#' }
    const [memoryAllowedNotes, setMemoryAllowedNotes] = useState(NOTES); // Default all
    const [memoryAllowedStrings, setMemoryAllowedStrings] = useState([0, 1, 2, 3, 4, 5]); // Default all
    const [questionsLeft, setQuestionsLeft] = useState(10); // 10 Questions per round

    // CHORD DESIGNER STATE
    const [designerRoot, setDesignerRoot] = useState('C');
    const [designerType, setDesignerType] = useState('major'); // 'major' | 'minor'
    const [designerStrings, setDesignerStrings] = useState([0, 1, 2, 3, 4, 5]); // All strings active initially

    // PROGRESSION & SETTINGS
    const [proMode, setProMode] = useState(() => localStorage.getItem('fretboardProMode') === 'true');
    const [showSettings, setShowSettings] = useState(false);
    useEffect(() => { localStorage.setItem('fretboardProMode', proMode); }, [proMode]);

    // ENFORCE LOCKS (Anti-Ghost Selection)
    useEffect(() => {
        if (proMode) return; // Free for all

        // 1. Sanitize Strings (Strict Progression)
        setMemoryAllowedStrings(prev => {
            return prev.filter(s => {
                if (s === 1) return totalXP >= 100;  // A requires 100
                if (s === 2) return totalXP >= 300;  // D requires 300
                if (s === 3) return totalXP >= 600;  // G requires 600
                if (s === 4) return totalXP >= 1000; // B requires 1000
                if (s === 5) return totalXP >= 1500; // e requires 1500
                return true; // Low E always allowed
            });
        });

        // 2. Sanitize Notes (Granular Progression)
        setMemoryAllowedNotes(prev => {
            return prev.filter(n => {
                if (n.includes('#')) return totalXP >= 2000;
                // Naturals progression
                if (['D', 'E'].includes(n)) return totalXP >= 150;
                if (['F', 'G'].includes(n)) return totalXP >= 250;
                return true; // A, B, C always allowed
            });
        });

        // 3. Enforce Timer Limits (Time Lord requires 3000)
        if (totalXP < 3000) {
            setSecondsPerNote(s => Math.max(3, s));
        }

    }, [totalXP, proMode]);

    // TRIAD HUNT STATE
    const [triadKey, setTriadKey] = useState('A-Major');
    const [triadSet, setTriadSet] = useState('top');
    const [triadGameMode, setTriadGameMode] = useState('current'); // 'current' or 'all'
    const [triadGameActive, setTriadGameActive] = useState(false);
    const [triadTarget, setTriadTarget] = useState(null); // { key, set, name, notes }
    const [triadTimeLeft, setTriadTimeLeft] = useState(60);

    // Timer Ref specific for Triad Hunt
    const triadTimerRef = useRef(null);

    const startTriadGame = (mode = 'current') => {
        setTriadGameMode(mode);
        setTriadGameActive(true);
        setScore(0);
        setTriadTimeLeft(60);
        setRevealed({});
        nextTriadTarget(mode); // Pass mode to ensure immediate effect

        // Start Timer
        if (triadTimerRef.current) clearInterval(triadTimerRef.current);
        triadTimerRef.current = setInterval(() => {
            setTriadTimeLeft(prev => {
                if (prev <= 1) {
                    stopTriadGame();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const stopTriadGame = () => {
        setTriadGameActive(false);
        if (triadTimerRef.current) clearInterval(triadTimerRef.current);
        // Play Game Over sound?
    };

    const nextTriadTarget = (modeOverride) => {
        const mode = modeOverride || triadGameMode;

        let keys, sets;

        if (mode === 'current') {
            keys = [triadKey];
            sets = [triadSet];
        } else {
            keys = ['A-Major', 'F#-Minor'];
            sets = ['top', 'middle', 'bottom'];
        }

        const shapes = ['Root Pos', '1st Inv', '2nd Inv'];

        const rKey = keys[Math.floor(Math.random() * keys.length)];
        const rSet = sets[Math.floor(Math.random() * sets.length)];
        const rShapeIndex = Math.floor(Math.random() * shapes.length);
        const rShapeName = shapes[rShapeIndex];

        // Note: rShapeName is still needed to find object, but we now rely on array index for "Pos 1, 2, 3"
        // Actually, our sorted array logic means we can just pick index 0, 1, or 2.

        // Let's explicitly pick index 0, 1, or 2
        const rIndex = Math.floor(Math.random() * 3);
        const shapeData = TRIAD_SHAPES[rKey][rSet][rIndex];

        setTriadTarget({
            key: rKey,
            set: rSet,
            name: shapeData.name, // e.g. '1st Inv'
            posLabel: `POS ${rIndex + 1}`, // e.g. 'POS 1'
            notes: shapeData.notes
        });
        setRevealed({}); // Hide notes, user must find them!
    };

    // Check click for Triad Game
    const checkTriadClick = (stringIndex, fretIndex) => {
        if (!triadGameActive || !triadTarget) return;

        // Is this note part of the target?
        const isCorrect = triadTarget.notes.some(n => n.s === stringIndex && n.f === fretIndex);

        if (isCorrect) {
            // Reveal it
            const key = `${stringIndex}-${fretIndex}`;
            if (!revealed[key]) {
                const noteName = getNoteWithOctave(stringIndex, fretIndex);
                playNote(noteName, stringIndex);

                const newRevealed = { ...revealed, [key]: true };
                setRevealed(newRevealed);

                // Check if full triad found (3 notes)
                if (Object.keys(newRevealed).length === 3) {
                    // SUCCESS!
                    setScore(s => s + 1);
                    // Play Win Sound (Arpeggio?)
                    playWinMelody(); // Or just a bell
                    // Delay next target slightly
                    setTimeout(() => {
                        nextTriadTarget();
                    }, 500);
                }
            }
        } else {
            // WRONG NOTE
            playFail();
            // Optional: flash red?
        }
    };

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

    const showTriadByPosition = (index) => {
        setRevealed({});
        const shapes = TRIAD_SHAPES[triadKey][triadSet];
        const shape = shapes[index];

        if (shape) {
            const newRevealed = {};
            shape.notes.forEach(n => {
                newRevealed[`${n.s}-${n.f}`] = true;
            });
            setRevealed(newRevealed);

            // Feedback
            setFeedbackMsg(`${shape.name.toUpperCase()} (POS ${index + 1})`);

            // Play Arpeggio
            const sortedNotes = [...shape.notes].sort((a, b) => a.s - b.s);

            sortedNotes.forEach((n, i) => {
                setTimeout(() => playNote(getNoteWithOctave(n.s, n.f), n.s), i * 200);
            });
        }
    };

    // --- MEMORY GAME LOGIC ---

    const failMemoryGame = () => {
        if (timerRef.current) cancelAnimationFrame(timerRef.current);

        // Deduct Life & Question
        if (livesRef.current > 1) {
            setLives(l => l - 1);
            setStreak(0);
            setFeedbackMsg('TIME UP! ❤️ LOST');
            playFail();

            // Check Round End
            setQuestionsLeft(prev => {
                const next = prev - 1;
                if (next <= 0) {
                    stopMemoryGame(true); // Survived!
                } else {
                    setTimeout(() => nextMemoryTarget(), 1500);
                }
                return next;
            });

        } else {
            // Game Over (Dead)
            setLives(0);
            setQuestionsLeft(q => q - 1);
            setMemoryGameOver(true);
            playFail();
            if (timerRef.current) cancelAnimationFrame(timerRef.current);
        }
    };

    const startMemoryTimer = () => {
        startTimeRef.current = Date.now();
        const duration = secondsPerNote * 1000;

        const loop = () => {
            const now = Date.now();
            const elapsed = now - startTimeRef.current;
            const pct = Math.min((elapsed / duration) * 100, 100);

            setTimerProgress(pct);

            if (pct >= 100) {
                failMemoryGame();
            } else {
                timerRef.current = requestAnimationFrame(loop);
            }
        };

        if (timerRef.current) cancelAnimationFrame(timerRef.current);
        timerRef.current = requestAnimationFrame(loop);
    };

    const startMemoryGame = () => {
        setMemoryGameActive(true);
        setMemoryGameOver(false); // Reset GO state
        setScore(0);
        setSessionXP(0); // Reset Session XP
        setQuestionsLeft(10); // Reset Questions
        setLives(3); // Always reset lives on full new start? Yes.
        setStreak(0);
        setFeedbackMsg('');
        setTimerProgress(0);
        nextMemoryTarget();
    };

    const stopMemoryGame = (finished = false) => {
        if (timerRef.current) cancelAnimationFrame(timerRef.current);

        // Check High Score
        if (score > highScore) {
            setHighScore(score);
        }

        if (finished) {
            setMemoryGameOver(true);
        } else {
            setMemoryGameActive(false);
            setMemoryTarget(null);
            setRevealed({});
            setTimerProgress(0);
        }
    };

    const nextMemoryTarget = () => {
        // Build pool of valid positions based on settings
        const validPositions = [];

        memoryAllowedStrings.forEach(sIndex => {
            if (!TUNING[sIndex]) return;
            for (let f = 0; f <= FRET_COUNT; f++) {
                const note = getNoteAt(sIndex, f);
                if (memoryAllowedNotes.includes(note)) {
                    validPositions.push({ s: sIndex, f: f, note: note });
                }
            }
        });

        if (validPositions.length === 0) {
            setFeedbackMsg("NO NOTES SELECTED!");
            stopMemoryGame();
            return;
        }

        const randomPos = validPositions[Math.floor(Math.random() * validPositions.length)];
        setMemoryTarget(randomPos);
        setRevealed({});

        // Reset Timer
        startMemoryTimer();
    };



    const handleMemoryGuess = (guessedNote, e) => {
        if (!memoryTarget) return;

        if (guessedNote === memoryTarget.note) {
            // Correct!
            // playWinMelody(); Removed in favor of Coin Sound

            // Decrement Questions
            const nextQ = questionsLeft - 1;
            setQuestionsLeft(nextQ);

            // Calculate Score with Streak Multiplier
            setStreak(prevStreak => {
                const newStreak = prevStreak + 1;
                const streakMultiplier = Math.floor(newStreak / 5) + 1;

                // Difficulty / Cheese Logic
                const noteCount = memoryAllowedNotes.length;
                const stringCount = memoryAllowedStrings.length;
                const time = Math.max(secondsPerNote, 1);
                const isCheese = noteCount < 2;

                // NERFED BALANCED FORMULA (Matches Menu)
                const stringFactor = 0.5 + (0.5 * (stringCount / 6));
                const noteFactor = 0.5 + (0.5 * (noteCount / 12));
                // Time Factor: 1s -> 3x, 3s -> 1x, 10s -> 0.3x
                const timeFactor = 3 / Math.max(time, 1);

                let difficultyMult = stringFactor * noteFactor * timeFactor;
                if (isCheese) difficultyMult = -2.0;

                // Base XP = 5 * Streak
                let xpGain = Math.ceil((5 * streakMultiplier) * difficultyMult);
                if (!isCheese && xpGain < 1) xpGain = 1;

                setScore(s => s + 1); // Session Score increases (you got it right)
                setSessionXP(s => s + xpGain); // Track Session XP
                setTotalXP(xp => Math.max(0, xp + xpGain)); // Global XP drains or grows

                // DIAMOND ANIMATION (Juice!) 💎
                if (e && xpGain > 0 && !isCheese) {
                    playCoinSound();
                    const targetRect = xpRef.current?.getBoundingClientRect();
                    if (targetRect) {
                        const startX = e.clientX;
                        const startY = e.clientY;
                        // Target center of XP container
                        const endX = targetRect.left + (targetRect.width / 2);
                        const endY = targetRect.top + (targetRect.height / 2);

                        // Amount based on XP (cap at 5)
                        const count = Math.min(5, Math.max(1, Math.ceil(xpGain / 5))); // 1 diamond per 5 XP
                        const newDiamonds = [];

                        for (let i = 0; i < count; i++) {
                            newDiamonds.push({
                                id: Date.now() + Math.random() + i,
                                type: 'gain',
                                startX, startY, endX, endY,
                                delay: i * 80
                            });
                        }
                        setDiamonds(prev => [...prev, ...newDiamonds]);

                        // Cleanup
                        setTimeout(() => {
                            setDiamonds(prev => prev.filter(d => !newDiamonds.find(nd => nd.id === d.id)));
                        }, 1000 + (count * 80));
                    }
                }

                // HEALING MECHANIC: Every 5 streak = +1 Life (Max 5)
                if (newStreak % 5 === 0) {
                    setLives(l => {
                        if (l < 5) return l + 1;
                        return l;
                    });
                    setFeedbackMsg(`STREAK ${newStreak}! ${xpGain >= 0 ? '+' : ''}${xpGain} XP & ❤️ HEALED!`);
                } else {
                    const sign = xpGain >= 0 ? '+' : '';
                    setFeedbackMsg(streakMultiplier > 1
                        ? `CORRECT! ${sign}${xpGain} XP (Streak x${streakMultiplier})`
                        : `CORRECT! ${sign}${xpGain} XP`
                    );
                }

                return newStreak;
            });

            if (timerRef.current) cancelAnimationFrame(timerRef.current);
            setTimeout(() => {
                setFeedbackMsg('');
                if (nextQ <= 0) {
                    stopMemoryGame(true); // Victory (Round Complete)
                } else {
                    nextMemoryTarget();
                }
            }, 500);
        } else {
            // Wrong
            // playFail(); Removed in favor of Crash Sound
            setStreak(0); // Reset streak

            // Calculate XP Loss
            const noteCount = memoryAllowedNotes.length;
            const stringCount = memoryAllowedStrings.length;
            const time = Math.max(secondsPerNote, 1);
            // Difficulty Factor (Nerfed)
            const stringFactor = 0.5 + (0.5 * (stringCount / 6));
            const noteFactor = 0.5 + (0.5 * (noteCount / 12));
            const timeFactor = 3 / Math.max(time, 1);
            const difficultyMult = stringFactor * noteFactor * timeFactor;

            // Loss = Base (5) * Difficulty.
            const xpLoss = Math.max(1, Math.ceil(5 * difficultyMult));
            setTotalXP(xp => Math.max(0, xp - xpLoss));
            setSessionXP(s => s - xpLoss); // Deduct from Session XP

            // DIAMOND LOSS ANIMATION 💔
            playThunderSound();
            const targetRect = xpRef.current?.getBoundingClientRect();
            if (targetRect) {
                // Start at XP indicator
                const startX = targetRect.left + (targetRect.width / 2);
                const startY = targetRect.top + (targetRect.height / 2);

                const count = Math.min(5, Math.ceil(xpLoss / 5)); // 1 diamond per 5 XP lost
                const lostDiamonds = [];

                for (let i = 0; i < count; i++) {
                    lostDiamonds.push({
                        id: Date.now() + Math.random() + i,
                        type: 'loss',
                        startX, startY,
                        driftX: (Math.random() - 0.5) * 100, // Drift left/right
                        delay: i * 50
                    });
                }
                setDiamonds(prev => [...prev, ...lostDiamonds]);

                setTimeout(() => {
                    setDiamonds(prev => prev.filter(d => !lostDiamonds.find(ld => ld.id === d.id)));
                }, 1000 + (count * 50));
            }

            if (livesRef.current > 1) {
                setLives(l => l - 1);
                setFeedbackMsg(`NOPE! It was ${memoryTarget.note} (-${xpLoss} XP)`);
                if (timerRef.current) cancelAnimationFrame(timerRef.current);

                // Check Round End
                if (nextQ <= 0) {
                    stopMemoryGame(true); // Survived with Lives!
                } else {
                    setTimeout(() => nextMemoryTarget(), 1500);
                }
            } else {
                setLives(0);
                setMemoryGameOver(true); // Trigger Game Over Screen
                playFail();
                if (timerRef.current) cancelAnimationFrame(timerRef.current);
            }
        }
    };



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
            const now = Tone.now();
            // Melodic "Oh No" (Descending)
            failSynth.current.triggerAttackRelease("Eb3", "8n", now);
            failSynth.current.triggerAttackRelease("C3", "8n", now + 0.15);
            failSynth.current.triggerAttackRelease("F#2", "4n", now + 0.3);
        }
    };

    const playCoinSound = () => {
        // Metallic "Coin" sound using FM Synthesis
        const synth = new Tone.PolySynth(Tone.FMSynth, {
            harmonicity: 10, // Sharper
            modulationIndex: 30, // More "bite"
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.5 }, // Longer ring
            modulation: { type: "square" },
            modulationEnvelope: { attack: 0.002, decay: 0.3, sustain: 0, release: 0.2 }
        }).toDestination();

        synth.volume.value = -10;

        const now = Tone.now();
        // Extended "Jackpot" Arpeggio (C7 Major7 -> C8)
        synth.triggerAttackRelease("C7", "32n", now);
        synth.triggerAttackRelease("E7", "32n", now + 0.05);
        synth.triggerAttackRelease("G7", "32n", now + 0.10);
        synth.triggerAttackRelease("B7", "32n", now + 0.15);
        synth.triggerAttackRelease("C8", "16n", now + 0.20); // Top sparkle
    };

    const playThunderSound = () => {
        // "Stumbling/Falling Boxes" effect using MembraneSynth (Kicks/Toms)
        const drum = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 4,
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
        }).toDestination();

        drum.volume.value = -2;

        const now = Tone.now();
        // Chaotic Impact Sequence (Low pitches)
        drum.triggerAttackRelease("D1", "8n", now);        // Thud
        drum.triggerAttackRelease("A0", "8n", now + 0.12); // Clunk
        drum.triggerAttackRelease("C1", "8n", now + 0.28); // Crash

        // Texture (Debris/Dust)
        const noise = new Tone.Noise("pink").start();
        // Dynamic Lowpass filter opening up slightly then closing
        const filter = new Tone.Filter(200, "lowpass").toDestination();
        const gain = new Tone.Gain(0).toDestination();

        noise.connect(filter);
        filter.connect(gain);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

        // Filter movement for "crumble" sound
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.linearRampToValueAtTime(600, now + 0.2);
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.8);

        noise.stop(now + 1.0);
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
        if (activeGameMode === 'memory' && memoryGameActive) return; // Disable fretboard clicking ONLY during active Drill

        if (triadGameActive) {
            checkTriadClick(stringIndex, fretIndex);
            return;
        }

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
        <div className="fretboard-wrapper" style={{ marginTop: '80px' }}>
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
                                <input
                                    type="checkbox"
                                    checked={proMode}
                                    onChange={(e) => setProMode(e.target.checked)}
                                    style={{ transform: 'scale(1.5)', accentColor: '#22c55e' }}
                                />
                            </div>
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                                {proMode ? "All restrictions bypassed." : "Features unlock with XP."}
                            </p>
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

            {/* GLOBAL NAVBAR */}
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0,
                height: '70px',
                background: 'rgba(15, 23, 42, 0.95)',
                borderBottom: '1px solid #334155',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 40px',
                zIndex: 1000,
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}>
                {/* LEFT: BRAND */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #9333ea)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.5rem', boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)' }}>🎸</div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: '#f8fafc', letterSpacing: '1px', fontStyle: 'italic' }}>
                        Magical <span style={{ color: '#3b82f6' }}>Music Tools</span>
                    </h1>
                </div>

                {/* RIGHT: GLOBAL STATS */}
                <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>

                    {/* SETTINGS BTN */}
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

            {/* GAME SELECTION MENU */}
            {/* MAIN NAVIGATION */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px', alignItems: 'center' }}>

                {/* TOOLS ROW */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px', width: '60px', textAlign: 'right' }}>TOOLS:</div>
                    <button
                        className="btn"
                        style={{
                            backgroundColor: activeGameMode === 'chord-designer' ? '#f43f5e' : '#1e293b', // Rose / Red theme
                            color: activeGameMode === 'chord-designer' ? '#fff' : '#94a3b8',
                            borderColor: activeGameMode === 'chord-designer' ? '#f43f5e' : '#334155',
                            fontSize: '1rem', padding: '10px 20px', letterSpacing: '1px'
                        }}
                        onClick={() => switchGameMode('chord-designer')}
                    >
                        CHORD-DESIGNER
                    </button>
                </div>

                {/* GAMES ROW */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px', width: '60px', textAlign: 'right' }}>GAMES:</div>
                    <button
                        className="btn"
                        style={{
                            backgroundColor: activeGameMode === 'string-walker' ? '#2dd4bf' : '#1e293b',
                            color: activeGameMode === 'string-walker' ? '#0f172a' : '#94a3b8',
                            borderColor: activeGameMode === 'string-walker' ? '#2dd4bf' : '#334155',
                            fontSize: '1rem', padding: '10px 20px', letterSpacing: '1px'
                        }}
                        onClick={() => switchGameMode('string-walker')}
                    >
                        STRING-WALKER
                    </button>

                    <button
                        className="btn"
                        style={{
                            backgroundColor: activeGameMode === 'triad-hunt' ? '#8b5cf6' : '#1e293b',
                            color: activeGameMode === 'triad-hunt' ? '#0f172a' : '#94a3b8',
                            borderColor: activeGameMode === 'triad-hunt' ? '#8b5cf6' : '#334155',
                            fontSize: '1rem', padding: '10px 20px', letterSpacing: '1px'
                        }}
                        onClick={() => switchGameMode('triad-hunt')}
                    >
                        TRIAD-HUNT
                    </button>

                    <button
                        className="btn"
                        style={{
                            backgroundColor: activeGameMode === 'memory' ? '#3b82f6' : '#1e293b',
                            color: activeGameMode === 'memory' ? '#0f172a' : '#94a3b8',
                            borderColor: activeGameMode === 'memory' ? '#3b82f6' : '#334155',
                            fontSize: '1rem', padding: '10px 20px', letterSpacing: '1px'
                        }}
                        onClick={() => switchGameMode('memory')}
                    >
                        NOTE-HUNT
                    </button>
                </div>
            </div>

            {/* CHORD DESIGNER HUD */}
            {activeGameMode === 'chord-designer' && (
                <div className="game-hud" style={{ flexDirection: 'column', gap: '15px', marginBottom: '50px', background: 'rgba(30, 41, 59, 0.5)', padding: '20px', borderRadius: '12px', border: '1px solid #f43f5e' }}>

                    {/* ROW 1: ROOT (CIRCLE OF FIFTHS) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>ROOT NOTE</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '5px' }}>
                            {['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'F'].map(note => (
                                <button
                                    key={note}
                                    className="btn"
                                    onClick={() => setDesignerRoot(note)}
                                    style={{
                                        backgroundColor: designerRoot === note ? '#f43f5e' : 'transparent',
                                        color: designerRoot === note ? '#fff' : '#94a3b8',
                                        borderColor: designerRoot === note ? '#f43f5e' : '#475569',
                                        fontSize: '0.9rem', padding: '6px 10px', minWidth: '36px',
                                        boxShadow: designerRoot === note ? '0 0 10px rgba(244, 63, 94, 0.4)' : 'none'
                                    }}
                                >
                                    {note}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap', marginTop: '10px' }}>

                        {/* ROW 2: TYPE */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' }}>
                            <label style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>QUALITY</label>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <button
                                    className="btn"
                                    onClick={() => setDesignerType('major')}
                                    style={{
                                        backgroundColor: designerType === 'major' ? '#f43f5e' : '#1e293b',
                                        color: designerType === 'major' ? '#fff' : '#94a3b8',
                                        borderColor: '#f43f5e',
                                        opacity: designerType === 'major' ? 1 : 0.5
                                    }}
                                >
                                    MAJOR
                                </button>
                                <button
                                    className="btn"
                                    onClick={() => setDesignerType('minor')}
                                    style={{
                                        backgroundColor: designerType === 'minor' ? '#f43f5e' : '#1e293b',
                                        color: designerType === 'minor' ? '#fff' : '#94a3b8',
                                        borderColor: '#f43f5e',
                                        opacity: designerType === 'minor' ? 1 : 0.5
                                    }}
                                >
                                    MINOR
                                </button>
                            </div>
                        </div>

                        {/* ROW 3: STRINGS */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' }}>
                            <label style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>ACTIVE STRINGS</label>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                {/* Reverse order: High E (1) to Low E (6) */}
                                {[5, 4, 3, 2, 1, 0].map((stringIndex) => (
                                    <button
                                        key={stringIndex}
                                        className="btn"
                                        onClick={() => {
                                            setDesignerStrings(prev =>
                                                prev.includes(stringIndex) ? prev.filter(s => s !== stringIndex) : [...prev, stringIndex]
                                            );
                                        }}
                                        style={{
                                            backgroundColor: designerStrings.includes(stringIndex) ? '#f43f5e' : '#1e293b',
                                            color: designerStrings.includes(stringIndex) ? '#fff' : '#94a3b8',
                                            borderColor: designerStrings.includes(stringIndex) ? '#f43f5e' : '#475569',
                                            width: '36px', padding: '6px 0',
                                            opacity: designerStrings.includes(stringIndex) ? 1 : 0.5
                                        }}
                                    >
                                        {/* Label 1 (High E) to 6 (Low E) */}
                                        {6 - stringIndex}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            )}

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

            {/* TRIAD HUNT HUD */}
            {activeGameMode === 'triad-hunt' && (
                <div className="game-hud" style={{ flexDirection: 'column', gap: '15px', marginBottom: '50px', background: 'rgba(30, 41, 59, 0.5)', padding: '20px', borderRadius: '12px', border: '1px solid #8b5cf6' }}>

                    {!triadGameActive ? (
                        <>
                            {/* Header */}
                            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                                <h2 style={{ margin: '0 0 5px 0', color: '#8b5cf6', letterSpacing: '2px' }}>THE LIBRARY</h2>
                                <p style={{ margin: '0', color: '#94a3b8', fontSize: '0.9rem' }}>
                                    Explore the shapes. Select a Key, String Set, and Inversion to reveal the truth.
                                </p>
                            </div>

                            {/* Controls Row */}
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>

                                {/* KEY SELECTOR */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>KEY</label>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        {['A-Major', 'F#-Minor'].map(k => (
                                            <button
                                                key={k}
                                                className="btn"
                                                style={{
                                                    backgroundColor: triadKey === k ? '#8b5cf6' : 'transparent',
                                                    color: triadKey === k ? '#fff' : '#94a3b8',
                                                    borderColor: triadKey === k ? '#8b5cf6' : '#475569',
                                                    fontSize: '0.9rem', padding: '6px 12px'
                                                }}
                                                onClick={() => setTriadKey(k)}
                                            >
                                                {k}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* SET SELECTOR */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>STRING SET</label>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        {['top', 'middle', 'bottom'].map(s => (
                                            <button
                                                key={s}
                                                className="btn"
                                                style={{
                                                    backgroundColor: triadSet === s ? '#8b5cf6' : 'transparent',
                                                    color: triadSet === s ? '#fff' : '#94a3b8',
                                                    borderColor: triadSet === s ? '#8b5cf6' : '#475569',
                                                    textTransform: 'uppercase',
                                                    fontSize: '0.9rem', padding: '6px 12px'
                                                }}
                                                onClick={() => setTriadSet(s)}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                            </div>

                            {/* SHAPE SELECTORS (1, 2, 3) */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px' }}>
                                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                                    {[0, 1, 2].map(i => (
                                        <button
                                            key={i}
                                            className="btn"
                                            style={{
                                                borderColor: '#e2e8f0',
                                                color: '#f8fafc',
                                                fontWeight: 'bold',
                                                width: '60px',
                                                height: '60px',
                                                fontSize: '1.5rem',
                                                backgroundColor: '#1e293b', // Default dark
                                                borderRadius: '50%' // Circular buttons
                                            }}
                                            onClick={() => showTriadByPosition(i)}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>
                                {/* Label for selected shape */}
                                <div style={{ minHeight: '20px', marginTop: '10px', color: '#64748b', fontSize: '0.9rem', fontWeight: '600', letterSpacing: '1px' }}>
                                    {feedbackMsg}
                                </div>
                            </div>

                            {/* Start Game Buttons */}
                            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '20px', borderTop: '1px solid #475569', paddingTop: '20px' }}>
                                <button
                                    className="btn"
                                    onClick={() => startTriadGame('current')}
                                    style={{
                                        backgroundColor: '#8b5cf6',
                                        color: '#0f172a',
                                        fontSize: '1rem',
                                        padding: '12px 20px',
                                        fontWeight: '800',
                                        boxShadow: '0 0 15px rgba(139, 92, 246, 0.3)',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center'
                                    }}
                                >
                                    <span>DRILL SELECTED</span>
                                    <span style={{ fontSize: '0.7em', fontWeight: '400', marginTop: '2px' }}>
                                        {triadKey} • {triadSet.toUpperCase()}
                                    </span>
                                </button>

                                <button
                                    className="btn"
                                    onClick={() => startTriadGame('all')}
                                    style={{
                                        backgroundColor: 'transparent',
                                        color: '#f8fafc',
                                        fontSize: '1rem',
                                        padding: '12px 20px',
                                        fontWeight: '800',
                                        border: '1px solid #475569',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center'
                                    }}
                                >
                                    <span>DRILL EVERYTHING</span>
                                    <span style={{ fontSize: '0.7em', fontWeight: '400', marginTop: '2px', color: '#94a3b8' }}>
                                        Full Fretboard Chaos
                                    </span>
                                </button>
                            </div>
                        </>
                    ) : (
                        /* GAME ACTIVE HUD */
                        <div style={{ textAlign: 'center', color: '#f8fafc' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#94a3b8' }}>SCORE: <span style={{ color: '#f59e0b', fontSize: '2rem' }}>{score}</span></div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: triadTimeLeft < 10 ? '#ef4444' : '#f8fafc' }}>
                                    {triadTimeLeft}s
                                </div>
                            </div>

                            <div style={{ margin: '30px 0', padding: '20px', background: '#1e293b', borderRadius: '12px' }}>
                                <div style={{ fontSize: '1rem', color: '#94a3b8', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>FIND THIS TRIAD</div>

                                <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#8b5cf6', margin: '0', textShadow: '0 0 20px rgba(139, 92, 246, 0.5)', lineHeight: '1' }}>
                                    {triadTarget && triadTarget.key.replace('-', ' ').toUpperCase()}
                                </div>

                                <div style={{ fontSize: '1.5rem', color: '#f8fafc', marginTop: '15px', display: 'flex', justifyContent: 'center', gap: '15px', alignItems: 'center' }}>
                                    <span style={{ color: '#2dd4bf', background: 'rgba(45, 212, 191, 0.1)', padding: '4px 12px', borderRadius: '6px' }}>
                                        {triadTarget && triadTarget.set.toUpperCase()} SET
                                    </span>
                                    {/* Arrow icon? */}
                                    <span style={{ fontSize: '1.2rem', color: '#64748b' }}>➜</span>
                                    <span style={{ fontWeight: 'bold' }}>
                                        {triadTarget && `${triadTarget.posLabel} (${triadTarget.name === 'Root Pos' ? 'ROOT' : triadTarget.name.toUpperCase()})`}
                                    </span>
                                </div>
                            </div>

                            <button
                                className="btn"
                                onClick={stopTriadGame}
                                style={{ borderColor: '#ef4444', color: '#ef4444', marginTop: '10px', fontSize: '0.9rem' }}
                            >
                                GIVE UP
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* MEMORY GAME HUD */}
            {activeGameMode === 'memory' && (
                <div className="game-hud" style={{ flexDirection: 'column', gap: '15px', marginBottom: '50px', background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px', border: '1px solid #3b82f6' }}>

                    {!memoryGameActive ? (
                        <div style={{ width: '100%' }}>
                            {/* HEADER: Title + Local XP */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(59, 130, 246, 0.3)', paddingBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <h2 style={{ margin: 0, color: '#60a5fa', fontSize: '1.5rem', letterSpacing: '1px' }}>NOTE HUNT</h2>
                                </div>

                                {/* LOCAL XP DISPLAY */}
                                <div ref={xpRef} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(15, 23, 42, 0.6)', padding: '6px 15px', borderRadius: '20px', border: '1px solid #3b82f6' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#93c5fd', fontWeight: 700, letterSpacing: '1px', marginRight: '5px' }}>XP</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', textShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}>💎 {totalXP}</div>
                                </div>
                            </div>

                            <div style={{ textAlign: 'center' }}>

                                {/* MULTIPLIER / PENALTY DISPLAY */}
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', alignItems: 'center' }}>
                                    {(() => {
                                        const notesCount = memoryAllowedNotes.length;
                                        const stringsCount = memoryAllowedStrings.length;
                                        const time = Math.max(secondsPerNote, 1);

                                        // Cheese Detection: < 2 Notes (1 note = answer is obvious)
                                        const isCheese = notesCount < 2;

                                        // NERFED BALANCED FORMULA
                                        const stringFactor = 0.5 + (0.5 * (stringsCount / 6));
                                        const noteFactor = 0.5 + (0.5 * (notesCount / 12));
                                        // Time Factor: 1s -> 3x, 3s -> 1x, 10s -> 0.3x
                                        const timeFactor = 3 / Math.max(time, 1);

                                        let xpVal = Math.max(1, Math.ceil(5 * stringFactor * noteFactor * timeFactor));
                                        if (isCheese) xpVal = -10;

                                        return (
                                            <div style={{
                                                background: isCheese ? 'rgba(239, 68, 68, 0.2)' : '#1e293b',
                                                padding: '8px 20px', borderRadius: '20px',
                                                border: `1px solid ${isCheese ? '#ef4444' : xpVal < 3 ? '#f59e0b' : '#3b82f6'}`,
                                                color: isCheese ? '#ef4444' : xpVal < 3 ? '#f59e0b' : '#3b82f6',
                                                fontWeight: 'bold',
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                boxShadow: isCheese ? '0 0 15px rgba(239, 68, 68, 0.3)' : 'none'
                                            }}>
                                                <span style={{ fontSize: '1.2rem' }}>{isCheese ? '⛈️' : xpVal < 3 ? '🌱' : '⚡'}</span>
                                                <span>
                                                    {isCheese ? 'XP DRAIN (-10 XP per answer)' : `+${xpVal} XP per correct answer`}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </div>

                                <p style={{ color: '#cbd5e1', marginBottom: '20px' }}>Identify the highlighted note. Configure your drill below.</p>

                                {/* SETTINGS CONTAINER */}
                                <div style={{ display: 'flex', flexDirection: 'row', gap: '50px', marginBottom: '25px', justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap', width: '100%' }}>

                                    {/* TIMER SETTING */}
                                    <div style={{ flex: '0 0 auto', width: 'fit-content', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px' }}>Timer (Sec)</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 1 }}>
                                            <input
                                                type="range"
                                                min={(!proMode && totalXP < 3000) ? 3 : 1}
                                                max="10" step="1"
                                                value={Math.max((!proMode && totalXP < 3000) ? 3 : 1, secondsPerNote)}
                                                onChange={(e) => setSecondsPerNote(Number(e.target.value))}
                                                style={{ width: '100px', accentColor: '#3b82f6' }}
                                            />
                                            <span style={{ color: '#f8fafc', fontWeight: 'bold', minWidth: '30px' }}>{secondsPerNote}s</span>
                                        </div>
                                        {!proMode && totalXP < 3000 && (
                                            <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span>🔒</span> <span>1s unlocked at 3000 XP</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* STRING SELECTION */}
                                    <div style={{ flex: '0 0 auto', width: 'fit-content' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Active Strings</div>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <button className="btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => setMemoryAllowedStrings([0, 1, 2, 3, 4, 5])}>ALL</button>
                                                <button className="btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => setMemoryAllowedStrings([])}>OFF</button>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-start' }}>
                                            {['Low E', 'A', 'D', 'G', 'B', 'High E'].map((label, idx) => {
                                                // Map visual label to logical index (Low E is 0 in our data)
                                                const isActive = memoryAllowedStrings.includes(idx);

                                                // PROGRESSION LOCK LOGIC
                                                let locked = false;
                                                let reqXP = 0;
                                                if (!proMode) {
                                                    if (idx === 1) { locked = totalXP < 100; reqXP = 100; }
                                                    if (idx === 2) { locked = totalXP < 300; reqXP = 300; }
                                                    if (idx === 3) { locked = totalXP < 600; reqXP = 600; }
                                                    if (idx === 4) { locked = totalXP < 1000; reqXP = 1000; }
                                                    if (idx === 5) { locked = totalXP < 1500; reqXP = 1500; }
                                                }

                                                return (
                                                    <button
                                                        key={idx}
                                                        className="btn"
                                                        disabled={locked}
                                                        onClick={() => {
                                                            if (locked) return;
                                                            setMemoryAllowedStrings(prev =>
                                                                prev.includes(idx) ? prev.filter(s => s !== idx) : [...prev, idx]
                                                            );
                                                        }}
                                                        style={{
                                                            padding: '6px 10px',
                                                            fontSize: '0.8rem',
                                                            whiteSpace: 'nowrap',
                                                            backgroundColor: locked ? '#1e293b' : (isActive ? '#facc15' : '#334155'),
                                                            color: locked ? '#475569' : (isActive ? '#0f172a' : '#94a3b8'),
                                                            borderColor: locked ? '#334155' : (isActive ? '#facc15' : '#475569'),
                                                            opacity: locked ? 0.5 : (isActive ? 1 : 0.8),
                                                            cursor: locked ? 'not-allowed' : 'pointer',
                                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                            minWidth: '50px'
                                                        }}
                                                    >
                                                        {locked ? (
                                                            <>
                                                                <span>🔒</span>
                                                                <span style={{ fontSize: '0.55rem', marginTop: '2px' }}>{reqXP} XP</span>
                                                            </>
                                                        ) : label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {memoryAllowedStrings.length === 0 && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>Select at least one string!</div>}
                                    </div>

                                    {/* NOTE SELECTION */}
                                    <div style={{ flex: '1 0 auto', maxWidth: '600px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Active Notes</div>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <button className="btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => setMemoryAllowedNotes(NOTES)}>ALL</button>
                                                <button className="btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => setMemoryAllowedNotes(['A', 'B', 'C', 'D', 'E', 'F', 'G'])}>NATURALS</button>
                                                <button className="btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => setMemoryAllowedNotes([])}>OFF</button>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '5px' }}>
                                            {['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'].map(note => {
                                                const isActive = memoryAllowedNotes.includes(note);

                                                // LOCK LOGIC
                                                let locked = false;
                                                let reqXP = 0;

                                                if (!proMode) {
                                                    if (note.includes('#')) {
                                                        locked = totalXP < 2000;
                                                        reqXP = 2000;
                                                    } else if (['D', 'E'].includes(note)) {
                                                        locked = totalXP < 150;
                                                        reqXP = 150;
                                                    } else if (['F', 'G'].includes(note)) {
                                                        locked = totalXP < 250;
                                                        reqXP = 250;
                                                    }
                                                }

                                                return (
                                                    <button
                                                        key={note}
                                                        disabled={locked}
                                                        onClick={() => {
                                                            if (locked) return;
                                                            setMemoryAllowedNotes(prev =>
                                                                prev.includes(note) ? prev.filter(n => n !== note) : [...prev, note]
                                                            );
                                                        }}
                                                        style={{
                                                            minWidth: '40px', height: '40px', flexShrink: 0,
                                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                            borderRadius: '6px',
                                                            backgroundColor: locked ? '#1e293b' : (isActive ? '#60a5fa' : '#334155'),
                                                            color: locked ? '#475569' : (isActive ? '#fff' : '#94a3b8'),
                                                            border: locked ? '1px dashed #334155' : 'none',
                                                            cursor: locked ? 'not-allowed' : 'pointer',
                                                            fontWeight: 'bold',
                                                            fontSize: '0.9rem',
                                                            position: 'relative'
                                                        }}
                                                    >
                                                        {locked ? (
                                                            <>
                                                                <span style={{ fontSize: '0.8rem' }}>🔒</span>
                                                                <span style={{ fontSize: '0.45rem', marginTop: '1px' }}>{reqXP}</span>
                                                            </>
                                                        ) : note}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {memoryAllowedNotes.length === 0 && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>Select at least one note!</div>}
                                    </div>
                                </div>

                                <button
                                    className="btn"
                                    onClick={startMemoryGame}
                                    disabled={memoryAllowedStrings.length === 0 || memoryAllowedNotes.length === 0}
                                    style={{
                                        backgroundColor: '#3b82f6',
                                        color: '#fff',
                                        fontWeight: 'bold',
                                        fontSize: '1.2rem',
                                        padding: '10px 30px',
                                        opacity: (memoryAllowedStrings.length === 0 || memoryAllowedNotes.length === 0) ? 0.5 : 1,
                                        cursor: (memoryAllowedStrings.length === 0 || memoryAllowedNotes.length === 0) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    START HUNT
                                </button>
                            </div>
                        </div>
                    ) : (
                        memoryGameOver ? (
                            <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(5px)', borderRadius: '20px' }}>
                                <div style={{
                                    textAlign: 'center', padding: '40px', background: '#0f172a', borderRadius: '20px',
                                    border: `2px solid ${lives > 0 ? '#22c55e' : '#ef4444'}`,
                                    boxShadow: lives > 0 ? '0 0 50px rgba(34, 197, 94, 0.4)' : '0 0 50px rgba(239, 68, 68, 0.4)',
                                    animation: 'scaleIn 0.3s ease-out'
                                }}>
                                    <style>{`@keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
                                    <h1 style={{
                                        fontSize: '3.5rem', margin: '0 0 10px',
                                        color: lives > 0 ? '#22c55e' : '#ef4444',
                                        textShadow: lives > 0 ? '0 0 30px rgba(34, 197, 94, 0.6)' : '0 0 30px rgba(239, 68, 68, 0.6)',
                                        letterSpacing: '4px'
                                    }}>
                                        {lives > 0 ? 'VICTORY' : 'GAME OVER'}
                                    </h1>

                                    <div style={{ fontSize: '5rem', marginBottom: '10px' }}>{lives > 0 ? '🎉' : '💀'}</div>

                                    <div style={{ fontSize: '1.5rem', marginBottom: '40px', color: '#94a3b8', letterSpacing: '2px', fontWeight: '300' }}>
                                        SESSION XP: <span style={{ color: '#c084fc', fontWeight: '800', fontSize: '2.5rem', textShadow: '0 0 20px rgba(192, 132, 252, 0.4)' }}>{sessionXP >= 0 ? '+' : ''}{sessionXP}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                                        <button
                                            className="btn"
                                            onClick={startMemoryGame}
                                            style={{ backgroundColor: '#22c55e', color: '#fff', fontSize: '1.2rem', padding: '15px 40px', fontWeight: 'bold' }}
                                        >
                                            TRY AGAIN 🔄
                                        </button>
                                        <button
                                            className="btn"
                                            onClick={() => stopMemoryGame(false)}
                                            style={{ backgroundColor: '#475569', color: '#fff', fontSize: '1.2rem', padding: '15px 40px', fontWeight: 'bold' }}
                                        >
                                            MENU 🏠
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', width: '100%' }}>

                                {/* LIVES & STREAK */}
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px', marginBottom: '20px' }}>
                                    {/* Lives */}
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        {[...Array(5)].map((_, i) => (
                                            <span key={i} style={{ fontSize: '1.5rem', filter: i < lives ? 'none' : 'grayscale(100%) opacity(0.2)', transition: 'all 0.3s' }}>❤️</span>
                                        ))}
                                    </div>
                                    {/* Streak */}
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: streak >= 5 ? '#f59e0b' : '#64748b', textShadow: streak >= 10 ? '0 0 10px rgba(245, 158, 11, 0.5)' : 'none', transition: 'all 0.3s' }}>
                                        {streak >= 5 ? `🔥 x${Math.floor(streak / 5) + 1}` : `Streak: ${streak}`}
                                    </div>
                                </div>

                                {/* PIE TIMER & SCORE */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px', marginBottom: '20px' }}>
                                    {/* SESSION XP (Animation Target) */}
                                    <div ref={xpRef} style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.8rem', color: '#93c5fd', fontWeight: 600 }}>SESSION XP</div>
                                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#facc15', textShadow: '0 0 15px rgba(250, 204, 21, 0.4)' }}>{sessionXP >= 0 ? '+' : ''}{sessionXP}</div>
                                    </div>

                                    {/* PIE TIMER */}
                                    {/* PIE TIMER + Q COUNT */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                        <div style={{
                                            width: '70px',
                                            height: '70px',
                                            borderRadius: '50%',
                                            background: `conic-gradient(#ef4444 ${timerProgress}%, #3b82f6 0)`,
                                            position: 'relative',
                                            boxShadow: '0 0 15px rgba(59, 130, 246, 0.3)'
                                        }}>
                                            <div style={{
                                                position: 'absolute',
                                                top: '6px', left: '6px', right: '6px', bottom: '6px',
                                                background: '#1e293b',
                                                borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: '800',
                                                fontSize: '1.2rem',
                                                color: '#f8fafc'
                                            }}>
                                                {Math.ceil((100 - timerProgress) / 100 * secondsPerNote)}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold' }}>
                                            {questionsLeft} LEFT
                                        </div>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'center', color: '#93c5fd', minHeight: '1.5em', marginBottom: '20px', fontSize: '1.1rem', fontWeight: 'bold' }}>{feedbackMsg}</div>

                                {/* NOTE BUTTONS */}
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', margin: '0 auto' }}>
                                    {['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'].map(n => (
                                        <button
                                            key={n}
                                            className="btn"
                                            onClick={(e) => handleMemoryGuess(n, e)}
                                            style={{
                                                minWidth: '45px',
                                                height: '45px',
                                                fontSize: '1rem',
                                                fontWeight: 'bold',
                                                backgroundColor: '#1e293b',
                                                color: '#f8fafc',
                                                border: '1px solid #475569',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                            }}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    className="btn"
                                    onClick={stopMemoryGame}
                                    style={{ marginTop: '20px', borderColor: '#ef4444', color: '#ef4444' }}
                                >
                                    STOP GAME
                                </button>
                            </div>
                        )
                    )}
                </div>
            )}

            <div className="fretboard-scroll-container">
                <div className="fretboard">
                    {/* Inlays (Background) */}
                    {renderInlays()}

                    {/* Nut Line */}
                    <div className="nut-line" style={{ left: '50px', zIndex: 5 }}></div>

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
                                    zIndex: 10,
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

                            // MEMORY TARGET CHECK
                            const isMemoryTarget = memoryGameActive && memoryTarget && memoryTarget.s === stringIndex && memoryTarget.f === fretIndex;

                            // MENU PREVIEW
                            const isMenuPreview = activeGameMode === 'memory' && !memoryGameActive &&
                                memoryAllowedStrings.includes(stringIndex) &&
                                memoryAllowedNotes.includes(note);

                            // CHORD DESIGNER LOGIC
                            let isDesignerNote = false;
                            let designerColor = null; // Default
                            let designerLabel = null; // R, 3, 5

                            if (activeGameMode === 'chord-designer' && designerStrings.includes(stringIndex)) {
                                const rootIdx = NOTES.indexOf(designerRoot);
                                const thirdInterval = designerType === 'major' ? 4 : 3;
                                const fifthInterval = 7;

                                const targetNotes = [
                                    NOTES[rootIdx],
                                    NOTES[(rootIdx + thirdInterval) % 12],
                                    NOTES[(rootIdx + fifthInterval) % 12]
                                ];

                                if (targetNotes.includes(note)) {
                                    // ZONE DOMINANCE HUNTER
                                    // 1. Find GlobalBest in +/- 4 window.
                                    // 2. If GlobalBest is a "Perfect Shape" (uses all active strings) and I am "Partial" -> I hide.
                                    // 3. Otherwise, use Overlap logic (if we share notes and Global is better -> I hide).

                                    const sortedStrings = [...designerStrings].sort((a, b) => a - b);

                                    // Helper: Gather candidates
                                    const gatherCandidates = (centerFret) => {
                                        const candsPerStr = [];
                                        const minF = Math.max(0, centerFret - 6);
                                        const maxF = Math.min(FRET_COUNT, centerFret + 6);

                                        for (let s of sortedStrings) {
                                            const cands = [];
                                            for (let f = minF; f <= maxF; f++) {
                                                const n = getNoteAt(s, f);
                                                if (targetNotes.includes(n)) {
                                                    cands.push({ s, f, note: n });
                                                }
                                            }
                                            candsPerStr.push({ s, cands });
                                        }
                                        return candsPerStr;
                                    };

                                    // Helper: Find Best Shape
                                    const findBestShape = (candsPerStr, forcedNote = null) => {
                                        const validShapes = [];

                                        const search = (depth, currentShape) => {
                                            if (depth === candsPerStr.length) {
                                                if (currentShape.length === 0) return;

                                                if (forcedNote) {
                                                    const hasMe = currentShape.some(d => d.s === forcedNote.s && d.f === forcedNote.f);
                                                    if (!hasMe) return;
                                                }

                                                const uniqueNotes = new Set(currentShape.map(d => d.note));
                                                if (!targetNotes.every(t => uniqueNotes.has(t))) return;

                                                const frets = currentShape.map(d => d.f);
                                                const span = Math.max(...frets) - Math.min(...frets);
                                                if (span > 3) return;

                                                validShapes.push({
                                                    shape: currentShape,
                                                    count: currentShape.length,
                                                    span: span,
                                                    bassString: Math.min(...currentShape.map(d => d.s)),
                                                    bassFret: Math.min(...currentShape.map(d => d.f))
                                                });
                                                return;
                                            }

                                            const { cands } = candsPerStr[depth];
                                            for (let cand of cands) {
                                                if (currentShape.length > 0) {
                                                    const currentFrets = [...currentShape.map(d => d.f), cand.f];
                                                    if ((Math.max(...currentFrets) - Math.min(...currentFrets)) > 3) continue;
                                                }
                                                search(depth + 1, [...currentShape, cand]);
                                            }
                                            search(depth + 1, currentShape);
                                        };

                                        search(0, []);

                                        if (validShapes.length === 0) return null;

                                        validShapes.sort((a, b) => {
                                            if (b.count !== a.count) return b.count - a.count;
                                            if (a.span !== b.span) return a.span - b.span;
                                            if (a.bassString !== b.bassString) return a.bassString - b.bassString;
                                            return a.bassFret - b.bassFret;
                                        });

                                        return validShapes[0];
                                    };

                                    // 1. Gather Context
                                    const neighbors = gatherCandidates(fretIndex);

                                    // 2. Find MY Best Shape
                                    const myBestEntry = findBestShape(neighbors, { s: stringIndex, f: fretIndex });

                                    if (myBestEntry) {
                                        // 3. Find GLOBAL Best Shape
                                        const globalBestEntry = findBestShape(neighbors, null);

                                        let iAmValid = true;

                                        if (globalBestEntry) {
                                            const activeStringCount = designerStrings.length;
                                            const globalIsPerfect = globalBestEntry.count === activeStringCount;
                                            const myIsPartial = myBestEntry.count < activeStringCount;

                                            // ZONE DOMINANCE REPLACED BY STRICT OVERLAP:
                                            if (false) {
                                                // Legacy block removed
                                            }
                                            // Standard Dominance Logic:
                                            {
                                                // Standard Overlap/Quality Check
                                                const globalBetter = (globalBestEntry.count > myBestEntry.count) ||
                                                    (globalBestEntry.count === myBestEntry.count && globalBestEntry.span < myBestEntry.span) ||
                                                    (globalBestEntry.count === myBestEntry.count && globalBestEntry.span === myBestEntry.span && globalBestEntry.bassString < myBestEntry.bassString);

                                                if (globalBetter) {
                                                    const shareNotes = myBestEntry.shape.some(myD =>
                                                        globalBestEntry.shape.some(gD => gD.s === myD.s && gD.f === myD.f)
                                                    );
                                                    if (shareNotes) {
                                                        iAmValid = false;
                                                    }
                                                }
                                            }
                                        }

                                        if (iAmValid) {
                                            isDesignerNote = true;
                                            let shapeBassInterval = '1';
                                            const finalShape = myBestEntry.shape;

                                            // Label
                                            if (note === targetNotes[0]) designerLabel = '1';
                                            else if (note === targetNotes[1]) designerLabel = designerType === 'major' ? '3' : 'b3';
                                            else designerLabel = '5';

                                            // Bass Logic
                                            let lowestString = 999;
                                            let lowestFret = 999;
                                            let bestBassCandidate = null;

                                            finalShape.forEach(d => {
                                                // Helper: Check if d.s is "Lower" (Thicker) -> Since 0=Low, Min is Thicker.
                                                if (d.s < lowestString) {
                                                    lowestString = d.s;
                                                    lowestFret = d.f;
                                                    bestBassCandidate = d.note;
                                                } else if (d.s === lowestString) {
                                                    if (d.f < lowestFret) {
                                                        lowestFret = d.f;
                                                        bestBassCandidate = d.note;
                                                    }
                                                }
                                            });

                                            if (bestBassCandidate) {
                                                if (bestBassCandidate === targetNotes[0]) shapeBassInterval = '1';
                                                else if (bestBassCandidate === targetNotes[1]) shapeBassInterval = '3';
                                                else shapeBassInterval = '5';
                                            }

                                            const shapeColors = {
                                                '1': '#f43f5e',
                                                '3': '#3b82f6',
                                                '5': '#eab308'
                                            };
                                            designerColor = shapeColors[shapeBassInterval];
                                        }
                                    }
                                }
                            }

                            const isVisible = revealedState || isMenuPreview || isDesignerNote;

                            return (
                                <React.Fragment key={key}>
                                    {/* LAYER 1: NOTE CELL (The visual note on the board) */}
                                    <div
                                        className="note-cell"
                                        style={{
                                            gridRow: visualRow,
                                            gridColumn: fretIndex + 1,
                                            // DISABLE INTERACTION WITH CELL WHEN GAME IS ACTIVE
                                            pointerEvents: memoryGameActive ? 'none' : 'auto'
                                        }}
                                        onMouseDown={(e) => {
                                            if (!memoryGameActive) {
                                                e.preventDefault();
                                                isDraggingRef.current = true;
                                                toggleNote(stringIndex, fretIndex);
                                            }
                                        }}
                                        onMouseEnter={() => {
                                            if (!memoryGameActive && isDraggingRef.current) {
                                                toggleNote(stringIndex, fretIndex);
                                            }
                                        }}
                                    >
                                        <div
                                            className={`note-circle ${isVisible ? 'revealed' : ''} ${feedbackState || ''} ${isMemoryTarget ? 'memory-target' : ''}`}
                                            style={
                                                isDesignerNote ? {
                                                    backgroundColor: designerColor,
                                                    borderColor: designerColor,
                                                    color: '#0f172a', // Dark text on bright colors
                                                    boxShadow: `0 0 10px ${designerColor}`,
                                                    opacity: 1
                                                } :
                                                    (isMenuPreview && !revealedState ? {
                                                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                                        borderColor: 'rgba(96, 165, 250, 0.4)',
                                                        color: 'rgba(255, 255, 255, 0.7)',
                                                        boxShadow: 'none'
                                                    } : {})
                                            }
                                        >
                                            {isMemoryTarget ? '?' : (isDesignerNote ? designerLabel : note)}
                                        </div>
                                    </div>

                                    {/* LAYER 2: PIE MENU (Overlay on top, independent sibling) */}
                                    {isMemoryTarget && (
                                        <div style={{
                                            gridRow: visualRow,
                                            gridColumn: fretIndex + 1,
                                            position: 'relative',
                                            pointerEvents: 'none', // Allow clicks to pass through empty space
                                            zIndex: 50
                                        }}>
                                            <div style={{
                                                position: 'absolute', top: '50%', left: '50%', width: 0, height: 0,
                                                overflow: 'visible'
                                            }}>
                                                {/* Glow effect background */}
                                                <div style={{
                                                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                                    width: '140px', height: '140px', borderRadius: '50%',
                                                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, rgba(15, 23, 42, 0) 70%)',
                                                }} />

                                                {/* Render Slices */}
                                                {['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'].map((n, i) => {
                                                    if (!memoryAllowedNotes.includes(n)) return null;

                                                    // Logik: A at Top (-90 deg). Each step 30 deg.
                                                    const angle = (i * 30) - 90;
                                                    const rad = angle * (Math.PI / 180);
                                                    const radius = 55; // Distance from center note
                                                    const x = Math.cos(rad) * radius;
                                                    const y = Math.sin(rad) * radius;

                                                    return (
                                                        <button
                                                            key={`pie-${n}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleMemoryGuess(n, e);
                                                            }}
                                                            style={{
                                                                position: 'absolute',
                                                                left: `${x}px`, top: `${y}px`,
                                                                transform: 'translate(-50%, -50%)',
                                                                width: '34px', height: '34px',
                                                                borderRadius: '50%',
                                                                border: '2px solid rgba(59, 130, 246, 0.5)',
                                                                backgroundColor: '#0f172a',
                                                                color: '#f8fafc',
                                                                fontWeight: 'bold',
                                                                fontSize: '0.85rem',
                                                                boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
                                                                cursor: 'pointer',
                                                                pointerEvents: 'auto', // Button accepts clicks
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                transition: 'transform 0.1s',
                                                                zIndex: 101,
                                                                animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
                                                            }}
                                                            onMouseEnter={e => {
                                                                e.target.style.transform = 'translate(-50%, -50%) scale(1.2)';
                                                                e.target.style.borderColor = '#60a5fa';
                                                                e.target.style.backgroundColor = '#1e293b';
                                                            }}
                                                            onMouseLeave={e => {
                                                                e.target.style.transform = 'translate(-50%, -50%) scale(1)';
                                                                e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                                                                e.target.style.backgroundColor = '#0f172a';
                                                            }}
                                                        >
                                                            {n}
                                                        </button>
                                                    );
                                                })}
                                                <style>{`@keyframes popIn { from { transform: translate(-50%, -50%) scale(0); opacity: 0; } to { opacity: 1; } }`}</style>
                                            </div>
                                        </div>
                                    )}
                                </React.Fragment>
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

            {/* FLYING DIAMONDS */}
            {
                diamonds.map(d => (
                    <div
                        key={d.id}
                        style={{
                            position: 'fixed',
                            left: d.startX,
                            top: d.startY,
                            fontSize: '1.5rem',
                            pointerEvents: 'none',
                            zIndex: 9999,
                            animation: d.type === 'loss'
                                ? `fallDown 0.8s ease-in ${d.delay}ms forwards`
                                : `flyToTarget 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${d.delay}ms forwards`,
                            '--target-x': d.endX ? `${d.endX - d.startX}px` : '0px',
                            '--target-y': d.endY ? `${d.endY - d.startY}px` : '0px',
                            '--drift-x': d.driftX ? `${d.driftX}px` : '0px',
                            filter: d.type === 'loss' ? 'grayscale(100%) opacity(0.8)' : 'none'
                        }}
                    >
                        {d.type === 'loss' ? '💔' : '💎'}
                    </div>
                ))
            }

        </div >
    );
}
