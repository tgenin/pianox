import { Instrument } from "piano-chart";
import * as Tone from "tone";

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

function updateNoteDisplay() {
    document.getElementById('noteDisplay').textContent =
        [...activeNotes].sort(noteSort).join('  ');
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
        console.log('[keydown]', { code: e.code, key: e.key, note, alreadyPressed: pressedKeys.has(e.code), pressedKeys: [...pressedKeys] });
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
        console.log('[keyup]', { code: e.code, key: e.key, note, wasPressed: pressedKeys.has(e.code), pressedKeys: [...pressedKeys] });
        if (note) {
            pressedKeys.delete(e.code);
            synth.triggerRelease(note);
            piano.keyUp(note);
            activeNotes.delete(note);
            updateNoteDisplay();
        }
    });
});
