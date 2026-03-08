/**
 * Rule-based assignment suggestions and local frequency learning.
 *
 * Suggestion pipeline:
 * 1. Suggestions are generated when AssignScreen mounts (after items + participants are set).
 * 2. Signals used: keyword matching (shared/alcohol) + per-user frequency history from AsyncStorage.
 * 3. Frequency is stored per-user (keyed by auth.uid()) and updated when user proceeds from Assign -> Summary.
 *
 * Confidence rules:
 * - 0.8: shared keyword match -> split evenly across all participants
 * - 0.7: alcohol keyword + frequency history match -> assign to most frequent person
 * - 0.65: generic frequency match (only if count >= 2 to avoid noise)
 * - 0.0: no match -> unassigned (user must manually assign)
 *
 * Threshold: only suggestions with confidence >= CONFIDENCE_THRESHOLD (0.6) are surfaced in the UI.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Split, Item, ItemAssignment } from '@receiptsplit/shared';

/** Minimum confidence to surface a suggestion in the UI. */
export const CONFIDENCE_THRESHOLD = 0.6;

/** Minimum frequency count before we trust a generic frequency-based suggestion. */
const MIN_FREQUENCY_COUNT = 2;

const FREQUENCY_KEY_PREFIX = '@receiptsplit/assignment_frequency/';

function frequencyKey(userId: string): string {
  return `${FREQUENCY_KEY_PREFIX}${userId}`;
}

const SHARED_KEYWORDS = [
  'appetizer', 'appetizers', 'fries', 'nachos', 'dessert', 'tiramisu', 'chips', 'bread',
  'salad', 'sides', 'shared', 'split', 'sampler', 'platter', 'combo',
];
const ALCOHOL_KEYWORDS = [
  'beer', 'ipa', 'wine', 'vodka', 'whiskey', 'whisky', 'cocktail', 'margarita',
  'sake', 'cider', 'lager', 'ale', 'bourbon', 'rum', 'tequila', 'champagne',
];

function normalizeItemLabel(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSharedItem(norm: string): boolean {
  return SHARED_KEYWORDS.some((k) => norm.includes(k));
}

function isAlcoholItem(norm: string): boolean {
  return ALCOHOL_KEYWORDS.some((k) => norm.includes(k));
}

export type AssignmentSuggestion = {
  assignments: ItemAssignment[];
  confidence: number;
};

export type SuggestionPrefs = {
  /** For shared items: split across this many people (default all participants) */
  sharedSplitCount?: number;
};

/**
 * Get stored frequency counts for a specific user.
 * Shape: { [itemNorm]: { [participantId]: count } }
 */
export async function getAssignmentFrequency(userId: string): Promise<Record<string, Record<string, number>>> {
  try {
    const raw = await AsyncStorage.getItem(frequencyKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Persist frequency counts for a specific user.
 * Called when user proceeds from Assign -> Summary screen.
 * Only counts non-"me" participants to avoid biasing toward self.
 */
export async function updateAssignmentFrequency(
  userId: string,
  items: Item[],
  participants: { id: string; name: string }[]
): Promise<void> {
  const freq = await getAssignmentFrequency(userId);
  const participantIds = new Set(participants.map((p) => p.id));

  items.forEach((item) => {
    if (item.assignments.length === 0) return;
    const norm = normalizeItemLabel(item.name || '');
    if (!norm) return;
    if (!freq[norm]) freq[norm] = {};
    item.assignments.forEach((a) => {
      if (!participantIds.has(a.participantId)) return;
      // Skip "me" — we don't want to learn "assign everything to me"
      if (a.participantId === 'me') return;
      const count = (freq[norm][a.participantId] ?? 0) + Math.max(1, a.shares);
      freq[norm][a.participantId] = count;
    });
  });

  await AsyncStorage.setItem(frequencyKey(userId), JSON.stringify(freq));
}

/**
 * Clear frequency data for a user (e.g. on logout).
 */
export async function clearAssignmentFrequency(userId: string): Promise<void> {
  await AsyncStorage.removeItem(frequencyKey(userId));
}

/**
 * Migrate old global frequency key to per-user key (one-time migration).
 */
export async function migrateFrequencyIfNeeded(userId: string): Promise<void> {
  const OLD_KEY = '@receiptsplit/assignment_frequency';
  try {
    const oldData = await AsyncStorage.getItem(OLD_KEY);
    if (oldData) {
      // Only migrate if user doesn't already have data
      const existing = await AsyncStorage.getItem(frequencyKey(userId));
      if (!existing) {
        await AsyncStorage.setItem(frequencyKey(userId), oldData);
      }
      await AsyncStorage.removeItem(OLD_KEY);
    }
  } catch {
    // Ignore migration errors
  }
}

/**
 * Suggest assignments per item. Returns a map itemId -> suggestion.
 *
 * Rules:
 * - Shared keyword -> split evenly across all participants (confidence 0.8)
 * - Alcohol keyword + frequency history -> assign to most frequent non-"me" person (confidence 0.7)
 * - Alcohol keyword, no history -> unassigned (confidence 0)
 * - Generic item + strong frequency match (count >= MIN_FREQUENCY_COUNT) -> suggest (confidence 0.65)
 * - No match -> unassigned (confidence 0)
 *
 * Note: "me" participant is excluded from frequency lookups to prevent self-assignment bias.
 */
export function suggestAssignments(
  split: Split,
  frequency: Record<string, Record<string, number>>,
  prefs: SuggestionPrefs = {}
): Map<string, AssignmentSuggestion> {
  const result = new Map<string, AssignmentSuggestion>();
  const participants = split.participants;
  const sharedCount = prefs.sharedSplitCount ?? participants.length;

  split.items.forEach((item) => {
    const norm = normalizeItemLabel(item.name || '');

    // Rule 1: Shared items -> split evenly across all participants
    if (isSharedItem(norm)) {
      const take = Math.max(1, Math.min(sharedCount, participants.length));
      const assignees = participants.slice(0, take);
      result.set(item.id, {
        assignments: assignees.map((p) => ({ participantId: p.id, shares: 1 })),
        confidence: 0.8,
      });
      return;
    }

    // Rule 2: Alcohol -> assign to most frequent non-"me" participant (if history exists)
    if (isAlcoholItem(norm)) {
      const best = findBestFrequencyMatch(frequency, norm, participants);
      if (best) {
        result.set(item.id, {
          assignments: [{ participantId: best.id, shares: 1 }],
          confidence: 0.7,
        });
        return;
      }
      // No history for alcohol -> unassigned
      result.set(item.id, { assignments: [], confidence: 0 });
      return;
    }

    // Rule 3: Generic item -> frequency-based suggestion only if strong enough
    const best = findBestFrequencyMatch(frequency, norm, participants);
    if (best && best.count >= MIN_FREQUENCY_COUNT) {
      result.set(item.id, {
        assignments: [{ participantId: best.id, shares: 1 }],
        confidence: 0.65,
      });
      return;
    }

    // No match -> unassigned
    result.set(item.id, { assignments: [], confidence: 0 });
  });

  return result;
}

/**
 * Find the participant with the highest frequency for a given item norm.
 * Excludes "me" to avoid self-assignment bias.
 */
function findBestFrequencyMatch(
  frequency: Record<string, Record<string, number>>,
  norm: string,
  participants: { id: string; name: string }[]
): { id: string; count: number } | null {
  const byParticipant = frequency[norm];
  if (!byParticipant || Object.keys(byParticipant).length === 0) return null;

  const sorted = Object.entries(byParticipant)
    .filter(([id]) => id !== 'me' && participants.some((p) => p.id === id))
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) return null;
  return { id: sorted[0][0], count: sorted[0][1] };
}
