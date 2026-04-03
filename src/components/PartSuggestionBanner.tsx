import React, { useEffect, useRef } from 'react';
import {
  Animated, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { VoicePart } from '../types';

const PART_LABELS: Record<VoicePart, string> = {
  soprano: 'Soprano', alto: 'Alto', tenor: 'Tenor', bass: 'Bass',
};
const PART_COLORS: Record<VoicePart, string> = {
  soprano: '#FF6B9D', alto: '#9B59B6', tenor: '#3498DB', bass: '#27AE60',
};
const PART_ICONS: Record<VoicePart, string> = {
  soprano: '🌸', alto: '🍇', tenor: '💎', bass: '🌊',
};

interface Props {
  suggestedPart: VoicePart;
  sessionCount: number;
  onAccept: () => void;
  onDismiss: () => void;
}

export function PartSuggestionBanner({ suggestedPart, sessionCount, onAccept, onDismiss }: Props) {
  const slideAnim = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 90,
      friction: 10,
    }).start();
  }, []);

  const color = PART_COLORS[suggestedPart];

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }], borderLeftColor: color }]}>
      <View style={styles.iconRow}>
        <Text style={styles.icon}>{PART_ICONS[suggestedPart]}</Text>
        <View style={styles.textGroup}>
          <Text style={styles.title}>🧠 Smart Coach Update</Text>
          <Text style={styles.body}>
            After observing your last {sessionCount} practice sessions, your Coach thinks you might be a better fit as{' '}
            <Text style={[styles.partName, { color }]}>{PART_LABELS[suggestedPart]}</Text>!
          </Text>
        </View>
      </View>
      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: color }]} onPress={onAccept}>
          <Text style={styles.acceptBtnText}>Switch to {PART_LABELS[suggestedPart]}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
          <Text style={styles.dismissBtnText}>Keep current part</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#1e2235',
    borderLeftWidth: 4,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  iconRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  icon: { fontSize: 30, marginTop: 2 },
  textGroup: { flex: 1 },
  title: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 4 },
  body: { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 19 },
  partName: { fontWeight: '900' },
  btnRow: { gap: 8 },
  acceptBtn: { borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  dismissBtn: { paddingVertical: 10, alignItems: 'center' },
  dismissBtnText: { fontSize: 13, color: 'rgba(255,255,255,0.45)', textDecorationLine: 'underline' },
});
