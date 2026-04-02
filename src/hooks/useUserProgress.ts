import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProgress, VoicePart } from '../types';

const STORAGE_KEY = '@choir_app_progress';

const DEFAULT_PROGRESS: UserProgress = {
  selectedPart: null,
  completedExercises: [],
  bestScores: {},
  totalPracticeTime: 0,
};

export function useUserProgress() {
  const [progress, setProgress] = useState<UserProgress>(DEFAULT_PROGRESS);
  const [isLoading, setIsLoading] = useState(true);

  // Load progress from storage on mount
  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setProgress({ ...DEFAULT_PROGRESS, ...parsed });
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProgress = useCallback(async (newProgress: UserProgress) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }, []);

  const selectPart = useCallback(async (part: VoicePart) => {
    const newProgress = { ...progress, selectedPart: part };
    setProgress(newProgress);
    await saveProgress(newProgress);
  }, [progress, saveProgress]);

  const markExerciseCompleted = useCallback(async (exerciseId: string, score?: number) => {
    const newCompletedExercises = progress.completedExercises.includes(exerciseId)
      ? progress.completedExercises
      : [...progress.completedExercises, exerciseId];

    const newBestScores = { ...progress.bestScores };
    if (score !== undefined) {
      // Only update if this score is better than the previous best
      if (newBestScores[exerciseId] === undefined || score > newBestScores[exerciseId]) {
        newBestScores[exerciseId] = score;
      }
    }

    const newProgress: UserProgress = {
      ...progress,
      completedExercises: newCompletedExercises,
      bestScores: newBestScores,
    };

    setProgress(newProgress);
    await saveProgress(newProgress);
  }, [progress, saveProgress]);

  const addPracticeTime = useCallback(async (minutes: number) => {
    const newProgress = {
      ...progress,
      totalPracticeTime: progress.totalPracticeTime + minutes,
    };
    setProgress(newProgress);
    await saveProgress(newProgress);
  }, [progress, saveProgress]);

  const resetProgress = useCallback(async () => {
    setProgress(DEFAULT_PROGRESS);
    await saveProgress(DEFAULT_PROGRESS);
  }, [saveProgress]);

  return {
    progress,
    isLoading,
    selectPart,
    markExerciseCompleted,
    addPracticeTime,
    resetProgress,
  };
}