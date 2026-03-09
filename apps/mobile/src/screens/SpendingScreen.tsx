import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Switch, ScrollView, ActivityIndicator, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getSplitsInRange, getPeriodStart, getPeriodEnd, getPeriodLabel, getUserSpendingCents, getUserShareCents, getCategoryTotals, formatCurrency } from '@receiptsplit/shared';
import type { Split, SpendingPeriod, CategoryTotal } from '@receiptsplit/shared';
import { useSplits } from '../contexts/SplitsContext';
import { getConfirmedFriendSharesForRange, getConfirmedSharesForRange } from '../lib/splitFriendRequests';
import { DonutChart, type DonutSegment } from '../components/DonutChart';

const PERIODS: SpendingPeriod[] = ['daily', 'weekly', 'monthly'];
const PERIOD_MENU_LABELS: Record<SpendingPeriod, string> = {
  daily: 'Today',
  weekly: 'This week',
  monthly: 'This month',
};

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#f97316',
  Grocery: '#22c55e',
  Entertainment: '#a855f7',
  Utilities: '#3b82f6',
  Other: '#64748b',
  Uncategorized: '#94a3b8',
  Shared: '#14b8a6',
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? '#94a3b8';
}

function mergeCategoryTotals(
  own: CategoryTotal[],
  confirmedCategoryCents: Array<{ category: string; cents: number }>,
  totalCents: number
): CategoryTotal[] {
  const byCategory = new Map<string, number>();
  own.forEach((c) => byCategory.set(c.category, (byCategory.get(c.category) ?? 0) + c.cents));
  confirmedCategoryCents.forEach(({ category, cents }) =>
    byCategory.set(category, (byCategory.get(category) ?? 0) + cents)
  );
  if (totalCents <= 0) return own;
  return Array.from(byCategory.entries())
    .map(([category, cents]) => ({
      category,
      cents,
      percent: (cents / totalCents) * 100,
    }))
    .sort((a, b) => b.cents - a.cents);
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 };

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function SpendingScreen() {
  const { splits, loading } = useSplits();
  const [period, setPeriod] = useState<SpendingPeriod>('weekly');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [confirmedRaw, setConfirmedRaw] = useState<{ totalCents: number }>({ totalCents: 0 });
  const [confirmedShares, setConfirmedShares] = useState<{ totalCents: number; categoryCents: Array<{ category: string; cents: number }> }>({
    totalCents: 0,
    categoryCents: [],
  });
  // Track whether confirmed data has loaded for the current period to avoid flicker
  const [confirmedLoaded, setConfirmedLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [excludeDeleted, setExcludeDeleted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const prevPeriodRef = useRef(period);

  const { startMs, endMs } = useMemo(() => ({
    startMs: getPeriodStart(period),
    endMs: getPeriodEnd(period),
  }), [period]);

  const periodLabel = getPeriodLabel(period);

  const selectPeriod = useCallback((p: SpendingPeriod) => {
    setPeriod(p);
    setMenuOpen(false);
  }, []);

  // Reset confirmed state when period changes to avoid stale data showing
  if (prevPeriodRef.current !== period) {
    prevPeriodRef.current = period;
    setConfirmedLoaded(false);
  }

  const loadConfirmed = useCallback(async () => {
    try {
      const [raw, withCategory] = await Promise.all([
        getConfirmedFriendSharesForRange(startMs, endMs),
        getConfirmedSharesForRange(startMs, endMs),
      ]);
      setConfirmedRaw({ totalCents: raw.totalCents });
      setConfirmedShares({ totalCents: withCategory.totalCents, categoryCents: withCategory.categoryCents });
    } catch {
      setConfirmedRaw({ totalCents: 0 });
      setConfirmedShares({ totalCents: 0, categoryCents: [] });
    } finally {
      setConfirmedLoaded(true);
      setLastUpdated(new Date());
    }
  }, [startMs, endMs]);

  useFocusEffect(useCallback(() => {
    loadConfirmed();
  }, [loadConfirmed]));

  const filteredSplits = excludeDeleted ? splits.filter((s) => !s.isDeleted) : splits;
  const periodSplits = getSplitsInRange(filteredSplits, startMs, endMs);
  const ownerCentsTotal = getUserSpendingCents(periodSplits);
  const totalCents = ownerCentsTotal + (confirmedLoaded ? confirmedRaw.totalCents : 0);
  const ownCategoryTotals = getCategoryTotals(periodSplits);
  const mergedCategoryTotals = confirmedLoaded
    ? mergeCategoryTotals(ownCategoryTotals, confirmedShares.categoryCents, totalCents)
    : ownCategoryTotals.map((c) => ({ ...c, percent: ownerCentsTotal > 0 ? (c.cents / ownerCentsTotal) * 100 : 0 }));
  const hasData = totalCents > 0;

  // Group splits by category for detail view
  const splitsByCategory = useMemo(() => {
    const map = new Map<string, Split[]>();
    for (const split of periodSplits) {
      const cat = split.category ?? 'Uncategorized';
      const arr = map.get(cat) ?? [];
      arr.push(split);
      map.set(cat, arr);
    }
    return map;
  }, [periodSplits]);

  const toggleCategory = (category: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategory((prev) => (prev === category ? null : category));
  };

  const donutSegments: DonutSegment[] = mergedCategoryTotals
    .filter((c) => c.cents > 0)
    .map((c) => ({
      category: c.category,
      cents: c.cents,
      percent: c.percent,
      color: getCategoryColor(c.category),
    }));

  const isLoading = loading || !confirmedLoaded;

  const lastUpdatedLabel = lastUpdated
    ? `Updated ${lastUpdated.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
    : '';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Spending</Text>
            <Text style={styles.subtitle}>Your share of splits</Text>
          </View>
          <View>
            <Pressable
              style={({ pressed }) => [styles.periodButton, pressed && { opacity: 0.7 }]}
              onPress={() => setMenuOpen(true)}
              hitSlop={hitSlop}
              accessibilityRole="button"
              accessibilityLabel={`Change period, currently ${PERIOD_MENU_LABELS[period]}`}
            >
              <Text style={styles.periodButtonText}>{PERIOD_MENU_LABELS[period]}</Text>
              <Ionicons name="calendar-outline" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Period dropdown */}
        <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
          <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
            <View style={styles.menuContainer}>
              {PERIODS.map((p) => (
                <Pressable
                  key={p}
                  style={({ pressed }) => [
                    styles.menuItem,
                    period === p && styles.menuItemActive,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => selectPeriod(p)}
                >
                  <Text style={[styles.menuItemText, period === p && styles.menuItemTextActive]}>
                    {PERIOD_MENU_LABELS[p]}
                  </Text>
                  {period === p && <Ionicons name="checkmark" size={18} color="#fff" />}
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="rgba(255,255,255,0.6)" />
          </View>
        ) : (
          <>
            <View style={styles.totalCard}>
              {hasData ? (
                <DonutChart
                  segments={donutSegments}
                  totalCents={totalCents}
                  formatCurrency={formatCurrency}
                  periodLabel={periodLabel}
                />
              ) : (
                <>
                  <Text style={styles.totalAmount}>{formatCurrency(0)}</Text>
                  <Text style={styles.totalLabel}>{periodLabel}</Text>
                </>
              )}
            </View>
            {hasData ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>By category</Text>
                {mergedCategoryTotals
                  .filter((c: CategoryTotal) => c.cents > 0)
                  .map((c: CategoryTotal) => {
                    const isExpanded = expandedCategory === c.category;
                    const categorySplits = splitsByCategory.get(c.category) ?? [];
                    return (
                      <View key={c.category}>
                        <Pressable
                          onPress={() => toggleCategory(c.category)}
                          style={[styles.categoryRow, isExpanded && styles.categoryRowExpanded]}
                        >
                          <View style={styles.categoryLeft}>
                            <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(c.category) }]} />
                            <Text style={styles.categoryName}>{c.category}</Text>
                          </View>
                          <View style={styles.categoryRight}>
                            <Text style={styles.categoryCents}>{formatCurrency(c.cents)}</Text>
                            <Text style={styles.categoryPercent}>{c.percent.toFixed(0)}%</Text>
                            <Ionicons
                              name={isExpanded ? 'chevron-up' : 'chevron-down'}
                              size={16}
                              color="rgba(255,255,255,0.4)"
                            />
                          </View>
                        </Pressable>
                        {isExpanded && categorySplits.length > 0 && (
                          <View style={styles.categoryDetail}>
                            {categorySplits
                              .sort((a, b) => b.updatedAt - a.updatedAt)
                              .map((split) => {
                                const myShare = getUserShareCents(split);
                                return (
                                  <View key={split.id} style={styles.detailRow}>
                                    <View style={styles.detailLeft}>
                                      <Text style={styles.detailName} numberOfLines={1}>
                                        {split.name || 'Untitled'}
                                      </Text>
                                      <Text style={styles.detailMeta}>
                                        {formatDate(split.updatedAt)} · {split.participants.length} people
                                      </Text>
                                    </View>
                                    <Text style={styles.detailAmount}>{formatCurrency(myShare)}</Text>
                                  </View>
                                );
                              })}
                          </View>
                        )}
                      </View>
                    );
                  })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No spending {periodLabel.toLowerCase()} yet.</Text>
                <Text style={styles.emptySubtext}>Splits you add will show here by category.</Text>
              </View>
            )}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Exclude deleted splits</Text>
              <Switch
                value={excludeDeleted}
                onValueChange={setExcludeDeleted}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#34C759' }}
                thumbColor="#fff"
              />
            </View>
          </>
        )}
        {lastUpdatedLabel ? (
          <Text style={styles.lastUpdated}>{lastUpdatedLabel}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0B0C' },
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: { fontSize: 28, fontWeight: '600', color: '#fff', marginBottom: 4 },
  subtitle: { color: 'rgba(255,255,255,0.6)' },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 4,
  },
  periodButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  menuBackdrop: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  menuContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    minWidth: 160,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  menuItemActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  menuItemText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
  },
  menuItemTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  muted: { color: 'rgba(255,255,255,0.6)' },
  loadingContainer: { paddingTop: 60, alignItems: 'center' },
  totalCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  totalAmount: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 4 },
  totalLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 12 },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryDot: { width: 12, height: 12, borderRadius: 6 },
  categoryName: { color: '#fff', fontSize: 16 },
  categoryRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryCents: { color: '#fff', fontSize: 16, fontWeight: '500' },
  categoryPercent: { color: 'rgba(255,255,255,0.6)', fontSize: 14, minWidth: 32, textAlign: 'right' },
  categoryRowExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
  },
  categoryDetail: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: 'rgba(255,255,255,0.1)',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  detailLeft: { flex: 1, marginRight: 12 },
  detailName: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '500' },
  detailMeta: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  detailAmount: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyState: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.6)', fontSize: 16 },
  emptySubtext: { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 8 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  toggleLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
  },
  lastUpdated: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginTop: 16,
  },
});
