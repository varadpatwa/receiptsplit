/**
 * Upload receipt image to Storage and call parse-receipt Edge Function.
 * Returns parsed receipt data for populating split items.
 *
 * Pipeline: preprocess image -> upload -> call edge function (with retries) -> validate
 */

import { supabase } from './supabase';
import { preprocessReceiptImage } from './imagePreprocess';

export interface ParsedReceiptItem {
  label: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tag?: 'alcohol' | 'appetizer' | 'shared' | 'other';
  confidence?: number;
}

export interface TotalsMismatchWarning {
  itemSum: number;
  reportedSubtotal: number;
  differencePercent: number;
}

export interface ParsedReceipt {
  merchant_name?: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  items: ParsedReceiptItem[];
  requestId?: string;
  totalsMismatch?: TotalsMismatchWarning;
}

const BUCKET = 'receipts';
const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 3000]; // ms backoff
/** If item sum vs reported subtotal differ by more than this %, flag it */
const MISMATCH_THRESHOLD_PERCENT = 10;

/**
 * Upload file to receipts/{userId}/{timestamp}.jpg and return storage path.
 * Image is preprocessed (resized, compressed to JPEG) before upload.
 */
export async function uploadReceiptImage(uri: string, userId: string): Promise<string> {
  const preprocessed = await preprocessReceiptImage(uri);

  const timestamp = Date.now();
  const path = `${userId}/${timestamp}.jpg`;

  const formData = new FormData();
  formData.append('file', {
    uri: preprocessed.uri,
    name: `${timestamp}.jpg`,
    type: 'image/jpeg',
  } as unknown as Blob);

  const { error } = await supabase.storage.from(BUCKET).upload(path, formData, {
    contentType: 'multipart/form-data',
    upsert: false,
  });

  if (error) throw new Error(error.message);
  return path;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('timeout') ||
      msg.includes('network') ||
      msg.includes('fetch') ||
      msg.includes('429') ||
      msg.includes('500') ||
      msg.includes('502') ||
      msg.includes('503') ||
      msg.includes('504')
    );
  }
  return false;
}

/**
 * Call parse-receipt Edge Function with retry + backoff.
 */
async function invokeParseWithRetry(storagePath: string): Promise<ParsedReceipt> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAYS[attempt - 1] ?? 3000);
    }

    try {
      const { data, error } = await supabase.functions.invoke<ParsedReceipt>('parse-receipt', {
        body: { storage_path: storagePath },
      });

      if (error) {
        let detail = error.message;
        if (typeof (error as { context?: { json?: () => Promise<{ error?: string }> } }).context?.json === 'function') {
          try {
            const body = await (error as { context: { json: () => Promise<{ error?: string }> } }).context.json();
            if (body?.error) detail = body.error;
          } catch {
            /* ignore */
          }
        }
        if (detail === 'Edge Function returned a non-2xx status code.') {
          detail = 'Receipt parser not available. Deploy the parse-receipt Edge Function (see docs).';
        }
        throw new Error(detail);
      }
      if (!data || !Array.isArray(data.items)) throw new Error('Invalid parse response');

      return data;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error('Parse failed');
      if (attempt < MAX_RETRIES && isRetryable(e)) {
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error('Parse failed');
}

/**
 * Check if item prices sum matches reported subtotal.
 */
function checkTotalsMismatch(items: ParsedReceiptItem[], reportedSubtotal: number): TotalsMismatchWarning | undefined {
  const itemSum = items.reduce((sum, it) => sum + it.total_price, 0);
  if (itemSum === 0 && reportedSubtotal === 0) return undefined;
  const reference = Math.max(itemSum, reportedSubtotal, 1);
  const diff = Math.abs(itemSum - reportedSubtotal);
  const diffPercent = (diff / reference) * 100;
  if (diffPercent > MISMATCH_THRESHOLD_PERCENT) {
    return { itemSum, reportedSubtotal, differencePercent: Math.round(diffPercent) };
  }
  return undefined;
}

/**
 * Call parse-receipt Edge Function with storage_path, retries, and guardrails.
 */
export async function parseReceiptByPath(storagePath: string): Promise<ParsedReceipt> {
  const raw = await invokeParseWithRetry(storagePath);

  const items: ParsedReceiptItem[] = raw.items.map((it) => ({
    label: String(it.label ?? '').trim() || 'Unnamed item',
    quantity: Math.max(1, Number(it.quantity) || 1),
    unit_price: Math.round(Number(it.unit_price) || 0),
    total_price: Math.round(Number(it.total_price) || 0),
    tag: it.tag,
    confidence: typeof it.confidence === 'number' ? it.confidence : undefined,
  }));

  const subtotal = Number(raw.subtotal) || 0;
  const tax = Number(raw.tax) || 0;
  const tip = Number(raw.tip) || 0;
  const total = Number(raw.total) || 0;

  const totalsMismatch = checkTotalsMismatch(items, subtotal);

  return {
    merchant_name: raw.merchant_name,
    subtotal,
    tax,
    tip,
    total,
    items,
    requestId: raw.requestId,
    totalsMismatch,
  };
}

/**
 * Upload image and parse in one call. Use from Receipt step after picking image.
 */
export async function uploadAndParseReceipt(imageUri: string, userId: string): Promise<ParsedReceipt> {
  const path = await uploadReceiptImage(imageUri, userId);
  return parseReceiptByPath(path);
}
