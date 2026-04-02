// Vocal part types
export type VoicePart = 'soprano' | 'alto' | 'tenor' | 'bass';

// Note representation
export interface Note {
  name: string;        // e.g., "C4", "A#4"
  frequency: number;   // in Hz
  octave: number;
  semitone: number;    // 0-11 (C=0, C#=1, ... B=11)
}

// Vocal part range definition
export interface VoicePartRange {
  part: VoicePart;
  name: string;
  description: string;
  lowestNote: Note;
  highestNote: Note;
  typicalRange: string;
  color: string;
}

// Exercise types
export type ExerciseType = 'scale' | 'arpeggio' | 'interval' | 'repertoire';

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  voicePart: VoicePart;
  notes: Note[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
}

// Practice session state
export interface PracticeSession {
  exerciseId: string;
  currentNoteIndex: number;
  isListening: boolean;
  detectedPitch: number | null;
  accuracy: number;
}

// User progress
export interface UserProgress {
  selectedPart: VoicePart | null;
  completedExercises: string[];
  bestScores: Record<string, number>;
  totalPracticeTime: number;
}

// Pitch detection result
export interface PitchResult {
  frequency: number;
  note: string;
  octave: number;
  cents: number;  // Deviation from target note (-50 to +50)
  confidence: number;
}