import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Split, Participant } from '@receiptsplit/shared';
import { generateId } from '@receiptsplit/shared';
import { listFriends, type Friend } from '../../lib/friends';
import { getRecentPeople, recordRecentPerson } from '../../lib/recentPeople';
import { useAuth } from '../../contexts/AuthContext';
import { Stepper } from '../../components/Stepper';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { Avatar } from '../../components/Avatar';
import { useParticipantAvatars } from '../../hooks/useParticipantAvatars';
import { T } from '../../theme/colors';
import { AuroraBackground } from '../../components/AuroraBackground';

type Suggestion =
  | { type: 'friend'; friend: Friend }
  | { type: 'recent'; name: string }
  | { type: 'add-temp'; name: string };

interface PeopleScreenProps {
  split: Split;
  onUpdate: (split: Split) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PeopleScreen({ split, onUpdate, onNext, onBack }: PeopleScreenProps) {
  const { userId } = useAuth();
  const [newName, setNewName] = useState('');
  const [savedFriends, setSavedFriends] = useState<Friend[]>([]);
  const [recentPeople, setRecentPeople] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    listFriends().then((f) => {
      if (!cancelled) setSavedFriends(f);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getRecentPeople(userId ?? null).then((r) => {
      if (!cancelled) setRecentPeople(r);
    });
    return () => { cancelled = true; };
  }, [userId]);

  const currentParticipantIds = useMemo(() => new Set(split.participants.map((p) => p.id)), [split.participants]);
  const currentParticipantNamesLower = useMemo(
    () => new Set(split.participants.map((p) => p.name.toLowerCase())),
    [split.participants]
  );
  const availableFriends = useMemo(
    () => savedFriends.filter((f) => !currentParticipantIds.has(f.id)),
    [savedFriends, currentParticipantIds]
  );
  const availableRecent = useMemo(
    () => recentPeople.filter((n) => !currentParticipantNamesLower.has(n.toLowerCase())),
    [recentPeople, currentParticipantNamesLower]
  );

  // Names of matched friends (lowercase) so we can de-dupe recent entries
  const suggestions = useMemo((): Suggestion[] => {
    const query = newName.trim().toLowerCase();
    if (!query) return [];
    const result: Suggestion[] = [];
    const friendPrefix: Friend[] = [];
    const friendContains: Friend[] = [];
    availableFriends.forEach((friend) => {
      const handleLower = friend.handle.toLowerCase();
      const displayLower = (friend.display_name ?? '').toLowerCase();
      const searchText = handleLower + ' ' + displayLower;
      if (handleLower.startsWith(query) || displayLower.startsWith(query)) friendPrefix.push(friend);
      else if (searchText.includes(query)) friendContains.push(friend);
    });
    friendPrefix.forEach((f) => result.push({ type: 'friend', friend: f }));
    friendContains.forEach((f) => result.push({ type: 'friend', friend: f }));
    // Collect matched friend names so we skip duplicate recent entries
    const matchedFriendNames = new Set(
      [...friendPrefix, ...friendContains].flatMap((f) => [
        f.handle.toLowerCase(),
        (f.display_name ?? '').toLowerCase(),
      ].filter(Boolean))
    );
    const recentPrefix: string[] = [];
    const recentContains: string[] = [];
    availableRecent.forEach((name) => {
      const lower = name.toLowerCase();
      // Skip recent if it matches a friend already shown
      if (matchedFriendNames.has(lower)) return;
      if (lower.startsWith(query)) recentPrefix.push(name);
      else if (lower.includes(query)) recentContains.push(name);
    });
    recentPrefix.forEach((n) => result.push({ type: 'recent', name: n }));
    recentContains.forEach((n) => result.push({ type: 'recent', name: n }));
    if (newName.trim()) result.push({ type: 'add-temp', name: newName.trim() });
    return result;
  }, [newName, availableFriends, availableRecent]);

  const addParticipant = (participant: Participant) => {
    onUpdate({ ...split, participants: [...split.participants, participant] });
    recordRecentPerson(participant.name, userId ?? null);
    setNewName('');
  };

  const addParticipantAsTemp = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addParticipant({ id: generateId(), name: trimmed, source: 'temp' });
  };

  const addByNameOrFriend = (name: string) => {
    // Check if this name matches a saved friend — use their stable UUID
    const lower = name.toLowerCase();
    const friend = savedFriends.find(
      (f) => f.handle.toLowerCase() === lower || (f.display_name ?? '').toLowerCase() === lower
    );
    if (friend && !currentParticipantIds.has(friend.id)) {
      addParticipant({ id: friend.id, name: friend.display_name || friend.handle, source: 'friend' });
    } else {
      addParticipantAsTemp(name);
    }
  };

  const handleSuggestionSelect = (s: Suggestion) => {
    switch (s.type) {
      case 'friend':
        addParticipant({
          id: s.friend.id,
          name: s.friend.display_name || s.friend.handle,
          source: 'friend',
        });
        break;
      case 'recent':
        addByNameOrFriend(s.name);
        break;
      case 'add-temp':
        addParticipantAsTemp(s.name);
        break;
    }
  };

  const handleNext = () => {
    split.participants.forEach((p) => recordRecentPerson(p.name, userId ?? null));
    onNext();
  };

  const deleteParticipant = (participantId: string) => {
    if (participantId === 'me') return;
    onUpdate({
      ...split,
      participants: split.participants.filter((p) => p.id !== participantId),
      items: split.items.map((item) => ({
        ...item,
        assignments: item.assignments.filter((a) => a.participantId !== participantId),
      })),
    });
  };

  const avatarMap = useParticipantAvatars(split.participants);
  const canProceed = split.participants.length >= 2;

  const renderSuggestionItem = (item: Suggestion, index: number) => {
    let displayText = '';
    let badge = '';
    if (item.type === 'friend') {
      displayText = item.friend.display_name || item.friend.handle;
      badge = '@' + item.friend.handle;
    } else if (item.type === 'recent') displayText = item.name;
    else displayText = `Add "${item.name}" as Temp`;
    return (
      <AnimatedPressable
        key={index}
        onPress={() => handleSuggestionSelect(item)}
        style={({ pressed }) => [styles.suggestionRow, pressed && { backgroundColor: 'rgba(255,255,255,0.05)' }]}
      >
        <Text style={styles.suggestionText}>{displayText}</Text>
        {badge ? <Text style={styles.suggestionBadge}>{badge}</Text> : null}
      </AnimatedPressable>
    );
  };

  return (
    <AuroraBackground>
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <AnimatedPressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
          </AnimatedPressable>
          <Text style={styles.title}>Add People</Text>
        </View>
        <Stepper currentStep="people" />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Who's splitting?</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Enter name or @handle"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={newName}
              onChangeText={setNewName}
            />
            <AnimatedPressable
              onPress={() => newName.trim() && addParticipantAsTemp(newName.trim())}
              style={[styles.addBtn, !newName.trim() && styles.addBtnDisabled]}
              disabled={!newName.trim()}
            >
              <Ionicons name="checkmark" size={24} color="#000" />
            </AnimatedPressable>
          </View>
          {suggestions.length > 0 ? (
            <View style={styles.suggestionsBox}>
              {suggestions.map((item, index) => renderSuggestionItem(item, index))}
            </View>
          ) : null}
          {availableRecent.length > 0 && !newName.trim() ? (
            <View style={styles.recentSection}>
              <Text style={styles.muted}>Recent</Text>
              <View style={styles.recentChips}>
                {availableRecent.slice(0, 5).map((name) => (
                  <AnimatedPressable
                    key={name}
                    onPress={() => addByNameOrFriend(name)}
                    style={({ pressed }) => [styles.recentChip, pressed && { opacity: 0.8 }]}
                  >
                    <Text style={styles.recentChipText}>{name}</Text>
                  </AnimatedPressable>
                ))}
              </View>
            </View>
          ) : null}
          {split.participants.length < 2 && (
            <Text style={styles.muted}>Add at least 2 people to continue</Text>
          )}
        </View>

        {split.participants.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Participants ({split.participants.length})</Text>
            {split.participants.map((p, index) => (
              <View key={p.id} style={styles.participantRow}>
                <View style={styles.participantLeft}>
                  <Avatar name={p.name} avatarUrl={avatarMap.get(p.id)} size={40} />
                  <View>
                    <Text style={styles.participantName}>{p.name}</Text>
                    {p.id === 'me' ? (
                      <Text style={styles.participantMeta}>Use "Exclude me" in Receipt to remove</Text>
                    ) : p.source ? (
                      <Text style={styles.participantMeta}>{p.source === 'friend' ? 'Saved friend' : 'Temp'}</Text>
                    ) : null}
                  </View>
                </View>
                {p.id !== 'me' && (
                  <AnimatedPressable onPress={() => deleteParticipant(p.id)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={20} color="rgba(255,100,100,0.9)" />
                  </AnimatedPressable>
                )}
              </View>
            ))}
          </View>
        ) : null}

        {!canProceed && (
          <Text style={styles.helpText}>Need at least 2 people to split the bill</Text>
        )}
        <AnimatedPressable
          onPress={handleNext}
          disabled={!canProceed}
          style={({ pressed }) => [styles.nextBtn, !canProceed && styles.nextBtnDisabled, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.nextBtnText}>Next: Assign Items</Text>
        </AnimatedPressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
  card: {
    backgroundColor: T.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.cardBorder,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  addBtn: { backgroundColor: T.ctaBg, padding: 12, borderRadius: 8 },
  addBtnDisabled: { opacity: 0.5 },
  suggestionsBox: { maxHeight: 220, marginTop: 8, borderRadius: 8, overflow: 'hidden', backgroundColor: T.inputBg },
  suggestionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  suggestionText: { color: '#fff', fontSize: 16 },
  suggestionBadge: { fontSize: 12, color: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 },
  recentSection: { marginTop: 12 },
  muted: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 8 },
  recentChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recentChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  recentChipText: { color: '#fff', fontSize: 14 },
  participantRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, marginBottom: 8 },
  participantLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '600', color: '#fff' },
  participantName: { fontWeight: '600', color: '#fff' },
  participantMeta: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  deleteBtn: { padding: 8 },
  helpText: { textAlign: 'center', color: 'rgba(255,255,255,0.6)', marginBottom: 8 },
  nextBtn: { backgroundColor: T.ctaBg, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: T.ctaText, fontSize: 16, fontWeight: '600' },
});
