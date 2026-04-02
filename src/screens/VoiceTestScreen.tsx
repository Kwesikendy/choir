import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { useUserProgress } from '../hooks/useUserProgress';
import { usePitchDetection } from '../hooks/usePitchDetection';
import { calculateAccuracy } from '../utils/pitchUtils';
import { playReferenceNote, stopReferenceNote } from '../utils/audioUtils';
import {
  TEST_NOTES, TestNote, NoteScores,
  analyseVoiceRange, VoicePartResult, getConfidenceLabel,
} from '../utils/voiceAnalysis';
import { PitchResult } from '../types';

type Stage = 'intro' | 'testing' | 'results';

const NOTE_LISTEN_SECS = 4;   // seconds to listen per note
const MIN_SCORE_THRESHOLD = 40; // minimum score to "count" as hitting a note

export function VoiceTestScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { selectPart } = useUserProgress();

  const [stage, setStage] = useState<Stage>('intro');
  const [noteIndex, setNoteIndex] = useState(0);
  const [noteScores, setNoteScores] = useState<NoteScores>({});
  const [results, setResults] = useState<VoicePartResult[]>([]);

  // Per-note state
  const [isListening, setIsListening] = useState(false);
  const [countdown, setCountdown] = useState(NOTE_LISTEN_SECS);
  const [liveAccuracy, setLiveAccuracy] = useState(0);
  const [bestAccuracy, setBestAccuracy] = useState(0);
  const [notePhase, setNotePhase] = useState<'ready' | 'play' | 'sing' | 'done'>('ready');

  const currentNote: TestNote = TEST_NOTES[noteIndex];
  const bestAccuracyRef = useRef(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------------------------------------------------------------------------
  // Pitch detection — target = current test note
  // ---------------------------------------------------------------------------
  const { startListening, stopListening, error: micError } = usePitchDetection({
    targetFrequency: currentNote?.frequency,
    onPitchDetected: useCallback((result: PitchResult | null) => {
      if (!result) { setLiveAccuracy(0); return; }
      const acc = calculateAccuracy(result.cents);
      setLiveAccuracy(acc);
      if (acc > bestAccuracyRef.current) {
        bestAccuracyRef.current = acc;
        setBestAccuracy(acc);
      }
    }, []),
  });

  // ---------------------------------------------------------------------------
  // Per-note flow: ready → play reference → sing → done
  // ---------------------------------------------------------------------------
  const startNoteFlow = useCallback(async () => {
    bestAccuracyRef.current = 0;
    setBestAccuracy(0);
    setLiveAccuracy(0);
    setCountdown(NOTE_LISTEN_SECS);
    setNotePhase('play');

    // 1. Play reference note
    await playReferenceNote(currentNote.frequency, 1200);

    // Small gap after reference
    await new Promise(r => setTimeout(r, 400));

    // 2. Start listening
    setNotePhase('sing');
    setIsListening(true);
    await startListening();

    // 3. Countdown
    let remaining = NOTE_LISTEN_SECS;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        finishNote();
      }
    }, 1000);
  }, [currentNote, startListening]);

  const finishNote = useCallback(async () => {
    setIsListening(false);
    setNotePhase('done');
    await stopListening();
    await stopReferenceNote();

    // Record best score for this note
    const score = bestAccuracyRef.current;
    setNoteScores(prev => ({ ...prev, [currentNote.name]: score }));
  }, [currentNote, stopListening]);

  // ---------------------------------------------------------------------------
  // Advance to next note or show results
  // ---------------------------------------------------------------------------
  const handleNext = useCallback(async () => {
    const updatedScores: NoteScores = {
      ...noteScores,
      [currentNote.name]: bestAccuracyRef.current,
    };

    if (noteIndex < TEST_NOTES.length - 1) {
      setNoteIndex(i => i + 1);
      setNotePhase('ready');
      setBestAccuracy(0);
      setLiveAccuracy(0);
    } else {
      // All notes done — compute results
      const ranked = analyseVoiceRange(updatedScores);
      setResults(ranked);
      setStage('results');
    }
  }, [noteIndex, noteScores, currentNote]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      stopListening();
      stopReferenceNote();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Accept recommendation
  // ---------------------------------------------------------------------------
  const handleAcceptRecommendation = async (part: VoicePartResult) => {
    await selectPart(part.part);
    navigation.navigate('PartOverview', { part: part.part });
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const progress = ((noteIndex + (notePhase === 'done' ? 1 : 0)) / TEST_NOTES.length) * 100;

  if (stage === 'intro') return <IntroStage onStart={() => setStage('testing')} onBack={() => navigation.goBack()} />;

  if (stage === 'results') return (
    <ResultsStage
      results={results}
      noteScores={noteScores}
      onAccept={handleAcceptRecommendation}
      onChooseManually={() => navigation.navigate('Home')}
    />
  );

  // ---------------------------------------------------------------------------
  // Testing stage
  // ---------------------------------------------------------------------------
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Exit Test</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Voice Discovery</Text>
        <Text style={styles.headerSub}>Note {noteIndex + 1} of {TEST_NOTES.length}</Text>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Note card */}
        <View style={styles.noteCard}>
          <Text style={styles.noteLabelTag}>{currentNote.label}</Text>
          <Text style={styles.noteName}>{currentNote.name}</Text>
          <Text style={styles.noteFreq}>{Math.round(currentNote.frequency)} Hz</Text>
        </View>

        {/* Phase UI */}
        {notePhase === 'ready' && (
          <View style={styles.phaseBox}>
            <Text style={styles.phaseTitle}>Ready?</Text>
            <Text style={styles.phaseDesc}>
              Tap below to hear the note, then sing it back as accurately as you can.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={startNoteFlow}>
              <Text style={styles.primaryBtnText}>♪ Hear &amp; Sing</Text>
            </TouchableOpacity>
          </View>
        )}

        {notePhase === 'play' && (
          <View style={styles.phaseBox}>
            <Text style={styles.phaseAnimText}>♪</Text>
            <Text style={styles.phaseTitle}>Listen carefully…</Text>
          </View>
        )}

        {notePhase === 'sing' && (
          <View style={styles.phaseBox}>
            {micError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>🎤 Microphone Error: {micError}</Text>
                <Text style={styles.errorSub}>Please check app permissions in settings.</Text>
              </View>
            ) : (
              <>
                <CountdownRing seconds={countdown} total={NOTE_LISTEN_SECS} accuracy={liveAccuracy} />
                <Text style={styles.singPrompt}>Sing the note!</Text>
                <AccuracyBar accuracy={liveAccuracy} best={bestAccuracy} />
              </>
            )}
          </View>
        )}

        {notePhase === 'done' && (
          <View style={styles.phaseBox}>
            <ScoreDisplay score={bestAccuracy} />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
              <Text style={styles.primaryBtnText}>
                {noteIndex < TEST_NOTES.length - 1 ? 'Next Note →' : 'See Results →'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Mini note strip */}
        <View style={styles.noteStrip}>
          {TEST_NOTES.map((n, i) => (
            <View
              key={n.name}
              style={[
                styles.stripDot,
                i < noteIndex && { backgroundColor: '#22c55e' },
                i === noteIndex && { backgroundColor: '#fff', transform: [{ scale: 1.4 }] },
                i > noteIndex && { backgroundColor: '#444' },
              ]}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function IntroStage({ onStart, onBack }: { onStart: () => void; onBack: () => void }) {
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.fullHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.introIcon}>🎤</Text>
        <Text style={styles.introTitle}>Discover Your{'\n'}Voice Part</Text>
        <Text style={styles.introSubtitle}>
          Not sure where you fit? Let us find out.
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.introContent}>
        {[
          { icon: '🎵', title: '11 Test Notes', body: 'You\'ll sing notes from very low to very high — don\'t worry if some feel impossible, that\'s expected!' },
          { icon: '🎧', title: 'Hear First, Then Sing', body: 'We\'ll play each reference note so you know exactly what to aim for.' },
          { icon: '📊', title: 'Instant Analysis', body: 'After the test, we\'ll analyse your range and recommend the voice part where you\'ll thrive.' },
          { icon: '✅', title: 'No Wrong Answers', body: 'The test is designed to find your natural strengths — be honest and sing comfortably, not forcefully.' },
        ].map((item) => (
          <View key={item.title} style={styles.introCard}>
            <Text style={styles.introCardIcon}>{item.icon}</Text>
            <View style={styles.introCardText}>
              <Text style={styles.introCardTitle}>{item.title}</Text>
              <Text style={styles.introCardBody}>{item.body}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.startBtn} onPress={onStart} activeOpacity={0.85}>
          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.startBtnGradient}>
            <Text style={styles.startBtnText}>Start Voice Test</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function ResultsStage({
  results, noteScores, onAccept, onChooseManually,
}: {
  results: VoicePartResult[];
  noteScores: NoteScores;
  onAccept: (r: VoicePartResult) => void;
  onChooseManually: () => void;
}) {
  const top = results[0];
  const second = results[1];
  const { label: confLabel, color: confColor } = getConfidenceLabel(top.score, second.score);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[top.color + 'DD', top.color + '88']} style={styles.resultsHeader}>
        <Text style={styles.resultsIcon}>{top.icon}</Text>
        <Text style={styles.resultsTitle}>Your Voice Part</Text>
        <Text style={styles.resultsPartName}>{top.label}</Text>
        <Text style={styles.resultsRange}>{top.rangeLabel}</Text>
        <View style={[styles.confBadge, { borderColor: confColor }]}>
          <Text style={[styles.confBadgeText, { color: confColor }]}>{confLabel}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.resultsContent}>
        {/* Description */}
        <View style={styles.descCard}>
          <Text style={styles.descText}>{top.description}</Text>
          <Text style={styles.encouragementText}>💬 {top.encouragement}</Text>
        </View>

        {/* Note-by-note performance */}
        <Text style={styles.sectionLabel}>Your Range Performance</Text>
        <View style={styles.rangeGrid}>
          {TEST_NOTES.map((note) => {
            const score = noteScores[note.name] ?? 0;
            const hit = score >= MIN_SCORE_THRESHOLD;
            return (
              <View key={note.name} style={styles.rangeCell}>
                <View style={[styles.rangeDot, { backgroundColor: hit ? '#22c55e' : '#444' }]}>
                  <Text style={styles.rangeDotText}>{hit ? '✓' : '·'}</Text>
                </View>
                <Text style={styles.rangeCellNote}>{note.name}</Text>
                <Text style={styles.rangeCellScore}>{score}%</Text>
              </View>
            );
          })}
        </View>

        {/* All part scores */}
        <Text style={styles.sectionLabel}>Full Breakdown</Text>
        {results.map((r, i) => (
          <View key={r.part} style={styles.partRow}>
            <Text style={styles.partRowIcon}>{r.icon}</Text>
            <View style={styles.partRowInfo}>
              <Text style={styles.partRowName}>{r.label}</Text>
              <View style={styles.partRowBarBg}>
                <View style={[styles.partRowBarFill, { width: `${r.score}%` as any, backgroundColor: r.color }]} />
              </View>
            </View>
            <Text style={[styles.partRowScore, { color: i === 0 ? r.color : '#888' }]}>{r.score}%</Text>
          </View>
        ))}

        {/* Actions */}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: top.color, marginTop: 24 }]}
          onPress={() => onAccept(top)}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>I'm a {top.label} — Start Training!</Text>
        </TouchableOpacity>

        {second.score > 40 && (
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: second.color }]}
            onPress={() => onAccept(second)}
          >
            <Text style={[styles.secondaryBtnText, { color: second.color }]}>
              Try {second.label} instead ({second.score}% fit)
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.manualBtn} onPress={onChooseManually}>
          <Text style={styles.manualBtnText}>Choose manually instead</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function CountdownRing({ seconds, total, accuracy }: { seconds: number; total: number; accuracy: number }) {
  const color = accuracy >= 70 ? '#22c55e' : accuracy >= 40 ? '#eab308' : '#ef4444';
  return (
    <View style={styles.countdown}>
      <Text style={[styles.countdownNum, { color }]}>{seconds}</Text>
      <Text style={styles.countdownLabel}>seconds left</Text>
    </View>
  );
}

function AccuracyBar({ accuracy, best }: { accuracy: number; best: number }) {
  const liveColor = accuracy >= 70 ? '#22c55e' : accuracy >= 40 ? '#eab308' : '#ef4444';
  return (
    <View style={styles.accContainer}>
      <View style={styles.accBarRow}>
        <Text style={styles.accBarLabel}>Live</Text>
        <View style={styles.accBarBg}>
          <View style={[styles.accBarFill, { width: `${accuracy}%` as any, backgroundColor: liveColor }]} />
        </View>
        <Text style={[styles.accBarVal, { color: liveColor }]}>{accuracy}%</Text>
      </View>
      <View style={styles.accBarRow}>
        <Text style={styles.accBarLabel}>Best</Text>
        <View style={styles.accBarBg}>
          <View style={[styles.accBarFill, { width: `${best}%` as any, backgroundColor: '#667eea' }]} />
        </View>
        <Text style={[styles.accBarVal, { color: '#667eea' }]}>{best}%</Text>
      </View>
    </View>
  );
}

function ScoreDisplay({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444';
  const label = score >= 70 ? 'Hit it! 🎯' : score >= 40 ? 'Close! 👍' : 'Out of range';
  return (
    <View style={styles.scorebox}>
      <Text style={[styles.scoreNum, { color }]}>{score}%</Text>
      <Text style={[styles.scoreLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },

  // Header
  header: { paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 },
  fullHeader: { paddingTop: 60, paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center' },
  backBtn: { marginBottom: 12 },
  backBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 15 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 2 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 12 },
  progressBg: { height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#667eea', borderRadius: 3 },

  // Intro
  introIcon: { fontSize: 52, marginBottom: 12 },
  introTitle: { fontSize: 32, fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 38, marginBottom: 8 },
  introSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  introContent: { padding: 20, paddingBottom: 40 },
  introCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 16, marginBottom: 12, alignItems: 'flex-start' },
  introCardIcon: { fontSize: 26, marginRight: 14, marginTop: 2 },
  introCardText: { flex: 1 },
  introCardTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  introCardBody: { fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 19 },
  startBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 12 },
  startBtnGradient: { paddingVertical: 18, alignItems: 'center' },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },

  // Testing
  content: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  noteCard: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingVertical: 28,
    paddingHorizontal: 48, alignItems: 'center', marginBottom: 24, width: '100%',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  noteLabelTag: { fontSize: 12, color: '#667eea', fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  noteName: { fontSize: 68, fontWeight: '900', color: '#fff', lineHeight: 72 },
  noteFreq: { fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  phaseBox: { alignItems: 'center', width: '100%', gap: 16 },
  phaseTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  phaseDesc: { fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22 },
  phaseAnimText: { fontSize: 64 },
  singPrompt: { fontSize: 18, fontWeight: '700', color: '#fff' },
  primaryBtn: {
    backgroundColor: '#667eea', borderRadius: 14, paddingVertical: 16,
    paddingHorizontal: 32, alignItems: 'center', width: '100%',
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  // Countdown
  countdown: { alignItems: 'center', marginBottom: 8 },
  countdownNum: { fontSize: 72, fontWeight: '900', lineHeight: 80 },
  countdownLabel: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },

  // Accuracy bars
  accContainer: { width: '100%', gap: 10 },
  accBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  accBarLabel: { width: 30, fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  accBarBg: { flex: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden' },
  accBarFill: { height: '100%', borderRadius: 5 },
  accBarVal: { width: 36, fontSize: 13, fontWeight: '700', textAlign: 'right' },

  // Score display
  scorebox: { alignItems: 'center', paddingVertical: 12 },
  scoreNum: { fontSize: 72, fontWeight: '900' },
  scoreLabel: { fontSize: 18, fontWeight: '700', marginTop: -4 },

  // Note strip
  noteStrip: { flexDirection: 'row', gap: 6, marginTop: 32, flexWrap: 'wrap', justifyContent: 'center' },
  stripDot: { width: 10, height: 10, borderRadius: 5 },

  // Results header
  resultsHeader: { paddingTop: 60, paddingBottom: 28, paddingHorizontal: 24, alignItems: 'center' },
  resultsIcon: { fontSize: 48, marginBottom: 8 },
  resultsTitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', letterSpacing: 2, textTransform: 'uppercase' },
  resultsPartName: { fontSize: 42, fontWeight: '900', color: '#fff', marginTop: 4 },
  resultsRange: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  confBadge: { marginTop: 10, borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 },
  confBadgeText: { fontSize: 13, fontWeight: '700' },

  // Results content
  resultsContent: { padding: 20, paddingBottom: 48, backgroundColor: '#f0f2f5' },
  descCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 20 },
  descText: { fontSize: 15, color: '#333', lineHeight: 22, marginBottom: 12 },
  encouragementText: { fontSize: 14, color: '#667eea', fontStyle: 'italic', lineHeight: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#888', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },

  // Range grid
  rangeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  rangeCell: { alignItems: 'center', width: 52 },
  rangeDot: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  rangeDotText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  rangeCellNote: { fontSize: 11, color: '#555', fontWeight: '600' },
  rangeCellScore: { fontSize: 10, color: '#999' },

  // Part rows
  partRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, gap: 12 },
  partRowIcon: { fontSize: 22 },
  partRowInfo: { flex: 1, gap: 6 },
  partRowName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  partRowBarBg: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  partRowBarFill: { height: '100%', borderRadius: 4 },
  partRowScore: { fontSize: 15, fontWeight: '800', width: 40, textAlign: 'right' },

  // Bottom action buttons
  secondaryBtn: { borderWidth: 2, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  secondaryBtnText: { fontSize: 15, fontWeight: '700' },
  manualBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  manualBtnText: { fontSize: 14, color: '#aaa', textDecorationLine: 'underline' },

  // Errors
  errorBox: { backgroundColor: 'rgba(239,68,68,0.15)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', alignItems: 'center' },
  errorText: { color: '#f87171', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  errorSub: { color: 'rgba(239,68,68,0.7)', fontSize: 13 },
});
