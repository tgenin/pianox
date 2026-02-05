import { Instrument } from "piano-chart";
import * as Tone from "tone";

const synth = new Tone.PolySynth(Tone.Synth).toDestination();
let piano;

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
    const sorted = [...activeNotes].sort(noteSort);
    document.getElementById('noteDisplay').textContent = sorted.join('  ');
}

async function noteOn(noteStr) {
    await Tone.start();
    synth.triggerAttack(noteStr);
    if (piano) piano.keyDown(noteStr);
    activeNotes.add(noteStr);
    updateNoteDisplay();
}

function noteOff(noteStr) {
    synth.triggerRelease(noteStr);
    if (piano) piano.keyUp(noteStr);
    activeNotes.delete(noteStr);
    updateNoteDisplay();
}

// Inline MIDI support
const MIDI_NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToNoteName(midiNote) {
    const octave = Math.floor(midiNote / 12) - 1;
    return MIDI_NOTE_NAMES[midiNote % 12] + octave;
}

function handleMIDIMessage(event) {
    const [status, note, velocity] = event.data;
    const command = status & 0xf0;
    if (command === 0x90 && velocity > 0) {
        noteOn(midiToNoteName(note));
    } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
        noteOff(midiToNoteName(note));
    }
}

async function initMIDI() {
    if (!navigator.requestMIDIAccess) {
        console.warn('Web MIDI API not supported in this browser');
        return;
    }
    try {
        const access = await navigator.requestMIDIAccess();
        function connectInputs() {
            for (const input of access.inputs.values()) {
                input.onmidimessage = handleMIDIMessage;
            }
        }
        connectInputs();
        access.onstatechange = () => connectInputs();
        console.log('MIDI ready –', access.inputs.size, 'input(s) found');
    } catch (err) {
        console.warn('MIDI access denied:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    piano = new Instrument(document.getElementById('pianoContainer'), {
        startOctave: 1,
        endOctave: 8,
        keyPressStyle: 'vivid',
        vividKeyPressColor: 'rgb(51, 116, 255)',
    });
    piano.create();

    initMIDI();

    piano.addKeyMouseDownListener((note) => {
        noteOn(noteToString(note));
    });

    piano.addKeyMouseUpListener((note) => {
        noteOff(noteToString(note));
    });

    document.addEventListener('keydown', (e) => {
        const note = keyMap[e.code];
        if (note && !pressedKeys.has(e.code)) {
            pressedKeys.add(e.code);
            noteOn(note);
        }
    });

    document.addEventListener('keyup', (e) => {
        const note = keyMap[e.code];
        if (note) {
            pressedKeys.delete(e.code);
            noteOff(note);
        }
    });
});
