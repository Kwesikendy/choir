import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { NoteDisplay } from '../components/NoteDisplay';
import { PitchVisualizer } from '../components/PitchVisualizer';
import { useUserProgress } from '../hooks/useUserProgress';
import { usePitchDetection } from '../hooks/usePitchDetection';
import { getExercisesForPart } from '../constants/exercises';
import { getVoicePartInfo } from '../constants/notes';
import { Exercise, Note } from '../types';
import { calculateAccuracy } from '../utils/pitchUtils';
import { playReferenceNote, stopReferenceNote } from '../utils/audioUtils';

// How long (ms) to hold a correct pitch before advancing automatically
const NOTE_HOLD_MS = 1200;
// Cent tolerance for "in tune"
const IN_TUNE_CENTS = 20;

export function PracticeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { progress, markExerciseCompleted, addPracticeTime } = useUserProgress();
  const partInfo = progress.selectedPart ? getVoicePartInfo(progress.selectedPart) : null;
  const exercises = progress.selectedPart ? getExercisesForPart(progress.selectedPart) : [];

  // ---------- exercise / note state ----------
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);

  // ---------- pitch / score state ----------
  const [detectedNote, setDetectedNote] = useState<string | null>(null);
  const [detectedFrequency, setDetectedFrequency] = useState<number | null>(null);
  const [cents, setCents] = useState(0);
  const [accuracy, setAccuracy] = useState(0);

  // Running average accuracy for the whole exercise
  const accuracySamplesRef = useRef<number[]>([]);

  // Timer for auto-advance when in tune long enough
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdProgressAnim = useRef(new Animated.Value(0)).current;
  const holdAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // Practice time tracking
  const practiceStartRef = useRef<number | null>(null);

  const currentNote: Note | null = selectedExercise
    ? selectedExercise.notes[currentNoteIndex]
    : null;

  // ----------------------------------------------------------------
  // Pitch detection hook — pass current target frequency
  // ----------------------------------------------------------------
  const { startListening, stopListening } = usePitchDetection({
    targetFrequency: currentNote?.frequency,
    onPitchDetected: useCallback((result: import('../types').PitchResult | null) => {
      if (!result) {
        setDetectedNote(null);
        setDetectedFrequency(null);
        clearHoldTimer();
        return;
      }

      setDetectedNote(result.note);
      setDetectedFrequency(result.frequency);
      setCents(result.cents);

      const acc = calculateAccuracy(result.cents);
      setAccuracy(acc);
      accuracySamplesRef.current.push(acc);

      // Check if pitch is in tune — start / continue hold timer
      if (Math.abs(result.cents) <= IN_TUNE_CENTS) {
        startHoldTimer();
      } else {
        clearHoldTimer();
      }
    }, [currentNote?.frequency]),
  });

  // ----------------------------------------------------------------
  // Hold timer — auto-advance when sustained in tune
  // ----------------------------------------------------------------
  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdAnimRef.current) {
      holdAnimRef.current.stop();
      holdAnimRef.current = null;
    }
    holdProgressAnim.setValue(0);
  };

  const startHoldTimer = () => {
    if (holdTimerRef.current) return; // already running

    // Animate the hold progress bar
    holdAnimRef.current = Animated.timing(holdProgressAnim, {
      toValue: 1,
      duration: NOTE_HOLD_MS,
      useNativeDriver: false,
    });
    holdAnimRef.current.start();

    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      holdProgressAnim.setValue(0);
      advanceNote();
    }, NOTE_HOLD_MS);
  };

  // ----------------------------------------------------------------
  // Navigate between notes
  // ----------------------------------------------------------------
  const advanceNote = useCallback(() => {
    if (!selectedExercise) return;
    if (currentNoteIndex < selectedExercise.notes.length - 1) {
      setCurrentNoteIndex(i => i + 1);
      setDetectedNote(null);
      setDetectedFrequency(null);
      setCents(0);
    } else {
      // Reached end — complete exercise
      finishExercise();
    }
  }, [selectedExercise, currentNoteIndex]);

  const handleNextNote = () => {
    clearHoldTimer();
    advanceNote();
  };

  const handlePrevNote = () => {
    clearHoldTimer();
    if (currentNoteIndex > 0) {
      setCurrentNoteIndex(i => i - 1);
      setDetectedNote(null);
      setDetectedFrequency(null);
      setCents(0);
    }
  };

  // ----------------------------------------------------------------
  // Exercise completion
  // ----------------------------------------------------------------
  const finishExercise = useCallback(async () => {
    if (!selectedExercise) return;
    const samples = accuracySamplesRef.current;
    const avgScore = samples.length > 0
      ? Math.round(samples.reduce((a, b) => a + b, 0) / samples.length)
      : 0;

    // Stop listening
    setIsListening(false);
    await stopListening();
    clearHoldTimer();

    // Save to progress
    await markExerciseCompleted(selectedExercise.id, avgScore);

    // Track practice time
    if (practiceStartRef.current) {
      const elapsedMinutes = (Date.now() - practiceStartRef.current) / 60000;
      await addPracticeTime(Math.round(elapsedMinutes));
    }

    Alert.alert(
      '🎉 Exercise Complete!',
      `Great work!\nYour score: ${avgScore}%`,
      [
        { text: 'Try again', onPress: () => restartExercise() },
        { text: 'Pick another', onPress: () => setSelectedExercise(null) },
      ]
    );
  }, [selectedExercise, markExerciseCompleted, addPracticeTime, stopListening]);

  const restartExercise = () => {
    setCurrentNoteIndex(0);
    setDetectedNote(null);
    setDetectedFrequency(null);
    setCents(0);
    accuracySamplesRef.current = [];
    practiceStartRef.current = Date.now();
  };

  // ----------------------------------------------------------------
  // Listen controls
  // ----------------------------------------------------------------
  const handleStartListening = async () => {
    accuracySamplesRef.current = [];
    practiceStartRef.current = Date.now();
    setIsListening(true);
    await startListening();
  };

  const handleStopListening = async () => {
    setIsListening(false);
    clearHoldTimer();
    setDetectedNote(null);
    setDetectedFrequency(null);
    await stopListening();
  };

  // ----------------------------------------------------------------
  // Reference note playback
  // ----------------------------------------------------------------
  const handlePlayReference = async () => {
    if (!currentNote) return;
    // Must stop recording first to allow playback on some devices
    if (isListening) {
      await handleStopListening();
    }
    await playReferenceNote(currentNote.frequency, 1000);
  };

  // ----------------------------------------------------------------
  // Reset when exercise changes
  // ----------------------------------------------------------------
  useEffect(() => {
    clearHoldTimer();
    setCurrentNoteIndex(0);
    setDetectedNote(null);
    setDetectedFrequency(null);
    setCents(0);
    accuracySamplesRef.current = [];
    setIsListening(false);
    stopListening();
  }, [selectedExercise]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearHoldTimer();
      stopListening();
      stopReferenceNote();
    };
  }, []);

  const handleGoBack = () => {
    clearHoldTimer();
    if (isListening) handleStopListening();
    if (selectedExercise) {
      setSelectedExercise(null);
    } else {
      navigation.goBack();
    }
  };

  // ----------------------------------------------------------------
  // Guards
  // ----------------------------------------------------------------
  if (!progress.selectedPart || !partInfo) {
    return (
      <View style={styles.container}>
        <View style={styles.centeredFallback}>
          <Text style={styles.fallbackText}>Please select a voice part first</Text>
          <TouchableOpacity style={styles.fallbackButton} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.fallbackButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ----------------------------------------------------------------
  // Exercise selection view
  // ----------------------------------------------------------------
  if (!selectedExercise) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[partInfo.color, partInfo.color + 'BB']} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Practice</Text>
          <Text style={styles.subtitle}>{partInfo.name}</Text>
        </LinearGradient>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
          <Text style={styles.sectionTitle}>Choose an Exercise</Text>
          {exercises.map((exercise) => {
            const isCompleted = progress.completedExercises.includes(exercise.id);
            const bestScore = progress.bestScores[exercise.id];
            return (
              <TouchableOpacity
                key={exercise.id}
                style={[styles.exerciseCard, isCompleted && styles.exerciseCardCompleted]}
                onPress={() => setSelectedExercise(exercise)}
                activeOpacity={0.75}
              >
                <View style={[styles.exerciseTypeIndicator, { backgroundColor: partInfo.color }]}>
                  <Text style={styles.exerciseTypeText}>{exercise.type[0].toUpperCase()}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <View style={styles.exerciseNameRow}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    {isCompleted && <Text style={styles.completedBadge}>✓</Text>}
                  </View>
                  <Text style={styles.exerciseDescription} numberOfLines={2}>
                    {exercise.description}
                  </Text>
                  <View style={styles.exerciseMeta}>
                    <Text style={[styles.difficultyBadge, getDifficultyStyle(exercise.difficulty)]}>
                      {exercise.difficulty}
                    </Text>
                    <Text style={styles.noteCount}>{exercise.notes.length} notes</Text>
                    {bestScore !== undefined && (
                      <Text style={[styles.bestScore, { color: partInfo.color }]}>
                        Best: {bestScore}%
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // ----------------------------------------------------------------
  // Active practice view
  // ----------------------------------------------------------------
  const holdBarWidth = holdProgressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <LinearGradient colors={[partInfo.color, partInfo.color + 'BB']} style={styles.headerCompact}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.exerciseTitle}>{selectedExercise.name}</Text>
        <Text style={styles.noteProgress}>
          Note {currentNoteIndex + 1} of {selectedExercise.notes.length}
        </Text>
        {/* Progress dots */}
        <View style={styles.progressDots}>
          {selectedExercise.notes.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.progressDot,
                idx < currentNoteIndex && { backgroundColor: '#fff' },
                idx === currentNoteIndex && { backgroundColor: '#fff', transform: [{ scale: 1.4 }] },
                idx > currentNoteIndex && { backgroundColor: 'rgba(255,255,255,0.35)' },
              ]}
            />
          ))}
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
        {/* Note display */}
        <NoteDisplay
          targetNote={currentNote}
          detectedNote={detectedNote}
          cents={cents}
          isListening={isListening}
          partColor={partInfo.color}
          accuracy={isListening && detectedNote ? accuracy : undefined}
        />

        {/* Pitch visualizer */}
        <PitchVisualizer
          targetFrequency={currentNote?.frequency ?? 440}
          detectedFrequency={detectedFrequency}
          cents={cents}
          partColor={partInfo.color}
          isListening={isListening}
        />

        {/* Hold progress bar */}
        {isListening && (
          <View style={styles.holdContainer}>
            <Text style={styles.holdLabel}>Hold in tune to advance</Text>
            <View style={styles.holdBarBg}>
              <Animated.View
                style={[
                  styles.holdBarFill,
                  { width: holdBarWidth, backgroundColor: partInfo.color },
                ]}
              />
            </View>
          </View>
        )}

        {/* Note navigation */}
        <View style={styles.noteNavigation}>
          <TouchableOpacity
            style={[styles.navButton, currentNoteIndex === 0 && styles.navButtonDisabled]}
            onPress={handlePrevNote}
            disabled={currentNoteIndex === 0}
          >
            <Text style={styles.navButtonText}>← Prev</Text>
          </TouchableOpacity>

          {/* Play reference note */}
          <TouchableOpacity style={[styles.navButton, styles.playButton]} onPress={handlePlayReference}>
            <Text style={styles.navButtonText}>♪ Hear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, currentNoteIndex === selectedExercise.notes.length - 1 && styles.navButtonDisabled]}
            onPress={handleNextNote}
            disabled={currentNoteIndex === selectedExercise.notes.length - 1}
          >
            <Text style={styles.navButtonText}>Next →</Text>
          </TouchableOpacity>
        </View>

        {/* Listen / stop */}
        <View style={styles.listenControls}>
          <TouchableOpacity
            style={[styles.listenButton, isListening && { backgroundColor: '#ef4444' }]}
            onPress={isListening ? handleStopListening : handleStartListening}
            activeOpacity={0.8}
          >
            <Text style={styles.listenButtonText}>
              {isListening ? '⏹ Stop' : '🎤 Start Listening'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Tips</Text>
          <Text style={styles.tipsText}>{selectedExercise.description}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function getDifficultyStyle(difficulty: string) {
  switch (difficulty) {
    case 'beginner': return { backgroundColor: '#22c55e' };
    case 'intermediate': return { backgroundColor: '#eab308' };
    case 'advanced': return { backgroundColor: '#ef4444' };
    default: return { backgroundColor: '#666' };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },

  // Headers
  header: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20 },
  headerCompact: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20 },
  backButton: { marginBottom: 8 },
  backButtonText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 18, color: 'rgba(255,255,255,0.9)' },
  exerciseTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 2 },
  noteProgress: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  // Progress dots
  progressDots: { flexDirection: 'row', marginTop: 10, gap: 5, flexWrap: 'wrap' },
  progressDot: { width: 8, height: 8, borderRadius: 4 },

  // Content
  content: { flex: 1 },
  contentPadding: { paddingBottom: 32 },
  sectionTitle: {
    fontSize: 18, fontWeight: '700', color: '#222',
    marginHorizontal: 16, marginBottom: 12, marginTop: 8,
  },

  // Exercise cards
  exerciseCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10,
    borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  exerciseCardCompleted: { backgroundColor: '#f0fdf4' },
  exerciseTypeIndicator: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  exerciseTypeText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  exerciseInfo: { flex: 1, paddingHorizontal: 12 },
  exerciseNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  exerciseName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  completedBadge: { fontSize: 14, color: '#22c55e', fontWeight: '700' },
  exerciseDescription: { fontSize: 13, color: '#666', marginTop: 2, marginBottom: 4 },
  exerciseMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  difficultyBadge: {
    fontSize: 11, color: '#fff', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 5, textTransform: 'capitalize', overflow: 'hidden',
  },
  noteCount: { fontSize: 12, color: '#999' },
  bestScore: { fontSize: 12, fontWeight: '700' },
  chevron: { fontSize: 28, color: '#ddd' },

  // Hold bar
  holdContainer: { marginHorizontal: 16, marginBottom: 8 },
  holdLabel: { fontSize: 12, color: '#888', marginBottom: 4, textAlign: 'center' },
  holdBarBg: {
    height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden',
  },
  holdBarFill: { height: '100%', borderRadius: 3 },

  // Note navigation
  noteNavigation: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 12, gap: 8,
  },
  navButton: {
    flex: 1, backgroundColor: '#4A90D9',
    paddingVertical: 11, borderRadius: 10, alignItems: 'center',
  },
  playButton: { backgroundColor: '#7c3aed' },
  navButtonDisabled: { backgroundColor: '#d1d5db' },
  navButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Listen button
  listenControls: { paddingHorizontal: 16, marginBottom: 16 },
  listenButton: {
    backgroundColor: '#22c55e', paddingVertical: 16,
    borderRadius: 14, alignItems: 'center',
    shadowColor: '#22c55e', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  listenButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  // Tips
  tipsCard: {
    backgroundColor: '#fff', marginHorizontal: 16,
    padding: 16, borderRadius: 14,
  },
  tipsTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 6 },
  tipsText: { fontSize: 14, color: '#666', lineHeight: 21 },

  // Fallback
  centeredFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  fallbackText: { fontSize: 18, color: '#666', marginBottom: 20 },
  fallbackButton: {
    backgroundColor: '#4A90D9', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10,
  },
  fallbackButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});