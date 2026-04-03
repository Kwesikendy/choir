import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePitchDetection } from '../hooks/usePitchDetection';
import { playReferenceNote, stopReferenceNote } from '../utils/audioUtils';
import { logVoiceObservation } from '../utils/VoiceMonitorService';
import { PitchResult } from '../types';

// Solfège syllables and intervals (semitone offsets from root)
const SOLFEGE_STEPS = [
  { name: 'Do',  semitone: 0  },
  { name: 'Re',  semitone: 2  },
  { name: 'Mi',  semitone: 4  },
  { name: 'Fa',  semitone: 5  },
  { name: 'Sol', semitone: 7  },
];

// Each pattern is a sequence of step indices
const PATTERNS = [
  [0],                                   // Do
  [0, 1, 2],                             // Do Re Mi
  [0, 1, 2, 1, 0],                       // Do Re Mi Re Do
  [0, 1, 2, 3, 2, 1, 0],                 // Do Re Mi Fa Mi Re Do
  [0, 1, 2, 3, 4, 3, 2, 1, 0],           // Do Re Mi Fa Sol Fa Mi Re Do
];

// Base frequency for C3 (adjusts each day +1 semitone)
const C3_HZ = 130.81;
const IN_TUNE_CENTS = 30;
const HOLD_MS = 1000;

function getBaseFreqForToday(): number {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const semitoneShift = dayOfYear % 12;
  return C3_HZ * Math.pow(2, semitoneShift / 12);
}

function semitoneToHz(base: number, semitones: number): number {
  return base * Math.pow(2, semitones / 12);
}

type WarmUpPhase = 'intro' | 'active' | 'done';

interface Props {
  onClose: () => void;
}

export function WarmUpScreen({ onClose }: Props) {
  const [phase, setPhase] = useState<WarmUpPhase>('intro');
  const [patternIdx, setPatternIdx] = useState(0);
  const [noteIdx, setNoteIdx] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [listeningNote, setListeningNote] = useState<string | null>(null);
  const [cents, setCents] = useState(0);

  const baseFreq = useRef(getBaseFreqForToday()).current;
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdAnim = useRef(new Animated.Value(0)).current;
  const holdAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // Voice observation tracking  
  const sessionMinFreq = useRef(10000);
  const sessionMaxFreq = useRef(0);
  const speakSumRef = useRef(0);
  const speakCountRef = useRef(0);

  const currentPattern = PATTERNS[patternIdx];
  const currentStep = SOLFEGE_STEPS[currentPattern[noteIdx]];
  const targetHz = semitoneToHz(baseFreq, currentStep.semitone);

  // ----------------------------------------------------------------
  // Hold timer
  // ----------------------------------------------------------------
  const clearHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
    holdAnimRef.current?.stop();
    holdAnim.setValue(0);
  };

  const startHold = useCallback(() => {
    if (holdTimerRef.current) return;
    holdAnimRef.current = Animated.timing(holdAnim, {
      toValue: 1,
      duration: HOLD_MS,
      useNativeDriver: false,
    });
    holdAnimRef.current.start();
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      holdAnim.setValue(0);
      advanceNote();
    }, HOLD_MS);
  }, [noteIdx, patternIdx]);

  const advanceNote = useCallback(() => {
    setNoteIdx(prev => {
      const next = prev + 1;
      if (next >= currentPattern.length) {
        // Move to next pattern
        setPatternIdx(pi => {
          const nextPi = pi + 1;
          if (nextPi >= PATTERNS.length) {
            // All patterns done!
            finishSession();
            return pi;
          }
          return nextPi;
        });
        return 0;
      }
      return next;
    });
  }, [currentPattern.length]);

  const finishSession = useCallback(async () => {
    setIsListening(false);
    stopListening();
    await stopReferenceNote();

    // Log voice observation for the Smart Coach
    const minF = sessionMinFreq.current < 10000 ? sessionMinFreq.current : 0;
    const maxF = sessionMaxFreq.current > 0 ? sessionMaxFreq.current : 0;
    const spk = speakCountRef.current > 0 ? speakSumRef.current / speakCountRef.current : 0;
    if (minF > 0 && maxF > 0 && spk > 0) {
      await logVoiceObservation({
        date: new Date().toISOString(),
        minFreq: minF,
        maxFreq: maxF,
        speakFreq: spk,
      });
    }

    setPhase('done');
  }, []);

  // ----------------------------------------------------------------
  // Pitch detection
  // ----------------------------------------------------------------
  const { startListening, stopListening } = usePitchDetection({
    targetFrequency: targetHz,
    onPitchDetected: useCallback((result: PitchResult | null) => {
      if (!result) {
        setListeningNote(null);
        clearHold();
        return;
      }
      setListeningNote(result.note);

      // Track range for Smart Coach
      if (result.frequency > 0) {
        if (result.frequency < sessionMinFreq.current) sessionMinFreq.current = result.frequency;
        if (result.frequency > sessionMaxFreq.current) sessionMaxFreq.current = result.frequency;
        speakSumRef.current += result.frequency;
        speakCountRef.current += 1;
      }

      const centsOff = result.cents;
      setCents(centsOff);

      if (Math.abs(centsOff) <= IN_TUNE_CENTS) {
        startHold();
      } else {
        clearHold();
      }
    }, [targetHz, startHold]),
  });

  // Play reference tone whenever the target note changes
  useEffect(() => {
    if (phase === 'active' && isListening) {
      playReferenceNote(targetHz, 600);
    }
  }, [noteIdx, patternIdx, phase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearHold();
      stopListening();
      stopReferenceNote();
    };
  }, []);

  // ----------------------------------------------------------------
  // UI
  // ----------------------------------------------------------------
  const patternDisplay = currentPattern.map(i => SOLFEGE_STEPS[i].name).join(' – ');
  const tuneColor = Math.abs(cents) <= IN_TUNE_CENTS ? '#22c55e' : Math.abs(cents) <= 60 ? '#eab308' : '#ef4444';

  if (phase === 'intro') {
    return (
      <View style={styles.overlay}>
        <LinearGradient colors={['#1a1a2e', '#0f3460', '#16213e']} style={styles.modal}>
          <Text style={styles.title}>☀️ Daily Warm-Up</Text>
          <Text style={styles.subtitle}>A few minutes of solfège keeps your voice sharp for today's practice.</Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoRow}>🎵 Today's Key: <Text style={styles.infoVal}>Key of {getNoteNameFromHz(baseFreq)}</Text></Text>
            <Text style={styles.infoRow}>📋 Patterns: <Text style={styles.infoVal}>{PATTERNS.length} progressive exercises</Text></Text>
            <Text style={styles.infoRow}>🧠 Smart Coach <Text style={styles.infoVal}>will observe and take notes</Text></Text>
          </View>

          <Text style={styles.howToTitle}>How it works</Text>
          <Text style={styles.howTo}>
            1. The app plays each note first — listen carefully.{'\n'}
            2. Sing the matching note and hold it steady.{'\n'}
            3. The bar fills as you hold pitch — then auto-advances!{'\n'}
            4. Patterns grow longer as you progress. 💪
          </Text>

          <TouchableOpacity style={styles.startBtn} onPress={async () => {
            setPhase('active');
            setIsListening(true);
            await startListening();
          }}>
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.startBtnInner}>
              <Text style={styles.startBtnText}>Start Warm-Up 🎤</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip today</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  if (phase === 'done') {
    return (
      <View style={styles.overlay}>
        <LinearGradient colors={['#0f3460', '#1a1a2e']} style={styles.modal}>
          <Text style={styles.doneIcon}>🎉</Text>
          <Text style={styles.title}>Warm-Up Complete!</Text>
          <Text style={styles.subtitle}>Excellent work! Your Smart Coach has logged today's session.{'\n'}You're warmed up and ready to practice!</Text>
          <TouchableOpacity style={styles.startBtn} onPress={onClose}>
            <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.startBtnInner}>
              <Text style={styles.startBtnText}>Go to Practice →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.overlay}>
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.modal}>
        {/* Header */}
        <View style={styles.activeHeader}>
          <Text style={styles.patternLabel}>Pattern {patternIdx + 1}/{PATTERNS.length}</Text>
          <Text style={styles.patternDisplay}>{patternDisplay}</Text>
        </View>

        {/* Target note */}
        <View style={styles.noteBox}>
          <Text style={styles.solfegeTag}>Sing this</Text>
          <Text style={styles.solfegeName}>{currentStep.name}</Text>
          <Text style={styles.noteHz}>{Math.round(targetHz)} Hz</Text>
        </View>

        {/* Your note */}
        <View style={[styles.yourNoteBox, { borderColor: tuneColor }]}>
          <Text style={styles.yourNoteLabel}>You're singing</Text>
          <Text style={[styles.yourNote, { color: tuneColor }]}>
            {listeningNote ?? '—'}
          </Text>
          <Text style={[styles.centsLabel, { color: tuneColor }]}>
            {Math.abs(cents) <= IN_TUNE_CENTS ? '✅ In tune!' : `${cents > 0 ? '+' : ''}${Math.round(cents)}¢`}
          </Text>
        </View>

        {/* Hold bar */}
        <View style={styles.holdBarBg}>
          <Animated.View style={[
            styles.holdBarFill,
            {
              width: holdAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              backgroundColor: tuneColor,
            }
          ]} />
        </View>
        <Text style={styles.holdHint}>Hold it steady to advance →</Text>
      </LinearGradient>
    </View>
  );
}

function getNoteNameFromHz(hz: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const midi = Math.round(69 + 12 * Math.log2(hz / 440));
  return noteNames[midi % 12];
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center',
    alignItems: 'center', zIndex: 999, padding: 20,
  },
  modal: {
    width: '100%', borderRadius: 24, padding: 28,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, elevation: 15,
  },
  title: { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  infoBox: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, marginBottom: 16, gap: 8 },
  infoRow: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  infoVal: { fontWeight: '800', color: '#fff' },
  howToTitle: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  howTo: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 22, marginBottom: 24 },
  startBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  startBtnInner: { paddingVertical: 16, alignItems: 'center' },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { color: 'rgba(255,255,255,0.35)', fontSize: 13, textDecorationLine: 'underline' },
  doneIcon: { fontSize: 52, textAlign: 'center', marginBottom: 12 },
  activeHeader: { alignItems: 'center', marginBottom: 20 },
  patternLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  patternDisplay: { fontSize: 16, fontWeight: '700', color: '#667eea' },
  noteBox: {
    backgroundColor: 'rgba(102,126,234,0.15)', borderRadius: 16,
    paddingVertical: 20, alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(102,126,234,0.3)',
  },
  solfegeTag: { fontSize: 12, color: '#667eea', fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  solfegeName: { fontSize: 64, fontWeight: '900', color: '#fff', lineHeight: 72 },
  noteHz: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  yourNoteBox: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginBottom: 16,
    borderWidth: 1.5,
  },
  yourNoteLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 },
  yourNote: { fontSize: 48, fontWeight: '900', lineHeight: 56 },
  centsLabel: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  holdBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  holdBarFill: { height: '100%', borderRadius: 3 },
  holdHint: { fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },
});
