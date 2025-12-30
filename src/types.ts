export type Note = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';
export type AccidentalMode = 'sharp' | 'flat';
export type GameMode = 'memory' | 'triads' | 'string-walker' | 'chicken-picking' | 'chord-designer' | 'triad-hunt' | null;

export interface NoteConfig {
    s: number; // string index (0-5)
    f: number; // fret index
    note?: string; // note name (e.g. "C#")
}

export interface Preset {
    id: string;
    name: string;
    notes: string[]; // e.g. ["stringIndex-fretIndex", "0-1"]
}

export interface TriadShape {
    name: string;
    notes: NoteConfig[];
}

export interface TriadProgression {
    top: TriadShape[];
    middle: TriadShape[];
    bottom: TriadShape[];
}

export type TriadKey = 'A-Major' | 'F#-Minor'; // Add others as needed

export const NOTES: Note[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const STRINGS: string[] = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']; 
