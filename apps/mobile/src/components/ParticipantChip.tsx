import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

interface ParticipantChipProps {
  name: string;
  selected: boolean;
  onToggle: () => void;
}

export function ParticipantChip({ name, selected, onToggle }: ParticipantChipProps) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
      ]}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{name}</Text>
    </Pressable>
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
