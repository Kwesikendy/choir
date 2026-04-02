import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Note } from '../types';

interface NoteDisplayProps {
  targetNote: Note | null;
  detectedNote: string | null;
  cents: number;
  isListening: boolean;
  partColor: string;
  accuracy?: number;
}

export function NoteDisplay({ targetNote, detectedNote, cents, isListening, partColor, accuracy }: NoteDisplayProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevAccurateRef = useRef(false);

  const absCents = Math.abs(cents);
  const isAccurate = isListening && detectedNote !== null && absCents <= 15;

  // Pulse animation when singing in tune
  useEffect(() => {
    if (isAccurate && !prevAccurateRef.current) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
        { iterations: -1 }
      ).start();
    } else if (!isAccurate) {
      pulseAnim.stopAnimation();
      Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    }
    prevAccurateRef.current = isAccurate;
  }, [isAccurate, pulseAnim]);

  const getAccuracyColor = () => {
    if (!isListening || detectedNote === null) return '#999';
    if (absCents <= 10) return '#22c55e';
    if (absCents <= 25) return '#eab308';
    return '#ef4444';
  };

  const getAccuracyText = () => {
    if (!isListening) return 'Tap to start';
    if (detectedNote === null) return 'Listening...';
    if (absCents <= 10) return '🎯 Excellent!';
    if (absCents <= 25) return '👍 Good';
    if (cents > 0) return '↓ Too Sharp';
    return '↑ Too Flat';
  };

  const color = getAccuracyColor();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Target Note */}
        <View style={styles.noteContainer}>
          <Text style={styles.label}>TARGET</Text>
          <View style={[styles.noteBox, { borderColor: partColor }]}>
            <Text style={[styles.noteText, { color: partColor }]}>
              {targetNote?.name || '--'}
            </Text>
          </View>
          <Text style={[styles.freqText, { color: partColor }]}>
            {targetNote ? `${Math.round(targetNote.frequency)} Hz` : ''}
          </Text>
        </View>

        {/* Divider arrow */}
        <Text style={styles.arrow}>→</Text>

        {/* Detected Note */}
        <View style={styles.noteContainer}>
          <Text style={styles.label}>YOU</Text>
          <Animated.View
            style={[
              styles.noteBox,
              { borderColor: color, transform: [{ scale: pulseAnim }] },
              isAccurate && styles.accurateGlow,
            ]}
          >
            <Text style={[styles.noteText, { color }]}>
              {isListening ? (detectedNote || '···') : '--'}
            </Text>
          </Animated.View>
          <Text style={[styles.freqText, { color }]}>
            {isListening && detectedNote && cents !== 0
              ? `${cents > 0 ? '+' : ''}${cents}¢`
              : ''}
          </Text>
        </View>
      </View>

      {/* Feedback line */}
      <View style={styles.feedbackRow}>
        <Text style={[styles.feedbackText, { color }]}>
          {getAccuracyText()}
        </Text>
        {isListening && accuracy !== undefined && (
          <View style={[styles.accuracyBadge, { backgroundColor: color + '22', borderColor: color }]}>
            <Text style={[styles.accuracyBadgeText, { color }]}>{accuracy}%</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    margin: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteContainer: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontSize: 11,
    color: '#aaa',
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 8,
  },
  noteBox: {
    borderWidth: 3,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 110,
    alignItems: 'center',
  },
  accurateGlow: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  noteText: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1,
  },
  freqText: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
    minHeight: 16,
  },
  arrow: {
    fontSize: 20,
    color: '#ddd',
    marginHorizontal: 8,
    marginTop: -20,
  },
  feedbackRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  feedbackText: {
    fontSize: 17,
    fontWeight: '700',
  },
  accuracyBadge: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  accuracyBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
});