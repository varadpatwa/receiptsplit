import React from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getReceiptTotal, formatCurrency } from '@receiptsplit/shared';
import { useSplits } from '../contexts/SplitsContext';
import { useToast } from '../contexts/ToastContext';
import { SwipeableRow } from '../components/SwipeableRow';
import type { Split } from '@receiptsplit/shared';
import type { HomeStackParamList } from '../navigation/HomeStack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 };

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

type Nav = NativeStackNavigationProp<HomeStackParamList, 'HomeList'>;

export default function HomeScreen() {
  const { activeSplits, loading, createNewSplit, loadSplit, saveSplit, deleteSplit, restoreSplit, saveError, clearSaveError, isGuest } = useSplits();
  const { showToast } = useToast();
  const navigation = useNavigation<Nav>();

  const onNewSplit = () => {
    const newSplit = createNewSplit();
    saveSplit(newSplit, true)
      .then(() => navigation.navigate('Receipt'))
      .catch(() => {});
  };

  const onSplitPress = (split: Split) => {
    loadSplit(split.id);
    const step = split.currentStep || 'receipt';
    const screenName = step.charAt(0).toUpperCase() + step.slice(1) as keyof HomeStackParamList;
    navigation.navigate(screenName);
  };

  const sorted = [...activeSplits].sort((a, b) => b.updatedAt - a.updatedAt);

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
        <Pressable
        style={({ pressed }) => [styles.newSplitButton, pressed && { opacity: 0.8 }]}
        onPress={onNewSplit}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel="New split"
      >
        <Text style={styles.newSplitText}>New Split</Text>
      </Pressable>
      <Text style={styles.sectionTitle}>Recent Splits</Text>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="rgba(255,255,255,0.6)" />
        </View>
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
            <SwipeableRow onDelete={() => {
              deleteSplit(item.id);
              showToast({
                message: `"${item.name}" deleted`,
                variant: 'info',
                duration: 6000,
                action: { label: 'Undo', onPress: () => restoreSplit(item.id) },
              });
            }}>
              <Pressable
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
                onPress={() => onSplitPress(item)}
                hitSlop={hitSlop}
                accessibilityRole="button"
                accessibilityLabel={`Open split ${item.name}`}
              >
                <View style={styles.cardRow}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardName}>{item.name}</Text>
                    <Text style={styles.muted}>
                      {item.merchantName ? `${item.merchantName} · ` : ''}{formatDate(item.updatedAt)} · {formatCurrency(getReceiptTotal(item) || 0)} · {item.participants.length} people
                    </Text>
                  </View>
                </View>
              </Pressable>
            </SwipeableRow>
          )}
          style={styles.list}
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
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  list: { flex: 1 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
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
