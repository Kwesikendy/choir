import { VoicePart } from '../types';

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
// Standard vocal ranges in MIDI Note Numbers
// MIDI 69 = A4 (440Hz). 
// ---------------------------------------------------------------------------
const PART_RANGES = {
  bass:    { minMidi: 40, maxMidi: 64 }, // E2 to E4
  tenor:   { minMidi: 48, maxMidi: 67 }, // C3 to G4
  alto:    { minMidi: 53, maxMidi: 74 }, // F3 to D5
  soprano: { minMidi: 60, maxMidi: 81 }, // C4 to A5
};

// Target natural speaking pitch (Tessitura anchor)
const PART_SPEAKING_PITCH = {
  bass:    { targetMidi: 43 }, // ~100 Hz (G2)
  tenor:   { targetMidi: 49 }, // ~138 Hz (C#3)
  alto:    { targetMidi: 55 }, // ~185 Hz (F#3)
  soprano: { targetMidi: 59 }, // ~246 Hz (B3)
};

const PART_META: Record<VoicePart, {
  label: string; description: string; color: string; icon: string;
  rangeLabel: string; encouragement: string;
}> = {
  soprano: {
    label: 'Soprano',
    description: 'You effortlessly reach high notes. Sopranos carry the melody and shine in lead roles.',
    color: '#FF6B9D',
    icon: '🌸',
    rangeLabel: 'C4 – A5',
    encouragement: 'Your high range is your superpower! Focus on breath support and you\'ll soar.',
  },
  alto: {
    label: 'Alto',
    description: 'Your voice has warmth and extreme richness. Altos are the harmonic backbone of any choir.',
    color: '#9B59B6',
    icon: '🍇',
    rangeLabel: 'F3 – D5',
    encouragement: 'Altos are the glue of the choir — your warm tone will blend beautifully.',
  },
  tenor: {
    label: 'Tenor',
    description: 'You have a commanding, strong high voice. Tenors often carry important melodies and harmonies.',
    color: '#3498DB',
    icon: '💎',
    rangeLabel: 'C3 – G4',
    encouragement: 'Your upper range has great potential. Work on bridging chest and head voice.',
  },
  bass: {
    label: 'Bass',
    description: 'Your voice has a deep, resonant, and grounding quality. Basses are the foundation of a choir.',
    color: '#27AE60',
    icon: '🌊',
    rangeLabel: 'E2 – E4',
    encouragement: 'Your deep voice grounds the whole choir. Embrace those low notes!',
  },
};

// Convert Hz to MIDI note number (Continuous floating point)
export function freqToMidi(freq: number): number {
  if (freq === 0) return 0;
  return 69 + 12 * Math.log2(freq / 440);
}

// ---------------------------------------------------------------------------
// Core scoring algorithm
// ---------------------------------------------------------------------------
export function analyseNaturalVoiceRange(minFreq: number, maxFreq: number, speakingFreq: number): VoicePartResult[] {
  const parts: VoicePart[] = ['soprano', 'alto', 'tenor', 'bass'];
  const userMinMidi = freqToMidi(minFreq);
  const userMaxMidi = freqToMidi(maxFreq);
  const userSpeakingMidi = freqToMidi(speakingFreq);
  const userRange = Math.max(1, userMaxMidi - userMinMidi);

  const results: VoicePartResult[] = parts.map((part) => {
    const { minMidi, maxMidi } = PART_RANGES[part];
    const partRange = maxMidi - minMidi;

    // Calculate how many semitones of the standard choir part overlap with the user's natural vocal bounds
    const overlapMin = Math.max(minMidi, userMinMidi);
    const overlapMax = Math.min(maxMidi, userMaxMidi);
    const overlap = Math.max(0, overlapMax - overlapMin);

    // Score based on how much of the Part's range the user covers
    // and how little they have to strain out of it
    const coveragePercentage = overlap / partRange;

    // If the user's center is very close to the part's center, boost securely
    const userCenter = (userMinMidi + userMaxMidi) / 2;
    const partCenter = (minMidi + maxMidi) / 2;
    const centerProximityBonus = Math.max(0, 1 - Math.abs(userCenter - partCenter) / 12); // up to 1 octave away

    // Speaking Pitch match (Highly weighted because speaking pitch reveals true physiological tessitura)
    const speakingDifference = Math.abs(userSpeakingMidi - PART_SPEAKING_PITCH[part].targetMidi);
    const speakingProximityBonus = Math.max(0, 1 - (speakingDifference / 8)); // 0 if > 8 semitones away

    // Final mathematical weighting (40% coverage constraint, 20% range center, 40% speaking tessitura)
    let rawScore = (coveragePercentage * 40) + (centerProximityBonus * 20) + (speakingProximityBonus * 40);
    
    return {
      part,
      score: Math.min(100, Math.round(rawScore)),
      ...PART_META[part],
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
  if (topScore >= 70 && gap >= 15) return { label: 'Strong match', color: '#22c55e' };
  if (topScore >= 50 && gap >= 10) return { label: 'Good match', color: '#eab308' };
  return { label: 'Possible match — pick what feels most comfortable', color: '#f97316' };
}
