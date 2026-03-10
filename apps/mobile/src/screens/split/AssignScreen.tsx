import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Split, ItemAssignment } from '@receiptsplit/shared';
import { formatCurrency, getRunningTally, allItemsAssigned } from '@receiptsplit/shared';
import { Stepper } from '../../components/Stepper';
import { ParticipantChip } from '../../components/ParticipantChip';
import {
  getAssignmentFrequency,
  suggestAssignments,
  updateAssignmentFrequency,
  migrateFrequencyIfNeeded,
  CONFIDENCE_THRESHOLD,
  type AssignmentSuggestion,
} from '../../lib/assignmentSuggestions';
import { useAuth } from '../../contexts/AuthContext';
import { T } from '../../theme/colors';
import { AuroraBackground } from '../../components/AuroraBackground';

interface AssignScreenProps {
  split: Split;
  onUpdate: (split: Split) => void;
  onNext: () => void;
  onBack: () => void;
  subtitle?: string;
}

export function AssignScreen({ split, onUpdate, onNext, onBack, subtitle }: AssignScreenProps) {
  const { userId } = useAuth();
  const [suggestions, setSuggestions] = useState<Map<string, AssignmentSuggestion>>(new Map());

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      await migrateFrequencyIfNeeded(userId);
      const freq = await getAssignmentFrequency(userId);
      if (cancelled) return;
      const map = suggestAssignments(split, freq);
      setSuggestions(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, split.id, split.items.length, split.participants.length]);

  const runningTally = getRunningTally(split);
  const allAssigned = allItemsAssigned(split);
  const unassignedItems = split.items.filter((item) => item.assignments.length === 0);
  const hasAnySuggestion = Array.from(suggestions.values()).some((s) => s.confidence >= CONFIDENCE_THRESHOLD);
  const suggestedNotAppliedCount = split.items.filter((item) => {
    const sug = suggestions.get(item.id);
    return sug && sug.confidence >= CONFIDENCE_THRESHOLD && sug.assignments.length > 0 && item.assignments.length === 0;
  }).length;
  const suggestedButNotApplied = suggestedNotAppliedCount > 0;

  const applySuggestionForItem = useCallback(
    (itemId: string) => {
      const sug = suggestions.get(itemId);
      if (!sug || sug.assignments.length === 0) return;
      onUpdate({
        ...split,
        items: split.items.map((i) =>
          i.id === itemId ? { ...i, assignments: [...sug.assignments] } : i
        ),
      });
    },
    [split, suggestions, onUpdate]
  );

  const confirmAllSuggestions = useCallback(() => {
    const nextItems = split.items.map((item) => {
      const sug = suggestions.get(item.id);
      if (sug && sug.confidence >= CONFIDENCE_THRESHOLD && sug.assignments.length > 0) {
        return { ...item, assignments: [...sug.assignments] };
      }
      return item;
    });
    onUpdate({ ...split, items: nextItems });
  }, [split, suggestions, onUpdate]);

  const handleNext = useCallback(async () => {
    if (userId) {
      await updateAssignmentFrequency(userId, split.items, split.participants);
    }
    onNext();
  }, [userId, split.items, split.participants, onNext]);

  const toggleAssignment = (itemId: string, participantId: string) => {
    const item = split.items.find((i) => i.id === itemId);
    if (!item) return;
    const existingIndex = item.assignments.findIndex((a) => a.participantId === participantId);
    let newAssignments: ItemAssignment[];
    if (existingIndex >= 0) {
      newAssignments = item.assignments.filter((_, i) => i !== existingIndex);
    } else {
      newAssignments = [...item.assignments, { participantId, shares: 1 }];
    }
    onUpdate({
      ...split,
      items: split.items.map((i) =>
        i.id === itemId ? { ...i, assignments: newAssignments } : i
      ),
    });
  };

  const isAssigned = (itemId: string, participantId: string) => {
    const item = split.items.find((i) => i.id === itemId);
    return item?.assignments.some((a) => a.participantId === participantId) ?? false;
  };

  return (
    <AuroraBackground>
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <AnimatedPressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
          </AnimatedPressable>
          <Text style={styles.title}>Assign Items</Text>
        </View>
        {subtitle ? (
          <Text style={styles.subtitle}>{subtitle}</Text>
        ) : (
          <Stepper currentStep="assign" />
        )}

        {hasAnySuggestion && (
          <View style={styles.suggestionBanner}>
            <Ionicons name="sparkles" size={20} color="rgba(34,197,94,0.9)" />
            <View style={styles.suggestionBannerText}>
              <Text style={styles.suggestionBannerTitle}>Penny's suggestions</Text>
              <Text style={styles.suggestionBannerSub}>
                {suggestedButNotApplied
                  ? `${suggestedNotAppliedCount} item${suggestedNotAppliedCount === 1 ? '' : 's'} ready to auto-assign`
                  : 'All suggestions applied'}
              </Text>
            </View>
            {suggestedButNotApplied && (
              <AnimatedPressable onPress={confirmAllSuggestions} style={styles.confirmSuggestionsBtn}>
                <Text style={styles.confirmSuggestionsBtnText}>Apply All</Text>
              </AnimatedPressable>
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Running Tally</Text>
          {split.participants.map((p) => {
            const tally = runningTally.get(p.id) ?? 0;
            return (
              <View key={p.id} style={styles.tallyRow}>
                <Text style={styles.tallyName}>{p.name}</Text>
                <Text style={styles.tallyValue}>{formatCurrency(Math.round(tally))}</Text>
              </View>
            );
          })}
        </View>

        {unassignedItems.length > 0 && (
          <View style={styles.warning}>
            <Ionicons name="warning" size={20} color="rgba(255,200,0,0.9)" />
            <View style={styles.warningText}>
              <Text style={styles.warningTitle}>
                {unassignedItems.length} unassigned {unassignedItems.length === 1 ? 'item' : 'items'}
              </Text>
              <Text style={styles.warningSub}>Assign all items to continue</Text>
            </View>
          </View>
        )}

        {split.items.map((item) => {
          const itemTotal = item.priceInCents * item.quantity;
          const hasAssignment = item.assignments.length > 0;
          const sug = suggestions.get(item.id);
          const hasSuggestion = sug && sug.confidence >= CONFIDENCE_THRESHOLD && sug.assignments.length > 0;
          const suggestedNames =
            hasSuggestion && split.participants.length
              ? sug!.assignments
                  .map((a) => split.participants.find((p) => p.id === a.participantId)?.name)
                  .filter(Boolean)
                  .join(', ')
              : '';
          const confidenceLabel = sug && sug.confidence >= 0.8 ? 'High' : sug && sug.confidence >= 0.65 ? 'Medium' : '';
          return (
            <View key={item.id} style={[styles.itemCard, !hasAssignment && styles.itemCardUnassigned]}>
              <View style={styles.itemHeader}>
                <View style={styles.flex1}>
                  <Text style={styles.itemName}>{item.name || 'Unnamed item'}</Text>
                  <View style={styles.itemMeta}>
                    <Text style={styles.muted}>{formatCurrency(item.priceInCents)}</Text>
                    {item.quantity > 1 && (
                      <>
                        <Text style={styles.muted}>×</Text>
                        <Text style={styles.muted}>{item.quantity}</Text>
                        <Text style={styles.muted}>=</Text>
                        <Text style={styles.muted}>{formatCurrency(itemTotal)}</Text>
                      </>
                    )}
                  </View>
                </View>
                {!hasAssignment && <Ionicons name="alert-circle" size={20} color="rgba(255,200,0,0.9)" />}
              </View>
              {hasSuggestion && !hasAssignment && (
                <AnimatedPressable
                  onPress={() => applySuggestionForItem(item.id)}
                  style={styles.useSuggestionBtn}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color="rgba(34,197,94,0.9)" />
                  <Text style={styles.useSuggestionText}>
                    Penny suggests: {suggestedNames || 'Split'}
                  </Text>
                  {confidenceLabel ? (
                    <View style={[styles.confidenceBadge, sug!.confidence >= 0.8 ? styles.confidenceHigh : styles.confidenceMedium]}>
                      <Text style={styles.confidenceBadgeText}>{confidenceLabel}</Text>
                    </View>
                  ) : null}
                </AnimatedPressable>
              )}
              <Text style={styles.whoShared}>Who shared this?</Text>
              <View style={styles.chipRow}>
                {split.participants.map((p) => (
                  <ParticipantChip
                    key={p.id}
                    name={p.name}
                    selected={isAssigned(item.id, p.id)}
                    onToggle={() => toggleAssignment(item.id, p.id)}
                  />
                ))}
              </View>
            </View>
          );
        })}

        <AnimatedPressable
          onPress={handleNext}
          disabled={!allAssigned}
          style={({ pressed }) => [styles.nextBtn, !allAssigned && styles.nextBtnDisabled, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.nextBtnText}>Next: Review Summary</Text>
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
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 16, marginLeft: 36 },
  card: {
    backgroundColor: T.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.cardBorder,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  tallyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  tallyName: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  tallyValue: { fontWeight: '600', color: '#fff' },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,200,0,0.2)',
    backgroundColor: 'rgba(255,200,0,0.08)',
    marginBottom: 16,
  },
  warningText: { flex: 1 },
  warningTitle: { fontWeight: '600', color: 'rgba(255,200,0,0.9)' },
  warningSub: { fontSize: 14, color: 'rgba(255,200,0,0.8)', marginTop: 4 },
  suggestionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
    backgroundColor: 'rgba(34,197,94,0.08)',
    marginBottom: 16,
  },
  suggestionBannerText: { flex: 1, minWidth: 120 },
  suggestionBannerTitle: { fontWeight: '600', color: 'rgba(34,197,94,0.95)' },
  suggestionBannerSub: { fontSize: 13, color: 'rgba(34,197,94,0.8)', marginTop: 4 },
  confirmSuggestionsBtn: {
    backgroundColor: 'rgba(34,197,94,0.9)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmSuggestionsBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  useSuggestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
  },
  useSuggestionText: { fontSize: 14, color: 'rgba(34,197,94,0.95)', fontWeight: '500', flex: 1 },
  confidenceBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  confidenceHigh: { backgroundColor: 'rgba(34,197,94,0.2)' },
  confidenceMedium: { backgroundColor: 'rgba(255,200,0,0.15)' },
  confidenceBadgeText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  itemCard: {
    backgroundColor: T.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.cardBorder,
    padding: 16,
    marginBottom: 16,
  },
  itemCardUnassigned: { borderColor: 'rgba(255,200,0,0.4)', backgroundColor: 'rgba(255,200,0,0.05)' },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  flex1: { flex: 1 },
  itemName: { fontWeight: '600', color: '#fff', fontSize: 16 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  muted: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  whoShared: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nextBtn: { backgroundColor: T.ctaBg, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: T.ctaText, fontSize: 16, fontWeight: '600' },
});
