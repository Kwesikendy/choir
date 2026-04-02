import { useState, useEffect, useRef, useCallback } from 'react';
import { detectPitch, frequencyToMusicalNote } from '../utils/pitchUtils';
import { rawPcmBase64ToFloat32 } from '../utils/wavUtils';
import { PitchResult } from '../types';
import LiveAudioStream from 'react-native-live-audio-stream';

interface UsePitchDetectionOptions {
  targetFrequency?: number;
  onPitchDetected?: (pitch: PitchResult | null) => void;
}

const SAMPLE_RATE = 44100;
const SILENCE_DB_THRESHOLD = -55;

export function usePitchDetection({ targetFrequency, onPitchDetected }: UsePitchDetectionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [currentPitch, setCurrentPitch] = useState<PitchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [volumeDb, setVolumeDb] = useState<number>(-160);

  const isActiveRef = useRef(false);

  useEffect(() => {
    // Initialize the native stream
    try {
      LiveAudioStream.init({
        sampleRate: SAMPLE_RATE,
        channels: 1,
        bitsPerSample: 16,
        audioSource: 6, // Voice Recognition
        bufferSize: 8192, // Good chunk size for low latency responsiveness
        wavFile: '' // Required by TS definitions to prevent error, even if unused
      });
    } catch (e) {
      console.error("Failed to initialize native audio stream", e);
    }
  }, []);

  const calculateVolumeDb = (samples: Float32Array): number => {
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
        sumSquares += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sumSquares / samples.length);
    if (rms === 0) return -160;
    return 20 * Math.log10(rms);
  };

  const startListening = useCallback(async () => {
    setError(null);
    setCurrentPitch(null);
    setVolumeDb(-160);
    isActiveRef.current = true;
    setIsListening(true);

    try {
      LiveAudioStream.on('data', (data: string) => {
        if (!isActiveRef.current) return;
        
        try {
          const floats = rawPcmBase64ToFloat32(data);
          
          // 1. Calculate true mathematical volume
          const db = calculateVolumeDb(floats);
          setVolumeDb(db);

          if (db < SILENCE_DB_THRESHOLD) {
            setCurrentPitch(null);
            onPitchDetected?.(null);
            return;
          }

          // 2. Feed raw buffer to YIN pitch engine
          const result = detectPitch(floats, SAMPLE_RATE);

          if (result && result.frequency > 0 && result.confidence > 0.5) {
            const noteInfo = frequencyToMusicalNote(result.frequency);
            const finalPitch: PitchResult = {
              frequency: result.frequency,
              note: `${noteInfo.note}${noteInfo.octave}`,
              octave: noteInfo.octave,
              cents: noteInfo.cents,
              confidence: result.confidence,
            };
            setCurrentPitch(finalPitch);
            onPitchDetected?.(finalPitch);
          }
        } catch (e) {
          // ignore parsing drops
        }
      });

      LiveAudioStream.start();
    } catch (err: any) {
      console.error("Native audio start error:", err);
      setError(err.message || 'Microphone recording failed.');
      setIsListening(false);
      isActiveRef.current = false;
    }
  }, [onPitchDetected]);

  const stopListening = useCallback(async () => {
    isActiveRef.current = false;
    setIsListening(false);
    try {
      LiveAudioStream.stop();
    } catch(e) {}
  }, []);

  const cleanup = useCallback(() => {
    if (isActiveRef.current) {
        stopListening();
    }
  }, [stopListening]);

  useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  return { isListening, currentPitch, error, volumeDb, startListening, stopListening };
}
