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

type OcrResult = Omit<ParseReceiptResponse, 'items'> & { rawItems: ParsedItem[] };

// --- Stub OCR: returns mock data when no OPENAI_API_KEY is configured.
async function runOcrStub(): Promise<OcrResult> {
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

const RECEIPT_PARSE_PROMPT = `You are a receipt parser. Analyze this receipt image and extract structured data.

Return a JSON object with these fields:
- "merchant_name": string (restaurant/store name)
- "subtotal": number (subtotal in cents, e.g. $14.00 = 1400)
- "tax": number (tax amount in cents)
- "tip": number (tip amount in cents, 0 if not shown)
- "total": number (total in cents)
- "items": array of objects, each with:
  - "label": string (item name as shown on receipt)
  - "quantity": number (default 1 if not shown)
  - "unit_price": number (price per unit in cents)
  - "total_price": number (quantity * unit_price in cents)

Important:
- All monetary values must be in cents (multiply dollars by 100).
- If quantity is not specified, assume 1.
- Include all line items, even modifiers or add-ons if they have a separate price.
- Do NOT include tax, tip, subtotal, or total as line items.
- If you cannot read certain parts, make your best guess from context.`;

function safeInt(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.round(n);
  }
  return fallback;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function uint8ToBase64(bytes: Uint8Array): string {
  const len = bytes.length;
  const parts: string[] = [];
  for (let i = 0; i < len; i += 3) {
    const a = bytes[i];
    const b = i + 1 < len ? bytes[i + 1] : 0;
    const c = i + 2 < len ? bytes[i + 2] : 0;
    parts.push(
      B64[a >> 2],
      B64[((a & 3) << 4) | (b >> 4)],
      i + 1 < len ? B64[((b & 15) << 2) | (c >> 6)] : '=',
      i + 2 < len ? B64[c & 63] : '=',
    );
  }
  return parts.join('');
}

// --- GPT-4o Vision OCR: sends image as base64 data URI to OpenAI for parsing.
async function runOcrVision(imageUrl: string, apiKey: string): Promise<OcrResult> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: RECEIPT_PARSE_PROMPT },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errBody}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  const parsed = JSON.parse(content);

  const rawItems: ParsedItem[] = Array.isArray(parsed.items)
    ? parsed.items.map((item: Record<string, unknown>) => ({
        label: String(item.label ?? 'Unnamed item'),
        quantity: safeInt(item.quantity, 1),
        unit_price: safeInt(item.unit_price),
        total_price: safeInt(item.total_price),
      }))
    : [];

  const subtotal = safeInt(parsed.subtotal) || rawItems.reduce((s, i) => s + i.total_price, 0);
  const tax = safeInt(parsed.tax);
  const tip = safeInt(parsed.tip);
  const total = safeInt(parsed.total) || (subtotal + tax + tip);

  return {
    merchant_name: parsed.merchant_name ? String(parsed.merchant_name) : undefined,
    subtotal,
    tax,
    tip,
    total,
    rawItems,
  };
}

// --- Main OCR dispatcher: uses GPT-4o Vision if OPENAI_API_KEY is set, otherwise falls back to stub.
async function runOcr(imageDataUri: string | null): Promise<OcrResult> {
  const apiKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('CHATGPT_API_KEY');
  if (!apiKey || !imageDataUri) {
    return runOcrStub();
  }
  return runOcrVision(imageDataUri, apiKey);
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

    let imageDataUri: string | null = null;
    if (storagePath && typeof storagePath === 'string') {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const { data, error } = await supabase.storage.from('receipts').download(storagePath);
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: error?.message || 'Failed to download image from storage' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const imageBytes = new Uint8Array(await data.arrayBuffer());
      if (imageBytes.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Uploaded image is empty (0 bytes). Please re-upload.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const b64 = uint8ToBase64(imageBytes);
      imageDataUri = `data:image/jpeg;base64,${b64}`;
    } else if (imageBase64 && typeof imageBase64 === 'string') {
      const cleaned = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      imageDataUri = `data:image/jpeg;base64,${cleaned}`;
    } else {
      return new Response(
        JSON.stringify({ error: 'Provide storage_path or image_base64' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ocrResult = await runOcr(imageDataUri);
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
