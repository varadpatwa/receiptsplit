import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getIncomingRequests,
  getOutgoingRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  type FriendRequest,
} from '../lib/friendRequests';
import {
  getPendingSplitRequests,
  confirmSplitRequest,
  rejectSplitRequest,
  type PendingSplitRequest,
} from '../lib/splitFriendRequests';
import { useFriendRequests } from '../contexts/FriendRequestsContext';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency } from '@receiptsplit/shared';

const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 };

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { refreshPendingCount } = useFriendRequests();
  const { showToast } = useToast();
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [splitRequests, setSplitRequests] = useState<PendingSplitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actingSplitKey, setActingSplitKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [inc, out, split] = await Promise.all([
        getIncomingRequests(),
        getOutgoingRequests(),
        getPendingSplitRequests(),
      ]);
      setIncoming(inc);
      setOutgoing(out);
      setSplitRequests(split);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load notifications';
      setLoadError(message);
      setIncoming([]);
      setOutgoing([]);
      setSplitRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleAccept = useCallback(
    async (requestId: string) => {
      setActingId(requestId);
      try {
        await acceptFriendRequest(requestId);
        setIncoming((prev) => prev.filter((r) => r.id !== requestId));
        await refreshPendingCount();
        showToast({ message: 'Friend request accepted', variant: 'success' });
      } catch (e) {
        showToast({ message: e instanceof Error ? e.message : 'Failed to accept', variant: 'error' });
      } finally {
        setActingId(null);
      }
    },
    [refreshPendingCount, showToast]
  );

  const handleDecline = useCallback(
    async (requestId: string) => {
      setActingId(requestId);
      try {
        await rejectFriendRequest(requestId);
        setIncoming((prev) => prev.filter((r) => r.id !== requestId));
        await refreshPendingCount();
        showToast({ message: 'Friend request declined', variant: 'info' });
      } catch (e) {
        showToast({ message: e instanceof Error ? e.message : 'Failed to decline', variant: 'error' });
      } finally {
        setActingId(null);
      }
    },
    [refreshPendingCount, showToast]
  );

  const handleSplitAccept = useCallback(
    async (splitId: string, friendUserId: string) => {
      const key = `${splitId}-${friendUserId}`;
      setActingSplitKey(key);
      try {
        await confirmSplitRequest(splitId, friendUserId);
        setSplitRequests((prev) => prev.filter((r) => r.split_id !== splitId || r.friend_user_id !== friendUserId));
        await refreshPendingCount();
        showToast({ message: 'Split confirmed', variant: 'success' });
      } catch (e) {
        showToast({ message: e instanceof Error ? e.message : 'Failed to accept', variant: 'error' });
      } finally {
        setActingSplitKey(null);
      }
    },
    [refreshPendingCount, showToast]
  );

  const handleSplitReject = useCallback(
    async (splitId: string, friendUserId: string) => {
      const key = `${splitId}-${friendUserId}`;
      setActingSplitKey(key);
      try {
        await rejectSplitRequest(splitId, friendUserId);
        setSplitRequests((prev) => prev.filter((r) => r.split_id !== splitId || r.friend_user_id !== friendUserId));
        await refreshPendingCount();
        showToast({ message: 'Split rejected', variant: 'info' });
      } catch (e) {
        showToast({ message: e instanceof Error ? e.message : 'Failed to reject', variant: 'error' });
      } finally {
        setActingSplitKey(null);
      }
    },
    [refreshPendingCount, showToast]
  );

  const isEmpty = incoming.length === 0 && outgoing.length === 0 && splitRequests.length === 0;

  function formatSplitDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
          </Pressable>
          <Text style={styles.title}>Notifications</Text>
          <View style={styles.headerSpacer} />
        </View>
        {loading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="rgba(255,255,255,0.6)" />
          </View>
        ) : loadError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{loadError}</Text>
            <Pressable style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.8 }]} onPress={() => load()} hitSlop={hitSlop}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="rgba(255,255,255,0.6)"
              />
            }
          >
            {isEmpty ? (
              <View style={styles.emptyCard}>
                <Ionicons name="notifications-off-outline" size={40} color="rgba(255,255,255,0.2)" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>All caught up</Text>
                <Text style={styles.emptySubtext}>Friend requests and split confirmations will appear here.</Text>
              </View>
            ) : (
              <>
                {incoming.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Incoming</Text>
                    <View style={styles.card}>
                      {incoming.map((r) => (
                        <View key={r.id} style={styles.row}>
                          <View style={styles.rowLeft}>
                            <Text style={styles.handle}>@{r.from_profile?.handle ?? 'unknown'}</Text>
                            {r.from_profile?.display_name ? (
                              <Text style={styles.muted}>{r.from_profile.display_name}</Text>
                            ) : null}
                          </View>
                          <View style={styles.actions}>
                            <Pressable
                              style={({ pressed }) => [
                                styles.acceptButton,
                                (actingId === r.id || pressed) && { opacity: 0.8 },
                              ]}
                              onPress={() => handleAccept(r.id)}
                              disabled={!!actingId}
                              hitSlop={hitSlop}
                            >
                              {actingId === r.id ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Text style={styles.acceptButtonText}>Accept</Text>
                              )}
                            </Pressable>
                            <Pressable
                              style={({ pressed }) => [
                                styles.declineButton,
                                (actingId === r.id || pressed) && { opacity: 0.8 },
                              ]}
                              onPress={() => handleDecline(r.id)}
                              disabled={!!actingId}
                              hitSlop={hitSlop}
                            >
                              <Text style={styles.declineButtonText}>Decline</Text>
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {outgoing.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Outgoing</Text>
                    <View style={styles.card}>
                      {outgoing.map((r) => (
                        <View key={r.id} style={styles.row}>
                          <View style={styles.rowLeft}>
                            <Text style={styles.handle}>@{r.to_profile?.handle ?? 'unknown'}</Text>
                            {r.to_profile?.display_name ? (
                              <Text style={styles.muted}>{r.to_profile.display_name}</Text>
                            ) : null}
                          </View>
                          <Text style={styles.pending}>Pending</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {splitRequests.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Split confirmations</Text>
                    <View style={styles.card}>
                      {splitRequests.map((r) => {
                        const rowKey = `${r.split_id}-${r.friend_user_id}`;
                        const acting = actingSplitKey === rowKey;
                        return (
                          <View key={rowKey} style={styles.row}>
                            <View style={styles.rowLeft}>
                              <Text style={styles.handle}>{r.split_title}</Text>
                              <Text style={styles.muted}>
                                {formatSplitDate(r.split_created_at)}
                                {r.owner_handle ? ` · @${r.owner_handle}` : ''} · {formatCurrency(r.share_amount)}
                              </Text>
                            </View>
                            <View style={styles.actions}>
                              <Pressable
                                style={[styles.acceptButton, acting && { opacity: 0.8 }]}
                                onPress={() => handleSplitAccept(r.split_id, r.friend_user_id)}
                                disabled={!!actingSplitKey}
                                hitSlop={hitSlop}
                              >
                                {acting ? (
                                  <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                  <Text style={styles.acceptButtonText}>Accept</Text>
                                )}
                              </Pressable>
                              <Pressable
                                style={[styles.declineButton, acting && { opacity: 0.8 }]}
                                onPress={() => handleSplitReject(r.split_id, r.friend_user_id)}
                                disabled={!!actingSplitKey}
                                hitSlop={hitSlop}
                              >
                                <Text style={styles.declineButtonText}>Reject</Text>
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0B0C' },
  container: { flex: 1, padding: 20, paddingTop: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerSpacer: { width: 24 },
  title: { flex: 1, fontSize: 28, fontWeight: '600', color: '#fff', textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  errorCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    padding: 24,
    alignItems: 'center',
  },
  errorText: { fontSize: 16, color: '#fca5a5', marginBottom: 16, textAlign: 'center' },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 12 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rowLeft: { flex: 1 },
  handle: { fontSize: 16, fontWeight: '500', color: '#fff' },
  muted: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  acceptButton: {
    backgroundColor: 'rgba(34,197,94,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  acceptButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  declineButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  declineButtonText: { color: '#fff', fontSize: 14 },
  pending: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
});
