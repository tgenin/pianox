import { Instrument } from "piano-chart";
import * as Tone from "tone";

const piano = new Instrument(document.getElementById('pianoContainer'), {
    startOctave: 1,
    endOctave: 8,
});
piano.create();

const synth = new Tone.PolySynth(Tone.Synth).toDestination();

function noteToString(note) {
    return `${note.note}${note.accidental || ""}${note.octave}`;
}

piano.addKeyMouseDownListener(async (note) => {
    await Tone.start();
    synth.triggerAttack(noteToString(note));
    piano.keyDown(note);
});

piano.addKeyMouseUpListener((note) => {
    synth.triggerRelease(noteToString(note));
    piano.keyUp(note);
});

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

document.addEventListener('keydown', async (e) => {
    const note = keyMap[e.code];
    console.log('[keydown]', { code: e.code, key: e.key, note, alreadyPressed: pressedKeys.has(e.code), pressedKeys: [...pressedKeys] });
    if (note && !pressedKeys.has(e.code)) {
        pressedKeys.add(e.code);
        await Tone.start();
        synth.triggerAttack(note);
        piano.keyDown(note);
    }
});

document.addEventListener('keyup', (e) => {
    const note = keyMap[e.code];
    console.log('[keyup]', { code: e.code, key: e.key, note, wasPressed: pressedKeys.has(e.code), pressedKeys: [...pressedKeys] });
    if (note) {
        pressedKeys.delete(e.code);
        synth.triggerRelease(note);
        piano.keyUp(note);
    }
});