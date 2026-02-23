import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getSplitsThisMonth, getUserSpendingCents, getCategoryTotals } from '@receiptsplit/shared';
import { listSplits } from '../lib/splits';

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default function SpendingScreen() {
  const [splits, setSplits] = useState<Awaited<ReturnType<typeof listSplits>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSplits()
      .then(setSplits)
      .catch(() => setSplits([]))
      .finally(() => setLoading(false));
  }, []);

  const thisMonth = getSplitsThisMonth(splits);
  const totalCents = getUserSpendingCents(thisMonth);
  const categoryTotals = getCategoryTotals(thisMonth);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spending</Text>
      <Text style={styles.subtitle}>Your spending this month</Text>
      {loading ? (
        <Text style={styles.muted}>Loading...</Text>
      ) : (
        <>
          <View style={styles.totalCard}>
            <Text style={styles.totalAmount}>{formatCurrency(totalCents)}</Text>
            <Text style={styles.totalLabel}>This month</Text>
          </View>
          {categoryTotals.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>By category</Text>
              {categoryTotals.map((c) => (
                <View key={c.category} style={styles.row}>
                  <Text style={styles.categoryName}>{c.category}</Text>
                  <Text style={styles.categoryCents}>{formatCurrency(c.cents)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0C', padding: 20, paddingTop: 16 },
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  categoryName: { color: '#fff', fontSize: 16 },
  categoryCents: { color: 'rgba(255,255,255,0.8)', fontSize: 16 },
});
