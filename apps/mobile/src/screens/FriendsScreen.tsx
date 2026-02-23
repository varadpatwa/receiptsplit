import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { searchProfilesByHandle } from '../lib/supabase';
import { listFriends, deleteFriend, type Friend } from '../lib/friends';
import {
  getIncomingRequests,
  getOutgoingRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  type FriendRequest,
} from '../lib/friendRequests';

export default function FriendsScreen() {
  const userId = useAuth().userId;
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; handle: string; display_name: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const load = async () => {
    if (!userId) {
      setFriends([]);
      setIncoming([]);
      setOutgoing([]);
      return;
    }
    setLoading(true);
    try {
      const [f, inc, out] = await Promise.all([listFriends(), getIncomingRequests(), getOutgoingRequests()]);
      setFriends(f);
      setIncoming(inc);
      setOutgoing(out);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [userId]);

  useEffect(() => {
    if (!searchQuery.trim() || !userId) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchProfilesByHandle(searchQuery, 10);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, userId]);

  const isFriend = (id: string) => friends.some((f) => f.id === id);
  const hasOutgoing = (id: string) => outgoing.some((r) => r.to_user_id === id);

  const handleSendRequest = async (toUserId: string) => {
    if (!userId) return;
    setLoading(true);
    try {
      await sendFriendRequest(toUserId);
      await load();
      setSearchQuery('');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    if (!userId) return;
    setLoading(true);
    try {
      await acceptFriendRequest(requestId);
      await load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to accept');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (requestId: string) => {
    setLoading(true);
    try {
      await rejectFriendRequest(requestId);
      await load();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    setLoading(true);
    try {
      await deleteFriend(friendId);
      await load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to remove friend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Friends</Text>
      <Text style={styles.subtitle}>Find and connect with friends by handle.</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Find friends</Text>
        <TextInput
          style={styles.input}
          placeholder="Search by handle (e.g. username)"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          editable={!loading && !!userId}
        />
        {searching && <Text style={styles.muted}>Searching...</Text>}
        {searchResults.length > 0 && (
          <View style={styles.results}>
            {searchResults.map((p) => (
              <View key={p.id} style={styles.resultRow}>
                <View>
                  <Text style={styles.handle}>@{p.handle}</Text>
                  {p.display_name ? <Text style={styles.muted}>{p.display_name}</Text> : null}
                </View>
                {isFriend(p.id) ? (
                  <Text style={styles.muted}>Already friends</Text>
                ) : hasOutgoing(p.id) ? (
                  <Text style={styles.muted}>Request sent</Text>
                ) : (
                  <TouchableOpacity
                    style={styles.smallButton}
                    onPress={() => handleSendRequest(p.id)}
                    disabled={loading}
                  >
                    <Text style={styles.smallButtonText}>Send request</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
      {incoming.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Friend Requests</Text>
          {incoming.map((r) => (
            <View key={r.id} style={styles.resultRow}>
              <View>
                <Text style={styles.handle}>@{r.from_profile?.handle ?? 'unknown'}</Text>
                {r.from_profile?.display_name ? (
                  <Text style={styles.muted}>{r.from_profile.display_name}</Text>
                ) : null}
              </View>
              <View style={styles.row}>
                <TouchableOpacity style={styles.iconButton} onPress={() => handleAccept(r.id)} disabled={loading}>
                  <Text style={styles.iconButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={() => handleReject(r.id)} disabled={loading}>
                  <Text style={styles.iconButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
      {outgoing.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sent Requests</Text>
          {outgoing.map((r) => (
            <View key={r.id} style={styles.resultRow}>
              <View>
                <Text style={styles.handle}>@{r.to_profile?.handle ?? 'unknown'}</Text>
                {r.to_profile?.display_name ? (
                  <Text style={styles.muted}>{r.to_profile.display_name}</Text>
                ) : null}
              </View>
              <Text style={styles.muted}>Pending</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Friends</Text>
        {loading && friends.length === 0 ? (
          <Text style={styles.muted}>Loading...</Text>
        ) : friends.length === 0 ? (
          <Text style={styles.muted}>
            {userId ? 'No friends yet. Search above to find friends.' : 'Sign in to see your friends'}
          </Text>
        ) : (
          friends.map((f) => (
            <View key={f.id} style={styles.resultRow}>
              <View>
                <Text style={styles.handle}>@{f.handle}</Text>
                {f.display_name ? <Text style={styles.muted}>{f.display_name}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => handleRemoveFriend(f.id)} disabled={loading}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0C', padding: 20, paddingTop: 16, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: '600', color: '#fff', marginBottom: 8 },
  subtitle: { color: 'rgba(255,255,255,0.6)', marginBottom: 24 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  input: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  muted: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 8 },
  results: { marginTop: 8 },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  handle: { fontSize: 16, fontWeight: '500', color: '#fff' },
  row: { flexDirection: 'row', gap: 8 },
  smallButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smallButtonText: { color: '#fff', fontSize: 14 },
  iconButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  iconButtonText: { color: '#fff', fontSize: 14 },
  removeText: { color: '#f87171', fontSize: 14 },
});
