/**
 * Audio utilities — microphone config + reference note playback
 */

import { Audio } from 'expo-av';

// ---------------------------------------------------------------------------
// Microphone helpers
// ---------------------------------------------------------------------------

export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting microphone permission:', error);
    return false;
  }
}

export async function configureAudioMode(forPlayback = false): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: !forPlayback,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch (error) {
    console.error('Error configuring audio mode:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Reference note tone generation
// ---------------------------------------------------------------------------

/**
 * Build a minimal valid WAV file containing a pure sine wave at `frequency`
 * for `durationMs` milliseconds.  Returns a base64 data URI that expo-av
 * can load with Audio.Sound.createAsync({ uri }).
 */
export function buildSineWaveDataUri(frequency: number, durationMs: number = 800): string {
  const sampleRate = 22050;
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = numSamples * blockAlign;
  const fileSize = 44 + dataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, fileSize - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);        // PCM chunk size
  view.setUint16(20, 1, true);         // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // PCM samples — cosine-ramped sine for click-free start/end
  const amplitude = 0.6 * 32767;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // 10 ms fade-in / fade-out envelope
    const fadeSamples = Math.floor(sampleRate * 0.01);
    let env = 1;
    if (i < fadeSamples) env = i / fadeSamples;
    else if (i > numSamples - fadeSamples) env = (numSamples - i) / fadeSamples;
    const sample = Math.round(amplitude * env * Math.sin(2 * Math.PI * frequency * t));
    view.setInt16(44 + i * 2, sample, true);
  }

  // Convert to base64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return `data:audio/wav;base64,${base64}`;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

let activeSoundRef: Audio.Sound | null = null;

/**
 * Play a reference tone at the given frequency.
 * Stops any previously playing tone first.
 */
export async function playReferenceNote(frequency: number, durationMs: number = 800): Promise<void> {
  try {
    // Stop any currently playing note
    if (activeSoundRef) {
      try {
        await activeSoundRef.stopAsync();
        await activeSoundRef.unloadAsync();
      } catch (_) { }
      activeSoundRef = null;
    }

    // Switch audio mode to playback
    await configureAudioMode(true);

    const uri = buildSineWaveDataUri(frequency, durationMs);
    const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true, volume: 0.8 });
    activeSoundRef = sound;

    // Auto-cleanup after playback
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        if (activeSoundRef === sound) activeSoundRef = null;
      }
    });
  } catch (err) {
    console.error('Error playing reference note:', err);
  }
}

export async function stopReferenceNote(): Promise<void> {
  if (activeSoundRef) {
    try {
      await activeSoundRef.stopAsync();
      await activeSoundRef.unloadAsync();
    } catch (_) { }
    activeSoundRef = null;
  }
}