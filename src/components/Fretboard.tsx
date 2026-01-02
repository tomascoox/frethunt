'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as Tone from 'tone';
import confetti from 'canvas-confetti';
import { supabase } from '@/lib/supabase';
import { SaveToolModal } from '@/components/SaveToolModal';
import './Fretboard.css';
import { GameMode, AccidentalMode, Note, NoteConfig, Preset, TriadKey, TriadProgression, NOTES as GLOBAL_NOTES } from '../types';

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
// Inlay Markers (Standard 3, 5, 7, 9, 12, 15, 17, 19, 22)
const MARKERS = [3, 5, 7, 9, 15, 17, 19, 21]; // 1-indexed frets
const DOUBLE_MARKERS = [12, 24]; // 1-indexed frets

const FLAT_MAP = {
    'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'
};
const formatNote = (note: string, mode: AccidentalMode): string => {
    if (!note) return '';
    if (mode === 'flat') {
        return (FLAT_MAP as Record<string, string>)[note] || note;
    }
    return note;
};

// Helper to get note name (e.g., 'C', 'F#')
const getNoteAt = (stringIndex: number, fretIndex: number): string => {
    // Calculate on the fly
    const openNote = TUNING[stringIndex];
    if (!openNote) return '';
    const openNoteName = openNote.slice(0, -1);
    const openNoteIndex = NOTES.indexOf(openNoteName);
    return NOTES[(openNoteIndex + fretIndex) % 12];
};

// Helper to get full note with octave (e.g., 'C4', 'F#3')
const getNoteWithOctave = (stringIndex: number, fretIndex: number): string => {
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

interface TriadTarget {
    key: string;
    set: string;
    name: string;
    posLabel: string;
    notes: NoteConfig[];
}

interface FretboardProps {
    activeGameMode: GameMode;
    setActiveGameMode: (mode: GameMode) => void;
    proMode: boolean;
    fretCount: number;
    totalXP: number;
    setTotalXP: React.Dispatch<React.SetStateAction<number>>;
    accidentalMode: AccidentalMode;
    initialNotes?: string[];
    initialStrings?: number[];
    initialPositions?: string[];
    disablePersistence?: boolean;
    toolMetadata?: { slug: string; title: string; description: string };
    startInEditMode?: boolean;
}

export default function Fretboard({
    activeGameMode, setActiveGameMode,
    proMode,
    fretCount = 13,
    totalXP, setTotalXP,
    accidentalMode = 'sharp',
    initialNotes,
    initialStrings,
    initialPositions,
    disablePersistence = false,
    toolMetadata,
    startInEditMode = false
}: FretboardProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState<boolean>(false);

    // ADMIN STATE
    const [hasAdmin, setHasAdmin] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [navbarContainer, setNavbarContainer] = useState<HTMLElement | null>(null);

    // ADMIN CHECK & PORTAL TARGET
    useEffect(() => {
        supabase.auth.getUser().then(({ data }: any) => {
            if (data.user && data.user.email === 'tomas@joox.se') setHasAdmin(true);
        });
        setNavbarContainer(document.getElementById('navbar-actions'));
    }, []);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 700);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // --- AUDIO UNLOCKER ---
    useEffect(() => {
        const unlockAudio = async () => {
            if (Tone.context.state !== 'running') {
                await Tone.start();
            }
            setAudioEnabled(true);
            window.removeEventListener('pointerdown', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
        };

        window.addEventListener('pointerdown', unlockAudio);
        window.addEventListener('keydown', unlockAudio);

        return () => {
            window.removeEventListener('pointerdown', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
        };
    }, []);

    // const [fretCount, setFretCount] = useState(13); // Props now


    const [revealed, setRevealed] = useState<Record<string, boolean>>({});

    // --- AUDIO & ASSETS ---
    const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
    const [isLoaded, setIsLoaded] = useState<boolean>(false);


    // --- VISUAL PRESSURE PRACTICE STATE ---
    const [practiceActive, setPracticeActive] = useState<boolean>(false);
    const [studyMode, setStudyMode] = useState<boolean>(false);
    const [secondsPerNote, setSecondsPerNote] = useState<number>(5); // Changed default from 5.0
    const [practiceTargetNote, setPracticeTargetNote] = useState<string>('A'); // Changed default from 'C'
    const [numberOfStrings, setNumberOfStrings] = useState<number>(6); // New: Limit active strings
    const [currentStringIndex, setCurrentStringIndex] = useState<number | null>(null); // 5 down to 0
    const [feedbackMsg, setFeedbackMsg] = useState<string>('');
    const [timerProgress, setTimerProgress] = useState<number>(0);
    const [gameFeedback, setGameFeedback] = useState<Record<string, string>>({});
    const [score, setScore] = useState<number>(0);
    // const [activeGameMode, setActiveGameMode] = useState(null); // Props now

    // MEMORY GAME STATE
    const [memoryGameActive, setMemoryGameActive] = useState<boolean>(false);
    const [memoryGameOver, setMemoryGameOver] = useState<boolean>(false);
    const [sessionXP, setSessionXP] = useState<number>(0); // Track XP gained in this session
    const [memoryTarget, setMemoryTarget] = useState<NoteConfig | null>(null); // { s, f, note: 'C#' }
    const [sessionHistory, setSessionHistory] = useState<Record<string, { correct: number; wrong: number }>>({}); // { 'C#': { correct: 0, wrong: 0 } }
    // const [pieMenuPosition, setPieMenuPosition] = useState(null); // REMOVED: PieMenu tracks itself now

    // Initialize with props or defaults to avoid SSR crash
    const [memoryAllowedNotes, setMemoryAllowedNotes] = useState<string[]>(initialNotes || GLOBAL_NOTES);
    const [memoryAllowedStrings, setMemoryAllowedStrings] = useState<number[]>(initialStrings || [0, 1, 2, 3, 4, 5]);

    // Hydrate Memory Settings
    useEffect(() => {
        if (typeof window !== 'undefined' && !disablePersistence) {
            try {
                const savedNotes = localStorage.getItem('fretboard_memoryAllowedNotes');
                if (savedNotes) setMemoryAllowedNotes(JSON.parse(savedNotes));
            } catch (e) { }

            try {
                const savedStrings = localStorage.getItem('fretboard_memoryAllowedStrings');
                if (savedStrings) setMemoryAllowedStrings(JSON.parse(savedStrings));
            } catch (e) { }
        }

        // Handling Logic: initialPositions (Exact Selection) -> initialNotes (Pattern)
        if (initialPositions && initialPositions.length > 0) {
            // EXACT MODE
            setCustomSelectedNotes(initialPositions);

            // Infer allowed notes for quiz text
            const uniqueNotes = Array.from(new Set(initialPositions.map(k => {
                const [s, f] = k.split('-').map(Number);
                return getNoteAt(s, f);
            })));
            setMemoryAllowedNotes(uniqueNotes);

            // Set allowed strings (Use prop if available, else infer)
            if (initialStrings && initialStrings.length > 0) {
                setMemoryAllowedStrings(initialStrings);
            } else {
                const uniqueStrings = Array.from(new Set(initialPositions.map(k => parseInt(k.split('-')[0]))));
                setMemoryAllowedStrings(uniqueStrings);
            }

            // GAME START LOGIC
            if (startInEditMode) {
                setMemoryGameActive(false);
                setIsCustomSelectionMode(true);
                setFeedbackMsg('Editing Mode: Click fretboard to change notes.');
            } else {
                setMemoryGameActive(true);
                setMemoryGameOver(false);
                setScore(0);
                setFeedbackMsg('');

                // Pick random target from positions
                const rKey = initialPositions[Math.floor(Math.random() * initialPositions.length)];
                const [rs, rf] = rKey.split('-').map(Number);
                setMemoryTarget({ s: rs, f: rf, note: getNoteAt(rs, rf) });

                setIsCustomSelectionMode(false); // Hide dots to start clean hunt
            }

        } else if (initialNotes && initialNotes.length > 0) {
            const matching: string[] = [];
            // Scan board to find all matching notes
            for (let s = 0; s < 6; s++) {
                if (initialStrings && !initialStrings.includes(s)) continue;

                for (let f = 0; f <= fretCount; f++) {
                    const n = getNoteAt(s, f);
                    if (initialNotes.includes(n)) {
                        matching.push(`${s}-${f}`);
                    }
                }
            }

            // 1. Set State for Persistence/Logic
            setCustomSelectedNotes(matching);
            setMemoryAllowedNotes(initialNotes);
            if (initialStrings) setMemoryAllowedStrings(initialStrings);

            // 2. AUTO-START GAME (Bypassing startMemoryGame() to avoid async state issues)
            // We want to skip 'isCustomSelectionMode' and go straight to hunting.
            if (matching.length > 0) {
                setMemoryGameActive(true);
                setMemoryGameOver(false);
                setScore(0);
                setFeedbackMsg('');

                // Pick random first target locally
                const rKey = matching[Math.floor(Math.random() * matching.length)];
                const [rs, rf] = rKey.split('-').map(Number);
                setMemoryTarget({ s: rs, f: rf, note: getNoteAt(rs, rf) });

                // Ensure Custom Mode is OFF so we don't see the answers
                setIsCustomSelectionMode(false);
            }
        }
    }, [initialNotes, initialStrings, initialPositions, disablePersistence, startInEditMode]);

    // LOW-LEVEL PERSISTENCE (Debouncing not strictly needed for settings)
    useEffect(() => { if (typeof window !== 'undefined' && !disablePersistence) localStorage.setItem('fretboard_memoryAllowedNotes', JSON.stringify(memoryAllowedNotes)); }, [memoryAllowedNotes]);
    useEffect(() => { if (typeof window !== 'undefined' && !disablePersistence) localStorage.setItem('fretboard_memoryAllowedStrings', JSON.stringify(memoryAllowedStrings)); }, [memoryAllowedStrings]);
    const [questionsLeft, setQuestionsLeft] = useState<number>(10); // 10 Questions per round

    // CUSTOM SELECTION STATE
    const [isCustomSelectionMode, setIsCustomSelectionMode] = useState<boolean>(false);
    const [customSelectedNotes, setCustomSelectedNotes] = useState<string[]>([]); // ["3-5", "2-7"]
    const [isCustomSetReady, setIsCustomSetReady] = useState<boolean>(false);

    // Custom Selection Persistence
    useEffect(() => {
        if (typeof window !== 'undefined' && !disablePersistence) {
            try {
                const saved = localStorage.getItem('fretboard_customSelectedNotes');
                if (saved) setCustomSelectedNotes(JSON.parse(saved));
            } catch (e) { }
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined' && !disablePersistence) {
            localStorage.setItem('fretboard_customSelectedNotes', JSON.stringify(customSelectedNotes));
        }
    }, [customSelectedNotes]);

    // CHORD DESIGNER STATE
    const [designerRoot, setDesignerRoot] = useState<string>('C');
    const [designerType, setDesignerType] = useState<'major' | 'minor'>('major'); // 'major' | 'minor'
    const [designerStrings, setDesignerStrings] = useState<number[]>([0, 1, 2, 3, 4, 5]); // All strings active initially

    // PROGRESSION & SETTINGS
    // const [proMode, setProMode] = useState... // Props now
    // const [showSettings, setShowSettings] = useState(false); // Props in Layout
    // useEffect(() => { localStorage.setItem('fretboardProMode', proMode); }, [proMode]); // App handles this

    // FORCE BODY NO-SCROLL (HORIZONTAL) to allow Full Bleed
    useEffect(() => {
        const originalOverflowX = document.body.style.overflowX;
        document.body.style.overflowX = 'hidden';
        return () => {
            document.body.style.overflowX = originalOverflowX;
        };
    }, []);

    // REF FOR DRAG-TO-PLAY INTERACTION
    // REF FOR DRAG-TO-PLAY INTERACTION & GAME LOGIC
    const isPointerDown = useRef<boolean>(false);
    const lastPlayedRef = useRef<string | null>(null);
    const dragSelectRef = useRef<{ active: boolean; type: 'add' | 'remove' | 'note' | 'string' | null; action: string | null }>({ active: false, type: null, action: null });
    const scrollAreaRef = useRef<HTMLDivElement | null>(null); // Ref for Fretboard Scroll Area

    // AUDIO & GAME REFS (Consolidated)
    const lastTargetRef = useRef<string | null>(null);
    const synthRef = useRef<Tone.Synth | null>(null);
    const stringSynths = useRef<Tone.Sampler[]>([]);
    const timerRef = useRef<any>(null); // Use any for Timeout compatibility
    const timeoutsRef = useRef<Record<string, any>>({});
    const startTimeRef = useRef(0);
    const bellSynth = useRef<Tone.Synth | null>(null); // It is a Synth, not PolySynth
    const failSynth = useRef<Tone.Synth | null>(null);
    const isProcessingRef = useRef(false);
    const isDraggingRef = useRef(false);

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

    // Auto-Scroll for Memory Game
    useEffect(() => {
        if (!memoryTarget) return;

        if (memoryTarget.f === 0) {
            // If target is Open String (Nut), reset board scroll to start (Fret 1)
            // This ensures context is visible next to the Nut.
            if (scrollAreaRef.current) {
                scrollAreaRef.current.scrollTo({ left: 0, behavior: 'smooth' });
            }
        } else {
            // Auto-Scroll to center the target note on the board
            requestAnimationFrame(() => {
                const el = document.getElementById(`note-cell-${memoryTarget.s}-${memoryTarget.f}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
            });
        }
    }, [memoryTarget]);

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
    const [triadKey, setTriadKey] = useState<TriadKey>('A-Major');
    const [triadSet, setTriadSet] = useState<'top' | 'middle' | 'bottom'>('top');
    const [triadGameMode, setTriadGameMode] = useState<'current' | 'all'>('current'); // 'current' or 'all'

    // Initialize with default
    const [userPresets, setUserPresets] = useState<Preset[]>([]);

    // Hydrate User Presets
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('fretboardUserPresets');
                if (saved) setUserPresets(JSON.parse(saved));
            } catch (e) { }
        }
    }, []);

    const [isCreatingPreset, setIsCreatingPreset] = useState<boolean>(false);
    const [isDeletingPresets, setIsDeletingPresets] = useState<boolean>(false);
    const [newPresetName, setNewPresetName] = useState<string>('');

    useEffect(() => {
        if (typeof window !== 'undefined') localStorage.setItem('fretboardUserPresets', JSON.stringify(userPresets));
    }, [userPresets]);

    const savePreset = () => {
        if (!newPresetName.trim()) {
            setIsCreatingPreset(false);
            return;
        }
        const newPreset = {
            id: Date.now().toString(),
            name: newPresetName.toUpperCase(),
            notes: [...customSelectedNotes]
        };
        setUserPresets(prev => [...prev, newPreset]);
        setIsCreatingPreset(false);
        setNewPresetName('');
    };
    const [triadGameActive, setTriadGameActive] = useState<boolean>(false);
    const [triadTarget, setTriadTarget] = useState<TriadTarget | null>(null);
    const [triadTimeLeft, setTriadTimeLeft] = useState<number>(60);

    // Timer Ref specific for Triad Hunt
    const triadTimerRef = useRef<any>(null);

    const startTriadGame = (mode: 'current' | 'all' = 'current') => {
        setTriadGameMode(mode);
        setTriadGameActive(true);
        setScore(0);
        setTriadTimeLeft(60);
        setRevealed({});
        nextTriadTarget(mode); // Pass mode to ensure immediate effect

        // Start Timer
        if (triadTimerRef.current) clearInterval(triadTimerRef.current);
        (triadTimerRef.current as any) = setInterval(() => {
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

    const nextTriadTarget = (modeOverride?: 'current' | 'all') => {
        const mode = modeOverride || triadGameMode;

        let keys: TriadKey[], sets: ('top' | 'middle' | 'bottom')[];

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
        // const rShapeIndex = Math.floor(Math.random() * shapes.length);
        // const rShapeName = shapes[rShapeIndex];

        // Note: rShapeName is still needed to find object, but we now rely on array index for "Pos 1, 2, 3"
        // Actually, our sorted array logic means we can just pick index 0, 1, or 2.

        // Let's explicitly pick index 0, 1, or 2
        const rIndex = Math.floor(Math.random() * 3);
        const shapeData = (TRIAD_SHAPES as any)[rKey][rSet][rIndex];

        setTriadTarget({
            key: rKey,
            set: rSet,
            name: shapeData.name, // e.g. '1st Inv'
            posLabel: `POS ${rIndex + 1}`, // e.g. 'POS 1'
            notes: shapeData.notes
        } as any);
        setRevealed({}); // Hide notes, user must find them!
    };

    // Check click for Triad Game
    const checkTriadClick = (stringIndex: number, fretIndex: number) => {
        if (!triadGameActive || !triadTarget) return;

        // Is this note part of the target?
        const isCorrect = (triadTarget as any).notes.some((n: any) => n.s === stringIndex && n.f === fretIndex);

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

    const switchGameMode = (mode: GameMode) => {
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

    const showTriadByPosition = (index: number) => {
        setRevealed({});
        const shapes = (TRIAD_SHAPES as any)[triadKey][triadSet];
        const shape = shapes[index];

        if (shape) {
            const newRevealed: Record<string, boolean> = {};
            shape.notes.forEach((n: any) => {
                newRevealed[`${n.s}-${n.f}`] = true;
            });
            setRevealed(newRevealed);

            // Feedback
            setFeedbackMsg(`${shape.name.toUpperCase()} (POS ${index + 1})`);

            // Play Arpeggio
            const sortedNotes = [...shape.notes].sort((a: any, b: any) => a.s - b.s);

            sortedNotes.forEach((n: any, i: number) => {
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
        lastTargetRef.current = null;
        nextMemoryTarget();
    };

    const stopMemoryGame = (finished = false) => {
        setMemoryGameActive(false);
        setMemoryTarget(null);
        setRevealed({});
    };

    const nextMemoryTarget = () => {
        let validPositions: NoteConfig[] = [];

        if (customSelectedNotes.length > 0) {
            // USE CUSTOM SELECTION (The One Source of Truth)
            validPositions = customSelectedNotes.map(key => {
                const [s, f] = key.split('-').map(Number);
                return { s, f, note: getNoteAt(s, f) };
            });
        }

        if (validPositions.length === 0) {
            setFeedbackMsg("NO NOTES SELECTED!");
            stopMemoryGame();
            return;
        }

        // SMART RANDOM: Weighted Selection based on Session History
        let candidates = validPositions;
        if (candidates.length > 1 && lastTargetRef.current) {
            candidates = candidates.filter(p => `${p.s}-${p.f}` !== lastTargetRef.current);
        }

        // Calculate Weights
        // Base weight = 10. Wrong answer adds massive weight (+25) to prioritize review.
        const weightedPool = candidates.map(p => {
            const h = sessionHistory[p.note!] || { correct: 0, wrong: 0 };
            const weight = 10 + (h.wrong * 25);
            return { pos: p, weight };
        });

        const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
        let randomVal = Math.random() * totalWeight;

        // Roulette Selection
        let selectedPos = weightedPool[0].pos; // Fallback
        for (let item of weightedPool) {
            if (randomVal < item.weight) {
                selectedPos = item.pos;
                break;
            }
            randomVal -= item.weight;
        }

        lastTargetRef.current = `${selectedPos.s}-${selectedPos.f}`;
        setMemoryTarget(selectedPos);
        setRevealed({});
    };

    const handleMemoryGuess = (guessedNote: string, e?: any) => {
        if (!memoryTarget) return;

        // Ensure note property exists
        const targetNote = memoryTarget.note;
        if (!targetNote) return;

        if (guessedNote === targetNote) {
            // Correct!
            setSessionHistory(prev => ({
                ...prev,
                [targetNote]: {
                    correct: (prev[targetNote]?.correct || 0) + 1,
                    wrong: (prev[targetNote]?.wrong || 0)
                }
            }));

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



    // FX Synths (Consolidated above)
    // Refs consolidated to top of component to avoid duplicates

    // Global MouseUp to stop dragging safely
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            isDraggingRef.current = false;
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    // Synths initialized in useEffect

    // Initialize Synths
    useEffect(() => {
        if (!audioEnabled) return;
        // OPTIMIZATION: Zero lookahead for instant response
        Tone.context.lookAhead = 0;

        // Tighter Reverb for snappier feel
        const reverb = new Tone.Reverb({ decay: 2.0, preDelay: 0.001, wet: 0.2 }).toDestination();

        const urls = { "E2": "E2.wav", "A2": "A2.wav", "D3": "D3.wav", "G3": "G3.wav", "B3": "B3.wav", "E4": "E4.wav" };
        const baseUrl = "https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples/guitar-acoustic/";

        const samplers: Tone.Sampler[] = [];
        let loadedCount = 0;

        for (let i = 0; i < 6; i++) {
            const s = new Tone.Sampler({
                urls: urls,
                baseUrl: baseUrl,
                release: 0.2, // Short release for fast damping
                // maxPolyphony removed (unsupported in Partial<SamplerOptions>)
                onload: () => {
                    loadedCount++;
                    if (loadedCount === 6) setIsLoaded(true);
                }
            }).connect(reverb);
            samplers.push(s);
        }
        stringSynths.current = samplers as any;
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
    }, [audioEnabled]);



    // STUDY MODE LOGIC
    useEffect(() => {
        if (studyMode) {
            // Find all instances of practiceTargetNote (Restrict to first 12 frets)
            // Highlight notes on Strings 0 (Low E) up to (numberOfStrings - 1)
            const newRevealed: Record<string, boolean> = {};
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


    const playNote = async (note: string, stringIndex: number) => {
        if (Tone.context.state !== 'running') {
            await Tone.start();
        }
        const sampler = stringSynths.current[stringIndex] as Tone.Sampler;
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
                    (synthRef.current as unknown as Tone.Synth).triggerRelease(Tone.now());
                } catch (e) {
                    // Ignore release errors
                }
            }

            // 2. Play new note
            (synthRef.current as unknown as Tone.Synth).triggerAttackRelease(note, 2, Tone.now());

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

        // Stop
        drum.triggerRelease(now + 1.5);
        noise.stop(now + 1.5);
    };

    // --- TIMER LOGIC ---
    const startTimer = (): void => {
        startTimeRef.current = Date.now();
        if (timerRef.current) cancelAnimationFrame(timerRef.current);

        const loop = (): void => {
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

    const failGame = (): void => {
        if (timerRef.current) cancelAnimationFrame(timerRef.current);
        setFeedbackMsg('GAME OVER! 💀');
        setPracticeActive(false);
        playFail();
        setTimeout(() => stopPractice(), 2000);
    };

    const startPractice = async (): Promise<void> => {
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

    const stopPractice = (): void => {
        if (timerRef.current) cancelAnimationFrame(timerRef.current);
        setPracticeActive(false);
        setCurrentStringIndex(null);
        setFeedbackMsg('');
        setRevealed({});
        setTimerProgress(0);
        setGameFeedback({});
        // High Score is handled in handlePracticeClick to avoid closure staleness
    };

    const handlePracticeClick = (stringIndex: number, fretIndex: number): void => {
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

            if (currentStringIndex !== null && currentStringIndex < maxIndex) {
                // NEXT STRING
                setScore(s => s + pointsForThisTurn); // Just regular update
                setCurrentStringIndex(prev => (prev === null ? null : prev + 1));

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
                        // setHighScore(finalTotal); // REMOVED: undefined function
                        localStorage.setItem('fretboardHighScore', finalTotal.toString());
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


    const handleInteraction = async (stringIndex: number, fretIndex: number, note: string) => {
        // 1. Ensure Audio Context is running (Crucial for Mobile)
        if (Tone.context.state !== 'running') {
            await Tone.start();
        }

        // 2. Play Audio (Allowed on all devices now)
        const fullNote = getNoteWithOctave(stringIndex, fretIndex);
        playNote(fullNote, stringIndex);

        // 3. Custom Mode Selection Logic
        if (isCustomSelectionMode) {
            const key = `${stringIndex}-${fretIndex}`;
            setCustomSelectedNotes(prev => {
                const exists = prev.includes(key);
                if (exists) {
                    return prev.filter(k => k !== key);
                } else {
                    // Force Enable String logic
                    if (!memoryAllowedStrings.includes(stringIndex)) {
                        setMemoryAllowedStrings(sPrev =>
                            sPrev.includes(stringIndex) ? sPrev : [...sPrev, stringIndex]
                        );
                    }
                    return [...prev, key];
                }
            });
            return;
        }

        // Check if it's a memory game target
        if (activeGameMode === 'memory' && memoryGameActive) {
            handleMemoryGuess(getNoteAt(stringIndex, fretIndex));
            return;
        }

        // Check if it's a triad game target
        if (triadGameActive) {
            checkTriadClick(stringIndex, fretIndex);
            return;
        }

        // Check if it's a practice game target
        if (practiceActive) {
            handlePracticeClick(stringIndex, fretIndex);
            return;
        }

        // Default Explorer Mode (and Study interaction)
        toggleNote(stringIndex, fretIndex);
    };


    const handleFretClick = (stringIndex: number, fretIndex: number): void => {
        // Logic is now mostly in handleInteraction via pointer events
        // But for accessibility or specific click logic:
        const noteName = getNoteWithOctave(stringIndex, fretIndex);
        // playNote(noteName, stringIndex); // Moved to PointerDown for speed
    };

    const toggleNote = (stringIndex: number, fretIndex: number): void => {
        // Normal Exploration Mode (and Study interaction)
        const key = `${stringIndex}-${fretIndex}`;
        const fullNote = getNoteWithOctave(stringIndex, fretIndex);
        const isCurrentlyRevealed = !!revealed[key];

        // Always play sound
        playNote(fullNote, stringIndex);

        if (!studyMode) {
            // EXPLORER MODE: "Flash" the note for 1.5s

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

    const isRevealed = (s: number, f: number): boolean => !!revealed[`${s}-${f}`];
    const getFeedback = (s: number, f: number): string | undefined => gameFeedback[`${s}-${f}`];

    // Generate Inlays using Grid positioning
    const renderInlays = (maxFrets: number = 22): React.ReactNode[] => {
        return [...MARKERS, ...DOUBLE_MARKERS]
            .filter(fret => fret <= maxFrets)
            .map(fret => {
                const colIndex = fret; // Fret N = Grid Col N (Since Col 1 is Fret 1)

                if (DOUBLE_MARKERS.includes(fret)) {
                    return (
                        <div key={`inlay-${fret}`} style={{
                            gridColumn: colIndex,
                            gridRow: '1 / 7', // SPAN ONLY STRING ROWS (1-6) to maintain vertical centering
                            display: 'grid',
                            gridTemplateRows: 'repeat(6, 1fr)',
                            justifyItems: 'center', // Center horizontally in the fret
                            alignItems: 'center',   // Center vertically in the grid
                            height: '100%',
                            zIndex: 0,
                            pointerEvents: 'none'
                        }}>
                            {/* Dot on B String (Row 2, Index 4) -> Nudged Down */}
                            <div className="marker double" style={{ gridRow: 2, position: 'static', transform: 'translateY(30%)', margin: 0 }}></div>

                            {/* Dot on A String (Row 5, Index 1) -> Nudged Up */}
                            <div className="marker double" style={{ gridRow: 5, position: 'static', transform: 'translateY(-30%)', margin: 0 }}></div>
                        </div>
                    );
                } else {
                    // Ensure we don't render single markers for double marker frets
                    if (DOUBLE_MARKERS.includes(fret)) return null;

                    return (
                        <div key={`inlay-${fret}`} className="marker single" style={{
                            gridColumn: colIndex,
                            gridRow: '1 / 7', // SPAN ONLY STRING ROWS (1-6)
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
    const hideAll = (): void => setRevealed({});

    return (
        <div className="fretboard-wrapper" style={{
            marginTop: '0',
            width: '100vw',
            marginLeft: '50%',
            transform: 'translateX(-50%)', // Centered Full Width Breakout
            maxWidth: 'none',
            alignItems: 'stretch',
            padding: '0',
            overflowX: 'hidden',
            boxSizing: 'border-box'
        }}>
            <style>{`
                /* Hide scrollbar for Chrome, Safari and Opera */
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                /* Hide scrollbar for IE, Edge and Firefox */
                .no-scrollbar {
                    -ms-overflow-style: none;  /* IE and Edge */
                    scrollbar-width: none;  /* Firefox */
                }
            `}</style>

            {/* UI ELEMENTS REMOVED (Moved to Layout.jsx) */}

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
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPracticeTargetNote(e.target.value)}
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
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSecondsPerNote(Number(e.target.value))}
                                        style={{ width: '100px', accentColor: '#2dd4bf' }}
                                    />
                                    <span style={{ color: '#f8fafc', minWidth: '40px' }}>{secondsPerNote}s</span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <label style={{ color: '#94a3b8', fontWeight: 600 }}>Str:</label>
                                    <select
                                        value={numberOfStrings}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNumberOfStrings(Number(e.target.value))}
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
                                    FIND: <span style={{ color: '#2dd4bf' }}>{formatNote(practiceTargetNote, accidentalMode)}</span>
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
                                                {currentStringIndex !== null ? `STRING ${currentStringIndex + 1} (${formatNote(TUNING[currentStringIndex].slice(0, -1), accidentalMode as AccidentalMode)})` : ''}
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
                                                style={{
                                                    backgroundColor: triadKey === k ? '#a855f7' : '#334155',
                                                    color: 'white',
                                                    border: 'none', borderRadius: '4px', cursor: 'pointer',
                                                    fontSize: '0.9rem', padding: '6px 12px'
                                                }}
                                                onClick={() => setTriadKey(k as TriadKey)}
                                            >
                                                {k.replace('-', ' ')}
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
                                                onClick={() => setTriadSet(s as 'top' | 'middle' | 'bottom')}
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
                                    {triadTarget && (() => {
                                        const [root, type] = triadTarget.key.split('-'); // e.g. "A#", "Major"
                                        return `${formatNote(root, accidentalMode as AccidentalMode)} ${type}`.toUpperCase();
                                    })()}
                                </div>

                                <div style={{ fontSize: '1.5rem', color: '#f8fafc', marginTop: '15px', display: 'flex', justifyContent: 'center', gap: '15px', alignItems: 'center' }}>
                                    <span style={{ color: '#2dd4bf', background: 'rgba(45, 212, 191, 0.1)', padding: '4px 12px', borderRadius: '6px' }}>
                                        {triadTarget && triadTarget.set.toUpperCase()} SET
                                    </span>
                                    {/* Arrow icon? */}
                                    <span style={{ fontSize: '1.2rem', color: '#64748b' }}>➜</span>
                                    <div style={{ fontSize: '1rem', color: '#cbd5e1', marginTop: '-5px', fontWeight: '500' }}>
                                        {triadTarget && `Position: ${triadTarget.posLabel || (triadTarget.set === 'top' ? 'String 1-2-3' : triadTarget.set === 'middle' ? 'String 2-3-4' : 'String 3-4-5')}`}
                                    </div>
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
            {activeGameMode === 'memory' && !memoryGameActive && (
                <div className="game-hud" style={{ width: 'auto', margin: '0 10px', flexDirection: 'column', gap: '8px', marginBottom: '15px', background: 'rgba(30, 41, 59, 0.5)', padding: '20px', borderRadius: '12px', border: '1px solid #3b82f6', position: 'relative', zIndex: 500 }}>

                    {/* ROW 1: NOTES SELECTOR */}
                    <div className="flex flex-col gap-1 items-center w-full">
                        <div className="flex flex-col items-center gap-1 sm:gap-2 w-full max-w-3xl justify-center">
                            {/* LABEL */}
                            <div className="text-[0.6rem] sm:text-xs font-bold text-slate-500 w-full text-center shrink-0 uppercase tracking-widest">NOTES</div>

                            {/* BUTTONS */}
                            <div className="flex gap-1 sm:gap-2 items-center w-full justify-center">
                                <select
                                    className="bg-slate-800 text-slate-200 text-[0.55rem] sm:text-sm font-bold py-1.5 pl-2 pr-6 sm:py-2 sm:pl-4 sm:pr-10 rounded-lg border border-slate-600 outline-none focus:border-blue-500 appearance-none cursor-pointer"
                                    style={{
                                        backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 0.3rem center',
                                        backgroundSize: '0.65em auto'
                                    }}
                                    onChange={(e) => {
                                        const noteToAdd = e.target.value;
                                        if (!noteToAdd) return;

                                        const fretLimit = 22;

                                        const newSelection = [...customSelectedNotes];

                                        for (let s = 0; s < 6; s++) {
                                            if (!memoryAllowedStrings.includes(s)) continue; // Check string filter
                                            for (let f = 0; f <= fretLimit; f++) {
                                                const currentNote = getNoteAt(s, f);
                                                if (currentNote === noteToAdd) {
                                                    const key = `${s}-${f}`;
                                                    if (!newSelection.includes(key)) {
                                                        newSelection.push(key);
                                                    }
                                                }
                                            }
                                        }
                                        setCustomSelectedNotes(newSelection);
                                        e.target.value = "";
                                    }}
                                >
                                    <option value="">ADD NOTE EVERYWHERE</option>
                                    {GLOBAL_NOTES.map(n => (
                                        <option key={n} value={n}>{formatNote(n, accidentalMode)}</option>
                                    ))}
                                </select>


                                {/* MANUAL SELECTION TOGGLE */}
                                <button
                                    onClick={() => setIsCustomSelectionMode(!isCustomSelectionMode)}
                                    className={`px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[0.55rem] sm:text-sm font-bold border transition-all whitespace-nowrap ${isCustomSelectionMode
                                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20 animate-pulse'
                                        : 'bg-slate-800 text-slate-200 border-slate-600 hover:border-blue-500'
                                        }`}
                                >
                                    {isCustomSelectionMode ? 'END CUSTOM NOTE SELECTION' : 'CUSTOM NOTE SELECTION'}
                                </button>

                                <button
                                    onClick={() => setCustomSelectedNotes([])}
                                    className="px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-slate-700 text-slate-300 text-[0.55rem] sm:text-xs font-bold hover:bg-slate-600 border border-slate-600 whitespace-nowrap"
                                    title="Clear Selection"
                                >
                                    CLEAR ALL
                                </button>
                            </div>

                            {/* INFO TEXT FOR SELECTION MODE */}
                            {isCustomSelectionMode && (
                                <div className="w-full text-center mt-2">
                                    <span className="text-emerald-400 text-xs font-bold tracking-wider animate-pulse">
                                        TAP NOTES ON FRETBOARD TO SELECT
                                    </span>
                                </div>
                            )}


                        </div>
                    </div>

                    {/* ROW 2: STRINGS SELECTOR */}
                    <div className="flex justify-center flex-col items-center gap-[5px] sm:gap-4 mt-[5px] sm:mt-4">
                        <div className="flex flex-col items-center gap-1 sm:gap-2 w-full max-w-3xl justify-center">
                            {/* LABEL */}
                            <div className="text-[0.6rem] sm:text-xs font-bold text-slate-500 w-full text-center shrink-0 uppercase tracking-widest">STRINGS-FILTER</div>

                            <div className="grid grid-cols-6 gap-0.5 sm:gap-1 w-auto min-w-[180px] max-w-[220px] sm:min-w-[300px] sm:max-w-[400px]">
                                {[5, 4, 3, 2, 1, 0].map((stringIndex, i) => (
                                    <button
                                        key={stringIndex}
                                        onPointerDown={(e: React.PointerEvent<HTMLButtonElement>) => {
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
                    </div>

                    {/* PRESETS SECTION (Always Visible) */}
                    <div className="w-full mt-[5px] sm:mt-4 flex flex-col items-center gap-1 sm:gap-2">
                        <span className="text-[0.6rem] sm:text-xs font-bold text-slate-500 w-full text-center shrink-0 uppercase tracking-widest">
                            PRESETS
                        </span>
                        <div className="flex flex-wrap gap-2 justify-center">
                            <button
                                onClick={() => {
                                    const naturals: string[] = [];
                                    for (let s = 0; s < 6; s++) {
                                        for (let f = 0; f <= 22; f++) {
                                            const note = getNoteAt(s, f);
                                            if (!note.includes('#')) {
                                                naturals.push(`${s}-${f}`);
                                            }
                                        }
                                    }
                                    setCustomSelectedNotes(naturals);
                                }}
                                className="px-2 py-1 rounded-full bg-slate-700 text-slate-300 text-[0.65rem] font-bold hover:bg-slate-600 border border-slate-600 transition-colors"
                            >
                                NATURALS
                            </button>

                            {/* USER PRESETS */}
                            {userPresets.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => {
                                        if (isDeletingPresets) {
                                            setUserPresets(prev => prev.filter(p => p.id !== preset.id));
                                        } else {
                                            setCustomSelectedNotes(preset.notes);
                                        }
                                    }}
                                    className={`px-2 py-1 rounded-full text-[0.65rem] font-bold transition-all ${isDeletingPresets
                                        ? 'bg-red-900/50 text-red-300 border border-red-500 hover:bg-red-800 animate-pulse'
                                        : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600'
                                        }`}
                                >
                                    {preset.name} {isDeletingPresets && '×'}
                                </button>
                            ))}

                            {/* NEW PRESET INPUT OR BUTTON */}
                            {isCreatingPreset ? (
                                <input
                                    autoFocus
                                    value={newPresetName}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPresetName(e.target.value.toUpperCase())}
                                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                        if (e.key === 'Enter') savePreset();
                                        if (e.key === 'Escape') {
                                            setIsCreatingPreset(false);
                                            setNewPresetName('');
                                        }
                                    }}
                                    onBlur={savePreset}
                                    className="px-2 py-1 rounded-full bg-blue-900/50 text-blue-200 text-[0.65rem] font-bold border border-blue-500 w-24 outline-none text-center h-[26px]"
                                    placeholder="NAME"
                                />
                            ) : (
                                <>
                                    <button
                                        onClick={() => {
                                            if (customSelectedNotes.length === 0) {
                                                alert("Select notes first!");
                                                return;
                                            }
                                            setIsCreatingPreset(true);
                                            setIsDeletingPresets(false);
                                        }}
                                        className="px-2 py-1 rounded-full bg-blue-600/20 text-blue-400 text-[0.65rem] font-bold hover:bg-blue-600/40 border border-blue-500/50 transition-colors"
                                    >
                                        + NEW PRESET
                                    </button>
                                    {userPresets.length > 0 && (
                                        <button
                                            onClick={() => setIsDeletingPresets(!isDeletingPresets)}
                                            className={`px-2 py-1 rounded-full text-[0.65rem] font-bold border transition-colors ${isDeletingPresets
                                                ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-500/20'
                                                : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-red-400 hover:border-red-500/50'
                                                }`}
                                        >
                                            {isDeletingPresets ? 'DONE' : 'DELETE'}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* ROW 3: START BUTTON */}
                    <div className="mt-3 flex gap-4 items-center justify-center w-full">
                        <button
                            onClick={startMemoryGame}
                            className="h-9 px-6 sm:h-12 sm:px-8 rounded-lg font-bold text-xs sm:text-base bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 hover:scale-105 transition-all"
                        >
                            START HUNT
                        </button>
                    </div>

                </div>
            )}

            {
                activeGameMode === 'memory' && memoryGameActive && (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '60px', marginBottom: '60px', padding: '0 20px' }}>

                        {toolMetadata && (
                            <p className="text-center text-slate-400 text-xs sm:text-sm max-w-md mb-6 leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-700 font-medium">
                                Choose the correct note in the circle!<br />
                                To add more notes, <span className="text-white font-bold">stop the quiz</span> and use custom note selection. Good luck!
                            </p>
                        )}

                        <button
                            onClick={() => stopMemoryGame(false)}
                            className="h-9 px-6 sm:h-12 sm:px-8 rounded-lg font-bold text-xs sm:text-base bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600 transition-all shadow-xl shadow-black/40"
                        >
                            STOP HUNTING
                        </button>
                    </div>
                )
            }

            {/* Fretboard Scroll Container - Forced Scrollability */}
            <div className="fretboard-scroll-container no-scrollbar" style={{
                padding: (activeGameMode === 'memory' && memoryTarget?.f === 0) ? '0 10px 0 60px' : '0 10px',
                transition: 'padding 0.3s ease',
                display: 'flex',
                width: '100%',
                position: 'relative',
                overflowX: 'auto', // Must be auto to scroll
                overflowY: 'hidden',
                touchAction: 'pan-x', // Explicitly allow horizontal panning
                WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
                flex: 1
            }}>

                {/* LEFT GUTTER: String Numbers */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flexShrink: 0,
                    marginTop: '1px', // Fine-tune alignment with board border
                    marginRight: '12px',
                    height: 'calc(6 * var(--string-height))', // 6 strings * var(--string-height)
                    position: 'sticky',
                    left: 0,
                    zIndex: 20,
                    backgroundColor: 'transparent' // Ensure opacity over scrolling content
                }}>
                    {/* Loop 1 to 6 (Top to Bottom) directly since Flex is Column */
                        [1, 2, 3, 4, 5, 6].map((num: number) => (
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

                {/* FIXED NUT PANEL (Outside Scroll Area) */}
                <div style={{
                    position: 'relative',
                    width: 'var(--nut-width)',
                    minWidth: 'var(--nut-width)',
                    height: 'calc(6 * var(--string-height) + 30px)', // +30px for number row alignment (empty)
                    zIndex: 30,
                    // Border and Shadow moved to inner content to allow bottom cap to mask it
                }}>
                    {/* Rotated Wood Background & Bone Nut */}
                    <div style={{
                        position: 'absolute',
                        top: 'calc(var(--string-height) / 2 - 10.2px)',
                        height: 'calc(5 * var(--string-height) + 20.4px)',
                        left: 0, right: 0,
                        overflow: 'hidden',
                        zIndex: 0,
                        borderRight: '5px solid #ded6d0',
                        boxShadow: '4px 0 8px rgba(0,0,0,0.5)',
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: '50%', left: '50%',
                            width: '200vw', height: '200vw',
                            transform: 'translate(-50%, -50%) rotate(90deg)',
                            backgroundImage: "url('/fretboard-wood-pale.webp')",
                            backgroundRepeat: 'repeat',
                        }} />
                    </div>

                    {/* Strings & Interactions */}
                    <div style={{
                        position: 'relative',
                        zIndex: 10,
                        height: 'calc(6 * var(--string-height))',
                        // borderRight: '5px solid #ded6d0', // MOVED to visual div
                        // boxShadow: '4px 0 8px rgba(0,0,0,0.5)', // MOVED to visual div
                        display: 'flex',
                        flexDirection: 'column'

                    }}>
                        {TUNING.slice().reverse().map((noteCode: string, visualIndex: number) => {
                            // visualIndex 0 = High E (String 5)
                            // visualIndex 5 = Low E (String 0)
                            const sIndex = 5 - visualIndex;

                            const thickness = (1 + (5 - sIndex) * 0.6) * (isMobile ? 1 : 1.5);
                            const isWound = sIndex <= 2;
                            const isActive = practiceActive && currentStringIndex === sIndex;
                            const openNote = getNoteAt(sIndex, 0);

                            // Memory Game Check
                            const isAllowed = !(activeGameMode === 'memory' && memoryGameActive && !memoryAllowedStrings.includes(sIndex));

                            // VISUAL LOGIC FOR OPEN STRINGS
                            const revealedState = isRevealed(sIndex, 0);
                            const feedbackState = getFeedback(sIndex, 0);
                            const isMemoryTarget = (activeGameMode === 'memory' && memoryTarget && memoryTarget.s === sIndex && memoryTarget.f === 0 && !revealedState);



                            const isDesignerNote = false;
                            const isCustomSelected = !memoryGameActive && customSelectedNotes.includes(`${sIndex}-0`) && memoryAllowedStrings.includes(sIndex);
                            const isVisible = revealedState || isDesignerNote || isCustomSelected;

                            return (
                                <div key={`nut-string-${sIndex}`} style={{
                                    flex: 1,
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {/* String Line */}
                                    <div style={{
                                        position: 'absolute',
                                        left: 0, right: -5, // Extend slightly into border
                                        height: `${thickness}px`,
                                        backgroundColor: isActive ? '#facc15' : (isWound ? 'transparent' : '#aa9992'),
                                        backgroundImage: (!isActive && isWound) ? 'url("/string-closeup.webp")' : 'none',
                                        backgroundRepeat: 'repeat-x',
                                        backgroundSize: 'auto 100%',
                                        zIndex: 1,
                                        boxShadow: isActive ? '0 0 10px #facc15' : 'none'
                                    }} />

                                    {/* Interaction Button + Visuals */}
                                    <div
                                        className={`note-cell ${isVisible ? 'visible' : ''}`}
                                        id={`note-cell-${sIndex}-0`}
                                        data-string={sIndex}
                                        data-fret={0}
                                        style={{
                                            width: '100%', height: '100%',
                                            zIndex: isCustomSelectionMode ? 100 : 20,
                                            cursor: 'pointer',
                                            touchAction: 'none', // Critical for Drag-to-Play
                                            pointerEvents: (isCustomSelectionMode || isAllowed) ? 'auto' : 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => {
                                            e.preventDefault();
                                            // Unified Pointer Handler for Nut
                                            isPointerDown.current = true;
                                            lastPlayedRef.current = `${sIndex}-0`;
                                            // Hand off strictly to handleInteraction
                                            handleInteraction(sIndex, 0, openNote);
                                        }}
                                        onPointerMove={(e: React.PointerEvent<HTMLDivElement>) => {
                                            if (isPointerDown.current) {
                                                const target = document.elementFromPoint(e.clientX, e.clientY);
                                                const cell = target?.closest('.note-cell'); // Works for both Nut and Fretboard cells

                                                if (cell) {
                                                    const s = parseInt(cell.getAttribute('data-string') || '0');
                                                    const f = parseInt(cell.getAttribute('data-fret') || '0');
                                                    const key = `${s}-${f}`;

                                                    if (lastPlayedRef.current !== key) {
                                                        lastPlayedRef.current = key;
                                                        const simpleNote = getNoteAt(s, f);
                                                        handleInteraction(s, f, simpleNote);
                                                    }
                                                }
                                            }
                                        }}
                                    >
                                        <div
                                            className={`note-circle ${isVisible ? 'revealed' : ''} ${feedbackState || ''} ${isMemoryTarget ? 'memory-target' : ''}`}
                                            style={{
                                                position: 'absolute',
                                                top: '50%',
                                                left: '50%',
                                                transform: 'translate(-50%, -50%)',

                                                width: 'min(26px, var(--string-height))',
                                                height: 'min(26px, var(--string-height))',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 5,
                                                ...(isCustomSelected ? {
                                                    backgroundColor: '#3b82f6',
                                                    borderColor: '#60a5fa',
                                                    color: '#ffffff',
                                                    boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)',
                                                    fontWeight: 'bold',
                                                    opacity: 0.9
                                                } : {})
                                            }}
                                        >
                                            {isMemoryTarget ? '?' : formatNote(openNote, accidentalMode)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Bottom Cap (aligns with numbers) */}
                    <div style={{
                        height: '30px',
                        background: 'transparent',
                        position: 'relative',
                        zIndex: 10
                    }} />
                </div>

                <div
                    ref={scrollAreaRef}
                    className="scroll-area no-scrollbar" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        width: '100%',
                        minWidth: 0,
                        overflowX: 'auto'
                    }}>
                    {(() => {
                        const renderFretCount = 22; // ALWAYS render full board (22 frets) per user request
                        const visibleFretCount = fretCount; // User setting controls ZOOM (how many visible)

                        // Layout Width Formula
                        let boardWidth: string, gridCols: string;

                        if (isMobile) {
                            // MOBILE: Linear / Constant Width
                            // Logic: We want 'visibleFretCount' to equal 100% width.
                            // So Total Width = (TotalFrets / VisibleFrets) * 100%
                            const totalRatio = renderFretCount / visibleFretCount;

                            // Adjust for Nut Width not scaling?
                            // Simplification: proportional scaling including nut is roughly ok for linear.
                            // Precise: (Nut + 22 * FretW) vs (Nut + 13 * FretW) = 100%.
                            // Let's stick to the multiplier, it's robust.
                            // Let's stick to the multiplier, it's robust.
                            boardWidth = `${totalRatio * 100}%`;
                            gridCols = `repeat(${renderFretCount}, 1fr)`;
                        } else {
                            // DESKTOP: Realistic Tapering
                            const visibleRatioSum = FRET_WIDTH_RATIOS.slice(0, visibleFretCount).reduce((a, b) => a + b, 0);
                            const totalRatioSum = FRET_WIDTH_RATIOS.slice(0, renderFretCount).reduce((a, b) => a + b, 0);

                            const expansionFactor = totalRatioSum / visibleRatioSum;
                            boardWidth = `calc(${expansionFactor} * 100%)`;
                            gridCols = `${FRET_WIDTH_RATIOS.slice(0, renderFretCount).map(r => `${r}fr`).join(' ')}`;
                        }

                        return (
                            <>
                                <div className="fretboard" style={{
                                    width: boardWidth,
                                    gridTemplateColumns: gridCols,
                                    gridTemplateRows: 'repeat(6, var(--string-height)) 30px', // Added row for numbers
                                    height: 'auto' // Allow growth
                                }}>
                                    {/* Inlays (Background) */}
                                    {/* GRID-CONFINED WOOD BACKGROUND */}
                                    {/* Override the CSS pseudo-element which spills over */}
                                    <style>{`
                                        .fretboard::before { display: none !important; }
                                    `}</style>
                                    <div style={{
                                        gridColumn: '1 / -1',
                                        gridRow: '1 / 7', // Span only string rows (1-6).
                                        marginTop: 'calc(var(--string-height) / 2 - 10.2px)',
                                        marginBottom: 'calc(var(--string-height) / 2 - 10.2px)',
                                        // Wait, the numbers (Row 7) have their own background.
                                        // So Wood should only be under strings.
                                        // Correct.
                                        zIndex: 0,
                                        // Audio Output Logic from CSS was: translate(-50%, -50%) rotate(90deg) width 200vw.
                                        // If I use standard background, grain is vertical?
                                        // Wood grain usually runs HORIZONTALLY along the neck.
                                        // Images usually vertical.
                                        // If I need to rotate the grain 90deg...
                                        // I can use a transformed inner div.
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            position: 'absolute',
                                            top: '50%', left: '50%',
                                            width: '200vw', height: '200vw',
                                            transform: 'translate(-50%, -50%) rotate(90deg)',
                                            backgroundImage: "url('/fretboard-wood-pale.webp')",
                                            backgroundRepeat: 'repeat'
                                        }}></div>
                                    </div>

                                    {/* Inlays (Background) */}
                                    {renderInlays()}

                                    {/* STICKY NUT LAYER (Hidden - Replaced by External Panel) */}
                                    <div style={{
                                        display: 'none',
                                        gridColumn: '1 / -1', // Span full grid to allow sticky to work
                                        width: 'var(--nut-width)', // Restrict width to Nut size
                                        gridRow: '1 / 7',
                                        position: 'sticky',
                                        left: 0,
                                        zIndex: 40,
                                        // Wood Background and Border handled by visual child
                                    }}>
                                        {/* Visual Nut with Trimmed Edges */}
                                        <div style={{
                                            position: 'absolute',
                                            top: 'calc(var(--string-height) / 2 - 10.2px)',
                                            bottom: 'calc(var(--string-height) / 2 - 10.2px)',
                                            left: 0, right: 0,
                                            borderRight: '5px solid #ded6d0', // Bone white/grey color
                                            boxShadow: '4px 0 8px rgba(0,0,0,0.5)', // Shadow specifically casting onto the scrolling board
                                            overflow: 'hidden',
                                            zIndex: -1
                                        }}>
                                            {/* Rotated Wood Background */}
                                            <div style={{
                                                position: 'absolute',
                                                top: '50%', left: '50%',
                                                width: '200vw', height: '200vw',
                                                transform: 'translate(-50%, -50%) rotate(90deg)',
                                                backgroundImage: "url('/fretboard-wood-pale.webp')",
                                                backgroundRepeat: 'repeat',
                                                zIndex: -1
                                            }} />
                                        </div>

                                        {/* Static String Segments for the Nut Area */}
                                        {TUNING.map((_, sIndex: number) => {
                                            const visualRow = 6 - sIndex; // 1-based row index? No, this is Absolute inside the div.
                                            // We need to position these "strings" exactly where the grid rows are.
                                            // Grid rows are `var(--string-height)`.
                                            // So String 0 (Bottom, Row 6) is at top: 5 * string-height + 50%?
                                            // Usage: `top: calc((6 - sIndex - 1) * var(--string-height) + 50%)`?
                                            // Let's use Flexbox or Grid inside this Sticky Layer to match perfectly.
                                            // Actually, easier: This Sticky Layer IS a Grid too?
                                            // Or just use absolute positioning percentages:
                                            // Row 1 (Top) = 0% to 16.66%
                                            // Center of Row 1 = 8.333%.
                                            // Since we have 6 rows...

                                            // Let's replicate the thickness logic
                                            const thickness = (1 + (5 - sIndex) * 0.6) * (isMobile ? 1 : 1.5);
                                            const isWound = sIndex <= 2;
                                            const isActive = practiceActive && currentStringIndex === sIndex; // Keep active highlight? Sure.

                                            return (
                                                <div
                                                    key={`nut-string-${sIndex}`}
                                                    style={{
                                                        position: 'absolute',
                                                        left: 0, right: 0,
                                                        height: `${thickness}px`,
                                                        // Calculate Top:
                                                        // Visual Row 1 (High E) is sIndex 5.
                                                        // Visual Row 6 (Low E) is sIndex 0.
                                                        // We want sIndex 5 to be at 1/12th of height?
                                                        // Center of first row is 1/12 aka 8.333%.
                                                        // Center of nth row is (n-1)*1/6 + 1/12.
                                                        top: `${((6 - sIndex - 1) * (100 / 6)) + (100 / 12)}%`,
                                                        transform: 'translateY(-50%)',

                                                        backgroundColor: isActive ? '#facc15' : (isWound ? 'transparent' : '#aa9992'),
                                                        backgroundImage: (!isActive && isWound) ? 'url("/string-closeup.webp")' : 'none',
                                                        backgroundRepeat: 'repeat-x',
                                                        backgroundSize: 'auto 100%',
                                                        boxShadow: isActive ? '0 0 10px #facc15' : '0 1px 2px rgba(0,0,0,0.6)',
                                                        zIndex: 45 // Above wood
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>

                                    {/* Fret Lines */}
                                    {Array.from({ length: renderFretCount }).map((_, i: number) => (
                                        <div
                                            key={`fret-line-${i + 1}`}
                                            className="fret-line"
                                            style={{
                                                gridColumn: i + 1, // Fret 1 is Col 1
                                                gridRow: '1 / 7', // Constrain to strings area
                                                position: 'relative',
                                                marginTop: 'calc(var(--string-height) / 2 - 10.2px)',
                                                marginBottom: 'calc(var(--string-height) / 2 - 10.2px)',
                                                justifySelf: 'end',
                                                right: '-1px'
                                            }}
                                        />
                                    ))}

                                    {/* Strings Visuals */}
                                    {TUNING.map((_, sIndex: number) => {
                                        // VISUAL INVERSION: Low E (0) should be at Bottom (Row 6)
                                        const visualRow = 6 - sIndex;
                                        const isActive = practiceActive && currentStringIndex === sIndex;
                                        const isWound = sIndex <= 2; // Low E, A, D are wound (indices 0, 1, 2)

                                        // Thickness: Low E (0) should be thickest. High E (5) thinnest.
                                        const thickness = (1 + (5 - sIndex) * 0.6) * (isMobile ? 1 : 1.5);

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
                                    {TUNING.map((stringData: string, stringIndex: number) => {
                                        return Array.from({ length: renderFretCount + 1 }).map((_, fretIndex: number) => {
                                            const note = getNoteAt(stringIndex, fretIndex);
                                            const key = `${stringIndex}-${fretIndex}`;
                                            const revealedState = isRevealed(stringIndex, fretIndex);
                                            const feedbackState = getFeedback(stringIndex, fretIndex);

                                            // VISUAL INVERSION: Map stringIndex 0 to Row 6.
                                            const visualRow = 6 - stringIndex;

                                            // MEMORY TARGET CHECK
                                            const isMemoryTarget = memoryGameActive && memoryTarget && memoryTarget.s === stringIndex && memoryTarget.f === fretIndex;



                                            // CHORD DESIGNER LOGIC
                                            let isDesignerNote = false;
                                            let designerColor: string | null = null; // Default
                                            let designerLabel: string | null = null; // R, 3, 5

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
                                                    const gatherCandidates = (centerFret: number) => {
                                                        const candsPerStr: { s: number; cands: { s: number; f: number; note: string; }[]; }[] = [];
                                                        const minF = Math.max(0, centerFret - 6);
                                                        const maxF = Math.min(fretCount, centerFret + 6);

                                                        for (let s of sortedStrings) {
                                                            const cands: { s: number; f: number; note: string; }[] = [];
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
                                                    const findBestShape = (candsPerStr: { s: number; cands: { s: number; f: number; note: string; }[]; }[], forcedNote: { s: number; f: number; } | null = null) => {
                                                        const validShapes: { shape: { s: number; f: number; note: string; }[]; count: number; span: number; bassString: number; bassFret: number; }[] = [];

                                                        const search = (depth: number, currentShape: { s: number; f: number; note: string; }[]) => {
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
                                                            const SHAPE_COLOR_MAP: Record<string, string> = {
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

                                            // Ensure isCustomSelected is defined here
                                            const isCustomSelected = !memoryGameActive && customSelectedNotes.includes(`${stringIndex}-${fretIndex}`) && memoryAllowedStrings.includes(stringIndex);
                                            const isVisible = revealedState || isDesignerNote || isCustomSelected;

                                            return (
                                                <React.Fragment key={key}>
                                                    {/* LAYER 1: NOTE BUTTON */}
                                                    <div
                                                        className={`note-cell ${isVisible ? 'visible' : ''}`}
                                                        id={`note-cell-${stringIndex}-${fretIndex}`}
                                                        data-string={stringIndex}
                                                        data-fret={fretIndex}
                                                        style={{
                                                            gridColumn: fretIndex,
                                                            gridRow: visualRow,
                                                            display: fretIndex === 0 ? 'none' : 'flex',
                                                            pointerEvents: 'auto',
                                                            touchAction: 'none', // Critical for Drag-To-Play on mobile
                                                            position: 'relative',
                                                            zIndex: (isCustomSelectionMode || (practiceActive && currentStringIndex === stringIndex)) ? 30 : 20
                                                        }}
                                                        onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => {
                                                            e.preventDefault();
                                                            isPointerDown.current = true;
                                                            lastPlayedRef.current = `${stringIndex}-${fretIndex}`;
                                                            // Hand off strictly to handleInteraction
                                                            handleInteraction(stringIndex, fretIndex, note);
                                                        }}
                                                        onPointerMove={(e) => {
                                                            if (isPointerDown.current) {
                                                                const target = document.elementFromPoint(e.clientX, e.clientY);
                                                                const cell = target?.closest('.note-cell');

                                                                if (cell) {
                                                                    const sAttr = cell.getAttribute('data-string');
                                                                    const fAttr = cell.getAttribute('data-fret');
                                                                    if (sAttr !== null && fAttr !== null) {
                                                                        const s = parseInt(sAttr, 10);
                                                                        const f = parseInt(fAttr, 10);
                                                                        const key = `${s}-${f}`;

                                                                        if (lastPlayedRef.current !== key) {
                                                                            lastPlayedRef.current = key;
                                                                            const simpleNote = getNoteAt(s, f);
                                                                            handleInteraction(s, f, simpleNote);
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        <div
                                                            className={`note-circle ${isVisible ? 'revealed' : ''} ${feedbackState || ''} ${isMemoryTarget ? 'memory-target' : ''}`}
                                                            style={(
                                                                isCustomSelected ? {
                                                                    backgroundColor: '#3b82f6',
                                                                    borderColor: '#60a5fa',
                                                                    color: '#ffffff',
                                                                    boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)',
                                                                    fontWeight: 'bold',
                                                                    opacity: 0.9
                                                                } : isDesignerNote ? {
                                                                    backgroundColor: designerColor || undefined,
                                                                    borderColor: designerColor || undefined,
                                                                    color: '#0f172a', // Dark text on bright colors
                                                                    boxShadow: `0 0 10px ${designerColor || '#fff'}`,
                                                                    opacity: 1
                                                                } : {}
                                                            ) as React.CSSProperties}
                                                        >
                                                            {isMemoryTarget ? '?' : (isDesignerNote ? designerLabel : formatNote(note, accidentalMode))}
                                                        </div>
                                                    </div>

                                                    {/* LAYER 2: PIE MENU (Overlay on top, independent sibling) */}

                                                </React.Fragment>
                                            );
                                        });
                                    })}
                                    {/* MERGED FRET NUMBERS (Row 7) - Masking Wood Texture */}
                                    {Array.from({ length: renderFretCount + 1 }).map((_, i) => {
                                        const showNumber = MARKERS.includes(i) || DOUBLE_MARKERS.includes(i);
                                        // Render a cell for EVERY fret to mask the wood texture underneath
                                        return (
                                            <div
                                                key={`fret-num-${i}`}
                                                className="fret-number-cell"
                                                style={{
                                                    gridColumn: i,
                                                    gridRow: 7,
                                                    display: i === 0 ? 'none' : 'flex',
                                                    position: 'relative',
                                                    zIndex: 20,
                                                    pointerEvents: 'none', // Allow clicks to pass through to note-cell
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backgroundColor: 'transparent', // Transparent to show wood
                                                    height: '100%',
                                                    width: 'calc(100% + 1px)', // Slight overlap to prevent subpixel gaps
                                                    marginLeft: '-0.5px', // Center the overlap
                                                    border: 'none',
                                                    outline: 'none',
                                                    boxShadow: 'none'
                                                }}
                                            >
                                                {showNumber ? i : ''}
                                            </div>
                                        );
                                    })}
                                </div >
                            </>
                        );
                    })()}
                </div>
            </div>


            {/* ADMIN SAVE UI */}
            {hasAdmin && (
                <>
                    {navbarContainer && createPortal(
                        <button
                            onClick={() => setShowSaveModal(true)}
                            className="bg-amber-600 text-white px-3 py-1 rounded text-xs font-bold shadow-lg border border-amber-400 hover:bg-amber-500 transition-colors"
                            style={{ fontFamily: 'monospace' }}
                        >
                            SAVE URL
                        </button>,
                        navbarContainer
                    )}
                    <SaveToolModal
                        open={showSaveModal}
                        onClose={() => setShowSaveModal(false)}
                        currentSettings={
                            customSelectedNotes.length > 0
                                ? { initialPositions: customSelectedNotes, initialStrings: memoryAllowedStrings }
                                : { initialNotes: memoryAllowedNotes, initialStrings: memoryAllowedStrings }
                        }
                        initialData={toolMetadata}
                    />
                </>
            )}

            {/* OVERLAYS at the end to avoid z-index/clipping issues */}
            {/* PIE MENU (Portal) */}
            <PieMenuOverlay
                target={memoryTarget}
                onGuess={handleMemoryGuess}
                allowedNotes={(() => {
                    if (customSelectedNotes.length > 0) {
                        const unique = new Set<string>();
                        customSelectedNotes.forEach(k => {
                            const parts = k.split('-');
                            const s = parseInt(parts[0], 10);
                            const f = parseInt(parts[1], 10);
                            const n = getNoteAt(s, f);
                            unique.add(n);
                        });
                        return Array.from(unique);
                    }
                    return memoryAllowedNotes;
                })()}
                visible={!!memoryTarget && activeGameMode === 'memory' && memoryGameActive}
                accidentalMode={accidentalMode as any}
            />

        </div >
    );
}

// PIE MENU OVERLAY COMPONENT (Fixed with Portal + rAF Tracking)
const PieMenuOverlay = ({ target, onGuess, allowedNotes, visible, accidentalMode }: {
    target: NoteConfig | null;
    onGuess: (note: string) => void;
    allowedNotes: string[];
    visible: boolean;
    accidentalMode: AccidentalMode;
}) => {
    // We use a Portal to escape clipping
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const radius = 85; // Radius of the menu
    const innerRadius = 50;

    // Ref for the moving container (to update directly without re-renders)
    const overlayRef = useRef<HTMLDivElement>(null);
    const rafId = useRef<number | null>(null);
    const isHoveredRef = useRef(false);

    // Tracking Loop
    useEffect(() => {
        if (!visible || !target || !mounted) return;

        const updatePosition = () => {
            const targetEl = document.getElementById(`note-cell-${target.s}-${target.f}`);
            if (targetEl && overlayRef.current) {
                const rect = targetEl.getBoundingClientRect();
                let centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                // EDGE DETECTION / CLAMPING
                // Ensure menu doesn't go off-screen (Left or Right)
                const margin = 15;
                const minX = radius + margin;
                const maxX = window.innerWidth - radius - margin;

                if (centerX < minX) centerX = minX; // Left edge
                else if (centerX > maxX) centerX = maxX; // Right edge

                // Apply directly to DOM for smoothness during scroll
                overlayRef.current.style.transform = `translate(${centerX}px, ${centerY}px)`;

                // PULSE OPACITY LOGIC (unless hovered)
                if (isHoveredRef.current) {
                    overlayRef.current.style.opacity = '1';
                } else {
                    const time = Date.now();
                    // 2 second period sine wave (0.3 to 0.9)
                    const alpha = 0.6 + 0.3 * Math.sin((time / 2000) * 2 * Math.PI);
                    overlayRef.current.style.opacity = alpha.toFixed(2);
                }

            } else if (overlayRef.current) {
                // Hide if target lost off screen? Or just lost.
                overlayRef.current.style.opacity = '0';
            }
            rafId.current = requestAnimationFrame(updatePosition);
        };

        // Start Loop
        updatePosition();

        return () => {
            if (rafId.current) cancelAnimationFrame(rafId.current);
        };
    }, [visible, target, mounted]);

    if (!visible || !target || !mounted) return null;

    const notes = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'F'];
    // const radius defined above
    // const innerRadius defined above
    const sliceAngle = 360 / 12;

    const content = (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 900, // Below Navbar (1000) and Menu (1999)
            pointerEvents: 'none' // Click through empty space
        }}>
            {/* The Moving Container (Positioned by JS) */}
            <div ref={overlayRef} style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 0, // Zero width/height wrapper, centered by transform
                height: 0,
                transform: 'translate(-1000px, -1000px)', // Initial off-screen
                pointerEvents: 'auto', // Enable interaction with menu
                opacity: 0, // Hidden until first update
                transition: 'opacity 0.1s' // Fade in slightly
            }}>
                {/* Visual Centering Wrapper (-50%) */}
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    transform: 'translate(-50%, -50%)',
                    width: radius * 2,
                    height: radius * 2
                }}>
                    <svg
                        width="100%" height="100%" viewBox="-100 -100 200 200"
                        style={{ overflow: 'visible', pointerEvents: 'auto' }}
                        onMouseEnter={() => isHoveredRef.current = true}
                        onMouseLeave={() => isHoveredRef.current = false}
                    >
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>

                        {notes.map((n, i) => {
                            const isAllowed = allowedNotes.includes(n);

                            const startAngle = (i * sliceAngle) - 90 - (sliceAngle / 2);
                            const endAngle = startAngle + sliceAngle;

                            // Coordinates for Slice Path
                            const toRad = (deg: number) => (deg * Math.PI) / 180;

                            const x1 = Math.cos(toRad(startAngle)) * radius;
                            const y1 = Math.sin(toRad(startAngle)) * radius;
                            const x2 = Math.cos(toRad(endAngle)) * radius;
                            const y2 = Math.sin(toRad(endAngle)) * radius;

                            const x3 = Math.cos(toRad(endAngle)) * innerRadius;
                            const y3 = Math.sin(toRad(endAngle)) * innerRadius;
                            const x4 = Math.cos(toRad(startAngle)) * innerRadius;
                            const y4 = Math.sin(toRad(startAngle)) * innerRadius;

                            const largeArc = sliceAngle > 180 ? 1 : 0;

                            const pathData = [
                                `M ${x4} ${y4}`,
                                `L ${x1} ${y1}`,
                                `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                                `L ${x3} ${y3}`,
                                `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
                                'Z'
                            ].join(' ');

                            // Text Label Position
                            const midAngle = startAngle + (sliceAngle / 2);
                            const textRadius = (radius + innerRadius) / 2;
                            const tx = Math.cos(toRad(midAngle)) * textRadius;
                            const ty = Math.sin(toRad(midAngle)) * textRadius;

                            return (
                                <g
                                    key={n}
                                    onClick={(e) => {
                                        e.stopPropagation(); // Consume click
                                        if (isAllowed) onGuess(n);
                                    }}
                                    style={{
                                        cursor: isAllowed ? 'pointer' : 'default',
                                        opacity: isAllowed ? 1 : 0.8,
                                        transition: 'transform 0.1s'
                                    }}
                                    onMouseEnter={(e) => { if (isAllowed) e.currentTarget.style.transform = 'scale(1.05)'; }}
                                    onMouseLeave={(e) => { if (isAllowed) e.currentTarget.style.transform = 'scale(1)'; }}
                                >
                                    <path
                                        d={pathData}
                                        fill={isAllowed ? '#3b82f6' : '#334155'}
                                        stroke={isAllowed ? '#1e3a8a' : '#1e293b'}
                                        strokeWidth="1"
                                    />
                                    <text
                                        x={tx}
                                        y={ty}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fill={isAllowed ? 'white' : '#64748b'}
                                        fontSize="14"
                                        fontWeight="bold"
                                        style={{ pointerEvents: 'none', opacity: isAllowed ? 1 : 0.6 }}
                                    >
                                        {formatNote(n, accidentalMode)}
                                    </text>
                                </g>
                            );
                        })}

                    </svg>
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
};

