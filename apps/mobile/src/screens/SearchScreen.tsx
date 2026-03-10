import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, SectionList, ScrollView,
  Keyboard, LayoutAnimation, Platform, UIManager, Animated,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getReceiptTotal, formatCurrency } from '@receiptsplit/shared';
import type { Split } from '@receiptsplit/shared';
import { useSplits } from '../contexts/SplitsContext';
import { useAuth } from '../contexts/AuthContext';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { T } from '../theme/colors';
import { AuroraBackground } from '../components/AuroraBackground';
import { askReceipts } from '../lib/askReceipts';
import type { ChatMessage } from '../lib/askReceipts';
import type { HomeStackParamList } from '../navigation/HomeStack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Search'>;

const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 };

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#f97316',
  Grocery: '#22c55e',
  Entertainment: '#a855f7',
  Utilities: '#3b82f6',
  Other: '#64748b',
  Uncategorized: '#94a3b8',
};

function getCategoryColor(category?: string): string {
  if (!category) return 'transparent';
  return CATEGORY_COLORS[category] ?? 'transparent';
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Check if query is long enough to be worth sending to AI (vs a single keyword)
function isAICandidate(q: string): boolean {
  const trimmed = q.trim();
  // 2+ words or ends with ? — treat as an AI query
  return trimmed.includes(' ') || trimmed.endsWith('?');
}

// --- Aggregate types ---

interface PersonAggregate {
  displayName: string;
  splitCount: number;
  totalCents: number;
  splits: Split[];
  topCategory?: string;
  lastSplitDate: number;
  _catCounts: Map<string, number>;
}

interface MerchantAggregate {
  displayName: string;
  visitCount: number;
  totalCents: number;
  splits: Split[];
  topCategory?: string;
}

type ResultItem =
  | { type: 'person'; key: string; agg: PersonAggregate }
  | { type: 'merchant'; key: string; agg: MerchantAggregate }
  | { type: 'split'; split: Split };

interface Section {
  title: string;
  data: ResultItem[];
}

// --- Quick Tools ---

type ToolMode = null | 'tip' | 'quicksplit' | 'pricecheck';

// --- Index builders ---

function topCategoryFromCounts(counts: Map<string, number>): string | undefined {
  let best: string | undefined;
  let bestCount = 0;
  counts.forEach((count, cat) => {
    if (count > bestCount) { best = cat; bestCount = count; }
  });
  return best;
}

function buildPersonIndex(splits: Split[]): Map<string, PersonAggregate> {
  const index = new Map<string, PersonAggregate>();
  for (const split of splits) {
    const total = getReceiptTotal(split);
    for (const p of split.participants) {
      const key = p.name.toLowerCase();
      const existing = index.get(key);
      if (existing) {
        existing.splitCount++;
        existing.totalCents += total;
        existing.splits.push(split);
        if (split.category) {
          existing._catCounts.set(split.category, (existing._catCounts.get(split.category) ?? 0) + 1);
          existing.topCategory = topCategoryFromCounts(existing._catCounts);
        }
        if (split.updatedAt > existing.lastSplitDate) existing.lastSplitDate = split.updatedAt;
      } else {
        const catCounts = new Map<string, number>();
        if (split.category) catCounts.set(split.category, 1);
        index.set(key, {
          displayName: p.name,
          splitCount: 1,
          totalCents: total,
          splits: [split],
          topCategory: split.category,
          lastSplitDate: split.updatedAt,
          _catCounts: catCounts,
        });
      }
    }
  }
  return index;
}

function buildMerchantIndex(splits: Split[]): Map<string, MerchantAggregate> {
  const index = new Map<string, MerchantAggregate>();
  for (const split of splits) {
    if (!split.merchantName) continue;
    const key = split.merchantName.toLowerCase();
    const total = getReceiptTotal(split);
    const existing = index.get(key);
    if (existing) {
      existing.visitCount++;
      existing.totalCents += total;
      existing.splits.push(split);
    } else {
      index.set(key, {
        displayName: split.merchantName,
        visitCount: 1,
        totalCents: total,
        splits: [split],
        topCategory: split.category,
      });
    }
  }
  return index;
}

// --- Typing dots animation ---

function TypingDots() {
  const dots = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [dots]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 24 }}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: T.pennyAccent,
            transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
            opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
          }}
        />
      ))}
    </View>
  );
}

// --- Follow-up suggestions based on last response ---

function getFollowUpSuggestions(lastAnswer: string, lastQuestion: string): string[] {
  const lower = lastAnswer.toLowerCase();
  const suggestions: string[] = [];

  if (lower.includes('food') || lower.includes('grocery') || lower.includes('restaurant')) {
    suggestions.push('Where do I spend the most on food?');
  }
  if (lower.includes('$') && !lower.includes('person')) {
    suggestions.push('How does this compare to last month?');
  }
  if (lower.includes('split') || lower.includes('person') || lower.includes('people')) {
    suggestions.push('Who do I split with the most?');
  }
  if (lower.includes('total') || lower.includes('spent')) {
    suggestions.push('Break it down by category');
  }

  // Always add a generic useful one
  if (suggestions.length < 2) {
    suggestions.push('What was my biggest expense?');
  }
  if (suggestions.length < 2) {
    suggestions.push('How much did I spend this week?');
  }

  // Filter out if it's the same as what was just asked
  const qLower = lastQuestion.toLowerCase();
  return suggestions.filter((s) => s.toLowerCase() !== qLower).slice(0, 2);
}

// --- Component ---

export default function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const { activeSplits, loadSplit } = useSplits();
  const { userId } = useAuth();

  // Search state
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [expandedItem, setExpandedItem] = useState<{ type: 'person' | 'merchant'; key: string } | null>(null);

  // AI chat state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const chatScrollRef = useRef<ScrollView>(null);

  // Quick tools state
  const [toolMode, setToolMode] = useState<ToolMode>(null);
  const [tipBill, setTipBill] = useState('');
  const [tipPercent, setTipPercent] = useState(18);
  const [tipPeople, setTipPeople] = useState('1');
  const [quickSplitAmount, setQuickSplitAmount] = useState('');
  const [quickSplitPeople, setQuickSplitPeople] = useState('2');
  const [priceCheckQuery, setPriceCheckQuery] = useState('');

  const inputRef = useRef<TextInput>(null);

  // Auto-focus the search input when the screen becomes focused
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        if (!inChatMode) inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }, [inChatMode])
  );

  // Debounce for local search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Clear error when query changes
  useEffect(() => {
    setAiError(null);
  }, [query]);

  // Precomputed indexes
  const personIndex = useMemo(() => buildPersonIndex(activeSplits), [activeSplits]);
  const merchantIndex = useMemo(() => buildMerchantIndex(activeSplits), [activeSplits]);

  // Local search sections
  const sections = useMemo((): Section[] => {
    const q = debouncedQuery;
    if (!q) return [];

    const secs: Section[] = [];

    const matchedPeople = Array.from(personIndex.entries())
      .filter(([key]) => key.includes(q))
      .sort(([, a], [, b]) => b.splitCount - a.splitCount)
      .slice(0, 8);
    if (matchedPeople.length > 0) {
      secs.push({ title: 'People', data: matchedPeople.map(([key, agg]) => ({ type: 'person' as const, key, agg })) });
    }

    const matchedMerchants = Array.from(merchantIndex.entries())
      .filter(([key]) => key.includes(q))
      .sort(([, a], [, b]) => b.visitCount - a.visitCount)
      .slice(0, 8);
    if (matchedMerchants.length > 0) {
      secs.push({ title: 'Merchants', data: matchedMerchants.map(([key, agg]) => ({ type: 'merchant' as const, key, agg })) });
    }

    const matchedSplits = activeSplits
      .filter((s) => {
        if (s.name.toLowerCase().includes(q)) return true;
        if (s.merchantName?.toLowerCase().includes(q)) return true;
        if (s.participants.some((p) => p.name.toLowerCase().includes(q))) return true;
        if (s.items.some((item) => item.name.toLowerCase().includes(q))) return true;
        return false;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 10);
    if (matchedSplits.length > 0) {
      secs.push({ title: 'Splits', data: matchedSplits.map((split) => ({ type: 'split' as const, split })) });
    }

    return secs;
  }, [debouncedQuery, personIndex, merchantIndex, activeSplits]);

  // Price check results
  const priceCheckResults = useMemo(() => {
    const q = priceCheckQuery.trim().toLowerCase();
    if (!q) return [];
    const results: { splitName: string; itemName: string; priceInCents: number; date: number; merchant?: string }[] = [];
    for (const split of activeSplits) {
      for (const item of split.items) {
        if (item.name.toLowerCase().includes(q)) {
          results.push({
            splitName: split.name,
            itemName: item.name,
            priceInCents: item.priceInCents,
            date: split.updatedAt,
            merchant: split.merchantName,
          });
        }
      }
    }
    return results.sort((a, b) => b.date - a.date).slice(0, 20);
  }, [priceCheckQuery, activeSplits]);

  const handleAskAI = useCallback(async () => {
    const q = query.trim();
    if (!q || aiLoading) return;
    Keyboard.dismiss();
    setAiLoading(true);
    setAiError(null);
    // Add user message to history immediately
    const userMsg: ChatMessage = { role: 'user', content: q };
    setChatHistory((prev) => [...prev, userMsg]);
    setQuery('');
    setDebouncedQuery('');
    try {
      const answer = await askReceipts(q, activeSplits, [...chatHistory, userMsg]);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setChatHistory((prev) => [...prev, { role: 'assistant', content: answer }]);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Something went wrong');
      // Remove the failed user message
      setChatHistory((prev) => prev.slice(0, -1));
    } finally {
      setAiLoading(false);
    }
  }, [query, activeSplits, aiLoading, chatHistory]);

  const onSubmit = useCallback(() => {
    if (query.trim()) {
      handleAskAI();
    }
  }, [query, handleAskAI]);

  const onSplitPress = useCallback((split: Split) => {
    Keyboard.dismiss();
    loadSplit(split.id);
    const step = split.currentStep || 'receipt';
    const screenName = (step.charAt(0).toUpperCase() + step.slice(1)) as keyof HomeStackParamList;
    navigation.navigate(screenName);
  }, [loadSplit, navigation]);

  const toggleExpand = useCallback((type: 'person' | 'merchant', key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedItem((prev) => prev?.type === type && prev.key === key ? null : { type, key });
  }, []);

  const clearQuery = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setExpandedItem(null);
    setChatHistory([]);
    setAiError(null);
    setToolMode(null);
  }, []);

  const selectTool = useCallback((tool: ToolMode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setToolMode((prev) => prev === tool ? null : tool);
    setQuery('');
    setDebouncedQuery('');
    setChatHistory([]);
    Keyboard.dismiss();
  }, []);

  const isExpanded = (type: 'person' | 'merchant', key: string) =>
    expandedItem?.type === type && expandedItem.key === key;

  const inChatMode = chatHistory.length > 0 || aiLoading || aiError !== null;
  const showAIHint = !inChatMode && debouncedQuery.length > 0 && isAICandidate(query);
  const showLocalResults = debouncedQuery.length > 0 && !toolMode && !inChatMode && sections.length > 0;
  const noResults = debouncedQuery.length > 0 && !toolMode && !inChatMode && sections.length === 0;

  // --- Tip calculator ---
  const tipCalc = useMemo(() => {
    const bill = parseFloat(tipBill);
    const people = parseInt(tipPeople, 10) || 1;
    if (!bill || bill <= 0) return null;
    const tip = bill * (tipPercent / 100);
    const total = bill + tip;
    const perPerson = total / people;
    return { tip, total, perPerson, people };
  }, [tipBill, tipPercent, tipPeople]);

  // --- Quick split ---
  const quickSplitCalc = useMemo(() => {
    const amount = parseFloat(quickSplitAmount);
    const people = parseInt(quickSplitPeople, 10) || 2;
    if (!amount || amount <= 0) return null;
    return { perPerson: amount / people, people };
  }, [quickSplitAmount, quickSplitPeople]);

  // --- Render helpers ---

  const renderItem = ({ item }: { item: ResultItem }) => {
    if (item.type === 'person') {
      const expanded = isExpanded('person', item.key);
      return (
        <View>
          <AnimatedPressable
            style={({ pressed }) => [styles.card, expanded && styles.cardExpanded, pressed && { opacity: 0.8 }]}
            onPress={() => toggleExpand('person', item.key)}
          >
            <View style={styles.cardRow}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(96,165,250,0.15)' }]}>
                <Ionicons name="person" size={16} color="rgba(96,165,250,0.9)" />
              </View>
              <View style={styles.cardLeft}>
                <Text style={styles.cardName}>{item.agg.displayName}</Text>
                <Text style={styles.muted}>
                  {item.agg.splitCount} split{item.agg.splitCount !== 1 ? 's' : ''} · {formatCurrency(item.agg.totalCents)}
                </Text>
              </View>
              <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={18} color="rgba(255,255,255,0.3)" />
            </View>
          </AnimatedPressable>
          {expanded && (
            <View style={styles.detailContainer}>
              <View style={styles.detailStats}>
                <Text style={styles.detailStatText}>
                  Last: {formatDate(item.agg.lastSplitDate)}
                  {item.agg.topCategory ? ` · Top: ${item.agg.topCategory}` : ''}
                </Text>
              </View>
              {item.agg.splits.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10).map((split) => {
                const catColor = getCategoryColor(split.category);
                return (
                  <AnimatedPressable key={split.id} style={({ pressed }) => [styles.detailRow, catColor !== 'transparent' && { borderLeftWidth: 3, borderLeftColor: catColor }, pressed && { opacity: 0.8 }]} onPress={() => onSplitPress(split)}>
                    <View style={styles.detailRowLeft}>
                      <Text style={styles.detailRowName}>{split.name}</Text>
                      <Text style={styles.detailRowMeta}>{split.merchantName ? `${split.merchantName} · ` : ''}{formatDate(split.updatedAt)}</Text>
                    </View>
                    <Text style={styles.detailRowAmount}>{formatCurrency(getReceiptTotal(split))}</Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          )}
        </View>
      );
    }

    if (item.type === 'merchant') {
      const expanded = isExpanded('merchant', item.key);
      return (
        <View>
          <AnimatedPressable
            style={({ pressed }) => [styles.card, expanded && styles.cardExpanded, pressed && { opacity: 0.8 }]}
            onPress={() => toggleExpand('merchant', item.key)}
          >
            <View style={styles.cardRow}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(249,115,22,0.15)' }]}>
                <Ionicons name="storefront" size={16} color="rgba(249,115,22,0.9)" />
              </View>
              <View style={styles.cardLeft}>
                <Text style={styles.cardName}>{item.agg.displayName}</Text>
                <Text style={styles.muted}>
                  {item.agg.visitCount} visit{item.agg.visitCount !== 1 ? 's' : ''} · {formatCurrency(item.agg.totalCents)}
                </Text>
              </View>
              <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={18} color="rgba(255,255,255,0.3)" />
            </View>
          </AnimatedPressable>
          {expanded && (
            <View style={styles.detailContainer}>
              {item.agg.topCategory && (
                <View style={styles.detailStats}>
                  <Text style={styles.detailStatText}>Category: {item.agg.topCategory}</Text>
                </View>
              )}
              {item.agg.splits.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10).map((split) => {
                const catColor = getCategoryColor(split.category);
                return (
                  <AnimatedPressable key={split.id} style={({ pressed }) => [styles.detailRow, catColor !== 'transparent' && { borderLeftWidth: 3, borderLeftColor: catColor }, pressed && { opacity: 0.8 }]} onPress={() => onSplitPress(split)}>
                    <View style={styles.detailRowLeft}>
                      <Text style={styles.detailRowName}>{split.name}</Text>
                      <Text style={styles.detailRowMeta}>{formatDate(split.updatedAt)} · {split.participants.length} people</Text>
                    </View>
                    <Text style={styles.detailRowAmount}>{formatCurrency(getReceiptTotal(split))}</Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          )}
        </View>
      );
    }

    // type === 'split'
    const split = item.split;
    const catColor = getCategoryColor(split.category);
    return (
      <AnimatedPressable
        style={({ pressed }) => [styles.card, catColor !== 'transparent' && { borderLeftWidth: 3, borderLeftColor: catColor }, pressed && { opacity: 0.8 }]}
        onPress={() => onSplitPress(split)}
      >
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardName}>{split.name}</Text>
            <Text style={styles.muted}>
              {split.merchantName ? `${split.merchantName} · ` : ''}{formatDate(split.updatedAt)} · {formatCurrency(getReceiptTotal(split))} · {split.participants.length} people
            </Text>
          </View>
        </View>
      </AnimatedPressable>
    );
  };

  // --- Shared input bar ---
  const renderInputBar = () => (
    <View style={[styles.inputBarRow, inChatMode && styles.inputBarBottom]}>
      {!inChatMode && (
        <AnimatedPressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          hitSlop={hitSlop}
        >
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
        </AnimatedPressable>
      )}
      <View style={styles.searchBar}>
        <Ionicons name="sparkles" size={18} color="rgba(168,85,247,0.7)" style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder={inChatMode ? "Ask Penny a follow-up..." : "Ask Penny about your spending..."}
          placeholderTextColor="rgba(255,255,255,0.35)"
          value={query}
          onChangeText={(text) => { setQuery(text); setToolMode(null); }}
          onSubmitEditing={onSubmit}
          autoFocus={!inChatMode}
          returnKeyType="send"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {(query.length > 0 || inChatMode) && (
          <AnimatedPressable onPress={clearQuery} hitSlop={hitSlop}>
            <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.4)" />
          </AnimatedPressable>
        )}
      </View>
      {inChatMode && query.trim().length > 0 && (
        <AnimatedPressable
          onPress={onSubmit}
          style={({ pressed }) => [styles.sendButton, pressed && { opacity: 0.7 }]}
          hitSlop={hitSlop}
        >
          <Ionicons name="arrow-up-circle" size={32} color={T.pennyAccent} />
        </AnimatedPressable>
      )}
    </View>
  );

  // --- Main render ---

  // Chat mode — completely different layout
  if (inChatMode) {
    return (
      <AuroraBackground><SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Chat header */}
          <View style={styles.chatHeader}>
            <AnimatedPressable
              onPress={clearQuery}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              hitSlop={hitSlop}
            >
              <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
            </AnimatedPressable>
            <View style={styles.chatHeaderCenter}>
              <Ionicons name="sparkles" size={16} color={T.pennyAccent} />
              <Text style={styles.chatHeaderTitle}>Penny</Text>
            </View>
            <AnimatedPressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              hitSlop={hitSlop}
            >
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
            </AnimatedPressable>
          </View>

          {/* Chat messages */}
          <ScrollView
            ref={chatScrollRef}
            style={styles.chatMessages}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.chatMessagesContent}
            keyboardDismissMode="interactive"
          >
            {chatHistory.map((msg, i) => (
              <View key={i} style={msg.role === 'user' ? styles.chatUserBubble : styles.chatAiBubble}>
                {msg.role === 'assistant' && (
                  <View style={styles.aiCardHeader}>
                    <Ionicons name="sparkles" size={14} color={T.pennyAccent} />
                  </View>
                )}
                <Text style={msg.role === 'user' ? styles.chatUserText : styles.aiAnswerText}>
                  {msg.content}
                </Text>
              </View>
            ))}
            {aiLoading && (
              <View style={styles.chatAiBubble}>
                <TypingDots />
              </View>
            )}
            {aiError && (
              <View style={styles.chatAiBubble}>
                <Text style={styles.aiErrorText}>{aiError}</Text>
                <AnimatedPressable onPress={handleAskAI} style={styles.aiRetry}>
                  <Text style={styles.aiRetryText}>Try again</Text>
                </AnimatedPressable>
              </View>
            )}
            {/* Follow-up suggestion chips */}
            {!aiLoading && !aiError && chatHistory.length >= 2 && chatHistory[chatHistory.length - 1].role === 'assistant' && (() => {
              const lastAssistant = chatHistory[chatHistory.length - 1].content;
              const lastUser = chatHistory[chatHistory.length - 2].content;
              const followUps = getFollowUpSuggestions(lastAssistant, lastUser);
              if (followUps.length === 0) return null;
              return (
                <View style={styles.followUpRow}>
                  {followUps.map((suggestion) => (
                    <AnimatedPressable
                      key={suggestion}
                      style={({ pressed }) => [styles.followUpChip, pressed && { opacity: 0.7 }]}
                      onPress={() => {
                        const userMsg: ChatMessage = { role: 'user', content: suggestion };
                        setChatHistory((prev) => [...prev, userMsg]);
                        setQuery('');
                        setAiLoading(true);
                        askReceipts(suggestion, activeSplits, [...chatHistory, userMsg])
                          .then((answer) => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setChatHistory((prev) => [...prev, { role: 'assistant', content: answer }]);
                            setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
                          })
                          .catch((e) => setAiError(e instanceof Error ? e.message : 'Something went wrong'))
                          .finally(() => setAiLoading(false));
                      }}
                    >
                      <Text style={styles.followUpText}>{suggestion}</Text>
                    </AnimatedPressable>
                  ))}
                </View>
              );
            })()}
          </ScrollView>

          {/* Bottom input bar */}
          {renderInputBar()}
        </KeyboardAvoidingView>
      </SafeAreaView></AuroraBackground>
    );
  }

  // Default mode — search bar at top
  return (
    <AuroraBackground><SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {renderInputBar()}

        {/* Quick tools row */}
        {!debouncedQuery && !toolMode && (
          <View>
            <Text style={styles.toolsSectionTitle}>Quick Tools</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolsRow}>
              <AnimatedPressable style={({ pressed }) => [styles.toolChip, pressed && { opacity: 0.8 }]} onPress={() => selectTool('tip')}>
                <View style={styles.toolChipInner}>
                  <Ionicons name="calculator" size={20} color="#22c55e" />
                  <Text style={styles.toolChipText}>Tip Calculator</Text>
                </View>
              </AnimatedPressable>
              <AnimatedPressable style={({ pressed }) => [styles.toolChip, pressed && { opacity: 0.8 }]} onPress={() => selectTool('quicksplit')}>
                <View style={styles.toolChipInner}>
                  <Ionicons name="cut" size={20} color="#60a5fa" />
                  <Text style={styles.toolChipText}>Quick Split</Text>
                </View>
              </AnimatedPressable>
              <AnimatedPressable style={({ pressed }) => [styles.toolChip, pressed && { opacity: 0.8 }]} onPress={() => selectTool('pricecheck')}>
                <View style={styles.toolChipInner}>
                  <Ionicons name="pricetag" size={20} color="#f97316" />
                  <Text style={styles.toolChipText}>Price Check</Text>
                </View>
              </AnimatedPressable>
            </ScrollView>
          </View>
        )}

        {/* Tool UIs */}
        {toolMode === 'tip' && (
          <ScrollView style={styles.toolContent} showsVerticalScrollIndicator={false}>
            <View style={styles.toolHeader}>
              <Text style={styles.toolTitle}>Tip Calculator</Text>
              <AnimatedPressable onPress={() => selectTool(null)} hitSlop={hitSlop}><Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" /></AnimatedPressable>
            </View>
            <Text style={styles.toolLabel}>Bill amount</Text>
            <TextInput style={styles.toolInput} placeholder="$0.00" placeholderTextColor="rgba(255,255,255,0.3)" value={tipBill} onChangeText={setTipBill} keyboardType="decimal-pad" autoFocus />
            <Text style={styles.toolLabel}>Tip %</Text>
            <View style={styles.tipPercentRow}>
              {[15, 18, 20, 25].map((pct) => (
                <AnimatedPressable key={pct} style={[styles.tipPercentChip, tipPercent === pct && styles.tipPercentActive]} onPress={() => setTipPercent(pct)}>
                  <Text style={[styles.tipPercentText, tipPercent === pct && styles.tipPercentTextActive]}>{pct}%</Text>
                </AnimatedPressable>
              ))}
            </View>
            <Text style={styles.toolLabel}>Split between</Text>
            <TextInput style={styles.toolInput} placeholder="1" placeholderTextColor="rgba(255,255,255,0.3)" value={tipPeople} onChangeText={setTipPeople} keyboardType="number-pad" />
            {tipCalc && (
              <View style={styles.toolResult}>
                <View style={styles.toolResultRow}><Text style={styles.toolResultLabel}>Tip</Text><Text style={styles.toolResultValue}>${tipCalc.tip.toFixed(2)}</Text></View>
                <View style={styles.toolResultRow}><Text style={styles.toolResultLabel}>Total</Text><Text style={styles.toolResultValue}>${tipCalc.total.toFixed(2)}</Text></View>
                {tipCalc.people > 1 && (<View style={[styles.toolResultRow, styles.toolResultHighlight]}><Text style={styles.toolResultLabelBold}>Per person</Text><Text style={styles.toolResultValueBold}>${tipCalc.perPerson.toFixed(2)}</Text></View>)}
              </View>
            )}
          </ScrollView>
        )}

        {toolMode === 'quicksplit' && (
          <ScrollView style={styles.toolContent} showsVerticalScrollIndicator={false}>
            <View style={styles.toolHeader}>
              <Text style={styles.toolTitle}>Quick Split</Text>
              <AnimatedPressable onPress={() => selectTool(null)} hitSlop={hitSlop}><Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" /></AnimatedPressable>
            </View>
            <Text style={styles.toolLabel}>Total amount</Text>
            <TextInput style={styles.toolInput} placeholder="$0.00" placeholderTextColor="rgba(255,255,255,0.3)" value={quickSplitAmount} onChangeText={setQuickSplitAmount} keyboardType="decimal-pad" autoFocus />
            <Text style={styles.toolLabel}>Number of people</Text>
            <View style={styles.tipPercentRow}>
              {['2', '3', '4', '5', '6'].map((n) => (
                <AnimatedPressable key={n} style={[styles.tipPercentChip, quickSplitPeople === n && styles.tipPercentActive]} onPress={() => setQuickSplitPeople(n)}>
                  <Text style={[styles.tipPercentText, quickSplitPeople === n && styles.tipPercentTextActive]}>{n}</Text>
                </AnimatedPressable>
              ))}
            </View>
            {quickSplitCalc && (
              <View style={styles.toolResult}>
                <View style={[styles.toolResultRow, styles.toolResultHighlight]}><Text style={styles.toolResultLabelBold}>Each person pays</Text><Text style={styles.toolResultValueBold}>${quickSplitCalc.perPerson.toFixed(2)}</Text></View>
              </View>
            )}
          </ScrollView>
        )}

        {toolMode === 'pricecheck' && (
          <ScrollView style={styles.toolContent} showsVerticalScrollIndicator={false}>
            <View style={styles.toolHeader}>
              <Text style={styles.toolTitle}>Price Check</Text>
              <AnimatedPressable onPress={() => selectTool(null)} hitSlop={hitSlop}><Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" /></AnimatedPressable>
            </View>
            <Text style={styles.toolLabel}>Search for an item</Text>
            <TextInput style={styles.toolInput} placeholder="e.g. avocado, coffee, pizza..." placeholderTextColor="rgba(255,255,255,0.3)" value={priceCheckQuery} onChangeText={setPriceCheckQuery} autoFocus autoCapitalize="none" />
            {priceCheckQuery.trim().length > 0 && priceCheckResults.length === 0 && (
              <Text style={styles.priceCheckEmpty}>No items found matching "{priceCheckQuery}"</Text>
            )}
            {priceCheckResults.length > 0 && (
              <View style={styles.priceCheckResults}>
                <Text style={styles.priceCheckSummary}>
                  Found {priceCheckResults.length} result{priceCheckResults.length !== 1 ? 's' : ''}{' · '}Avg {formatCurrency(Math.round(priceCheckResults.reduce((s, r) => s + r.priceInCents, 0) / priceCheckResults.length))}
                </Text>
                {priceCheckResults.map((r, i) => (
                  <View key={`${r.date}-${i}`} style={styles.priceCheckRow}>
                    <View style={styles.detailRowLeft}><Text style={styles.detailRowName}>{r.itemName}</Text><Text style={styles.detailRowMeta}>{r.merchant || r.splitName} · {formatDate(r.date)}</Text></View>
                    <Text style={styles.priceCheckPrice}>{formatCurrency(r.priceInCents)}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}

        {/* AI hint */}
        {showAIHint && !toolMode && (
          <View style={styles.aiHint}>
            <Ionicons name="sparkles" size={20} color="rgba(168,85,247,0.6)" />
            <Text style={styles.aiHintText}>Press return to ask Penny</Text>
          </View>
        )}

        {/* Local search results */}
        {showLocalResults && (
          <SectionList
            sections={sections}
            keyExtractor={(item, index) => {
              if (item.type === 'split') return item.split.id;
              if (item.type === 'person') return `person-${item.key}`;
              return `merchant-${item.key}`;
            }}
            renderItem={renderItem}
            renderSectionHeader={({ section }) => (
              <Text style={styles.sectionTitle}>{section.title}</Text>
            )}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        )}

        {noResults && (
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={48} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyTitle}>No results</Text>
            <Text style={styles.emptySubtitle}>Try a different search term or press return to ask Penny</Text>
          </View>
        )}

        {/* Initial state — Penny welcome + suggestions */}
        {!debouncedQuery && !toolMode && (
          <View style={styles.welcomeSection}>
            {/* Penny welcome card */}
            <View style={styles.welcomeCard}>
              <View style={styles.welcomeIconCircle}>
                <Ionicons name="sparkles" size={28} color={T.pennyAccent} />
              </View>
              <Text style={styles.welcomeTitle}>Hey, I'm Penny</Text>
              <Text style={styles.welcomeSubtitle}>
                Your spending memory. I know every receipt, every item, every person you've split with. Ask me anything.
              </Text>
            </View>

            {/* Suggestion chips */}
            <View style={styles.suggestionsGrid}>
              {[
                { text: 'How much did I spend this month?', icon: 'wallet-outline' as const },
                { text: 'What was my biggest split?', icon: 'trending-up-outline' as const },
                { text: 'How much have I spent on food?', icon: 'restaurant-outline' as const },
                { text: 'Who do I split with the most?', icon: 'people-outline' as const },
              ].map((suggestion) => (
                <AnimatedPressable
                  key={suggestion.text}
                  style={({ pressed }) => [styles.suggestionChip, pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }]}
                  onPress={() => {
                    const userMsg: ChatMessage = { role: 'user', content: suggestion.text };
                    setChatHistory([userMsg]);
                    setQuery('');
                    setDebouncedQuery('');
                    Keyboard.dismiss();
                    setAiLoading(true);
                    askReceipts(suggestion.text, activeSplits, [userMsg])
                      .then((answer) => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setChatHistory((prev) => [...prev, { role: 'assistant', content: answer }]);
                      })
                      .catch((e) => setAiError(e instanceof Error ? e.message : 'Something went wrong'))
                      .finally(() => setAiLoading(false));
                  }}
                >
                  <View style={styles.suggestionChipInner}>
                    <Ionicons name={suggestion.icon} size={18} color="rgba(168,85,247,0.7)" />
                    <Text style={styles.suggestionChipText}>{suggestion.text}</Text>
                  </View>
                </AnimatedPressable>
              ))}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView></AuroraBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, padding: 20, paddingTop: 16 },
  inputBarRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  inputBarBottom: { marginBottom: 0, marginTop: 8, paddingBottom: 4 },
  sendButton: { marginLeft: 4 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  chatHeaderCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chatHeaderTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  chatMessages: { flex: 1 },
  chatMessagesContent: { paddingBottom: 8 },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.cardBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: T.cardBorder,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 16, padding: 0 },

  // Quick tools
  toolsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  toolsRow: { gap: 10, paddingBottom: 4 },
  toolChip: {
    backgroundColor: T.chipBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.chipBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toolChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolChipText: { color: '#fff', fontSize: 14, fontWeight: '500' },

  // Tool content
  toolContent: { flex: 1 },
  toolHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  toolTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  toolLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 16 },
  toolInput: {
    backgroundColor: T.inputBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: T.cardBorder,
  },
  tipPercentRow: { flexDirection: 'row', gap: 8 },
  tipPercentChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: T.chipBg,
    borderWidth: 1,
    borderColor: T.chipBorder,
  },
  tipPercentActive: { backgroundColor: '#fff', borderColor: '#fff' },
  tipPercentText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },
  tipPercentTextActive: { color: '#000' },
  toolResult: {
    backgroundColor: T.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.cardBorder,
    padding: 16,
    marginTop: 20,
    gap: 10,
  },
  toolResultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toolResultHighlight: {
    backgroundColor: T.cardBg,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: -4,
  },
  toolResultLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 15 },
  toolResultValue: { color: '#fff', fontSize: 15, fontWeight: '500' },
  toolResultLabelBold: { color: '#fff', fontSize: 17, fontWeight: '600' },
  toolResultValueBold: { color: '#fff', fontSize: 22, fontWeight: '700' },

  // Price check
  priceCheckEmpty: { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 16, textAlign: 'center' },
  priceCheckResults: { marginTop: 16 },
  priceCheckSummary: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 10 },
  priceCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: T.cardBgSubtle,
    borderRadius: 8,
    marginBottom: 4,
  },
  priceCheckPrice: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // AI section
  aiSection: { marginBottom: 16 },
  aiHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.pennyBg,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: T.pennyBorder,
  },
  aiHintText: { color: 'rgba(168,85,247,0.7)', fontSize: 14 },
  aiLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: T.pennyBg,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: T.pennyBorder,
  },
  aiLoadingText: { color: 'rgba(168,85,247,0.7)', fontSize: 14 },
  aiCard: {
    backgroundColor: T.pennyBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: T.pennyBorder,
  },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  aiCardLabel: { color: T.pennyAccent, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  aiAnswerText: { color: '#fff', fontSize: 15, lineHeight: 22 },
  chatUserBubble: {
    alignSelf: 'flex-end',
    backgroundColor: T.cardBorder,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    maxWidth: '85%',
  },
  chatUserText: { color: '#fff', fontSize: 15, lineHeight: 22 },
  chatAiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: T.pennyBg,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: T.pennyBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    maxWidth: '90%',
  },
  aiErrorText: { color: '#fca5a5', fontSize: 14, marginBottom: 8 },
  aiRetry: { alignSelf: 'flex-start' },
  aiRetryText: { color: T.pennyAccent, fontSize: 14, fontWeight: '600' },

  // Welcome card
  welcomeSection: { flex: 1 },
  welcomeCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  welcomeIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: T.pennyBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  suggestionsGrid: {
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: T.pennyBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.pennyBorder,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  suggestionChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  suggestionChipText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    flex: 1,
  },

  // Follow-up chips
  followUpRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  followUpChip: {
    backgroundColor: T.pennyBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.pennyBorder,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  followUpText: {
    color: T.pennyAccent,
    fontSize: 13,
    fontWeight: '500',
  },

  // Section list
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  listContent: { paddingBottom: 40, gap: 6 },
  card: {
    backgroundColor: T.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.cardBorder,
    padding: 16,
  },
  cardExpanded: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: T.cardBg,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  cardLeft: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 2 },
  muted: { color: 'rgba(255,255,255,0.55)', fontSize: 13 },
  detailContainer: {
    backgroundColor: T.cardBgSubtle,
    borderWidth: 1, borderTopWidth: 0,
    borderColor: T.cardBorder,
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
    paddingHorizontal: 14, paddingBottom: 10,
  },
  detailStats: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.borderSubtle, marginBottom: 6 },
  detailStatText: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8 },
  detailRowLeft: { flex: 1 },
  detailRowName: { color: '#fff', fontSize: 14, fontWeight: '500' },
  detailRowMeta: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 1 },
  detailRowAmount: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginTop: 16, marginBottom: 6 },
  emptySubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center' },
});
