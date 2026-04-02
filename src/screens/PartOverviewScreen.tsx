import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { getVoicePartInfo } from '../constants/notes';
import { VoicePart } from '../types';

export function PartOverviewScreen() {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { part } = route.params as { part: VoicePart };

  const partInfo = getVoicePartInfo(part);

  const handleStartPractice = () => {
    navigation.navigate('Practice');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[partInfo.color, partInfo.color + 'CC']}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{partInfo.name}</Text>
        <Text style={styles.range}>{partInfo.typicalRange}</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Part</Text>
          <Text style={styles.description}>{partInfo.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Characteristics</Text>
          <View style={styles.characteristic}>
            <Text style={styles.characteristicLabel}>Range:</Text>
            <Text style={styles.characteristicValue}>{partInfo.typicalRange}</Text>
          </View>
          <View style={styles.characteristic}>
            <Text style={styles.characteristicLabel}>Lowest Note:</Text>
            <Text style={styles.characteristicValue}>{partInfo.lowestNote.name}</Text>
          </View>
          <View style={styles.characteristic}>
            <Text style={styles.characteristicLabel}>Highest Note:</Text>
            <Text style={styles.characteristicValue}>{partInfo.highestNote.name}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Role in Choir</Text>
          <Text style={styles.description}>
            {getRoleDescription(part)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tips for {partInfo.name}s</Text>
          {getTips(part).map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.practiceButton} onPress={handleStartPractice}>
          <LinearGradient
            colors={[partInfo.color, partInfo.color + 'DD']}
            style={styles.practiceButtonGradient}
          >
            <Text style={styles.practiceButtonText}>Start Practice</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

function getRoleDescription(part: VoicePart): string {
  const roles: Record<VoicePart, string> = {
    soprano: 'Sopranos typically carry the melody and are often the most prominent voice in choral arrangements. They add brightness and clarity to the overall sound.',
    alto: 'Altos provide essential harmonic support. They fill in the middle range of chords and add warmth and richness to the choral texture.',
    tenor: 'Tenors often sing the melody in male voice arrangements and provide upper harmonies in mixed choirs. They bridge the gap between bass and alto ranges.',
    bass: 'Basses provide the harmonic foundation. They anchor the chord progressions and give the choir its solid, resonant bottom end.'
  };
  return roles[part];
}

function getTips(part: VoicePart): string[] {
  const tips: Record<VoicePart, string[]> = {
    soprano: [
      'Focus on breath support to maintain high notes',
      'Practice transitioning between chest and head voice smoothly',
      'Keep your jaw relaxed when singing high passages',
      'Work on vowel modification for upper register notes'
    ],
    alto: [
      'Develop your lower register with exercises',
      'Focus on blend and balance with other parts',
      'Practice reading harmony lines independently',
      'Work on switching between harmony and melody'
    ],
    tenor: [
      'Build strength in your passaggio (transition region)',
      'Practice mixing chest and head voice',
      'Focus on clarity in the upper range',
      'Work on breath management for sustained notes'
    ],
    bass: [
      'Develop resonance in your low register',
      'Focus on pitch accuracy for foundation notes',
      'Practice maintaining steady volume throughout range',
      'Work on breath support for sustained low notes'
    ]
  };
  return tips[part];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  range: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  characteristic: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  characteristicLabel: {
    fontSize: 15,
    color: '#666',
  },
  characteristicValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: 15,
    color: '#4A90D9',
    marginRight: 8,
    marginTop: 2,
  },
  tipText: {
    fontSize: 15,
    color: '#555',
    flex: 1,
    lineHeight: 22,
  },
  practiceButton: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  practiceButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  practiceButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});