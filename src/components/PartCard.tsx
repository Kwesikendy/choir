import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { VoicePart, VoicePartRange } from '../types';

interface PartCardProps {
  part: VoicePartRange;
  onPress: () => void;
  isSelected?: boolean;
}

export function PartCard({ part, onPress, isSelected }: PartCardProps) {
  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.colorBar, { backgroundColor: part.color }]} />
      <View style={styles.content}>
        <Text style={styles.name}>{part.name}</Text>
        <Text style={styles.range}>{part.typicalRange}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {part.description}
        </Text>
      </View>
      <View style={styles.chevron}>
        <Text style={styles.chevronText}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  selected: {
    borderWidth: 2,
    borderColor: '#4A90D9',
  },
  colorBar: {
    width: 6,
    minHeight: 80,
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  range: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  chevron: {
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  chevronText: {
    fontSize: 28,
    color: '#ccc',
    fontWeight: '300',
  },
});