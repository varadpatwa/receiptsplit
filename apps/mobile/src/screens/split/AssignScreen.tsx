import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Split, ItemAssignment } from '@receiptsplit/shared';
import { formatCurrency, getRunningTally, allItemsAssigned } from '@receiptsplit/shared';
import { Stepper } from '../../components/Stepper';
import { ParticipantChip } from '../../components/ParticipantChip';

interface AssignScreenProps {
  split: Split;
  onUpdate: (split: Split) => void;
  onNext: () => void;
  onBack: () => void;
}

export function AssignScreen({ split, onUpdate, onNext, onBack }: AssignScreenProps) {
  const runningTally = getRunningTally(split);
  const allAssigned = allItemsAssigned(split);
  const unassignedItems = split.items.filter((item) => item.assignments.length === 0);

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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
          </Pressable>
          <Text style={styles.title}>Assign Items</Text>
        </View>
        <Stepper currentStep="assign" />

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

        <Pressable
          onPress={onNext}
          disabled={!allAssigned}
          style={({ pressed }) => [styles.nextBtn, !allAssigned && styles.nextBtnDisabled, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.nextBtnText}>Next: Review Summary</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0B0C' },
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { padding: 8, marginRight: 8 },
  title: { fontSize: 22, fontWeight: '600', color: '#fff' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
  itemCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
  nextBtn: { backgroundColor: '#fff', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: '#000', fontSize: 16, fontWeight: '600' },
});
