import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getReceiptTotal, formatCurrency } from '@receiptsplit/shared';
import type { Split, SplitEvent, SplitCategory } from '@receiptsplit/shared';
import { useSplits } from '../contexts/SplitsContext';
import { useToast } from '../contexts/ToastContext';
import { SwipeableRow } from '../components/SwipeableRow';
import { listEvents, deleteEvent } from '../lib/events';
import { useMultiSplitSafe } from '../contexts/MultiSplitContext';
import type { HomeStackParamList } from '../navigation/HomeStack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 };

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#f97316',
  Grocery: '#22c55e',
  Entertainment: '#a855f7',
  Utilities: '#3b82f6',
  Other: '#64748b',
};

function getCategoryColor(category?: string): string {
  if (!category) return 'transparent';
  return CATEGORY_COLORS[category] ?? 'transparent';
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

type Nav = NativeStackNavigationProp<HomeStackParamList, 'HomeList'>;

type ListItem =
  | { type: 'split'; data: Split; sortKey: number }
  | { type: 'event'; data: SplitEvent; sortKey: number; total: number; receiptCount: number };

export default function HomeScreen() {
  const { activeSplits, loading, createNewSplit, loadSplit, saveSplit, deleteSplit, restoreSplit, saveError, clearSaveError, isGuest } = useSplits();
  const { showToast } = useToast();
  const navigation = useNavigation<Nav>();
  const [events, setEvents] = useState<SplitEvent[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const multiSplit = useMultiSplitSafe();

  // Load events on focus (authenticated only)
  useFocusEffect(
    useCallback(() => {
      if (isGuest) return;
      listEvents().then(setEvents).catch(() => {});
    }, [isGuest])
  );

  // Collect split IDs that belong to events (to avoid double-showing)
  const eventSplitIds = useMemo(() => {
    const ids = new Set<string>();
    for (const event of events) {
      for (const sid of event.splitIds) ids.add(sid);
    }
    return ids;
  }, [events]);

  // Build merged list
  const listItems = useMemo((): ListItem[] => {
    const items: ListItem[] = [];

    // Add standalone splits (not part of any event)
    for (const split of activeSplits) {
      if (!eventSplitIds.has(split.id)) {
        items.push({ type: 'split', data: split, sortKey: split.updatedAt });
      }
    }

    // Add events
    for (const event of events) {
      const eventSplits = event.splitIds
        .map((id) => activeSplits.find((s) => s.id === id))
        .filter((s): s is Split => !!s);
      const total = eventSplits.reduce((sum, s) => sum + getReceiptTotal(s), 0);
      const mostRecent = eventSplits.reduce((max, s) => Math.max(max, s.updatedAt), event.createdAt);
      items.push({
        type: 'event',
        data: event,
        sortKey: mostRecent,
        total,
        receiptCount: eventSplits.length,
      });
    }

    return items.sort((a, b) => b.sortKey - a.sortKey);
  }, [activeSplits, events, eventSplitIds]);

  // Collect categories that exist in the list for filter chips
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const split of activeSplits) {
      if (split.category) cats.add(split.category);
    }
    return Array.from(cats).sort();
  }, [activeSplits]);

  // Apply category filter
  const filteredListItems = useMemo(() => {
    if (!categoryFilter) return listItems;
    return listItems.filter((item) => {
      if (item.type === 'split') return item.data.category === categoryFilter;
      if (item.type === 'event') {
        // Show event if any of its receipts match the filter
        const eventSplitsList = item.data.splitIds
          .map((id) => activeSplits.find((s) => s.id === id))
          .filter((s): s is Split => !!s);
        return eventSplitsList.some((s) => s.category === categoryFilter);
      }
      return true;
    });
  }, [listItems, categoryFilter, activeSplits]);

  const onNewSplit = () => {
    if (isGuest) {
      // Guest mode: use old manual entry flow
      const newSplit = createNewSplit();
      saveSplit(newSplit, true)
        .then(() => navigation.navigate('Receipt'))
        .catch(() => {});
    } else {
      // Authenticated: use capture flow (works for 1 or many receipts)
      navigation.navigate('MultiSplitCapture');
    }
  };

  const onSplitPress = (split: Split) => {
    loadSplit(split.id);
    const step = split.currentStep || 'receipt';
    const screenName = step.charAt(0).toUpperCase() + step.slice(1) as keyof HomeStackParamList;
    navigation.navigate(screenName);
  };

  const onEventPress = (event: SplitEvent) => {
    multiSplit?.loadMultiSplit(event);
    navigation.navigate('MultiSplitHub');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {saveError ? (
          <Pressable style={styles.errorBanner} onPress={clearSaveError}>
            <Text style={styles.errorBannerText}>{saveError}</Text>
            <Text style={styles.errorBannerDismiss}>Dismiss</Text>
          </Pressable>
        ) : null}
        <View style={styles.headerRow}>
          <Text style={styles.title}>ReceiptSplit</Text>
          {!isGuest ? (
            <View style={styles.headerIcons}>
              <Pressable
                style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
                onPress={() => navigation.navigate('Search')}
                hitSlop={hitSlop}
                accessibilityRole="button"
                accessibilityLabel="Search"
              >
                <Ionicons name="search" size={24} color="#fff" />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
                onPress={() => navigation.navigate('Notifications')}
                hitSlop={hitSlop}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
              >
                <Ionicons name="notifications-outline" size={24} color="#fff" />
              </Pressable>
            </View>
          ) : null}
        </View>
        <Text style={styles.subtitle}>Split bills in under 60 seconds</Text>

        {/* Action Button */}
        <Pressable
          style={({ pressed }) => [styles.newSplitButton, pressed && { opacity: 0.8 }]}
          onPress={onNewSplit}
          hitSlop={hitSlop}
        >
          <Text style={styles.newSplitText}>New Split</Text>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Splits</Text>
          {availableCategories.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterRowContent}>
              <Pressable
                onPress={() => setCategoryFilter(null)}
                style={[styles.filterChip, !categoryFilter && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, !categoryFilter && styles.filterChipTextActive]}>All</Text>
              </Pressable>
              {availableCategories.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategoryFilter((prev) => prev === cat ? null : cat)}
                  style={[styles.filterChip, categoryFilter === cat && { backgroundColor: getCategoryColor(cat), borderColor: getCategoryColor(cat) }]}
                >
                  <View style={[styles.filterDot, { backgroundColor: getCategoryColor(cat) }, categoryFilter === cat && { backgroundColor: '#fff' }]} />
                  <Text style={[styles.filterChipText, categoryFilter === cat && { color: '#fff', fontWeight: '600' }]}>{cat}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="rgba(255,255,255,0.6)" />
          </View>
        ) : filteredListItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{categoryFilter ? `No ${categoryFilter} splits` : 'No splits yet'}</Text>
            <Text style={styles.muted}>{categoryFilter ? 'Try a different category or clear the filter' : 'Create your first split to start dividing bills with friends'}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredListItems}
            keyExtractor={(item) => item.type === 'split' ? item.data.id : `event-${item.data.id}`}
            renderItem={({ item }) => {
              if (item.type === 'event') {
                const evt = item.data;
                return (
                  <SwipeableRow onDelete={() => {
                    deleteEvent(evt.id).catch(() => {});
                    setEvents((prev) => prev.filter((e) => e.id !== evt.id));
                    showToast({ message: `"${evt.title}" deleted`, variant: 'info', duration: 4000 });
                  }}>
                    <Pressable
                      style={({ pressed }) => [styles.card, styles.eventCard, pressed && { opacity: 0.8 }]}
                      onPress={() => onEventPress(evt)}
                    >
                      <View style={styles.cardRow}>
                        <View style={styles.eventIcon}>
                          <Ionicons name="layers" size={20} color="rgba(96,165,250,0.9)" />
                        </View>
                        <View style={styles.cardLeft}>
                          <Text style={styles.cardName}>{evt.title}</Text>
                          <Text style={styles.muted}>
                            {item.receiptCount} receipt{item.receiptCount !== 1 ? 's' : ''} · {formatCurrency(item.total)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                      </View>
                    </Pressable>
                  </SwipeableRow>
                );
              }

              const split = item.data;
              const catColor = getCategoryColor(split.category);
              return (
                <SwipeableRow onDelete={() => {
                  deleteSplit(split.id);
                  showToast({
                    message: `"${split.name}" deleted`,
                    variant: 'info',
                    duration: 6000,
                    action: { label: 'Undo', onPress: () => restoreSplit(split.id) },
                  });
                }}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.card,
                      catColor !== 'transparent' && { borderLeftWidth: 3, borderLeftColor: catColor },
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => onSplitPress(split)}
                    hitSlop={hitSlop}
                    accessibilityRole="button"
                    accessibilityLabel={`Open split ${split.name}`}
                  >
                    <View style={styles.cardRow}>
                      <View style={styles.cardLeft}>
                        <Text style={styles.cardName}>{split.name}</Text>
                        <Text style={styles.muted}>
                          {split.merchantName ? `${split.merchantName} · ` : ''}{formatDate(split.updatedAt)} · {formatCurrency(getReceiptTotal(split) || 0)} · {split.participants.length} people
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                </SwipeableRow>
              );
            }}
            style={styles.list}
            contentContainerStyle={{ gap: 8 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0B0C' },
  container: { flex: 1, padding: 20, paddingTop: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '600', color: '#fff' },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { padding: 4 },
  subtitle: { color: 'rgba(255,255,255,0.6)', marginBottom: 24 },
  newSplitButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  newSplitText: { color: '#000', fontSize: 16, fontWeight: '600' },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  filterRow: { marginTop: 10 },
  filterRowContent: { gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  filterChipText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  list: { flex: 1 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
  },
  eventCard: {
    borderColor: 'rgba(96,165,250,0.2)',
  },
  eventIcon: { marginRight: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardLeft: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 4 },
  muted: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 8 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: { flex: 1, color: '#fca5a5', fontSize: 14 },
  errorBannerDismiss: { color: '#fca5a5', fontSize: 14, fontWeight: '600', marginLeft: 8 },
});
