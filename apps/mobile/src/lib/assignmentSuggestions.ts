/**
 * Rule-based assignment suggestions and local frequency learning.
 * Phase 1.5: shared keywords -> split evenly; alcohol -> by frequency; else by frequency or unassigned.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Split, Item, ItemAssignment } from '@receiptsplit/shared';

const FREQUENCY_KEY = '@receiptsplit/assignment_frequency';

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
  /** For shared items: split across this many people (default all participants, or 2) */
  sharedSplitCount?: number;
};

/**
 * Get stored frequency counts: { [itemNorm]: { [participantId]: count } }
 */
export async function getAssignmentFrequency(): Promise<Record<string, Record<string, number>>> {
  try {
    const raw = await AsyncStorage.getItem(FREQUENCY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Persist frequency counts. Call after user confirms assignments (e.g. on Assign -> Summary).
 */
export async function updateAssignmentFrequency(
  items: Item[],
  participants: { id: string; name: string }[]
): Promise<void> {
  const freq = await getAssignmentFrequency();
  const participantIds = new Set(participants.map((p) => p.id));

  items.forEach((item) => {
    if (item.assignments.length === 0) return;
    const norm = normalizeItemLabel(item.name || '');
    if (!norm) return;
    if (!freq[norm]) freq[norm] = {};
    item.assignments.forEach((a) => {
      if (!participantIds.has(a.participantId)) return;
      const count = (freq[norm][a.participantId] ?? 0) + Math.max(1, a.shares);
      freq[norm][a.participantId] = count;
    });
  });

  await AsyncStorage.setItem(FREQUENCY_KEY, JSON.stringify(freq));
}

/**
 * Suggest assignments per item. Returns a map itemId -> suggestion.
 * - Shared keyword -> split evenly across all (or prefs.sharedSplitCount).
 * - Alcohol -> assign to participant with highest frequency for this item norm.
 * - Else -> highest frequency or unassigned (confidence 0).
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

    if (isSharedItem(norm)) {
      const take = Math.max(1, Math.min(sharedCount, participants.length));
      const assignees = participants.slice(0, take);
      result.set(item.id, {
        assignments: assignees.map((p) => ({ participantId: p.id, shares: 1 })),
        confidence: 0.8,
      });
      return;
    }

    if (isAlcoholItem(norm)) {
      const byParticipant = frequency[norm];
      if (byParticipant && Object.keys(byParticipant).length > 0) {
        const sorted = Object.entries(byParticipant)
          .filter(([id]) => participants.some((p) => p.id === id))
          .sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) {
          result.set(item.id, {
            assignments: [{ participantId: sorted[0][0], shares: 1 }],
            confidence: 0.7,
          });
          return;
        }
      }
    }

    const byParticipant = frequency[norm];
    if (byParticipant && Object.keys(byParticipant).length > 0) {
      const sorted = Object.entries(byParticipant)
        .filter(([id]) => participants.some((p) => p.id === id))
        .sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) {
        result.set(item.id, {
          assignments: [{ participantId: sorted[0][0], shares: 1 }],
          confidence: 0.5,
        });
        return;
      }
    }

    result.set(item.id, { assignments: [], confidence: 0 });
  });

  return result;
}
