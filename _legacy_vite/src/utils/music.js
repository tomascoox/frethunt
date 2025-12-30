export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Application uses Standard Tuning: High E to Low E (visual top to bottom)
// Offsets from C=0. Octave is based on standard guitar tuning.
export const TUNING = [
    { note: 'E', offset: 4, octave: 4 },  // High E (E4)
    { note: 'B', offset: 11, octave: 3 }, // B (B3)
    { note: 'G', offset: 7, octave: 3 },  // G (G3)
    { note: 'D', offset: 2, octave: 3 },  // D (D3)
    { note: 'A', offset: 9, octave: 2 },  // A (A2)
    { note: 'E', offset: 4, octave: 2 }   // Low E (E2)
];

export const getNoteAt = (stringIndex, fretIndex) => {
    const stringOpen = TUNING[stringIndex];
    const noteIndex = (stringOpen.offset + fretIndex) % 12;
    return NOTES[noteIndex];
};

export const getNoteWithOctave = (stringIndex, fretIndex) => {
    const stringOpen = TUNING[stringIndex];
    const totalSemitonesFromC0 = (stringOpen.octave * 12) + stringOpen.offset + fretIndex;

    const octave = Math.floor(totalSemitonesFromC0 / 12);
    const noteIndex = totalSemitonesFromC0 % 12;

    return `${NOTES[noteIndex]}${octave}`;
};

export const MARKERS = [3, 5, 7, 9, 15, 17, 19, 21];
export const DOUBLE_MARKERS = [12];
