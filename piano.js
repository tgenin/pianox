import { Instrument } from "piano-chart";
import * as Tone from "tone";
let chordDefinitions = {};
fetch("./chords.json").then(r => r.json()).then(data => { chordDefinitions = data; });

const synth = new Tone.PolySynth(Tone.Synth).toDestination();

function noteToString(note) {
    return `${note.note}${note.accidental || ""}${note.octave}`;
}

// Keyboard mappings using physical key codes (e.code) for reliability
const keyMap = {
    'KeyA': 'C4',
    'KeyS': 'D4',
    'KeyD': 'E4',
    'KeyF': 'F4',
    'KeyG': 'G4',
    'KeyH': 'A4',
    'KeyJ': 'B4',
    'KeyK': 'C5',
    'KeyL': 'D5',
    'Semicolon': 'E5',
    'KeyW': 'C#4',
    'KeyE': 'D#4',
    'KeyT': 'F#4',
    'KeyY': 'G#4',
    'KeyU': 'A#4',
    'KeyO': 'C#5',
    'KeyP': 'D#5',
};

const pressedKeys = new Set();
const activeNotes = new Set();

const NOTE_ORDER = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function noteSort(a, b) {
    const octA = parseInt(a.slice(-1));
    const octB = parseInt(b.slice(-1));
    if (octA !== octB) return octA - octB;
    const nameA = a.slice(0, -1);
    const nameB = b.slice(0, -1);
    return NOTE_ORDER.indexOf(nameA) - NOTE_ORDER.indexOf(nameB);
}

function detectChord(notes) {
    if (notes.length < 2) return null;

    // Convert note names to pitch classes (0-11)
    const pitchClasses = notes.map(n => {
        const name = n.slice(0, -1);
        return NOTE_ORDER.indexOf(name);
    });

    // Remove duplicate pitch classes
    const uniquePCs = [...new Set(pitchClasses)];
    if (uniquePCs.length < 2) return null;


    // console.log('[detectChord]', { notes, pitchClasses, uniquePCs });

    // Try each note as potential root
    for (const root of uniquePCs) {
        const intervals = uniquePCs
            .map(pc => (pc - root + 12) % 12)
            .sort((a, b) => a - b);

        // console.log('[detectChord] trying root', NOTE_ORDER[root], { root, intervals });

        for (const [key, chord] of Object.entries(chordDefinitions)) {
            // Normalize chord intervals to pitch classes (mod 12)
            const chordPCs = chord.intervals.map(i => i % 12).sort((a, b) => a - b);
            const uniqueChordPCs = [...new Set(chordPCs)];

            if (intervals.length === uniqueChordPCs.length &&
                intervals.every((v, i) => v === uniqueChordPCs[i])) {
                const result = NOTE_ORDER[root] + chord.symbol;
                // console.log('[detectChord]', { notes, pitchClasses, uniquePCs });
                // console.log('[detectChord] FOUND', result, { key, root: NOTE_ORDER[root], intervals, chordPCs: uniqueChordPCs });
                return result;
            }
        }
    }
    return null;
}

function updateNoteDisplay() {
    const sorted = [...activeNotes].sort(noteSort);
    const chord = detectChord(sorted);
    document.getElementById('noteDisplay').textContent = sorted.join('  ');
    document.getElementById('chordDisplay').textContent = chord || '';
}

document.addEventListener('DOMContentLoaded', () => {
    const piano = new Instrument(document.getElementById('pianoContainer'), {
        startOctave: 1,
        endOctave: 8,
    });
    piano.create();

    piano.addKeyMouseDownListener(async (note) => {
        await Tone.start();
        synth.triggerAttack(noteToString(note));
        piano.keyDown(note);
        activeNotes.add(noteToString(note));
        updateNoteDisplay();
    });

    piano.addKeyMouseUpListener((note) => {
        synth.triggerRelease(noteToString(note));
        piano.keyUp(note);
        activeNotes.delete(noteToString(note));
        updateNoteDisplay();
    });

    document.addEventListener('keydown', async (e) => {
        const note = keyMap[e.code];
        // console.log('[keydown]', { code: e.code, key: e.key, note, alreadyPressed: pressedKeys.has(e.code), pressedKeys: [...pressedKeys] });
        if (note && !pressedKeys.has(e.code)) {
            pressedKeys.add(e.code);
            await Tone.start();
            synth.triggerAttack(note);
            piano.keyDown(note);
            activeNotes.add(note);
            updateNoteDisplay();
        }
    });

    document.addEventListener('keyup', (e) => {
        const note = keyMap[e.code];
        // console.log('[keyup]', { code: e.code, key: e.key, note, wasPressed: pressedKeys.has(e.code), pressedKeys: [...pressedKeys] });
        if (note) {
            pressedKeys.delete(e.code);
            synth.triggerRelease(note);
            piano.keyUp(note);
            activeNotes.delete(note);
            updateNoteDisplay();
        }
    });
});
