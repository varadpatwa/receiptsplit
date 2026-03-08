/**
 * Upload receipt image to Storage and call parse-receipt Edge Function.
 * Returns parsed receipt data for populating split items.
 */

import { supabase } from './supabase';

export interface ParsedReceiptItem {
  label: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tag?: 'alcohol' | 'appetizer' | 'shared' | 'other';
}

export interface ParsedReceipt {
  merchant_name?: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  items: ParsedReceiptItem[];
}

const BUCKET = 'receipts';

/**
 * Upload file to receipts/{userId}/{timestamp}.jpg and return storage path.
 */
export async function uploadReceiptImage(uri: string, userId: string): Promise<string> {
  const timestamp = Date.now();
  const path = `${userId}/${timestamp}.jpg`;

  const response = await fetch(uri);
  const blob = await response.blob();

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  });

  if (error) throw new Error(error.message);
  return path;
}

/**
 * Call parse-receipt Edge Function with storage_path.
 * Returns parsed receipt or throws.
 */
export async function parseReceiptByPath(storagePath: string): Promise<ParsedReceipt> {
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

  return {
    merchant_name: data.merchant_name,
    subtotal: Number(data.subtotal) || 0,
    tax: Number(data.tax) || 0,
    tip: Number(data.tip) || 0,
    total: Number(data.total) || 0,
    items: data.items.map((it) => ({
      label: String(it.label ?? '').trim() || 'Unnamed item',
      quantity: Math.max(1, Number(it.quantity) || 1),
      unit_price: Math.round(Number(it.unit_price) || 0),
      total_price: Math.round(Number(it.total_price) || 0),
      tag: it.tag,
    })),
  };
}

/**
 * Upload image and parse in one call. Use from Receipt step after picking image.
 */
export async function uploadAndParseReceipt(imageUri: string, userId: string): Promise<ParsedReceipt> {
  const path = await uploadReceiptImage(imageUri, userId);
  return parseReceiptByPath(path);
}
