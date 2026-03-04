import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSplitsThisMonth, getUserSpendingCents, getCategoryTotals, formatCurrency } from '@receiptsplit/shared';
import type { CategoryTotal } from '@receiptsplit/shared';
import { useSplits } from '../contexts/SplitsContext';
import { DonutChart, type DonutSegment } from '../components/DonutChart';

const CATEGORY_COLORS: Record<string, string> = {
  Restaurant: '#f97316',
  Grocery: '#22c55e',
  Entertainment: '#a855f7',
  Utilities: '#3b82f6',
  Other: '#64748b',
  Uncategorized: '#94a3b8',
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? '#94a3b8';
}

export default function SpendingScreen() {
  const { splits, loading } = useSplits();
  const thisMonth = getSplitsThisMonth(splits);
  const totalCents = getUserSpendingCents(thisMonth);
  const categoryTotals = getCategoryTotals(thisMonth);
  const hasData = totalCents > 0;

  const donutSegments: DonutSegment[] = categoryTotals
    .filter((c) => c.cents > 0)
    .map((c) => ({
      category: c.category,
      cents: c.cents,
      percent: c.percent,
      color: getCategoryColor(c.category),
    }));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>Spending</Text>
        <Text style={styles.subtitle}>Your share of this month's splits</Text>
        {loading ? (
          <Text style={styles.muted}>Loading...</Text>
        ) : (
          <>
            <View style={styles.totalCard}>
              {hasData ? (
                <DonutChart
                  segments={donutSegments}
                  totalCents={totalCents}
                  formatCurrency={formatCurrency}
                />
              ) : (
                <>
                  <Text style={styles.totalAmount}>{formatCurrency(0)}</Text>
                  <Text style={styles.totalLabel}>This month</Text>
                </>
              )}
            </View>
            {hasData ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>By category</Text>
                {categoryTotals
                  .filter((c: CategoryTotal) => c.cents > 0)
                  .map((c: CategoryTotal) => (
                    <View key={c.category} style={styles.categoryRow}>
                      <View style={styles.categoryLeft}>
                        <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(c.category) }]} />
                        <Text style={styles.categoryName}>{c.category}</Text>
                      </View>
                      <View style={styles.categoryRight}>
                        <Text style={styles.categoryCents}>{formatCurrency(c.cents)}</Text>
                        <Text style={styles.categoryPercent}>{c.percent.toFixed(0)}%</Text>
                      </View>
                    </View>
                  ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No spending this month yet.</Text>
                <Text style={styles.emptySubtext}>Splits you add will show here by category.</Text>
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0B0C' },
  container: { flex: 1, padding: 20, paddingTop: 16 },
  title: { fontSize: 28, fontWeight: '600', color: '#fff', marginBottom: 8 },
  subtitle: { color: 'rgba(255,255,255,0.6)', marginBottom: 24 },
  muted: { color: 'rgba(255,255,255,0.6)' },
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
  categoryPercent: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  emptyState: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.6)', fontSize: 16 },
  emptySubtext: { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 8 },
});
