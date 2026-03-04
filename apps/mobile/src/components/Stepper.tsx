import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {steps.map((step, index) => {
          const isActive = index <= currentIndex;
          return (
            <React.Fragment key={step.id}>
              <View style={styles.stepWrap}>
                <View style={[styles.circle, isActive ? styles.circleActive : styles.circleInactive]}>
                  <Text style={[styles.circleText, isActive && styles.circleTextActive]}>{index + 1}</Text>
                </View>
                <Text style={[styles.label, index === currentIndex && styles.labelActive]}>{step.label}</Text>
              </View>
              {index < steps.length - 1 && (
                <View style={[styles.line, index < currentIndex && styles.lineActive]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  stepWrap: { alignItems: 'center' },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: { backgroundColor: '#fff' },
  circleInactive: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  circleText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  circleTextActive: { color: '#000' },
  label: { marginTop: 8, fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.6)' },
  labelActive: { color: '#fff' },
  line: { flex: 1, height: 2, marginBottom: 24, marginHorizontal: 4, backgroundColor: 'rgba(255,255,255,0.1)' },
  lineActive: { backgroundColor: '#fff' },
});
