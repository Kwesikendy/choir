import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserProgress } from '../hooks/useUserProgress';
import { getVoicePartInfo } from '../constants/notes';
import { getExercisesForPart } from '../constants/exercises';

export function ProgressScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { progress } = useUserProgress();
  const partInfo = progress.selectedPart ? getVoicePartInfo(progress.selectedPart) : null;
  const exercises = progress.selectedPart ? getExercisesForPart(progress.selectedPart) : [];

  // Calculate stats
  const totalExercises = exercises.length;
  const completedExercises = progress.completedExercises.length;
  const completionPercentage = totalExercises > 0
    ? Math.round((completedExercises / totalExercises) * 100)
    : 0;

  const averageScore = Object.keys(progress.bestScores).length > 0
    ? Math.round(Object.values(progress.bestScores).reduce((a, b) => a + b, 0) / Object.keys(progress.bestScores).length)
    : 0;

  // Format practice time
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.title}>Your Progress</Text>
        {partInfo && (
          <Text style={styles.subtitle}>{partInfo.name}</Text>
        )}
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{completionPercentage}%</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{averageScore}%</Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatTime(progress.totalPracticeTime)}</Text>
            <Text style={styles.statLabel}>Practice Time</Text>
          </View>
        </View>

        {/* Completion Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercises Completed</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${completionPercentage}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {completedExercises} of {totalExercises} exercises
          </Text>
        </View>

        {/* Best Scores */}
        {Object.keys(progress.bestScores).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Best Scores</Text>
            {Object.entries(progress.bestScores).map(([exerciseId, score]) => {
              const exercise = exercises.find(e => e.id === exerciseId);
              if (!exercise) return null;
              return (
                <View key={exerciseId} style={styles.scoreRow}>
                  <Text style={styles.scoreName}>{exercise.name}</Text>
                  <View style={styles.scoreBar}>
                    <View
                      style={[
                        styles.scoreFill,
                        { width: `${score}%` }
                      ]}
                    />
                  </View>
                  <Text style={styles.scoreValue}>{score}%</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Exercise Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Exercises</Text>
          {exercises.map((exercise) => {
            const isCompleted = progress.completedExercises.includes(exercise.id);
            const bestScore = progress.bestScores[exercise.id];
            return (
              <View
                key={exercise.id}
                style={[
                  styles.exerciseRow,
                  isCompleted && styles.exerciseRowCompleted
                ]}
              >
                <View style={styles.exerciseStatus}>
                  <Text style={styles.statusIcon}>
                    {isCompleted ? '✓' : '○'}
                  </Text>
                  <View style={styles.exerciseDetails}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseType}>{exercise.type}</Text>
                  </View>
                </View>
                {bestScore !== undefined && (
                  <Text style={styles.exerciseScore}>{bestScore}%</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Practice Tips</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>
              • Practice regularly - even 10 minutes daily helps
            </Text>
            <Text style={styles.tipText}>
              • Focus on one exercise at a time until comfortable
            </Text>
            <Text style={styles.tipText}>
              • Record yourself to hear progress over time
            </Text>
            <Text style={styles.tipText}>
              • Stay hydrated for better vocal health
            </Text>
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
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#e5e5e5',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  scoreName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  scoreBar: {
    width: 80,
    height: 8,
    backgroundColor: '#e5e5e5',
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    backgroundColor: '#4A90D9',
    borderRadius: 4,
  },
  scoreValue: {
    width: 35,
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  exerciseRowCompleted: {
    backgroundColor: '#f0fdf4',
  },
  exerciseStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
  },
  exerciseDetails: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  exerciseType: {
    fontSize: 12,
    color: '#888',
    textTransform: 'capitalize',
  },
  exerciseScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90D9',
  },
  tipCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 24,
    marginBottom: 4,
  },
});