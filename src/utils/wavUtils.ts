import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer'; // Requires polyfill in some RN environments, but 'base64-js' or atob is an alternative.

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const lookup = new Uint8Array(256);
for (let i = 0; i < chars.length; i++) {
  lookup[chars.charCodeAt(i)] = i;
}

function base64ToUint8Array(base64: string): Uint8Array {
  let bufferLength = base64.length * 0.75;
  let len = base64.length;
  let i = 0;
  let p = 0;
  let encoded1, encoded2, encoded3, encoded4;

  if (base64[base64.length - 1] === '=') {
    bufferLength--;
    if (base64[base64.length - 2] === '=') {
      bufferLength--;
    }
  }

  const bytes = new Uint8Array(bufferLength);

  for (i = 0; i < len; i += 4) {
    encoded1 = lookup[base64.charCodeAt(i)];
    encoded2 = lookup[base64.charCodeAt(i + 1)];
    encoded3 = lookup[base64.charCodeAt(i + 2)];
    encoded4 = lookup[base64.charCodeAt(i + 3)];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }

  return bytes;
}

/**
 * Converts a raw Base64 encoded Int16 PCM buffer into a Float32Array (-1.0 to 1.0)
 * Suitable for react-native-live-audio-stream output.
 */
export function rawPcmBase64ToFloat32(base64: string): Float32Array {
  const bytes = base64ToUint8Array(base64);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  
  const numSamples = bytes.byteLength / 2;
  const floats = new Float32Array(numSamples);
  
  for (let i = 0; i < numSamples; i++) {
    const int16 = view.getInt16(i * 2, true);
    floats[i] = int16 < 0 ? int16 / 32768.0 : int16 / 32767.0;
  }
  
  return floats;
}

/**
 * Parses a WAV file from an Expo FileSystem URI and extracts the PCM data as Float32.
 * @param uri Local file URI to the .wav file
 * @returns Float32Array containing the audio samples (-1.0 to 1.0)
 */
export async function getPcmDataFromWav(uri: string): Promise<{ samples: Float32Array; sampleRate: number } | null> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as any,
    });

    const bytes = base64ToUint8Array(base64);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    // Basic RIFF/WAVE header parsing
    // 0-3: "RIFF"
    // 8-11: "WAVE"
    // We scan chunks until we find "fmt " and "data"
    let offset = 12;
    let sampleRate = 44100;
    let numChannels = 1;
    let bitsPerSample = 16;
    let dataOffset = -1;
    let dataSize = 0;

    while (offset < view.byteLength - 8) {
      const chunkId =
        String.fromCharCode(view.getUint8(offset)) +
        String.fromCharCode(view.getUint8(offset + 1)) +
        String.fromCharCode(view.getUint8(offset + 2)) +
        String.fromCharCode(view.getUint8(offset + 3));
      
      const chunkSize = view.getUint32(offset + 4, true);

      if (chunkId === 'fmt ') {
        numChannels = view.getUint16(offset + 8 + 2, true);
        sampleRate = view.getUint32(offset + 8 + 4, true);
        bitsPerSample = view.getUint16(offset + 8 + 14, true);
      } else if (chunkId === 'data') {
        dataOffset = offset + 8;
        dataSize = chunkSize;
        break; // found the data we need
      }

      offset += 8 + chunkSize;
    }

    if (dataOffset === -1) {
      console.warn("Could not find data chunk in WAV file");
      return null;
    }

    const numSamples = dataSize / (bitsPerSample / 8);
    const floats = new Float32Array(numSamples);

    if (bitsPerSample === 16) {
      // Int16 to Float32 interpolation
      for (let i = 0; i < numSamples; i++) {
        // Read 16-bit little-endian
        const int16 = view.getInt16(dataOffset + i * 2, true);
        // Normalize to [-1.0, 1.0]
        floats[i] = int16 < 0 ? int16 / 32768.0 : int16 / 32767.0;
      }
    } else {
      console.warn(`Unsupported bits per sample: ${bitsPerSample}`);
      return null;
    }

    // If stereo, mix to mono
    if (numChannels === 2) {
      const monoFloats = new Float32Array(numSamples / 2);
      for (let i = 0; i < monoFloats.length; i++) {
        monoFloats[i] = (floats[i * 2] + floats[i * 2 + 1]) / 2;
      }
      return { samples: monoFloats, sampleRate };
    }

    return { samples: floats, sampleRate };
  } catch (error) {
    console.error("WAV parsing error:", error);
    return null;
  }
}
