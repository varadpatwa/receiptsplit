import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';

interface ParticipantChipProps {
  name: string;
  selected: boolean;
  onToggle: () => void;
}

export function ParticipantChip({ name, selected, onToggle }: ParticipantChipProps) {
  return (
    <AnimatedPressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
      ]}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{name}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'transparent',
  },
  chipSelected: { borderColor: 'transparent', backgroundColor: '#fff' },
  chipPressed: { opacity: 0.85 },
  text: { fontSize: 14, fontWeight: '500', color: '#fff' },
  textSelected: { color: '#000' },
});
