import { VoicePart } from '../types';

/** A single note in the voice test */
export interface TestNote {
  name: string;       // e.g. "C4"
  frequency: number;  // Hz
  label: string;      // display label e.g. "Middle C"
}

/** Score (0–100) achieved on each test note */
export type NoteScores = Record<string, number>; // key = TestNote.name

export interface VoicePartResult {
  part: VoicePart;
  label: string;
  description: string;
  score: number;        // 0–100 fit score
  color: string;
  icon: string;
  rangeLabel: string;
  encouragement: string;
}

// ---------------------------------------------------------------------------
// Test notes — span the full SATB range (E2 → A5)
// ---------------------------------------------------------------------------
export const TEST_NOTES: TestNote[] = [
  { name: 'E2',  frequency: 82.41,  label: 'Very Low' },
  { name: 'A2',  frequency: 110.00, label: 'Low' },
  { name: 'C3',  frequency: 130.81, label: 'Low-Mid' },
  { name: 'E3',  frequency: 164.81, label: 'Mid-Low' },
  { name: 'G3',  frequency: 196.00, label: 'Mid' },
  { name: 'C4',  frequency: 261.63, label: 'Middle C' },
  { name: 'E4',  frequency: 329.63, label: 'Mid-High' },
  { name: 'G4',  frequency: 392.00, label: 'High-Mid' },
  { name: 'C5',  frequency: 523.25, label: 'High' },
  { name: 'E5',  frequency: 659.25, label: 'Very High' },
  { name: 'A5',  frequency: 880.00, label: 'Top' },
];

// Voice part "coverage" over the test notes (1 = this note is in range, 0 = not)
// Based on standard SATB ranges
const PART_COVERAGE: Record<VoicePart, number[]> = {
  //           E2  A2  C3  E3  G3  C4  E4  G4  C5  E5  A5
  bass:    [   1,  1,  1,  1,  0.5,0.2, 0,  0,  0,  0,  0 ],
  tenor:   [   0, 0.2, 1,  1,  1,  1, 0.8, 0.3, 0,  0,  0 ],
  alto:    [   0,  0,  0, 0.2, 1,  1,  1,  1, 0.8, 0.3, 0 ],
  soprano: [   0,  0,  0,  0,  0, 0.5, 1,  1,  1,  1,  1 ],
};

const PART_META: Record<VoicePart, {
  label: string; description: string; color: string; icon: string;
  rangeLabel: string; encouragement: string;
}> = {
  soprano: {
    label: 'Soprano',
    description: 'You have a bright, high voice. Sopranos carry the melody and often shine in lead roles.',
    color: '#FF6B9D',
    icon: '🌸',
    rangeLabel: 'C4 – A5',
    encouragement: 'Your high range is your superpower! Focus on breath support and you\'ll soar.',
  },
  alto: {
    label: 'Alto',
    description: 'Your voice has warmth and richness in the middle-lower range. Altos are the harmonic backbone of any choir.',
    color: '#9B59B6',
    icon: '🍇',
    rangeLabel: 'F3 – D5',
    encouragement: 'Altos are the glue of the choir — your warm tone will blend beautifully.',
  },
  tenor: {
    label: 'Tenor',
    description: 'You have a strong male high voice. Tenors often carry important melodies and harmonies.',
    color: '#3498DB',
    icon: '💎',
    rangeLabel: 'C3 – G4',
    encouragement: 'Your upper range has great potential. Work on bridging chest and head voice.',
  },
  bass: {
    label: 'Bass',
    description: 'Your voice has a deep, resonant quality. Basses are the foundation every choir is built on.',
    color: '#27AE60',
    icon: '🌊',
    rangeLabel: 'E2 – E4',
    encouragement: 'Your deep voice grounds the whole choir. Embrace those low notes!',
  },
};

// ---------------------------------------------------------------------------
// Core scoring algorithm
// ---------------------------------------------------------------------------

/**
 * Given the user's per-note scores (0–100), return ranked voice part results.
 * Algorithm:
 *   For each voice part, compute a weighted average of the user's scores
 *   where each test note is weighted by how "central" it is to that part.
 *   Parts that require notes the user scored badly on are penalised.
 */
export function analyseVoiceRange(scores: NoteScores): VoicePartResult[] {
  const parts: VoicePart[] = ['soprano', 'alto', 'tenor', 'bass'];

  const results: VoicePartResult[] = parts.map((part) => {
    const coverage = PART_COVERAGE[part];
    let weightedScore = 0;
    let totalWeight = 0;

    TEST_NOTES.forEach((note, idx) => {
      const weight = coverage[idx];
      if (weight === 0) return;
      const noteScore = scores[note.name] ?? 0;
      weightedScore += noteScore * weight;
      totalWeight += weight;
    });

    const fitScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
    const meta = PART_META[part];

    return {
      part,
      score: fitScore,
      ...meta,
    };
  });

  // Sort best fit first
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Plain-language summary of how confident the recommendation is.
 */
export function getConfidenceLabel(topScore: number, secondScore: number): {
  label: string; color: string;
} {
  const gap = topScore - secondScore;
  if (topScore >= 70 && gap >= 20) return { label: 'Strong match', color: '#22c55e' };
  if (topScore >= 50 && gap >= 10) return { label: 'Good match', color: '#eab308' };
  return { label: 'Possible match — consider both top options', color: '#f97316' };
}
