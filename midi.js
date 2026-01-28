import { noteOn, noteOff } from './piano.js';

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

export async function initMIDI() {
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
