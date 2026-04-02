import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line, Circle, Rect, Text as SvgText } from 'react-native-svg';

interface PitchVisualizerProps {
  targetFrequency: number;
  detectedFrequency: number | null;
  cents: number;
  partColor: string;
  isListening: boolean;
}

const { width } = Dimensions.get('window');
const VISUALIZER_WIDTH = width - 64;

export function PitchVisualizer({
  targetFrequency,
  detectedFrequency,
  cents,
  partColor,
  isListening
}: PitchVisualizerProps) {
  // Calculate the visual position based on cents deviation
  // Map cents (-50 to +50) to position on screen
  const centsToPosition = (cents: number) => {
    // Clamp to +/- 50 cents
    const clampedCents = Math.max(-50, Math.min(50, cents));
    // Map to -1 to 1 range
    const normalized = clampedCents / 50;
    // Convert to screen position (center is 0)
    return (VISUALIZER_WIDTH / 2) + (normalized * (VISUALIZER_WIDTH / 2));
  };

  const targetX = VISUALIZER_WIDTH / 2;
  const detectedX = isListening && detectedFrequency ? centsToPosition(cents) : targetX;

  // Accuracy indicator color
  const getIndicatorColor = () => {
    if (!isListening) return '#ccc';
    const absCents = Math.abs(cents);
    if (absCents <= 10) return '#22c55e';
    if (absCents <= 25) return '#eab308';
    return '#ef4444';
  };

  return (
    <View style={styles.container}>
      <Svg width={VISUALIZER_WIDTH} height={120}>
        {/* Background gradient bands */}
        <Rect x="0" y="30" width={VISUALIZER_WIDTH / 3} height="60" fill="#fee2e2" />
        <Rect x={VISUALIZER_WIDTH / 3} y="30" width={VISUALIZER_WIDTH / 3} height="60" fill="#fef9c3" />
        <Rect x={2 * VISUALIZER_WIDTH / 3} y="30" width={VISUALIZER_WIDTH / 3} height="60" fill="#dcfce7" />

        {/* Center line (target) */}
        <Line
          x1={targetX}
          y1="20"
          x2={targetX}
          y2="100"
          stroke={partColor}
          strokeWidth="3"
          strokeDasharray="5,5"
        />

        {/* Detected pitch indicator */}
        {isListening && detectedFrequency && (
          <>
            {/* Vertical line showing detected pitch */}
            <Line
              x1={detectedX}
              y1="25"
              x2={detectedX}
              y2="95"
              stroke={getIndicatorColor()}
              strokeWidth="4"
            />
            {/* Circle marker */}
            <Circle
              cx={detectedX}
              cy="60"
              r="12"
              fill={getIndicatorColor()}
            />
          </>
        )}

        {/* Not currently singing */}
        {!isListening && (
          <Circle
            cx={targetX}
            cy="60"
            r="10"
            fill="#ccc"
          />
        )}

        {/* Labels */}
        <SvgText x="10" y="115" fontSize="12" fill="#666">Flat</SvgText>
        <SvgText x={VISUALIZER_WIDTH / 2 - 30} y="15" fontSize="12" fill="#666" fontWeight="600">Target</SvgText>
        <SvgText x={VISUALIZER_WIDTH - 30} y="115" fontSize="12" fill="#666">Sharp</SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
});