import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, Image, ActivityIndicator,
} from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  formatCurrency, getReceiptTotal, calculateEventBreakdown,
} from '@receiptsplit/shared';
import type { Split, SplitEvent, SplitCategory } from '@receiptsplit/shared';
import { supabase } from '../../lib/supabase';
import { T } from '../../theme/colors';
import { AuroraBackground } from '../../components/AuroraBackground';

interface Props {
  event: SplitEvent;
  eventSplits: Split[];
  onAddReceipt: () => void;
  onTapReceipt: (splitId: string) => void;
  onAssignAll: () => void;
  onViewSummary: () => void;
  onRemoveReceipt: (splitId: string) => void;
  onCategoryChange: (category: SplitCategory) => void;
  onBack: () => void;
}

const CATEGORIES: SplitCategory[] = ['Food', 'Grocery', 'Entertainment', 'Utilities', 'Other'];

function ReceiptThumbnail({ storagePath }: { storagePath: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.storage
      .from('receipts')
      .createSignedUrl(storagePath, 3600)
      .then(({ data }) => {
        if (data?.signedUrl) setUrl(data.signedUrl);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storagePath]);

  if (loading) {
    return (
      <View style={styles.thumbPlaceholder}>
        <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
      </View>
    );
  }
  if (!url) {
    return (
      <View style={styles.thumbPlaceholder}>
        <Ionicons name="receipt-outline" size={24} color="rgba(255,255,255,0.3)" />
      </View>
    );
  }
  return <Image source={{ uri: url }} style={styles.thumbnail} />;
}

export default function MultiSplitHubScreen({
  event, eventSplits, onAddReceipt, onTapReceipt, onAssignAll, onViewSummary, onRemoveReceipt, onCategoryChange, onBack,
}: Props) {
  const combinedTotal = eventSplits.reduce((sum, s) => sum + getReceiptTotal(s), 0);
  const personBreakdown = calculateEventBreakdown(eventSplits);
  const hasCompletedReceipts = eventSplits.some((s) => s.currentStep === 'export' || s.currentStep === 'summary');

  const handleBack = () => {
    if (eventSplits.length > 0) {
      Alert.alert('Leave Multi-Split?', 'Your receipts are saved. You can reopen this from Recent Splits.', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', onPress: onBack },
      ]);
    } else {
      onBack();
    }
  };

  const handleRemove = (splitId: string, splitName: string) => {
    Alert.alert('Remove Receipt?', `Remove "${splitName}" from this multi-split?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onRemoveReceipt(splitId) },
    ]);
  };

  return (
    <AuroraBackground>
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <AnimatedPressable onPress={handleBack} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </AnimatedPressable>
          <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Combined Total */}
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Combined Total</Text>
            <Text style={styles.totalAmount}>{formatCurrency(combinedTotal)}</Text>
            <Text style={styles.muted}>
              {eventSplits.length} receipt{eventSplits.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Category */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryRow}
          >
            {CATEGORIES.map((cat) => {
              const selected = eventSplits.length > 0 && eventSplits[0].category === cat;
              return (
                <AnimatedPressable
                  key={cat}
                  onPress={() => onCategoryChange(cat)}
                  style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                >
                  <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>{cat}</Text>
                </AnimatedPressable>
              );
            })}
          </ScrollView>

          {/* Receipts with photos */}
          {eventSplits.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Receipts</Text>
              {eventSplits.map((split) => (
                <AnimatedPressable
                  key={split.id}
                  style={({ pressed }) => [styles.receiptCard, pressed && { opacity: 0.8 }]}
                  onPress={() => onTapReceipt(split.id)}
                >
                  {split.receiptImagePath ? (
                    <ReceiptThumbnail storagePath={split.receiptImagePath} />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Ionicons name="receipt-outline" size={24} color="rgba(255,255,255,0.3)" />
                    </View>
                  )}
                  <View style={styles.receiptInfo}>
                    <Text style={styles.receiptName}>{split.name}</Text>
                    <Text style={styles.muted}>
                      {split.items.length} item{split.items.length !== 1 ? 's' : ''} · {formatCurrency(getReceiptTotal(split))}
                    </Text>
                  </View>
                  <AnimatedPressable
                    onPress={() => handleRemove(split.id, split.name)}
                    hitSlop={12}
                    style={styles.removeBtn}
                  >
                    <Ionicons name="close-circle" size={22} color="rgba(255,100,100,0.6)" />
                  </AnimatedPressable>
                </AnimatedPressable>
              ))}
            </View>
          ) : null}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <AnimatedPressable
              style={({ pressed }) => [styles.addReceiptButton, pressed && { opacity: 0.8 }]}
              onPress={onAddReceipt}
            >
              <Ionicons name="add-circle-outline" size={22} color="#000" />
              <Text style={styles.addReceiptText}>Add Receipt</Text>
            </AnimatedPressable>
            {eventSplits.length > 0 ? (
              <AnimatedPressable
                style={({ pressed }) => [styles.assignButton, pressed && { opacity: 0.8 }]}
                onPress={onAssignAll}
              >
                <Ionicons name="people-outline" size={22} color="#fff" />
                <Text style={styles.assignButtonText}>Assign Items</Text>
              </AnimatedPressable>
            ) : null}
          </View>

          {/* Per-Person Running Totals */}
          {personBreakdown.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Per Person</Text>
              {personBreakdown.map((p) => (
                <View key={p.name} style={styles.personRow}>
                  <Text style={styles.personName}>{p.name}</Text>
                  <Text style={styles.personAmount}>{formatCurrency(p.total)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* View Summary / Done */}
          {hasCompletedReceipts ? (
            <AnimatedPressable
              style={({ pressed }) => [styles.summaryButton, pressed && { opacity: 0.8 }]}
              onPress={onViewSummary}
            >
              <Text style={styles.summaryButtonText}>View Summary & Export</Text>
            </AnimatedPressable>
          ) : eventSplits.length > 0 ? (
            <Text style={[styles.muted, { textAlign: 'center', marginTop: 8, marginBottom: 24 }]}>
              Complete at least one receipt to view the summary
            </Text>
          ) : null}
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
    marginBottom: 16,
  },
  totalLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 4 },
  totalAmount: { color: '#fff', fontSize: 32, fontWeight: '700', marginBottom: 4 },
  muted: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 12 },
  receiptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.cardBorder,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  thumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptInfo: { flex: 1 },
  receiptName: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  removeBtn: { padding: 4 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  addReceiptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.ctaBg,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addReceiptText: { color: T.ctaText, fontSize: 16, fontWeight: '600' },
  assignButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  assignButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  personRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: T.cardBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
  },
  personName: { color: '#fff', fontSize: 16, fontWeight: '500' },
  personAmount: { color: '#fff', fontSize: 16, fontWeight: '600' },
  summaryButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  summaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  categoryScroll: { marginBottom: 16, flexGrow: 0 },
  categoryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 2 },
  categoryChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: T.cardBg,
    borderWidth: 1,
    borderColor: T.cardBorder,
  },
  categoryChipSelected: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  categoryChipText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' },
  categoryChipTextSelected: { color: '#000' },
});
