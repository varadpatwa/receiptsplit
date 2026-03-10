import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import type { Split } from '@receiptsplit/shared';
import { formatCurrency, calculateBreakdown, getReceiptTotal, generateShareableText } from '@receiptsplit/shared';
import { Stepper } from '../../components/Stepper';
import { T } from '../../theme/colors';
import { AuroraBackground } from '../../components/AuroraBackground';

interface SummaryScreenProps {
  split: Split;
  onNext: () => void;
  onBack: () => void;
}

export function SummaryScreen({ split, onNext, onBack }: SummaryScreenProps) {
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const breakdowns = calculateBreakdown(split);
  const receiptTotal = getReceiptTotal(split);
  const shareableText = generateShareableText(split, breakdowns);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(shareableText);
      setCopyMessage('Breakdown copied to clipboard');
      setTimeout(() => setCopyMessage(null), 2000);
    } catch {
      Alert.alert('Copy failed', 'Could not copy to clipboard.');
    }
  };

  return (
    <AuroraBackground>
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <AnimatedPressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
          </AnimatedPressable>
          <Text style={styles.title}>Summary</Text>
        </View>
        <Stepper currentStep="summary" />

        <View style={styles.card}>
          <View style={styles.receiptTotalRow}>
            <Text style={styles.receiptTotalLabel}>Receipt Total</Text>
            <Text style={styles.receiptTotalValue}>{formatCurrency(receiptTotal)}</Text>
          </View>
        </View>

        <View style={styles.copyRow}>
          <Text style={styles.sectionTitle}>Per-Person Breakdown</Text>
          <AnimatedPressable onPress={handleCopy} style={({ pressed }) => [styles.copyBtn, pressed && { opacity: 0.8 }]}>
            <Ionicons name="copy-outline" size={18} color="#fff" />
            <Text style={styles.copyBtnText}>Copy</Text>
          </AnimatedPressable>
        </View>
        {copyMessage ? <Text style={styles.toast}>{copyMessage}</Text> : null}

        {breakdowns.map((b) => (
          <View key={b.participantId} style={styles.card}>
            <View style={styles.breakdownHeader}>
              <Text style={styles.breakdownName}>{b.participantName}</Text>
              <Text style={styles.breakdownTotal}>{formatCurrency(b.grandTotal)}</Text>
            </View>
            <View style={styles.breakdownDivider} />
            {b.items.map((item, idx) => (
              <View key={idx} style={styles.breakdownRow}>
                <Text style={styles.muted}>{item.itemName}</Text>
                <Text style={styles.muted}>{formatCurrency(item.amount)}</Text>
              </View>
            ))}
            <View style={styles.breakdownRow}>
              <Text style={styles.itemsSubtotal}>Items Subtotal</Text>
              <Text style={styles.itemsSubtotal}>{formatCurrency(b.itemsTotal)}</Text>
            </View>
            {b.taxTotal > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.muted}>Tax</Text>
                <Text style={styles.muted}>{formatCurrency(b.taxTotal)}</Text>
              </View>
            )}
            {b.tipTotal > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.muted}>Tip</Text>
                <Text style={styles.muted}>{formatCurrency(b.tipTotal)}</Text>
              </View>
            )}
          </View>
        ))}

        <AnimatedPressable onPress={onNext} style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.8 }]}>
          <Text style={styles.nextBtnText}>Next: Export</Text>
        </AnimatedPressable>
      </ScrollView>
    </SafeAreaView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { padding: 8, marginRight: 8 },
  title: { fontSize: 22, fontWeight: '600', color: '#fff' },
  card: {
    backgroundColor: T.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.cardBorder,
    padding: 16,
    marginBottom: 16,
  },
  receiptTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptTotalLabel: { fontSize: 18, fontWeight: '600', color: '#fff' },
  receiptTotalValue: { fontSize: 22, fontWeight: '600', color: '#fff' },
  copyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12 },
  copyBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  toast: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 12 },
  breakdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownName: { fontSize: 18, fontWeight: '600', color: '#fff' },
  breakdownTotal: { fontSize: 22, fontWeight: '600', color: '#fff' },
  breakdownDivider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', marginTop: 12, paddingTop: 12 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  muted: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  itemsSubtotal: { fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  nextBtn: { backgroundColor: T.ctaBg, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  nextBtnText: { color: T.ctaText, fontSize: 16, fontWeight: '600' },
});
