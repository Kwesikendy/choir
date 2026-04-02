import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserProgress } from '../hooks/useUserProgress';
import { usePitchDetection } from '../hooks/usePitchDetection';
import {
  analyseNaturalVoiceRange, VoicePartResult, getConfidenceLabel
} from '../utils/voiceAnalysis';
import { PitchResult } from '../types';

type Stage = 'intro' | 'lowest' | 'highest' | 'speaking' | 'results';

const LISTEN_SECONDS = 8; // Extended for siren sliding

export function VoiceTestScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { selectPart } = useUserProgress();

  const [stage, setStage] = useState<Stage>('intro');
  const [minFreq, setMinFreq] = useState(0);
  const [maxFreq, setMaxFreq] = useState(0);
  const [speakFreq, setSpeakFreq] = useState(0);
  const [results, setResults] = useState<VoicePartResult[]>([]);

  const handleFinishPhase = (type: 'lowest' | 'highest' | 'speaking', freq: number) => {
    if (type === 'lowest') {
      setMinFreq(freq);
      setStage('highest');
    } else if (type === 'highest') {
      setMaxFreq(freq);
      setStage('speaking');
    } else {
      setSpeakFreq(freq);
      const ranked = analyseNaturalVoiceRange(minFreq, maxFreq, freq);
      setResults(ranked);
      setStage('results');
    }
  };

  const handleAcceptRecommendation = async (part: VoicePartResult) => {
    await selectPart(part.part);
    navigation.navigate('PartOverview', { part: part.part });
  };

  if (stage === 'intro') {
    return <IntroStage onStart={() => setStage('lowest')} onBack={() => navigation.goBack()} />;
  }

  if (stage === 'lowest' || stage === 'highest' || stage === 'speaking') {
    return (
      <ExtremeTestStage 
        key={stage}
        type={stage} 
        onDone={(freq) => handleFinishPhase(stage, freq)} 
        onBack={() => {
          if (stage === 'lowest') setStage('intro');
          if (stage === 'highest') setStage('lowest');
          if (stage === 'speaking') setStage('highest');
        }}
      />
    );
  }

  return (
    <ResultsStage
      results={results}
      minFreq={minFreq}
      maxFreq={maxFreq}
      speakFreq={speakFreq}
      onAccept={handleAcceptRecommendation}
      onChooseManually={() => navigation.navigate('Home')}
    />
  );
}

// ---------------------------------------------------------------------------
// Testing Stage Component (Lowest, Highest, Speaking)
// ---------------------------------------------------------------------------
function ExtremeTestStage({ type, onDone, onBack }: { type: 'lowest' | 'highest' | 'speaking', onDone: (f: number) => void, onBack: () => void }) {
  const [countdown, setCountdown] = useState(LISTEN_SECONDS);
  const [phase, setPhase] = useState<'ready' | 'sing' | 'done'>('ready');
  
  const extremeRef = useRef(type === 'lowest' ? 10000 : 0);
  const speakSumRef = useRef(0);
  const speakCountRef = useRef(0);

  const [liveNote, setLiveNote] = useState('--');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Animation for the graphical depth gauge
  const gaugeAnim = useRef(new Animated.Value(0)).current;

  const { startListening, stopListening, error: micError } = usePitchDetection({
    onPitchDetected: useCallback((result: PitchResult | null) => {
      if (!result) return;
      
      let fillPercentage = 0;

      if (type === 'lowest') {
        if (result.frequency > 50 && result.frequency < extremeRef.current) extremeRef.current = result.frequency;
        // Visual depth scale for Lowest (starts dropping from 300Hz down to 60Hz)
        fillPercentage = Math.max(0, Math.min(100, ((300 - result.frequency) / (300 - 60)) * 100));

      } else if (type === 'highest') {
        if (result.frequency < 1200 && result.frequency > extremeRef.current) extremeRef.current = result.frequency;
        // Visual height scale for Highest (starts rising from 200Hz up to 1000Hz)
        fillPercentage = Math.max(0, Math.min(100, ((result.frequency - 200) / (1000 - 200)) * 100));

      } else if (type === 'speaking') {
        if (result.frequency > 60 && result.frequency < 400) {
          speakSumRef.current += result.frequency;
          speakCountRef.current += 1;
          extremeRef.current = speakSumRef.current / speakCountRef.current;
        }
        fillPercentage = 50; // Speaking doesn't use the gauge logic
      }
      
      setLiveNote(result.note);

      // Smoothly animate the gauge thermometer
      Animated.timing(gaugeAnim, {
        toValue: fillPercentage,
        duration: 80, // fluid real-time reaction
        useNativeDriver: false
      }).start();

    }, [type]),
  });

  const startTest = async () => {
    extremeRef.current = type === 'lowest' ? 10000 : 0;
    speakSumRef.current = 0;
    speakCountRef.current = 0;
    
    setLiveNote('--');
    setPhase('sing');
    setCountdown(LISTEN_SECONDS);
    gaugeAnim.setValue(0);

    await startListening();

    let remain = LISTEN_SECONDS;
    timerRef.current = setInterval(() => {
      remain -= 1;
      setCountdown(remain);
      if (remain <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        stopListening();
        setPhase('done');
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopListening();
    };
  }, []);

  const progressGroup = type === 'lowest' ? 33 : type === 'highest' ? 66 : 100;
  
  const getTitles = () => {
    if (type === 'lowest') return { phase: 'Phase 1: Deepest Range', action: 'Find your floor', instruction: 'The Low Siren', desc: 'Sliiiide your voice continuously downwards. Keep dragging it deeper like a fire engine siren until it naturally stops or croaks.' };
    if (type === 'highest') return { phase: 'Phase 2: Highest Range', action: 'Reach your peak', instruction: 'The High Siren', desc: 'Sliiiide your voice continuously upwards. Keep lifting it higher and higher like a siren until you absolutely can\'t go further.' };
    return { phase: 'Phase 3: Natural Speaking', action: 'Read out loud', instruction: 'Read the phrase naturally', desc: 'Read exactly in your everyday talking voice. Avoid "putting on a voice" or speaking abnormally high or low.' };
  };
  
  const t = getTitles();

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Voice Discovery</Text>
        <Text style={styles.headerSub}>{t.phase}</Text>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progressGroup}%` as any }]} />
        </View>
      </LinearGradient>

      <View style={styles.content}>
        
        {/* Dynamic Siren Gauge (Hidden during speaking phase) */}
        {type !== 'speaking' && phase === 'sing' && (
          <View style={styles.gaugeContainer}>
             <View style={styles.gaugeTrack}>
                <Animated.View style={[
                  styles.gaugeFill, 
                  { 
                    height: gaugeAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                    backgroundColor: type === 'lowest' ? '#3b82f6' : '#ef4444',
                    top: type === 'lowest' ? 0 : undefined,
                    bottom: type === 'highest' ? 0 : undefined,
                  }
                ]} />
             </View>
             <Text style={styles.gaugeHint}>
               {type === 'lowest' ? '↓ Slide Deeper' : '↑ Slide Higher'}
             </Text>
          </View>
        )}

        {/* Regular UI Box */}
        <View style={[styles.noteCard, type !== 'speaking' && phase === 'sing' && { marginTop: 24, paddingVertical: 18 }]}>
          <Text style={styles.noteLabelTag}>{t.action}</Text>
          <Text style={styles.noteName}>{phase === 'ready' ? '?' : liveNote}</Text>
          {phase === 'done' && (
             <Text style={styles.extremeFound}>Locked: {Math.round(extremeRef.current === 10000 ? 0 : extremeRef.current)} Hz</Text>
          )}
        </View>

        {phase === 'ready' && (
          <View style={styles.phaseBox}>
            <Text style={styles.phaseTitle}>{t.instruction}</Text>
            {type === 'speaking' ? (
               <View style={styles.sentenceCard}>
                 <Text style={styles.sentenceText}>"The quick brown fox jumps over the lazy dog."</Text>
               </View>
            ) : null}
            <Text style={styles.phaseDesc}>{t.desc}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={startTest}>
              <Text style={styles.primaryBtnText}>🎤 Start Recording</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'sing' && (
          <View style={styles.phaseBox}>
            {micError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>🎤 Microphone Error</Text>
                <Text style={styles.errorSub}>{micError}</Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <View style={[styles.countdown, type !== 'speaking' && { flexDirection: 'row', gap: 12 }]}>
                  <Text style={[styles.countdownNum, { color: '#22c55e', fontSize: type !== 'speaking' ? 42 : 86, lineHeight: type !== 'speaking' ? 48 : 95 }]}>{countdown}</Text>
                  <Text style={styles.countdownLabel}>seconds{type !== 'speaking' ? ' left to slide' : ' left'}</Text>
                </View>
                {type === 'speaking' ? (
                   <View style={styles.sentenceCard}>
                     <Text style={[styles.sentenceText, { color: '#22c55e' }]}>"The quick brown fox jumps over the lazy dog."</Text>
                   </View>
                ) : (
                   <Text style={[styles.singPrompt, { color: type === 'lowest' ? '#60a5fa' : '#f87171' }]}>
                     Keep sliding {type === 'lowest' ? 'down' : 'up'}!
                   </Text>
                )}
              </View>
            )}
          </View>
        )}

        {phase === 'done' && (
           <View style={styles.phaseBox}>
              <Text style={styles.scoreLabel}>Capture secured! ✅</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => {
                  let safeVal = extremeRef.current;
                  if (safeVal === 10000 || safeVal === 0) {
                    if (type === 'lowest') safeVal = 200;
                    if (type === 'highest') safeVal = 400;
                    if (type === 'speaking') safeVal = 250;
                  }
                  onDone(safeVal);
              }}>
                <Text style={styles.primaryBtnText}>
                  {type === 'lowest' ? 'Proceed to Phase 2 →' : type === 'highest' ? 'Proceed to Phase 3 →' : 'See Analysis Results →'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.manualBtn} onPress={() => setPhase('ready')}>
                <Text style={styles.manualBtnText}>Retake this phase</Text>
              </TouchableOpacity>
           </View>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Intro Stage Component
// ---------------------------------------------------------------------------
function IntroStage({ onStart, onBack }: { onStart: () => void; onBack: () => void }) {
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.fullHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.introIcon}>🎤</Text>
        <Text style={styles.introTitle}>Discover Your{'\n'}True Range</Text>
        <Text style={styles.introSubtitle}>
          We don't ask you to match difficult targets. You define your own limits.
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.introContent}>
        {[
          { icon: '📉', title: 'Phase 1: The Low Siren', body: 'Start softly and smoothly slide your voice downward, going as deep as you naturally can.' },
          { icon: '📈', title: 'Phase 2: The High Siren', body: 'Sweep your pitch upward. Safely push the ceiling to find out how high you can go.' },
          { icon: '🗣️', title: 'Phase 3: Tessitura', body: 'Casually read a short sentence out loud to find your comfortable acoustic center.' },
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

// ---------------------------------------------------------------------------
// Results Stage Component
// ---------------------------------------------------------------------------
function ResultsStage({
  results, minFreq, maxFreq, speakFreq, onAccept, onChooseManually,
}: {
  results: VoicePartResult[];
  minFreq: number;
  maxFreq: number;
  speakFreq: number;
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
        
        {/* Acoustic Breakdown Box */}
        <View style={styles.descCard}>
           <Text style={styles.sectionLabel}>Acoustic Breakdown</Text>
           <Text style={styles.rangeSummaryText}>
             • Lowest Boundary: <Text style={{fontWeight:'900'}}>{Math.round(minFreq)} Hz</Text>{'\n'}
             • Highest Boundary: <Text style={{fontWeight:'900'}}>{Math.round(maxFreq)} Hz</Text>{'\n'}
             • Speaking Anchor: <Text style={{fontWeight:'900'}}>{Math.round(speakFreq)} Hz</Text>{'\n\n'}
             This biological profile perfectly correlates with a standard <Text style={{fontWeight:'900', color: top.color}}>{top.label}</Text>!
           </Text>
        </View>

        {/* Description */}
        <View style={styles.descCard}>
          <Text style={styles.descText}>{top.description}</Text>
          <Text style={styles.encouragementText}>💬 {top.encouragement}</Text>
        </View>

        {/* All part scores */}
        <Text style={styles.sectionLabel}>Overlap Breakdown</Text>
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

// ---------------------------------------------------------------------------
// Shared Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: { paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 },
  fullHeader: { paddingTop: 60, paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center' },
  backBtn: { marginBottom: 12, width: 80 },
  backBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 15 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 2 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 12 },
  progressBg: { height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#667eea', borderRadius: 3 },
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
  content: { padding: 20, paddingBottom: 40, alignItems: 'center', flex: 1, justifyContent: 'center' },
  gaugeContainer: { flex: 1, maxHeight: 150, width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  gaugeTrack: { width: 30, flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  gaugeFill: { width: '100%', position: 'absolute' },
  gaugeHint: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 12, fontWeight: '700' },
  noteCard: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingVertical: 32,
    paddingHorizontal: 48, alignItems: 'center', marginBottom: 32, width: '100%',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  noteLabelTag: { fontSize: 14, color: '#667eea', fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
  noteName: { fontSize: 82, fontWeight: '900', color: '#fff', lineHeight: 90 },
  extremeFound: { fontSize: 18, color: '#22c55e', marginTop: 16, fontWeight: '700' },
  phaseBox: { alignItems: 'center', width: '100%', gap: 16 },
  phaseTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  phaseDesc: { fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22 },
  sentenceCard: { backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, marginVertical: 8 },
  sentenceText: { fontSize: 16, fontWeight: '600', color: '#fff', fontStyle: 'italic', textAlign: 'center' },
  singPrompt: { fontSize: 18, fontWeight: '700', color: '#fff' },
  primaryBtn: {
    backgroundColor: '#667eea', borderRadius: 14, paddingVertical: 16,
    paddingHorizontal: 32, alignItems: 'center', width: '100%',
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  countdown: { alignItems: 'center', marginBottom: 16 },
  countdownNum: { fontSize: 86, fontWeight: '900', lineHeight: 95 },
  countdownLabel: { fontSize: 16, color: 'rgba(255,255,255,0.5)', marginTop: -6 },
  scoreLabel: { fontSize: 20, fontWeight: '700', color: '#22c55e', marginBottom: 8 },
  resultsHeader: { paddingTop: 60, paddingBottom: 28, paddingHorizontal: 24, alignItems: 'center' },
  resultsIcon: { fontSize: 48, marginBottom: 8 },
  resultsTitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', letterSpacing: 2, textTransform: 'uppercase' },
  resultsPartName: { fontSize: 42, fontWeight: '900', color: '#fff', marginTop: 4 },
  resultsRange: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  confBadge: { marginTop: 10, borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 },
  confBadgeText: { fontSize: 13, fontWeight: '700' },
  resultsContent: { padding: 20, paddingBottom: 48, backgroundColor: '#f0f2f5' },
  descCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  descText: { fontSize: 15, color: '#333', lineHeight: 22, marginBottom: 12 },
  encouragementText: { fontSize: 14, color: '#667eea', fontStyle: 'italic', lineHeight: 20 },
  rangeSummaryText: { fontSize: 15, color: '#444', lineHeight: 22 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#888', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },
  partRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, gap: 12 },
  partRowIcon: { fontSize: 22 },
  partRowInfo: { flex: 1, gap: 6 },
  partRowName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  partRowBarBg: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  partRowBarFill: { height: '100%', borderRadius: 4 },
  partRowScore: { fontSize: 15, fontWeight: '800', width: 40, textAlign: 'right' },
  secondaryBtn: { borderWidth: 2, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  secondaryBtnText: { fontSize: 15, fontWeight: '700' },
  manualBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  manualBtnText: { fontSize: 14, color: '#888', textDecorationLine: 'underline' },
  errorBox: { backgroundColor: 'rgba(239,68,68,0.15)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', alignItems: 'center' },
  errorText: { color: '#f87171', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  errorSub: { color: 'rgba(239,68,68,0.7)', fontSize: 13 },
});
