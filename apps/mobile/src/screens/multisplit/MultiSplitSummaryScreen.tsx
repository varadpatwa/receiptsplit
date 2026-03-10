import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Share, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import {
  formatCurrency, getReceiptTotal, calculateEventBreakdown,
} from '@receiptsplit/shared';
import type { Split, SplitEvent } from '@receiptsplit/shared';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { T } from '../../theme/colors';
import { AuroraBackground } from '../../components/AuroraBackground';

interface Props {
  event: SplitEvent;
  eventSplits: Split[];
  onBack: () => void;
  onDone: () => void;
}

export default function MultiSplitSummaryScreen({ event, eventSplits, onBack, onDone }: Props) {
  const combinedTotal = eventSplits.reduce((sum, s) => sum + getReceiptTotal(s), 0);
  const personBreakdown = calculateEventBreakdown(eventSplits);

  const generateText = () => {
    const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
    let text = `💰 ${event.title}\n`;
    text += `${eventSplits.length} receipts · Total: ${fmt(combinedTotal)}\n\n`;

    text += `Each Person Owes:\n`;
    for (const p of personBreakdown) {
      text += `  ${p.name}: ${fmt(p.total)}\n`;
    }

    text += `\nReceipts:\n`;
    for (const split of eventSplits) {
      text += `  ${split.name}: ${fmt(getReceiptTotal(split))}\n`;
    }

    return text;
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(generateText());
    Alert.alert('Copied', 'Summary copied to clipboard');
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: generateText() });
    } catch {
      // user cancelled
    }
  };

  return (
    <AuroraBackground>
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <AnimatedPressable onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </AnimatedPressable>
          <Text style={styles.title}>Summary</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Event Header */}
          <View style={styles.totalCard}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.totalAmount}>{formatCurrency(combinedTotal)}</Text>
            <Text style={styles.muted}>
              {eventSplits.length} receipt{eventSplits.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Each Person Owes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Each Person Owes</Text>
            {personBreakdown.map((p) => (
              <View key={p.name} style={styles.personRow}>
                <Text style={styles.personName}>{p.name}</Text>
                <Text style={styles.personAmount}>{formatCurrency(p.total)}</Text>
              </View>
            ))}
          </View>

          {/* Receipts Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Receipts</Text>
            {eventSplits.map((split) => (
              <View key={split.id} style={styles.receiptRow}>
                <Text style={styles.receiptName}>{split.name}</Text>
                <Text style={styles.receiptAmount}>{formatCurrency(getReceiptTotal(split))}</Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <AnimatedPressable
              style={({ pressed }) => [styles.actionButton, styles.copyButton, pressed && { opacity: 0.8 }]}
              onPress={handleCopy}
            >
              <Ionicons name="copy-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Copy</Text>
            </AnimatedPressable>
            <AnimatedPressable
              style={({ pressed }) => [styles.actionButton, styles.shareButton, pressed && { opacity: 0.8 }]}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Share</Text>
            </AnimatedPressable>
          </View>

          {/* Done */}
          <AnimatedPressable
            style={({ pressed }) => [styles.doneButton, pressed && { opacity: 0.8 }]}
            onPress={onDone}
          >
            <Text style={styles.doneButtonText}>Return Home</Text>
          </AnimatedPressable>
        </ScrollView>
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
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '600', color: '#fff', flex: 1, textAlign: 'center', marginHorizontal: 12 },
  scroll: { flex: 1 },
  totalCard: {
    backgroundColor: T.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.cardBorder,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  eventTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '500', marginBottom: 8 },
  totalAmount: { color: '#fff', fontSize: 36, fontWeight: '700', marginBottom: 4 },
  muted: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 12 },
  personRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: T.cardBg,
    borderRadius: 8,
    padding: 14,
    marginBottom: 6,
  },
  personName: { color: '#fff', fontSize: 16, fontWeight: '500' },
  personAmount: { color: '#fff', fontSize: 16, fontWeight: '600' },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: T.cardBg,
    borderRadius: 8,
    padding: 14,
    marginBottom: 6,
  },
  receiptName: { color: '#fff', fontSize: 15, fontWeight: '500', flex: 1 },
  receiptAmount: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  copyButton: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  shareButton: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  doneButton: {
    backgroundColor: T.ctaBg,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  doneButtonText: { color: T.ctaText, fontSize: 16, fontWeight: '600' },
});
