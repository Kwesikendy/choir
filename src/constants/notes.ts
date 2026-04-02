import { Note, VoicePartRange, VoicePart } from '../types';

// A4 = 440Hz standard tuning
const A4_FREQUENCY = 440;
const A4_MIDI = 69; // MIDI note number for A4

// Note names in order
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Convert MIDI note number to frequency
export function midiToFrequency(midi: number): number {
  return A4_FREQUENCY * Math.pow(2, (midi - A4_MIDI) / 12);
}

// Convert frequency to nearest note
export function frequencyToNote(frequency: number): { note: string; octave: number; cents: number } | null {
  if (frequency <= 0) return null;

  const midi = 12 * Math.log2(frequency / A4_FREQUENCY) + A4_MIDI;
  const roundedMidi = Math.round(midi);
  const cents = Math.round((midi - roundedMidi) * 100);

  const octave = Math.floor(roundedMidi / 12) - 1;
  const noteIndex = roundedMidi % 12;

  return {
    note: NOTE_NAMES[noteIndex],
    octave,
    cents
  };
}

// Get Note object from name and octave
export function getNote(name: string, octave: number): Note {
  const noteIndex = NOTE_NAMES.indexOf(name);
  const midi = noteIndex + (octave + 1) * 12;
  const frequency = midiToFrequency(midi);

  return {
    name: `${name}${octave}`,
    frequency,
    octave,
    semitone: noteIndex
  };
}

// Voice part ranges
export const VOICE_PARTS: VoicePartRange[] = [
  {
    part: 'soprano',
    name: 'Soprano',
    description: 'The highest female voice part. Sopranos typically sing the melody and carry the main tune. They often have the most prominent role in choral arrangements.',
    lowestNote: getNote('C', 4),
    highestNote: getNote('A', 5),
    typicalRange: 'C4-A5',
    color: '#FF6B9D'
  },
  {
    part: 'alto',
    name: 'Alto',
    description: 'The lower female voice part. Altos provide rich harmonies below the soprano line. They often sing inner harmonies and add depth to the choral sound.',
    lowestNote: getNote('F', 3),
    highestNote: getNote('D', 5),
    typicalRange: 'F3-D5',
    color: '#9B59B6'
  },
  {
    part: 'tenor',
    name: 'Tenor',
    description: 'The highest male voice part. Tenors often carry the melody in male voice arrangements and provide the upper harmony in mixed choirs.',
    lowestNote: getNote('C', 3),
    highestNote: getNote('G', 4),
    typicalRange: 'C3-G4',
    color: '#3498DB'
  },
  {
    part: 'bass',
    name: 'Bass',
    description: 'The lowest male voice part. Basses provide the harmonic foundation for the choir. They anchor the chord progressions and add depth to the overall sound.',
    lowestNote: getNote('E', 2),
    highestNote: getNote('E', 4),
    typicalRange: 'E2-E4',
    color: '#27AE60'
  }
];

// Get voice part info
export function getVoicePartInfo(part: VoicePart): VoicePartRange {
  return VOICE_PARTS.find(vp => vp.part === part)!;
}