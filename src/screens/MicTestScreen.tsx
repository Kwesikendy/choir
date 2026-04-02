import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePitchDetection } from '../hooks/usePitchDetection';

export function MicTestScreen() {
  const navigation = useNavigation();
  const { isListening, volumeDb, error, startListening, stopListening } = usePitchDetection();
  
  // Convert -160 -> 0 dB scale to a 0 -> 100 percentage for the volume bar
  // Usually anything below -60 is background noise, and normal speech is around -30 to -10.
  const volumePercentage = Math.max(0, Math.min(100, ((volumeDb + 80) / 80) * 100));

  useEffect(() => {
    // Automatically start listening when the screen opens
    startListening();
    return () => {
      stopListening();
    };
  }, [startListening, stopListening]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Microphone Test</Text>
        <Text style={styles.headerSub}>Speak normally to test audio input</Text>
      </LinearGradient>

      <View style={styles.content}>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>🎤 Microphone Error</Text>
            <Text style={styles.errorSub}>{error}</Text>
            <Text style={styles.errorHelp}>Please check your system or app permissions. Expo Go needs permission to access your microphone.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={startListening}>
              <Text style={styles.retryBtnText}>Retry Permissions</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.testCard}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{volumePercentage > 15 ? '🗣️' : '🤐'}</Text>
            </View>
            
            <Text style={styles.statusText}>
              {isListening ? (volumePercentage > 15 ? 'Receiving audio...' : 'Listening...') : 'Starting microphone...'}
            </Text>

            {/* Volume Meter */}
            <View style={styles.meterBg}>
              <View 
                style={[
                  styles.meterFill, 
                  { 
                    width: `${volumePercentage}%`,
                    backgroundColor: volumePercentage > 75 ? '#ef4444' : volumePercentage > 40 ? '#22c55e' : '#667eea'
                  }
                ]} 
              />
            </View>
            
            <View style={styles.statsRow}>
              <Text style={styles.statLabel}>Raw Input:</Text>
              <Text style={styles.statValue}>{Math.round(volumeDb)} dB</Text>
            </View>

            <View style={styles.helpBox}>
              <Text style={styles.helpText}>
                If the bar bounces when you speak, your microphone is working perfectly. 
                If it stays completely empty and reads -160 dB, your microphone might be blocked or used by another app.
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20 },
  backBtn: { marginBottom: 16 },
  backBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 16 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: 15, color: 'rgba(255,255,255,0.6)' },
  
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  testCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  
  iconContainer: {
    width: 80, height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: { fontSize: 40 },
  
  statusText: { fontSize: 18, color: '#fff', fontWeight: '600', marginBottom: 32 },
  
  meterBg: {
    width: '100%', height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  meterFill: { height: '100%', borderRadius: 12 },
  
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  statValue: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
  
  helpBox: {
    backgroundColor: 'rgba(102,126,234,0.15)',
    padding: 16,
    borderRadius: 12,
  },
  helpText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 22, textAlign: 'center' },

  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    padding: 24, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)',
    alignItems: 'center',
  },
  errorText: { color: '#f87171', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  errorSub: { color: '#fff', fontSize: 16, marginBottom: 16, textAlign: 'center' },
  errorHelp: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  retryBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
