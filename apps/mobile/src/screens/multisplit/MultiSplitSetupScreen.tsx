import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { T } from '../../theme/colors';
import { AuroraBackground } from '../../components/AuroraBackground';

interface Props {
  onNext: (title: string) => void;
  onBack: () => void;
}

export default function MultiSplitSetupScreen({ onNext, onBack }: Props) {
  const [title, setTitle] = useState('');

  const handleNext = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert('Enter a name', 'Give your multi-split a name (e.g. "Friday Night")');
      return;
    }
    onNext(trimmed);
  };

  return (
    <AuroraBackground>
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <AnimatedPressable onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </AnimatedPressable>
          <Text style={styles.headerTitle}>New Multi-Split</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.label}>What's this for?</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Friday Night, Weekend Trip"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={title}
            onChangeText={setTitle}
            autoFocus
            onSubmitEditing={handleNext}
            returnKeyType="next"
          />
          <Text style={styles.hint}>
            A multi-split lets you combine multiple receipts into one group with shared participants.
          </Text>
        </View>

        <View style={styles.footer}>
          <AnimatedPressable
            style={({ pressed }) => [styles.nextButton, pressed && { opacity: 0.8 }, !title.trim() && { opacity: 0.4 }]}
            onPress={handleNext}
            disabled={!title.trim()}
          >
            <Text style={styles.nextButtonText}>Next: Add People</Text>
          </AnimatedPressable>
        </View>
      </View>
    </SafeAreaView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, padding: 20, paddingTop: 16 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  content: { flex: 1 },
  label: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  input: {
    backgroundColor: T.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.cardBorder,
    padding: 16,
    color: '#fff',
    fontSize: 18,
    marginBottom: 12,
  },
  hint: { color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 20 },
  footer: { paddingBottom: 16 },
  nextButton: {
    backgroundColor: T.ctaBg,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: { color: T.ctaText, fontSize: 16, fontWeight: '600' },
});
