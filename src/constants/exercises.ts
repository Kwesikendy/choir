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

// Helper to parse string notation into Note array (e.g. "C4 C4 G4 G4" -> Note[])
function parseMelody(melodyString: string): Note[] {
  return melodyString.split(' ').map(token => {
    // Basic regex to match note and octave, e.g. "C4", "F#3", "Bb4"
    const match = token.match(/^([A-G][b#]?)([0-9])$/);
    if (!match) throw new Error(`Invalid melody note token: ${token}`);
    const noteName = match[1];
    const octave = parseInt(match[2], 10);
    return getNote(noteName, octave);
  });
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
      },
      {
        id: 'soprano-rep-twinkle',
        name: 'Song: Twinkle Twinkle',
        type: 'repertoire',
        voicePart: 'soprano',
        notes: parseMelody('C4 C4 G4 G4 A4 A4 G4 F4 F4 E4 E4 D4 D4 C4'),
        difficulty: 'beginner',
        description: 'Sing along to this classic beginner melody.'
      },
      {
        id: 'soprano-rep-row',
        name: 'Song: Row Your Boat',
        type: 'repertoire',
        voicePart: 'soprano',
        notes: parseMelody('C4 C4 C4 D4 E4 E4 D4 E4 F4 G4'),
        difficulty: 'beginner',
        description: 'A great beginner exercise for stepwise motion.'
      },
      {
        id: 'soprano-rep-ode',
        name: 'Song: Ode to Joy',
        type: 'repertoire',
        voicePart: 'soprano',
        notes: parseMelody('E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4 D4 D4'),
        difficulty: 'intermediate',
        description: 'A beautiful masterpiece. Focus on smooth, connected singing.'
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
      },
      {
        id: 'alto-rep-twinkle',
        name: 'Song: Twinkle Twinkle',
        type: 'repertoire',
        voicePart: 'alto',
        notes: parseMelody('F3 F3 C4 C4 D4 D4 C4 Bb3 Bb3 A3 A3 G3 G3 F3'),
        difficulty: 'beginner',
        description: 'Sing along to this classic beginner melody transposed for alto.'
      },
      {
        id: 'alto-rep-row',
        name: 'Song: Row Your Boat',
        type: 'repertoire',
        voicePart: 'alto',
        notes: parseMelody('F3 F3 F3 G3 A3 A3 G3 A3 Bb3 C4'),
        difficulty: 'beginner',
        description: 'A great beginner exercise for stepwise motion.'
      },
      {
        id: 'alto-rep-ode',
        name: 'Song: Ode to Joy',
        type: 'repertoire',
        voicePart: 'alto',
        notes: parseMelody('A3 A3 Bb3 C4 C4 Bb3 A3 G3 F3 F3 G3 A3 A3 G3 G3'),
        difficulty: 'intermediate',
        description: 'A beautiful masterpiece. Focus on smooth, connected singing.'
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
      },
      {
        id: 'tenor-rep-twinkle',
        name: 'Song: Twinkle Twinkle',
        type: 'repertoire',
        voicePart: 'tenor',
        notes: parseMelody('C3 C3 G3 G3 A3 A3 G3 F3 F3 E3 E3 D3 D3 C3'),
        difficulty: 'beginner',
        description: 'Sing along to this classic beginner melody transposed for tenor.'
      },
      {
        id: 'tenor-rep-row',
        name: 'Song: Row Your Boat',
        type: 'repertoire',
        voicePart: 'tenor',
        notes: parseMelody('C3 C3 C3 D3 E3 E3 D3 E3 F3 G3'),
        difficulty: 'beginner',
        description: 'A great beginner exercise for stepwise motion.'
      },
      {
        id: 'tenor-rep-ode',
        name: 'Song: Ode to Joy',
        type: 'repertoire',
        voicePart: 'tenor',
        notes: parseMelody('E3 E3 F3 G3 G3 F3 E3 D3 C3 C3 D3 E3 E3 D3 D3'),
        difficulty: 'intermediate',
        description: 'A beautiful masterpiece. Focus on smooth, connected singing.'
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
      },
      {
        id: 'bass-rep-twinkle',
        name: 'Song: Twinkle Twinkle',
        type: 'repertoire',
        voicePart: 'bass',
        notes: parseMelody('G2 G2 D3 D3 E3 E3 D3 C3 C3 B2 B2 A2 A2 G2'),
        difficulty: 'beginner',
        description: 'Sing along to this classic beginner melody transposed for bass.'
      },
      {
        id: 'bass-rep-row',
        name: 'Song: Row Your Boat',
        type: 'repertoire',
        voicePart: 'bass',
        notes: parseMelody('G2 G2 G2 A2 B2 B2 A2 B2 C3 D3'),
        difficulty: 'beginner',
        description: 'A great beginner exercise for stepwise motion.'
      },
      {
        id: 'bass-rep-ode',
        name: 'Song: Ode to Joy',
        type: 'repertoire',
        voicePart: 'bass',
        notes: parseMelody('B2 B2 C3 D3 D3 C3 B2 A2 G2 G2 A2 B2 B2 A2 A2'),
        difficulty: 'intermediate',
        description: 'A beautiful masterpiece. Focus on solid tone.'
      }
    ]
  };

  return baseExercises[part];
}