// Supabase Edge Function: parse-receipt
// Input: { storage_path: string } OR { image_base64: string }
// Output: { merchant_name?, subtotal, tax, tip, total (cents), items: [{ label, quantity, unit_price, total_price, tag? }] }
// OCR provider: swap runOcr() implementation (see OCR_PROVIDER note below).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export interface ParsedItem {
  label: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tag?: 'alcohol' | 'appetizer' | 'shared' | 'other';
}

export interface ParseReceiptResponse {
  merchant_name?: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  items: ParsedItem[];
}

function normalizeLabel(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SHARED_KEYWORDS = [
  'appetizer', 'appetizers', 'fries', 'nachos', 'dessert', 'tiramisu', 'chips', 'bread',
  'salad', 'sides', 'shared', 'split', 'sampler', 'platter', 'combo',
];
const ALCOHOL_KEYWORDS = [
  'beer', 'ipa', 'wine', 'vodka', 'whiskey', 'whisky', 'cocktail', 'margarita',
  'sake', 'cider', 'lager', 'ale', 'bourbon', 'rum', 'tequila', 'champagne',
];

function tagItem(normalized: string): ParsedItem['tag'] {
  const lower = normalized.toLowerCase();
  if (ALCOHOL_KEYWORDS.some((k) => lower.includes(k))) return 'alcohol';
  if (SHARED_KEYWORDS.some((k) => lower.includes(k))) return 'appetizer';
  return 'other';
}

function normalizeAndTagItems(items: ParsedItem[]): ParsedItem[] {
  return items.map((it) => {
    const label = it.label.trim() || 'Unnamed item';
    const norm = normalizeLabel(label);
    const tag = tagItem(norm);
    return { ...it, label, tag };
  });
}

// --- OCR provider: replace this with real OCR (e.g. Google Vision, Tesseract, AWS Textract).
// Keep the same return shape: { merchant_name?, subtotal, tax, tip, total, rawItems: ParsedItem[] }.
async function runOcr(imageBytes: Uint8Array): Promise<Omit<ParseReceiptResponse, 'items'> & { rawItems: ParsedItem[] }> {
  // Stub: return mock data for development. In production, call your OCR API here.
  const stubItems: ParsedItem[] = [
    { label: 'Pizza Margherita', quantity: 1, unit_price: 1400, total_price: 1400 },
    { label: 'IPA Beer', quantity: 2, unit_price: 700, total_price: 1400 },
    { label: 'House Fries', quantity: 1, unit_price: 500, total_price: 500 },
  ];
  const subtotal = stubItems.reduce((s, i) => s + i.total_price, 0);
  const tax = Math.round(subtotal * 0.08);
  const tip = Math.round((subtotal + tax) * 0.15);
  return {
    merchant_name: 'Sample Restaurant',
    subtotal,
    tax,
    tip,
    total: subtotal + tax + tip,
    rawItems: stubItems,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const storagePath = body?.storage_path as string | undefined;
    const imageBase64 = body?.image_base64 as string | undefined;

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let ownerId: string | null = null;
    if (storagePath && typeof storagePath === 'string') {
      const firstSegment = storagePath.split('/')[0];
      if (firstSegment) ownerId = firstSegment;
    }
    if (ownerId) {
      if (!anonKey) {
        return new Response(
          JSON.stringify({ error: 'Server configuration error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const authClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userError } = await authClient.auth.getUser();
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (user.id !== ownerId) {
        return new Response(
          JSON.stringify({ error: 'Not allowed to access this receipt' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let imageBytes: Uint8Array;
    if (storagePath && typeof storagePath === 'string') {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const { data, error } = await supabase.storage.from('receipts').download(storagePath);
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: error?.message || 'Failed to download image from storage' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      imageBytes = new Uint8Array(await data.arrayBuffer());
    } else if (imageBase64 && typeof imageBase64 === 'string') {
      const binary = atob(imageBase64.replace(/^data:image\/\w+;base64,/, ''));
      imageBytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) imageBytes[i] = binary.charCodeAt(i);
    } else {
      return new Response(
        JSON.stringify({ error: 'Provide storage_path or image_base64' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ocrResult = await runOcr(imageBytes);
    const items = normalizeAndTagItems(ocrResult.rawItems);

    const response: ParseReceiptResponse = {
      merchant_name: ocrResult.merchant_name,
      subtotal: ocrResult.subtotal,
      tax: ocrResult.tax,
      tip: ocrResult.tip,
      total: ocrResult.total,
      items,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Parse failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
