import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import confetti from 'canvas-confetti';
import './Fretboard.css';

// Standard Tuning: E A D G B e
const TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Fret Width Ratios (17.817 rule approximation)
const FRET_WIDTH_RATIOS = [
    1.431, 1.351, 1.275, 1.203, 1.136, 1.072, 1.012, 0.955, 0.902, 0.851,
    0.803, 0.758, 0.716, 0.675, 0.638, 0.602, 0.568, 0.536, 0.506, 0.478,
    0.451, 0.425, 0.401, 0.379
];

// Inlay Markers (Standard 3, 5, 7, 9, 12, 15, 17, 19, 21)
const MARKERS = [3, 5, 7, 9, 15, 17, 19, 21]; // 1-indexed frets
const DOUBLE_MARKERS = [12, 24]; // 1-indexed frets

// Helper to get note name (e.g., 'C', 'F#')
const getNoteAt = (stringIndex, fretIndex) => {
    // Calculate on the fly
    const openNote = TUNING[stringIndex];
    if (!openNote) return '';
    const openNoteName = openNote.slice(0, -1);
    const openNoteIndex = NOTES.indexOf(openNoteName);
    return NOTES[(openNoteIndex + fretIndex) % 12];
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
    // DETECT MOBILE FOR EVEN FRETS
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 700);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const [showMenu, setShowMenu] = useState(false); // HAMBURGER MENU STATE

    // --- GLOBAL SETTINGS ---
    const [fretCount, setFretCount] = useState(13); // Default requested by user


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
    const [activeGameMode, setActiveGameMode] = useState(null); // null = Explorer, 'string-walker' = The Game

    // MEMORY GAME STATE
    const [memoryGameActive, setMemoryGameActive] = useState(false);
    const [memoryGameOver, setMemoryGameOver] = useState(false);
    const [sessionXP, setSessionXP] = useState(0); // Track XP gained in this session
    const [memoryTarget, setMemoryTarget] = useState(null); // { s, f, note: 'C#' }
    const [pieMenuPosition, setPieMenuPosition] = useState(null);
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

    // REF FOR DRAG-TO-PLAY INTERACTION
    const isPointerDown = useRef(false);
    const lastPlayedRef = useRef(null);
    const dragSelectRef = useRef({ active: false, type: null, action: null });

    // GLOBAL POINTER UP (RESET DRAG)
    useEffect(() => {
        const handleUp = () => {
            isPointerDown.current = false;
            lastPlayedRef.current = null;
            dragSelectRef.current = { active: false, type: null, action: null };
        };
        // Also handle cancel/leave to be safe
        window.addEventListener('pointerup', handleUp);
        window.addEventListener('pointercancel', handleUp);
        return () => {
            window.removeEventListener('pointerup', handleUp);
            window.removeEventListener('pointercancel', handleUp);
        };
    }, []);

    // Position Tracker for Memory Game Pie Menu
    useEffect(() => {
        if (!memoryTarget) {
            setPieMenuPosition(null);
            return;
        }

        const updatePos = () => {
            const el = document.getElementById(`note-cell-${memoryTarget.s}-${memoryTarget.f}`);
            if (el) {
                const rect = el.getBoundingClientRect();
                setPieMenuPosition({
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                });
            }
        };

        // Initial update
        // Small timeout to ensure DOM is rendered with ID
        const t = setTimeout(updatePos, 0);

        // Update on scroll/resize
        window.addEventListener('scroll', updatePos, true);
        window.addEventListener('resize', updatePos);

        return () => {
            clearTimeout(t);
            window.removeEventListener('scroll', updatePos, true);
            window.removeEventListener('resize', updatePos);
        };
    }, [memoryTarget, fretCount]);

    // GLOBAL AUDIO UNLOCKER (Aggressive)
    useEffect(() => {
        const unlockAudio = async () => {
            try {
                if (Tone.context.state !== 'running') {
                    await Tone.start();
                }
                // Also explicitly resume standard AudioContext if accessible
                if (Tone.context.rawContext && Tone.context.rawContext.state === 'suspended') {
                    await Tone.context.rawContext.resume();
                }
            } catch (e) {
                console.error("Audio unlock failed", e);
            }
        };

        const events = ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'];
        events.forEach(e => document.addEventListener(e, unlockAudio, { once: true }));

        return () => {
            events.forEach(e => document.removeEventListener(e, unlockAudio));
        };
    }, []);

    // ENFORCE LOCKS (Anti-Ghost Selection)


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



    const startMemoryGame = () => {
        setMemoryGameActive(true);
        setMemoryGameOver(false);
        setScore(0);
        setFeedbackMsg('');
        nextMemoryTarget();
    };

    const stopMemoryGame = (finished = false) => {
        setMemoryGameActive(false);
        setMemoryTarget(null);
        setRevealed({});
    };

    const nextMemoryTarget = () => {
        const validPositions = [];

        memoryAllowedStrings.forEach(sIndex => {
            if (!TUNING[sIndex]) return;
            for (let f = 0; f <= fretCount; f++) {
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
    };

    const handleMemoryGuess = (guessedNote, e) => {
        if (!memoryTarget) return;

        if (guessedNote === memoryTarget.note) {
            // Correct!
            setScore(s => s + 1);
            setFeedbackMsg('CORRECT!');
            playCoinSound();
            setTimeout(() => {
                setFeedbackMsg('');
                nextMemoryTarget();
            }, 500);
        } else {
            setFeedbackMsg('TRY AGAIN');
            playFail();
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
        if (Tone.context.state !== 'running') {
            await Tone.start();
        }
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

    const handleNoteInteraction = (stringIndex, fretIndex, note) => {
        if (activeGameMode === 'memory' && memoryGameActive) {
            setMemoryTarget({ s: stringIndex, f: fretIndex, note });
        } else if (activeGameMode === 'triad-hunt') {
            checkTriadClick(stringIndex, fretIndex);
        } else if (practiceActive) {
            handlePracticeClick(stringIndex, fretIndex);
        } else {
            // Explorer Mode
            toggleNote(stringIndex, fretIndex);
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
        return [...MARKERS, ...DOUBLE_MARKERS]
            .filter(fret => fret <= fretCount)
            .map(fret => {
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
                            gap: 'calc(2 * var(--string-height))', // Match new row height (approx 2 * 34px)
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
        <div className="fretboard-wrapper" style={{ marginTop: '0' }}>
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


                        {/* FRET COUNT SETTING */}
                        <div style={{ marginBottom: '20px', padding: '20px', background: '#0f172a', borderRadius: '10px', border: '1px solid #334155' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#fff' }}>FRET COUNT: <span style={{ color: '#3b82f6' }}>{fretCount}</span></span>
                            </div>
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
                        onClick={() => { switchGameMode('chord-designer'); setShowMenu(false); }}
                        className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-all border ${activeGameMode === 'chord-designer' ? 'bg-rose-500 text-white border-rose-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'}`}
                    >
                        TRIADS
                    </button>

                    <button
                        onClick={() => { switchGameMode('string-walker'); setShowMenu(false); }}
                        className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-all border ${activeGameMode === 'string-walker' ? 'bg-teal-500 text-slate-900 border-teal-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'}`}
                    >
                        STRING WALKER
                    </button>

                    <button
                        onClick={() => { switchGameMode('triad-hunt'); setShowMenu(false); }}
                        className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-all border ${activeGameMode === 'triad-hunt' ? 'bg-violet-500 text-white border-violet-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'}`}
                    >
                        TRIAD HUNT
                    </button>

                    <button
                        onClick={() => { switchGameMode('memory'); setShowMenu(false); }}
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
                    style={{ position: 'fixed', top: '60px', left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1998 }}
                />
            )}

            {/* CHORD DESIGNER HUD */}
            {activeGameMode === 'chord-designer' && (
                <div className="game-hud" style={{ width: '100%', flexDirection: 'column', gap: '8px', marginBottom: '15px', background: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '12px', border: '1px solid #f43f5e' }}>

                    {/* ROW 1: ROOT (CIRCLE OF FIFTHS) */}
                    <div className="flex flex-col gap-1 items-center w-full">
                        <div className="flex flex-wrap justify-center gap-0.5 sm:gap-2 w-full max-w-2xl">
                            {['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'].map(note => (
                                <button
                                    key={note}
                                    onClick={() => setDesignerRoot(note)}
                                    className={`
                                        w-[1.4rem] h-7 sm:w-10 sm:h-10 rounded-md font-bold text-[0.55rem] sm:text-sm transition-all
                                        flex items-center justify-center border
                                        ${designerRoot === note
                                            ? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/50 scale-105 z-10'
                                            : 'bg-slate-800 text-slate-400 border-slate-600 hover:border-slate-400 hover:text-white'}
                                    `}
                                >
                                    {note}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-center gap-[10px] sm:gap-8 flex-wrap mt-[5px] sm:mt-4">

                        {/* ROW 2: TYPE */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' }}>
                            <div className="flex gap-0.5 sm:gap-2">
                                <button
                                    onClick={() => setDesignerType('major')}
                                    className={`
                                        h-7 px-2 sm:h-10 sm:px-4 rounded-md font-bold text-[0.6rem] sm:text-sm transition-all
                                        flex items-center justify-center border
                                    `}
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
                                    onClick={() => setDesignerType('minor')}
                                    className={`
                                        h-7 px-2 sm:h-10 sm:px-4 rounded-md font-bold text-[0.6rem] sm:text-sm transition-all
                                        flex items-center justify-center border
                                    `}
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

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' }}>

                            <div className="grid grid-cols-6 gap-0.5 sm:gap-1 w-auto min-w-[180px] max-w-[220px] sm:min-w-[300px] sm:max-w-[400px]">
                                {/* Row 1: Keys */}
                                {[5, 4, 3, 2, 1, 0].map((stringIndex, i) => (
                                    <button
                                        key={stringIndex}
                                        onClick={() => {
                                            setDesignerStrings(prev =>
                                                prev.includes(stringIndex) ? prev.filter(s => s !== stringIndex) : [...prev, stringIndex]
                                            );
                                        }}
                                        className={`
                                            h-7 w-full sm:h-10 rounded-md font-bold text-[0.6rem] sm:text-sm transition-all
                                            flex items-center justify-center border
                                        `}
                                        style={{
                                            backgroundColor: designerStrings.includes(stringIndex) ? '#f43f5e' : '#1e293b',
                                            color: designerStrings.includes(stringIndex) ? '#fff' : '#94a3b8',
                                            borderColor: designerStrings.includes(stringIndex) ? '#f43f5e' : '#475569',
                                            opacity: designerStrings.includes(stringIndex) ? 1 : 0.5,
                                            gridColumn: i + 1,
                                            gridRow: 1
                                        }}
                                    >
                                        {6 - stringIndex}
                                    </button>
                                ))}

                                {/* Helper for Brackets */}
                                {/* We make the text break the line using Flexbox wings */}

                                {/* Row 2: Sets */}
                                {[
                                    { label: 'SET 1', strings: [5, 4, 3], col: 2 },
                                    { label: 'SET 2', strings: [4, 3, 2], col: 3 },
                                    { label: 'SET 3', strings: [3, 2, 1], col: 4 },
                                    { label: 'SET 4', strings: [2, 1, 0], col: 5 }
                                ].map((set, i) => {
                                    const isActive = JSON.stringify(designerStrings.slice().sort()) === JSON.stringify(set.strings.sort());
                                    return (
                                        <button
                                            key={set.label}
                                            onClick={() => setDesignerStrings(set.strings)}
                                            className={`
                                                h-7 w-full sm:h-10 rounded-md font-bold text-[0.5rem] sm:text-[0.7rem] transition-all
                                                flex items-center justify-center border
                                            `}
                                            style={{
                                                backgroundColor: isActive ? '#f43f5e' : '#1e293b',
                                                color: isActive ? '#fff' : '#94a3b8',
                                                borderColor: isActive ? '#f43f5e' : '#475569',
                                                opacity: isActive ? 1 : 0.5,
                                                gridColumn: set.col,
                                                gridRow: 2,
                                                marginTop: '4px'
                                            }}
                                        >
                                            {set.label}
                                        </button>
                                    );
                                })}
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
            {/* MEMORY GAME HUD */}
            {activeGameMode === 'memory' && (
                <div className="game-hud" style={{ width: '100%', flexDirection: 'column', gap: '8px', marginBottom: '15px', background: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '12px', border: '1px solid #3b82f6' }}>

                    {/* ROW 1: NOTES SELECTOR */}
                    <div className="flex flex-col gap-1 items-center w-full">
                        <div className="flex flex-col items-center gap-1 sm:gap-2 w-full max-w-3xl justify-center">
                            {/* LABEL */}
                            <div className="text-[0.6rem] sm:text-xs font-bold text-slate-500 w-full text-center shrink-0">NOTES</div>

                            {/* BUTTONS */}
                            <div className="flex flex-wrap justify-center gap-1 sm:gap-2">
                                {['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'].map(note => (
                                    <button
                                        key={note}
                                        onPointerDown={(e) => {
                                            e.preventDefault();
                                            e.currentTarget.releasePointerCapture(e.pointerId); // Allow smooth dragging
                                            const isActive = memoryAllowedNotes.includes(note);
                                            const action = isActive ? 'remove' : 'add';
                                            dragSelectRef.current = { active: true, type: 'note', action };

                                            // Immediate update
                                            if (action === 'add') setMemoryAllowedNotes(prev => [...prev, note]);
                                            else setMemoryAllowedNotes(prev => prev.filter(n => n !== note));
                                        }}
                                        onPointerEnter={() => {
                                            const { active, type, action } = dragSelectRef.current;
                                            if (active && type === 'note') {
                                                if (action === 'add' && !memoryAllowedNotes.includes(note)) {
                                                    setMemoryAllowedNotes(prev => [...prev, note]);
                                                } else if (action === 'remove' && memoryAllowedNotes.includes(note)) {
                                                    setMemoryAllowedNotes(prev => prev.filter(n => n !== note));
                                                }
                                            }
                                        }}
                                        className={`
                                            w-7 h-7 sm:w-10 sm:h-10 rounded-md font-bold text-[0.6rem] sm:text-sm transition-all
                                            flex items-center justify-center border cursor-pointer select-none touch-none
                                            ${memoryAllowedNotes.includes(note)
                                                ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/50 scale-105 z-10'
                                                : 'bg-slate-800 text-slate-400 border-slate-600 hover:border-slate-400 hover:text-white'}
                                        `}
                                    >
                                        {note}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center flex-col items-center gap-[5px] sm:gap-4 mt-[5px] sm:mt-4">

                        {/* ROW 2: STRINGS SELECTOR */}
                        <div className="flex flex-col items-center gap-1 sm:gap-2 w-full max-w-3xl justify-center">
                            {/* LABEL */}
                            <div className="text-[0.6rem] sm:text-xs font-bold text-slate-500 w-full text-center shrink-0">STRINGS</div>

                            <div className="grid grid-cols-6 gap-0.5 sm:gap-1 w-auto min-w-[180px] max-w-[220px] sm:min-w-[300px] sm:max-w-[400px]">
                                {[5, 4, 3, 2, 1, 0].map((stringIndex, i) => (
                                    <button
                                        key={stringIndex}
                                        onPointerDown={(e) => {
                                            e.preventDefault();
                                            e.currentTarget.releasePointerCapture(e.pointerId);
                                            const isActive = memoryAllowedStrings.includes(stringIndex);
                                            const action = isActive ? 'remove' : 'add';
                                            dragSelectRef.current = { active: true, type: 'string', action };

                                            // Immediate update
                                            if (action === 'add') setMemoryAllowedStrings(prev => [...prev, stringIndex]);
                                            else setMemoryAllowedStrings(prev => prev.filter(s => s !== stringIndex));
                                        }}
                                        onPointerEnter={() => {
                                            const { active, type, action } = dragSelectRef.current;
                                            if (active && type === 'string') {
                                                if (action === 'add' && !memoryAllowedStrings.includes(stringIndex)) {
                                                    setMemoryAllowedStrings(prev => [...prev, stringIndex]);
                                                } else if (action === 'remove' && memoryAllowedStrings.includes(stringIndex)) {
                                                    setMemoryAllowedStrings(prev => prev.filter(s => s !== stringIndex));
                                                }
                                            }
                                        }}
                                        className={`
                                            h-7 w-full sm:h-10 rounded-md font-bold text-[0.6rem] sm:text-sm transition-all
                                            flex items-center justify-center border cursor-pointer select-none touch-none
                                        `}
                                        style={{
                                            backgroundColor: memoryAllowedStrings.includes(stringIndex) ? '#3b82f6' : '#1e293b',
                                            color: memoryAllowedStrings.includes(stringIndex) ? '#fff' : '#94a3b8',
                                            borderColor: memoryAllowedStrings.includes(stringIndex) ? '#3b82f6' : '#475569',
                                            opacity: memoryAllowedStrings.includes(stringIndex) ? 1 : 0.5,
                                            gridColumn: i + 1,
                                            gridRow: 1
                                        }}
                                    >
                                        {6 - stringIndex}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ROW 3: CONTROLS */}
                        <div className="mt-6 flex gap-4 items-center">
                            {!memoryGameActive ? (
                                <button
                                    onClick={startMemoryGame}
                                    className="h-9 px-6 sm:h-12 sm:px-8 rounded-lg font-bold text-xs sm:text-base bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 hover:scale-105 transition-all"
                                >
                                    START HUNT
                                </button>
                            ) : (
                                <div className="flex gap-4 items-center">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[0.6rem] sm:text-xs text-slate-400 font-bold tracking-widest">FOUND</span>
                                        <span className="text-xl sm:text-2xl font-black text-amber-400">{score}</span>
                                    </div>
                                    <button
                                        onClick={() => stopMemoryGame(false)}
                                        className="h-9 px-4 sm:h-12 sm:px-6 rounded-lg font-bold text-xs sm:text-base bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600 transition-all"
                                    >
                                        STOP
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="fretboard-scroll-container" style={{ display: 'flex', justifyContent: 'center' }}>

                {/* LEFT GUTTER: String Numbers */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginTop: '1px', // Fine-tune alignment with board border
                    marginRight: '12px',
                    height: 'calc(6 * var(--string-height))' // 6 strings * var(--string-height)
                }}>
                    {/* Loop 1 to 6 (Top to Bottom) directly since Flex is Column */
                        [1, 2, 3, 4, 5, 6].map((num) => (
                            <div
                                key={`gutter-num-${num}`}
                                style={{
                                    height: 'var(--string-height)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    color: '#64748b',
                                    fontWeight: 'bold',
                                    fontSize: '0.8rem',
                                    fontFamily: "'Inter', sans-serif"
                                }}
                            >
                                {num}
                            </div>
                        ))}
                </div>

                {/* RIGHT CONTENT: Board + Fret Numbers */}
                <div style={{ display: 'flex', flexDirection: 'column', width: isMobile ? '100%' : 'auto' }}>
                    {(() => {
                        // Dynamic Width Calculation
                        // If Mobile (<700px), use uniform width (1.0) for better playability
                        // If Desktop/Tablet, use authentic decreasing ratios
                        const activeRatios = isMobile
                            ? new Array(fretCount).fill(1.0)
                            : FRET_WIDTH_RATIOS.slice(0, fretCount);

                        // If Mobile (<700px), use uniform width (1fr) to fill screen
                        // If Desktop/Tablet, use authentic decreasing ratios
                        const gridCols = isMobile
                            ? `var(--nut-width) repeat(${fretCount}, 1fr)`
                            : `var(--nut-width) ${activeRatios.map(r => `calc(${r} * var(--base-unit))`).join(' ')}`;

                        return (
                            <>
                                <div className="fretboard" style={{
                                    width: isMobile ? '100%' : 'fit-content',
                                    minWidth: isMobile ? '0' : 'fit-content',
                                    gridTemplateColumns: gridCols
                                }}>
                                    {/* Inlays (Background) */}
                                    {renderInlays()}

                                    {/* Nut Line */}
                                    <div className="nut-line" style={{ left: 'var(--nut-width)', zIndex: 5 }}></div>

                                    {/* Fret Lines */}
                                    {Array.from({ length: fretCount }).map((_, i) => (
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
                                        return Array.from({ length: fretCount + 1 }).map((_, fretIndex) => {
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
                                                        const maxF = Math.min(fretCount, centerFret + 6);

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

                                                            // SHAPE FINGERPRINTING & COLORING
                                                            // 1. Sort by string index (Thick -> Thin)
                                                            const sortedShape = finalShape.slice().sort((a, b) => a.s - b.s);
                                                            // 2. Normalize frets relative to the lowest fret in the shape
                                                            const minF = Math.min(...sortedShape.map(d => d.f));
                                                            const fingerprint = sortedShape.map(d => d.f - minF).join('');

                                                            // 3. STRICT COLOR MAPPING (The "Fingerprint")
                                                            // Assigns a specific color to each unique visual shape (finger placement pattern).
                                                            const SHAPE_COLOR_MAP = {
                                                                // --- 2nd Inversion Shapes ---
                                                                '010': '#f59e0b', // Set 1 (Triangle) -> Yellow (Reserved)
                                                                '000': '#8b5cf6', // Set 2 (Bar) -> Purple
                                                                '110': '#10b981', // Set 3/4 -> Emerald

                                                                // --- 1st Inversion Shapes ---
                                                                '100': '#3b82f6', // Set 1 -> Blue
                                                                '201': '#84cc16', // Set 2 -> Lime (Distinct from Blue)
                                                                '200': '#d946ef', // Set 3/4 -> Fuchsia (Distinct from Blue/Lime)

                                                                // --- Root Position Shapes ---
                                                                '220': '#f43f5e', // Set 1 -> Red
                                                                '210': '#f97316', // Set 2 -> Orange
                                                                '320': '#ec4899', // Set 3/4 -> Pink

                                                                // --- Minor-Exclusive Shapes ---
                                                                '120': '#22d3ee', // Set 1 Min 2nd Inv -> Turquoise
                                                                '101': '#6366f1', // Set 2 Min 1st Inv -> Indigo
                                                                '310': '#a8a29e', // Set 3 Min Root ("Stretch") -> Stone
                                                            };

                                                            if (SHAPE_COLOR_MAP[fingerprint]) {
                                                                designerColor = SHAPE_COLOR_MAP[fingerprint];
                                                            } else {
                                                                // Fallback for unknown shapes (should rarely be hit for closed triads)
                                                                designerColor = '#94a3b8';
                                                            }
                                                        }
                                                    }
                                                }
                                            }

                                            const isVisible = revealedState || isMenuPreview || isDesignerNote;

                                            return (
                                                <React.Fragment key={key}>
                                                    {/* LAYER 1: NOTE BUTTON */}
                                                    <div
                                                        className={`note-cell ${isVisible ? 'visible' : ''}`}
                                                        id={`note-cell-${stringIndex}-${fretIndex}`}
                                                        data-string={stringIndex}
                                                        data-fret={fretIndex}
                                                        style={{
                                                            gridColumn: fretIndex + 1,
                                                            gridRow: visualRow,
                                                            pointerEvents: (activeGameMode === 'memory' && memoryGameActive && !memoryAllowedStrings.includes(stringIndex)) ? 'none' : 'auto',
                                                            touchAction: 'none' // Critical for Drag-To-Play on mobile
                                                        }}
                                                        onPointerDown={(e) => {
                                                            e.preventDefault();
                                                            isPointerDown.current = true;
                                                            lastPlayedRef.current = `${stringIndex}-${fretIndex}`;
                                                            handleNoteInteraction(stringIndex, fretIndex, note);
                                                        }}
                                                        onPointerMove={(e) => {
                                                            if (isPointerDown.current) {
                                                                const target = document.elementFromPoint(e.clientX, e.clientY);
                                                                const cell = target?.closest('.note-cell');

                                                                if (cell) {
                                                                    const s = parseInt(cell.getAttribute('data-string'));
                                                                    const f = parseInt(cell.getAttribute('data-fret'));
                                                                    const key = `${s}-${f}`;

                                                                    if (lastPlayedRef.current !== key) {
                                                                        lastPlayedRef.current = key;
                                                                        const simpleNote = getNoteAt(s, f);
                                                                        handleNoteInteraction(s, f, simpleNote);
                                                                    }
                                                                }
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
                                                                        backgroundColor: '#3b82f6',
                                                                        borderColor: '#60a5fa',
                                                                        color: '#ffffff',
                                                                        boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)',
                                                                        fontWeight: 'bold',
                                                                        opacity: 0.9
                                                                    } : {})
                                                            }
                                                        >
                                                            {isMemoryTarget ? '?' : (isDesignerNote ? designerLabel : note)}
                                                        </div>
                                                    </div>

                                                    {/* LAYER 2: PIE MENU (Overlay on top, independent sibling) */}

                                                </React.Fragment>
                                            );
                                        });
                                    })}
                                </div>

                                {/* Fret Numbers Row */}
                                <div className="fret-numbers" style={{
                                    width: isMobile ? '100%' : 'fit-content',
                                    minWidth: isMobile ? '0' : 'fit-content',
                                    gridTemplateColumns: gridCols
                                }}>
                                    {Array.from({ length: fretCount + 1 }).map((_, i) => {
                                        const showNumber = MARKERS.includes(i) || DOUBLE_MARKERS.includes(i);
                                        return (
                                            <div key={`fret-num-${i}`} className="fret-number-cell">
                                                {showNumber ? i : ''}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        );
                    })()}
                </div>
            </div>


            {/* OVERLAYS at the end to avoid z-index/clipping issues */}
            <PieMenuOverlay
                position={pieMenuPosition}
                onGuess={handleMemoryGuess}
                allowedNotes={memoryAllowedNotes}
                visible={!!pieMenuPosition && activeGameMode === 'memory' && memoryGameActive}
            />

        </div>
    );
}

const PieMenuOverlay = ({ position, onGuess, allowedNotes, visible }) => {
    if (!visible || !position) return null;

    const notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
    const radius = 110; // Outer radius
    const innerRadius = 45; // Donut hole

    // Create slices
    // A is at Top (-90 deg).
    const sliceAngle = 360 / 12;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 9999,
            overflow: 'hidden'
        }}>
            <div style={{
                position: 'absolute',
                top: position.y,
                left: position.x,
                transform: 'translate(-50%, -50%)',
                width: radius * 2,
                height: radius * 2,
                pointerEvents: 'auto'
            }}>
                <svg width="100%" height="100%" viewBox="-100 -100 200 200" style={{ overflow: 'visible' }}>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {notes.map((n, i) => {
                        const isAllowed = allowedNotes.includes(n);

                        // Calculate wedge path
                        const startAngle = (i * sliceAngle) - 90 - (sliceAngle / 2);
                        const endAngle = startAngle + sliceAngle;

                        // Convert to radians
                        const startRad = (startAngle * Math.PI) / 180;
                        const endRad = (endAngle * Math.PI) / 180;

                        // Coordinates
                        const x1 = Math.cos(startRad) * radius;
                        const y1 = Math.sin(startRad) * radius;
                        const x2 = Math.cos(endRad) * radius;
                        const y2 = Math.sin(endRad) * radius;

                        const x1_in = Math.cos(startRad) * innerRadius;
                        const y1_in = Math.sin(startRad) * innerRadius;
                        const x2_in = Math.cos(endRad) * innerRadius;
                        const y2_in = Math.sin(endRad) * innerRadius;

                        // SVG Path Command
                        const pathData = [
                            `M ${x1_in} ${y1_in}`,
                            `L ${x1} ${y1}`,
                            `A ${radius} ${radius} 0 0 1 ${x2} ${y2}`,
                            `L ${x2_in} ${y2_in}`,
                            `A ${innerRadius} ${innerRadius} 0 0 0 ${x1_in} ${y1_in}`,
                            'Z'
                        ].join(' ');

                        // Label Position (Center of wedge)
                        const midAngle = startAngle + (sliceAngle / 2);
                        const midRad = (midAngle * Math.PI) / 180;
                        const textRadius = (radius + innerRadius) / 2;
                        const tx = Math.cos(midRad) * textRadius;
                        const ty = Math.sin(midRad) * textRadius;

                        return (
                            <g
                                key={n}
                                onClick={(e) => {
                                    if (isAllowed) {
                                        e.stopPropagation();
                                        onGuess(n, e);
                                    }
                                }}
                                style={{
                                    cursor: isAllowed ? 'pointer' : 'default',
                                    opacity: isAllowed ? 1 : 0.3,
                                    transition: 'all 0.2s ease',
                                    transformOrigin: '0 0'
                                }}
                                onMouseEnter={(e) => {
                                    if (isAllowed) e.currentTarget.style.transform = 'scale(1.1)';
                                }}
                                onMouseLeave={(e) => {
                                    if (isAllowed) e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                <path
                                    d={pathData}
                                    fill={isAllowed ? '#3b82f6' : '#1e293b'}
                                    stroke="#1e293b"
                                    strokeWidth="1"
                                    className="hover:brightness-110"
                                />
                                <text
                                    x={tx}
                                    y={ty}
                                    fill="#fff"
                                    fontSize="10"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    alignmentBaseline="middle"
                                    pointerEvents="none"
                                >
                                    {n}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};


