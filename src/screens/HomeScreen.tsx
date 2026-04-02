import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { PartCard } from '../components/PartCard';
import { VOICE_PARTS } from '../constants/notes';
import { VoicePart } from '../types';
import { useUserProgress } from '../hooks/useUserProgress';

type NavigationProp = NativeStackNavigationProp<any>;

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { progress, selectPart } = useUserProgress();

  const handlePartSelect = (part: VoicePart) => {
    selectPart(part);
    navigation.navigate('PartOverview', { part });
  };

  const handlePractice = () => {
    if (progress.selectedPart) {
      navigation.navigate('Practice');
    }
  };

  const handleProgress = () => {
    navigation.navigate('Progress');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.title}>Choir Practice</Text>
        <Text style={styles.subtitle}>Learn your vocal part</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Voice Discovery Banner */}
        {!progress.selectedPart ? (
          <TouchableOpacity
            style={styles.discoverBanner}
            onPress={() => navigation.navigate('VoiceTest')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.discoverGradient}>
              <Text style={styles.discoverIcon}>🎤</Text>
              <View style={styles.discoverText}>
                <Text style={styles.discoverTitle}>Not sure where you fit?</Text>
                <Text style={styles.discoverSub}>Take the Voice Discovery Test →</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Your Voice Part</Text>
          {VOICE_PARTS.map((part) => (
            <PartCard
              key={part.part}
              part={part}
              onPress={() => handlePartSelect(part.part)}
              isSelected={progress.selectedPart === part.part}
            />
          ))}
          <View style={styles.utilityLinks}>
            <TouchableOpacity style={styles.utilityLink} onPress={() => navigation.navigate('VoiceTest')}>
              <Text style={styles.utilityLinkText}>🔄 Retake Voice Test</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.utilityLink} onPress={() => navigation.navigate('MicTest')}>
              <Text style={styles.utilityLinkText}>🎤 Test Microphone</Text>
            </TouchableOpacity>
          </View>
        </View>

        {progress.selectedPart && (
          <View style={styles.quickActions}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <TouchableOpacity style={styles.actionButton} onPress={handlePractice}>
              <Text style={styles.actionButtonText}>Start Practice</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={handleProgress}>
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>View Progress</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How It Works</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoNumber}>1</Text>
            <Text style={styles.infoText}>Select your voice part above</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoNumber}>2</Text>
            <Text style={styles.infoText}>Choose an exercise to practice</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoNumber}>3</Text>
            <Text style={styles.infoText}>Sing and get real-time feedback</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  quickActions: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: '#4A90D9',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4A90D9',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#4A90D9',
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#667eea',
    color: '#fff',
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 28,
    fontSize: 14,
    fontWeight: '700',
    marginRight: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#555',
    flex: 1,
  },
  discoverBanner: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  discoverGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  discoverIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  discoverText: {
    flex: 1,
  },
  discoverTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  discoverSub: {
    fontSize: 14,
    color: '#ccc',
    fontWeight: '600',
  },
  utilityLinks: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 12,
    marginBottom: 8,
  },
  utilityLink: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(102,126,234,0.1)',
    borderRadius: 12,
  },
  utilityLinkText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
});