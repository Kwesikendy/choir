import { useState, useEffect, useRef, useCallback } from 'react';
import { detectPitch, frequencyToMusicalNote } from '../utils/pitchUtils';
import { rawPcmBase64ToFloat32 } from '../utils/wavUtils';
import { PitchResult } from '../types';
import LiveAudioStream from 'react-native-live-audio-stream';
import { Audio } from 'expo-av';

interface UsePitchDetectionOptions {
  targetFrequency?: number;
  onPitchDetected?: (pitch: PitchResult | null) => void;
}

const SAMPLE_RATE = 44100;
const SILENCE_DB_THRESHOLD = -45; // Lowered to pick up normal/quiet singing instantly

// ---------------------------------------------------------------------------
// Global Audio Stream Manager
// ---------------------------------------------------------------------------
let globalStreamInitialized = false;
let lastProcessTime = 0;
const globalSubscribers = new Set<(data: string) => void>();

function ensureGlobalStream() {
  if (!globalStreamInitialized) {
    LiveAudioStream.init({
      sampleRate: SAMPLE_RATE,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 1, // 1 = MIC
      bufferSize: 2048, 
      wavFile: ''
    });

    LiveAudioStream.on('data', (data: string) => {
      const now = Date.now();
      // Hard throttle: Do not process more than 10 times a second to prevent
      // React state re-render avalanches & JS thread mathematical freezing
      if (now - lastProcessTime < 100) return;
      lastProcessTime = now;

      globalSubscribers.forEach(cb => cb(data));
    });

    globalStreamInitialized = true;
  }
}

export function usePitchDetection({ targetFrequency, onPitchDetected }: UsePitchDetectionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [currentPitch, setCurrentPitch] = useState<PitchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [volumeDb, setVolumeDb] = useState<number>(-160);

  const isActiveRef = useRef(false);



  const calculateVolumeDb = (samples: Float32Array): number => {
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
        sumSquares += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sumSquares / samples.length);
    if (rms === 0) return -160;
    return 20 * Math.log10(rms);
  };

  const onPitchRef = useRef(onPitchDetected);

  // Always keep the ref pointing to the latest callback so we don't need to re-bind
  useEffect(() => {
    onPitchRef.current = onPitchDetected;
  }, [onPitchDetected]);

  // Subscribe to the global stream emitter
  useEffect(() => {
    const handleData = (data: string) => {
      if (!isActiveRef.current) return;
      
      try {
        const floats = rawPcmBase64ToFloat32(data);
        
        // 1. Calculate true mathematical volume
        const db = calculateVolumeDb(floats);
        setVolumeDb(db);

        if (db < SILENCE_DB_THRESHOLD) {
          setCurrentPitch(null);
          onPitchRef.current?.(null);
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
          onPitchRef.current?.(finalPitch);
        }
      } catch (e) {
        // ignore parsing drops
      }
    };

    globalSubscribers.add(handleData);

    return () => {
      globalSubscribers.delete(handleData);
    };
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    setCurrentPitch(null);
    setVolumeDb(-160);
    isActiveRef.current = true;
    setIsListening(true);

    try {
      // Explicitly request OS microphone permissions before touching Native module 
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
          throw new Error('Microphone permission is required to detect pitch.');
      }

      // Ensure the global native module is initialized
      ensureGlobalStream();

      LiveAudioStream.start();
    } catch (err: any) {
      console.error("Native audio start error:", err);
      setError(err.message || 'Microphone recording failed.');
      setIsListening(false);
      isActiveRef.current = false;
    }
  }, []);

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
