/**
 * YIN Pitch Detection Algorithm Implementation
 *
 * Based on "YIN, a fundamental frequency estimator for speech and music"
 * by Alain de Cheveigné and Hideki Kawahara
 */

const YIN_THRESHOLD = 0.2; // Default threshold for YIN algorithm
const YIN_PROBABILITY_THRESHOLD = 0.7; // Minimum confidence to report a pitch

/**
 * Computes the difference function for the YIN algorithm
 * @param buffer Audio sample buffer
 * @param maxTau Maximum tau (period) to search
 * @returns Difference function array
 */
function difference(buffer: Float32Array, maxTau: number): Float32Array {
  const length = buffer.length;
  const yinBuffer = new Float32Array(maxTau);

  for (let tau = 0; tau < maxTau; tau++) {
    yinBuffer[tau] = 0;
    for (let i = 0; i < maxTau; i++) {
      const delta = buffer[i] - buffer[i + tau];
      yinBuffer[tau] += delta * delta;
    }
  }

  return yinBuffer;
}

/**
 * Cumulative mean normalized difference function
 * @param yinBuffer Difference function array
 */
function cumulativeMeanNormalizedDifference(yinBuffer: Float32Array): void {
  yinBuffer[0] = 1;
  let runningSum = 0;

  for (let tau = 1; tau < yinBuffer.length; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] = yinBuffer[tau] * tau / runningSum;
  }
}

/**
 * Find the absolute threshold
 * @param yinBuffer YIN buffer
 * @param threshold Threshold value
 * @returns Index of the first tau below threshold, or -1 if none found
 */
function absoluteThreshold(yinBuffer: Float32Array, threshold: number): number {
  // Start from tau = 2 to avoid the trivial solution
  for (let tau = 2; tau < yinBuffer.length; tau++) {
    if (yinBuffer[tau] < threshold) {
      // Look for local minimum
      while (tau + 1 < yinBuffer.length && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      return tau;
    }
  }
  return -1;
}

/**
 * Parabolic interpolation for more accurate pitch detection
 * @param yinBuffer YIN buffer
 * @param tau The tau found by absolute threshold
 * @returns Interpolated tau
 */
function parabolicInterpolation(yinBuffer: Float32Array, tau: number): number {
  if (tau < 1 || tau >= yinBuffer.length - 1) {
    return tau;
  }

  const x0 = tau - 1;
  const x1 = tau;
  const x2 = tau + 1;

  const y0 = yinBuffer[x0];
  const y1 = yinBuffer[x1];
  const y2 = yinBuffer[x2];

  // Coefficients for parabola
  const a = (y0 + y2 - 2 * y1) / 2;
  const b = (y2 - y0) / 2;

  // Minimum point of parabola
  const xMin = -b / (2 * a);

  // Only adjust if within reasonable bounds
  if (Math.abs(xMin) < 1) {
    return tau + xMin;
  }

  return tau;
}

/**
 * Main YIN pitch detection function
 * @param audioBuffer Audio sample buffer (Float32Array)
 * @param sampleRate Audio sample rate (default 44100)
 * @returns Detected frequency and confidence, or null if no pitch found
 */
export function detectPitch(
  audioBuffer: Float32Array,
  sampleRate: number = 44100
): { frequency: number; confidence: number } | null {
  const bufferSize = audioBuffer.length;

  // Minimum and maximum frequencies we're interested in
  // For choir: roughly G2 (98Hz) to A5 (880Hz)
  const minFrequency = 80;
  const maxFrequency = 1200;

  // Calculate tau range
  const maxTau = Math.min(bufferSize, Math.floor(sampleRate / minFrequency));
  const minTau = Math.floor(sampleRate / maxFrequency);

  if (bufferSize < maxTau) {
    return null;
  }

  // Compute difference function
  const yinBuffer = difference(audioBuffer, maxTau);

  // Normalize
  cumulativeMeanNormalizedDifference(yinBuffer);

  // Find the tau where the difference falls below threshold
  const tau = absoluteThreshold(yinBuffer, YIN_THRESHOLD);

  if (tau === -1 || tau < minTau) {
    return null;
  }

  // Interpolate for better accuracy
  const betterTau = parabolicInterpolation(yinBuffer, tau);

  // Calculate confidence (1 - normalized difference at found tau)
  const confidence = 1 - yinBuffer[tau];

  if (confidence < YIN_PROBABILITY_THRESHOLD) {
    return null;
  }

  // Calculate frequency
  const frequency = sampleRate / betterTau;

  return {
    frequency,
    confidence
  };
}

/**
 * Convert frequency to musical note with cents deviation
 * @param frequency Detected frequency
 * @returns Note information
 */
export function frequencyToMusicalNote(frequency: number): {
  note: string;
  octave: number;
  cents: number;
  frequency: number;
} {
  const A4 = 440;
  const A4_MIDI = 69;

  // Calculate MIDI note number (with fractional part for cents)
  const midiNote = 12 * Math.log2(frequency / A4) + A4_MIDI;

  // Round to nearest note
  const roundedMidi = Math.round(midiNote);
  const cents = Math.round((midiNote - roundedMidi) * 100);

  // Calculate note name and octave
  const octave = Math.floor(roundedMidi / 12) - 1;
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteName = noteNames[roundedMidi % 12];

  return {
    note: noteName,
    octave,
    cents,
    frequency
  };
}

/**
 * Get the target note's frequency
 * @param note Note name (e.g., 'C', 'F#')
 * @param octave Octave number
 * @returns Frequency in Hz
 */
export function getNoteFrequency(note: string, octave: number): number {
  const A4 = 440;
  const A4_MIDI = 69;

  // Remove sharp symbol for note name lookup
  const noteIndex = {
    'C': 0, 'C#': 1,
    'D': 2, 'D#': 3,
    'E': 4,
    'F': 5, 'F#': 6,
    'G': 7, 'G#': 8,
    'A': 9, 'A#': 10,
    'B': 11
  };

  const semitone = noteIndex[note as keyof typeof noteIndex] ?? 0;
  const midiNote = (octave + 1) * 12 + semitone;

  return A4 * Math.pow(2, (midiNote - A4_MIDI) / 12);
}

/**
 * Calculate pitch accuracy percentage
 * @param detectedCents Cents deviation from target note
 * @returns Accuracy percentage (0-100)
 */
export function calculateAccuracy(detectedCents: number): number {
  // Cents range from -50 to +50 for notes within a semitone
  // Convert to accuracy: 0 cents = 100%, ±50 cents = 0%
  const accuracy = 100 - Math.abs(detectedCents) * 2;
  return Math.max(0, Math.min(100, accuracy));
}