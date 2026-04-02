import { Exercise, VoicePart, Note } from '../types';
import { getNote } from './notes';

// Helper to generate scale notes
function generateScale(rootNote: string, rootOctave: number, type: 'major' | 'minor', octaves: number = 1): Note[] {
  const notes: Note[] = [];

  // Major and minor scale intervals (in semitones from root)
  const majorIntervals = [0, 2, 4, 5, 7, 9, 11, 12];
  const minorIntervals = [0, 2, 3, 5, 7, 8, 10, 12];

  const intervals = type === 'major' ? majorIntervals : minorIntervals;

  const root = getNote(rootNote, rootOctave);
  const rootMidi = root.octave * 12 + root.semitone + 12; // MIDI note number

  for (let octave = 0; octave < octaves; octave++) {
    for (const interval of intervals) {
      const midi = rootMidi + interval + (octave * 12);
      const noteOctave = Math.floor(midi / 12) - 1;
      const noteIndex = midi % 12;

      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      notes.push(getNote(noteNames[noteIndex], noteOctave));
    }
  }

  return notes;
}

// Helper to generate arpeggio notes
function generateArpeggio(rootNote: string, rootOctave: number, type: 'major' | 'minor'): Note[] {
  const root = getNote(rootNote, rootOctave);

  // Arpeggio intervals (root, third, fifth, octave)
  const majorIntervals = [0, 4, 7, 12, 7, 4, 0];
  const minorIntervals = [0, 3, 7, 12, 7, 3, 0];

  const intervals = type === 'major' ? majorIntervals : minorIntervals;

  const rootMidi = root.octave * 12 + root.semitone + 12;

  return intervals.map(interval => {
    const midi = rootMidi + interval;
    const noteOctave = Math.floor(midi / 12) - 1;
    const noteIndex = midi % 12;
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return getNote(noteNames[noteIndex], noteOctave);
  });
}

// Helper to generate interval exercises
function generateIntervals(rootNote: string, rootOctave: number): Note[] {
  const root = getNote(rootNote, rootOctave);
  const rootMidi = root.octave * 12 + root.semitone + 12;

  // Common intervals: unison, major 2nd, major 3rd, perfect 4th, perfect 5th, major 6th, octave
  const intervalDistances = [0, 2, 4, 5, 7, 9, 12];
  const notes: Note[] = [];

  for (const distance of intervalDistances) {
    const midi = rootMidi + distance;
    const noteOctave = Math.floor(midi / 12) - 1;
    const noteIndex = midi % 12;
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    notes.push(getNote(noteNames[noteIndex], noteOctave));
  }

  return notes;
}

// Exercises by voice part
export function getExercisesForPart(part: VoicePart): Exercise[] {
  const baseExercises: Record<VoicePart, Exercise[]> = {
    soprano: [
      {
        id: 'soprano-major-scale',
        name: 'C Major Scale',
        type: 'scale',
        voicePart: 'soprano',
        notes: generateScale('C', 4, 'major'),
        difficulty: 'beginner',
        description: 'Practice the C major scale ascending and descending. Focus on clear tone production.'
      },
      {
        id: 'soprano-minor-scale',
        name: 'A Minor Scale',
        type: 'scale',
        voicePart: 'soprano',
        notes: generateScale('A', 4, 'minor'),
        difficulty: 'beginner',
        description: 'Practice the A natural minor scale. Notice the different sound quality compared to major.'
      },
      {
        id: 'soprano-major-arpeggio',
        name: 'C Major Arpeggio',
        type: 'arpeggio',
        voicePart: 'soprano',
        notes: generateArpeggio('C', 4, 'major'),
        difficulty: 'intermediate',
        description: 'Sing the notes of the C major chord: C-E-G-C-G-E-C.'
      },
      {
        id: 'soprano-intervals',
        name: 'Interval Training',
        type: 'interval',
        voicePart: 'soprano',
        notes: generateIntervals('C', 4),
        difficulty: 'intermediate',
        description: 'Practice singing intervals from unison to octave.'
      }
    ],
    alto: [
      {
        id: 'alto-major-scale',
        name: 'F Major Scale',
        type: 'scale',
        voicePart: 'alto',
        notes: generateScale('F', 4, 'major'),
        difficulty: 'beginner',
        description: 'Practice the F major scale. Focus on warm, rich tone in the lower register.'
      },
      {
        id: 'alto-minor-scale',
        name: 'D Minor Scale',
        type: 'scale',
        voicePart: 'alto',
        notes: generateScale('D', 4, 'minor'),
        difficulty: 'beginner',
        description: 'Practice the D natural minor scale.'
      },
      {
        id: 'alto-major-arpeggio',
        name: 'F Major Arpeggio',
        type: 'arpeggio',
        voicePart: 'alto',
        notes: generateArpeggio('F', 4, 'major'),
        difficulty: 'intermediate',
        description: 'Sing the notes of the F major chord.'
      },
      {
        id: 'alto-intervals',
        name: 'Interval Training',
        type: 'interval',
        voicePart: 'alto',
        notes: generateIntervals('F', 4),
        difficulty: 'intermediate',
        description: 'Practice singing intervals from unison to octave.'
      }
    ],
    tenor: [
      {
        id: 'tenor-major-scale',
        name: 'C Major Scale',
        type: 'scale',
        voicePart: 'tenor',
        notes: generateScale('C', 3, 'major'),
        difficulty: 'beginner',
        description: 'Practice the C major scale in the tenor range.'
      },
      {
        id: 'tenor-minor-scale',
        name: 'A Minor Scale',
        type: 'scale',
        voicePart: 'tenor',
        notes: generateScale('A', 3, 'minor'),
        difficulty: 'beginner',
        description: 'Practice the A natural minor scale in the tenor range.'
      },
      {
        id: 'tenor-major-arpeggio',
        name: 'C Major Arpeggio',
        type: 'arpeggio',
        voicePart: 'tenor',
        notes: generateArpeggio('C', 3, 'major'),
        difficulty: 'intermediate',
        description: 'Sing the notes of the C major chord in the tenor range.'
      },
      {
        id: 'tenor-intervals',
        name: 'Interval Training',
        type: 'interval',
        voicePart: 'tenor',
        notes: generateIntervals('C', 3),
        difficulty: 'intermediate',
        description: 'Practice singing intervals from unison to octave.'
      }
    ],
    bass: [
      {
        id: 'bass-major-scale',
        name: 'C Major Scale',
        type: 'scale',
        voicePart: 'bass',
        notes: generateScale('C', 3, 'major'),
        difficulty: 'beginner',
        description: 'Practice the C major scale in the bass range. Focus on solid, resonant tone.'
      },
      {
        id: 'bass-minor-scale',
        name: 'A Minor Scale',
        type: 'scale',
        voicePart: 'bass',
        notes: generateScale('A', 2, 'minor'),
        difficulty: 'beginner',
        description: 'Practice the A natural minor scale in the bass range.'
      },
      {
        id: 'bass-major-arpeggio',
        name: 'F Major Arpeggio',
        type: 'arpeggio',
        voicePart: 'bass',
        notes: generateArpeggio('F', 2, 'major'),
        difficulty: 'intermediate',
        description: 'Sing the notes of the F major chord in the bass range.'
      },
      {
        id: 'bass-intervals',
        name: 'Interval Training',
        type: 'interval',
        voicePart: 'bass',
        notes: generateIntervals('F', 2),
        difficulty: 'intermediate',
        description: 'Practice singing intervals from unison to octave.'
      }
    ]
  };

  return baseExercises[part];
}