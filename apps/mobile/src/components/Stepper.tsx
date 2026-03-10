import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { T } from '../theme/colors';

type StepId = 'receipt' | 'people' | 'assign' | 'summary' | 'export';

const steps: { id: StepId; label: string }[] = [
  { id: 'receipt', label: 'Receipt' },
  { id: 'people', label: 'People' },
  { id: 'assign', label: 'Assign' },
  { id: 'summary', label: 'Summary' },
  { id: 'export', label: 'Export' },
];

interface StepperProps {
  currentStep: StepId;
}

export function Stepper({ currentStep }: StepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);
  const progress = (currentIndex / (steps.length - 1)) * 100;

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${progress}%` }]} />
        {/* Step dots on the bar */}
        {steps.map((_, index) => {
          const isCompleted = index <= currentIndex;
          const position = (index / (steps.length - 1)) * 100;
          return (
            <View
              key={index}
              style={[
                styles.dot,
                { left: `${position}%` },
                isCompleted ? styles.dotActive : styles.dotInactive,
                index === currentIndex && styles.dotCurrent,
              ]}
            />
          );
        })}
      </View>
      {/* Labels */}
      <View style={styles.labelRow}>
        {steps.map((step, index) => (
          <Text
            key={step.id}
            style={[
              styles.label,
              index === currentIndex && styles.labelActive,
              index < currentIndex && styles.labelCompleted,
            ]}
          >
            {step.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  barTrack: {
    height: 4,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderRadius: 2,
    marginBottom: 10,
    position: 'relative',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 4,
    backgroundColor: T.accent,
    borderRadius: 2,
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    top: -3,
    marginLeft: -5,
  },
  dotActive: {
    backgroundColor: T.accent,
  },
  dotInactive: {
    backgroundColor: T.bg,
    borderWidth: 2,
    borderColor: 'rgba(99,102,241,0.3)',
  },
  dotCurrent: {
    width: 12,
    height: 12,
    borderRadius: 6,
    top: -4,
    marginLeft: -6,
    backgroundColor: T.accent,
    shadowColor: T.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    width: 52,
  },
  labelActive: {
    color: T.accent,
    fontWeight: '600',
  },
  labelCompleted: {
    color: 'rgba(255,255,255,0.55)',
  },
});
