import AsyncStorage from '@react-native-async-storage/async-storage';
import { freqToMidi } from './voiceAnalysis';
import { VoicePart } from '../types';

const OBSERVATION_KEY = '@choir_voice_observations';
const SESSIONS_BEFORE_SUGGESTION = 10;

export interface VoiceObservation {
  date: string;
  minFreq: number;
  maxFreq: number;
  speakFreq: number;
}

export interface MonitorResult {
  shouldSuggest: boolean;
  suggestedPart: VoicePart | null;
  sessionCount: number;
}

const PART_RANGES: Record<VoicePart, { minMidi: number; maxMidi: number; speakMidi: number }> = {
  bass:    { minMidi: 40, maxMidi: 64, speakMidi: 43 },
  tenor:   { minMidi: 48, maxMidi: 67, speakMidi: 49 },
  alto:    { minMidi: 53, maxMidi: 74, speakMidi: 55 },
  soprano: { minMidi: 60, maxMidi: 81, speakMidi: 59 },
};

export async function logVoiceObservation(obs: VoiceObservation): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(OBSERVATION_KEY);
    const list: VoiceObservation[] = raw ? JSON.parse(raw) : [];
    list.push(obs);
    // Keep last 50 sessions max
    if (list.length > 50) list.splice(0, list.length - 50);
    await AsyncStorage.setItem(OBSERVATION_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('VoiceMonitor: failed to log observation', e);
  }
}

export async function getObservations(): Promise<VoiceObservation[]> {
  try {
    const raw = await AsyncStorage.getItem(OBSERVATION_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearObservations(): Promise<void> {
  await AsyncStorage.removeItem(OBSERVATION_KEY);
}

/**
 * Analyses the last N sessions and decides if a part change should be suggested.
 * Returns a suggestion only after SESSIONS_BEFORE_SUGGESTION sessions.
 */
export async function analyseAndSuggest(currentPart: VoicePart): Promise<MonitorResult> {
  const observations = await getObservations();
  const sessionCount = observations.length;

  if (sessionCount < SESSIONS_BEFORE_SUGGESTION) {
    return { shouldSuggest: false, suggestedPart: null, sessionCount };
  }

  // Use the last 10 sessions as the analysis window
  const recent = observations.slice(-SESSIONS_BEFORE_SUGGESTION);

  const avgMinMidi = recent.reduce((s, o) => s + freqToMidi(o.minFreq), 0) / recent.length;
  const avgMaxMidi = recent.reduce((s, o) => s + freqToMidi(o.maxFreq), 0) / recent.length;
  const avgSpeakMidi = recent.reduce((s, o) => s + freqToMidi(o.speakFreq), 0) / recent.length;

  // Score each part against the rolling average
  const parts: VoicePart[] = ['soprano', 'alto', 'tenor', 'bass'];
  let bestPart: VoicePart = currentPart;
  let bestScore = -1;

  for (const part of parts) {
    const range = PART_RANGES[part];
    const overlapMin = Math.max(range.minMidi, avgMinMidi);
    const overlapMax = Math.min(range.maxMidi, avgMaxMidi);
    const overlap = Math.max(0, overlapMax - overlapMin);
    const coverage = overlap / (range.maxMidi - range.minMidi);
    const speakDiff = Math.abs(avgSpeakMidi - range.speakMidi);
    const speakBonus = Math.max(0, 1 - speakDiff / 8);
    const score = coverage * 0.5 + speakBonus * 0.5;
    if (score > bestScore) {
      bestScore = score;
      bestPart = part;
    }
  }

  // Only suggest if the best-fit part differs from the current and is clearly better
  const currentRange = PART_RANGES[currentPart];
  const currentOverlapMin = Math.max(currentRange.minMidi, avgMinMidi);
  const currentOverlapMax = Math.min(currentRange.maxMidi, avgMaxMidi);
  const currentOverlap = Math.max(0, currentOverlapMax - currentOverlapMin);
  const currentCoverage = currentOverlap / (currentRange.maxMidi - currentRange.minMidi);
  const currentSpeakDiff = Math.abs(avgSpeakMidi - currentRange.speakMidi);
  const currentSpeakBonus = Math.max(0, 1 - currentSpeakDiff / 8);
  const currentScore = currentCoverage * 0.5 + currentSpeakBonus * 0.5;

  const shouldSuggest = bestPart !== currentPart && (bestScore - currentScore) > 0.15;

  return {
    shouldSuggest,
    suggestedPart: shouldSuggest ? bestPart : null,
    sessionCount,
  };
}
