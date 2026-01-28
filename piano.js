import { Instrument } from "piano-chart";
import * as Tone from "tone";
let chordDefinitions = {};
let chordOrder = [];
fetch("./chords.json").then(r => r.text()).then(text => {
    chordDefinitions = JSON.parse(text);
    // Preserve key order from JSON (Object.keys reorders numeric keys like "6")
    chordOrder = [...text.matchAll(/"([^"]+)"\s*:/g)].map(m => m[1]).filter(k => k in chordDefinitions);
    buildChordGrid();
});

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
const chordCells = new Map(); // "C#m" -> <td> element

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

    // Highlight matching chord cell in the grid
    for (const cell of chordCells.values()) {
        cell.classList.remove('detected');
    }
    if (chord) {
        const cell = chordCells.get(chord);
        if (cell) cell.classList.add('detected');
    }
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

function playChord(root, intervals) {
    const notes = intervals.map(i => {
        const noteIndex = (NOTE_ORDER.indexOf(root) + i) % 12;
        const octave = 4 + Math.floor((NOTE_ORDER.indexOf(root) + i) / 12);
        return NOTE_ORDER[noteIndex] + octave;
    });
    notes.forEach(n => noteOn(n));
    setTimeout(() => notes.forEach(n => noteOff(n)), 800);
}

function buildChordGrid() {
    const container = document.getElementById('chordGrid');
    if (!container) return;
    const table = document.createElement('table');

    // Header row: empty corner + one column per note
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.appendChild(document.createElement('th')); // corner
    for (const note of NOTE_ORDER) {
        const th = document.createElement('th');
        th.textContent = note;
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Use chordOrder to preserve JSON key order (Object.keys hoists numeric keys like "6")
    const tbody = document.createElement('tbody');
    for (const key of chordOrder) {
        const chord = chordDefinitions[key];
        const tr = document.createElement('tr');
        const label = document.createElement('td');
        label.textContent = chord.name;
        tr.appendChild(label);

        for (const root of NOTE_ORDER) {
            const td = document.createElement('td');
            td.className = 'chord-cell';
            td.textContent = root + chord.symbol;
            chordCells.set(root + chord.symbol, td);
            td.addEventListener('click', () => {
                td.classList.add('playing');
                setTimeout(() => td.classList.remove('playing'), 800);
                playChord(root, chord.intervals);
            });
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.appendChild(table);
}

document.addEventListener('DOMContentLoaded', () => {
    piano = new Instrument(document.getElementById('pianoContainer'), {
        startOctave: 1,
        endOctave: 8,
        keyPressStyle: 'vivid',
        vividKeyPressColor: 'rgb(51, 116, 255)',
    });
    piano.create();

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
