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

// Keyboard mappings
const keyMap = {
    'a': 'C4',
    's': 'D4',
    'd': 'E4',
    'f': 'F4',
    'g': 'G4',
    'h': 'A4',
    'j': 'B4',
    'k': 'C5',
    'l': 'D5',
    ';': 'E5',
    "'": 'F5',
    'w': 'C#4',
    'e': 'D#4',
    't': 'F#4',
    'y': 'G#4',
    'u': 'A#4',
    'o': 'C#5',
    'p': 'D#5',
};

const pressedKeys = new Set();

document.addEventListener('keydown', async (e) => {
    const note = keyMap[e.key.toLowerCase()];
    if (note && !pressedKeys.has(e.key)) {
        pressedKeys.add(e.key);
        await Tone.start();
        synth.triggerAttack(note);
        piano.keyDown(note);
    }
});

document.addEventListener('keyup', (e) => {
    const note = keyMap[e.key.toLowerCase()];
    if (note) {
        pressedKeys.delete(e.key);
        synth.triggerRelease(note);
        piano.keyUp(note);
    }
});