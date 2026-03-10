import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { Avatar } from './Avatar';

interface ParticipantChipProps {
  name: string;
  selected: boolean;
  onToggle: () => void;
  avatarUrl?: string | null;
}

export function ParticipantChip({ name, selected, onToggle, avatarUrl }: ParticipantChipProps) {
  return (
    <AnimatedPressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
      ]}
    >
      <View style={styles.inner}>
        <Avatar name={name} avatarUrl={avatarUrl} size={22} />
        <Text style={[styles.text, selected && styles.textSelected]}>{name}</Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'transparent',
  },
  chipSelected: { borderColor: 'transparent', backgroundColor: '#fff' },
  chipPressed: { opacity: 0.85 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  text: { fontSize: 14, fontWeight: '500', color: '#fff' },
  textSelected: { color: '#000' },
});
