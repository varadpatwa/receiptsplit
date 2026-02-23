import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { getReceiptTotal } from '@receiptsplit/shared';
import { listSplits } from '../lib/splits';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default function HomeScreen() {
  const [splits, setSplits] = useState<Awaited<ReturnType<typeof listSplits>>>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await listSplits();
      setSplits(data);
    } catch {
      setSplits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sorted = [...splits].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ReceiptSplit</Text>
      <Text style={styles.subtitle}>Split bills in under 60 seconds</Text>
      <TouchableOpacity style={styles.newSplitButton}>
        <Text style={styles.newSplitText}>New Split</Text>
      </TouchableOpacity>
      <Text style={styles.sectionTitle}>Recent Splits</Text>
      {loading ? (
        <Text style={styles.muted}>Loading...</Text>
      ) : sorted.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No splits yet</Text>
          <Text style={styles.muted}>Create your first split to start dividing bills with friends</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardLeft}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <Text style={styles.muted}>
                    {formatDate(item.updatedAt)} · {formatCurrency(getReceiptTotal(item) || 0)} · {item.participants.length} people
                  </Text>
                </View>
              </View>
            </View>
          )}
          style={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0C', padding: 20, paddingTop: 16 },
  title: { fontSize: 28, fontWeight: '600', color: '#fff', marginBottom: 8 },
  subtitle: { color: 'rgba(255,255,255,0.6)', marginBottom: 24 },
  newSplitButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  newSplitText: { color: '#000', fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 12 },
  list: { flex: 1 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    marginBottom: 12,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
});
