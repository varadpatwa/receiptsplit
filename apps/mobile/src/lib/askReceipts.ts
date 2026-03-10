import { supabase } from './supabase';
import type { Split } from '@receiptsplit/shared';
import { getReceiptTotal } from '@receiptsplit/shared';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SplitSummary {
  name: string;
  merchantName?: string;
  category?: string;
  totalCents: number;
  participants: string[];
  items: { name: string; priceInCents: number; quantity: number }[];
  taxInCents: number;
  tipInCents: number;
  date: string;
}

function serializeSplits(splits: Split[]): SplitSummary[] {
  return splits.map((s) => ({
    name: s.name,
    merchantName: s.merchantName,
    category: s.category,
    totalCents: getReceiptTotal(s),
    participants: s.participants.map((p) => p.name),
    items: s.items.map((i) => ({
      name: i.name,
      priceInCents: i.priceInCents,
      quantity: i.quantity,
    })),
    taxInCents: s.taxInCents,
    tipInCents: s.tipInCents,
    date: new Date(s.updatedAt).toISOString().split('T')[0],
  }));
}

export async function askReceipts(
  question: string,
  splits: Split[],
  history: ChatMessage[] = [],
): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ answer: string }>('ask-receipts', {
    body: { question, splits: serializeSplits(splits), history },
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('non-2xx') || msg.includes('FunctionsHttpError')) {
      throw new Error('AI service is not available right now. Deploy the ask-receipts edge function first.');
    }
    if (msg.includes('FunctionsRelayError') || msg.includes('network')) {
      throw new Error('Couldn\'t reach the server. Check your connection.');
    }
    throw new Error(msg || 'Something went wrong');
  }

  if (!data?.answer) {
    throw new Error('No answer received');
  }

  return data.answer;
}
