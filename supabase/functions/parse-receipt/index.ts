// Supabase Edge Function: parse-receipt
// Input: { storage_path: string } OR { image_base64: string }
// Output: ParseReceiptResponse with items, totals, confidence, requestId, and optional warnings.

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
  confidence?: number;
}

export interface TotalsMismatchWarning {
  itemSum: number;
  reportedSubtotal: number;
  differencePercent: number;
}

export interface ParseReceiptResponse {
  merchant_name?: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  items: ParsedItem[];
  requestId: string;
  totalsMismatch?: TotalsMismatchWarning;
  rawOcrText?: string;
}

// --- Helpers ---

function generateRequestId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `rcpt_${ts}_${rand}`;
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

function safeInt(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.round(n);
  }
  return fallback;
}

function safeFloat(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

const MISMATCH_THRESHOLD_PERCENT = 10;

function checkTotalsMismatch(items: ParsedItem[], reportedSubtotal: number): TotalsMismatchWarning | undefined {
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

// --- Base64 encoding ---

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

// --- Stub OCR ---

type OcrResult = Omit<ParseReceiptResponse, 'items' | 'requestId' | 'totalsMismatch'> & { rawItems: ParsedItem[] };

async function runOcrStub(): Promise<OcrResult> {
  const stubItems: ParsedItem[] = [
    { label: 'Pizza Margherita', quantity: 1, unit_price: 1400, total_price: 1400, confidence: 0.95 },
    { label: 'IPA Beer', quantity: 2, unit_price: 700, total_price: 1400, confidence: 0.90 },
    { label: 'House Fries', quantity: 1, unit_price: 500, total_price: 500, confidence: 0.92 },
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

// --- GPT-4o Vision OCR ---

const RECEIPT_PARSE_PROMPT = `You are a precise receipt parser. Analyze this receipt image and extract structured data.

Return a JSON object with these fields:
- "merchant_name": string (restaurant/store name, or null if unreadable)
- "subtotal": number (subtotal in cents, e.g. $14.00 = 1400)
- "tax": number (tax amount in cents)
- "tip": number (tip amount in cents, 0 if not shown)
- "total": number (total in cents)
- "items": array of objects, each with:
  - "label": string (item name exactly as printed on receipt)
  - "quantity": number (default 1 if not explicitly shown)
  - "unit_price": number (price per unit in cents)
  - "total_price": number (quantity * unit_price in cents)
  - "confidence": number between 0 and 1 (how confident you are in this line item parse, 1.0 = certain)

Rules:
- All monetary values MUST be in cents (multiply dollars by 100).
- If quantity is not specified, assume 1.
- Multi-line item names: combine the name parts into one label string.
- Handle "2 x $7.00" or "2 @ 7.00" or "QTY: 2" formats for quantity.
- Include all line items, even modifiers or add-ons if they have a separate price.
- Do NOT include tax, tip, subtotal, discount, or total as line items.
- If a line item is partially illegible, provide your best guess and set confidence lower.
- For totals: look for labels like "TOTAL", "SUBTOTAL", "SUB-TOTAL", "TAX", "TIP", "GRATUITY".
- If you see a discount, skip it (don't include as an item).`;

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
            { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 3000,
      temperature: 0.1,
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
    ? parsed.items.map((item: Record<string, unknown>) => {
        const qty = safeInt(item.quantity, 1);
        const unitPrice = safeInt(item.unit_price);
        const totalPrice = safeInt(item.total_price);

        // Fix: if total_price is 0 but unit_price and quantity are set, compute it
        const fixedTotal = totalPrice > 0 ? totalPrice : unitPrice * Math.max(1, qty);
        // Fix: if unit_price is 0 but total_price and quantity are set, compute it
        const fixedUnit = unitPrice > 0 ? unitPrice : (qty > 0 ? Math.round(fixedTotal / qty) : fixedTotal);

        return {
          label: String(item.label ?? 'Unnamed item'),
          quantity: Math.max(1, qty),
          unit_price: fixedUnit,
          total_price: fixedTotal,
          confidence: safeFloat(item.confidence, 0.8),
        };
      })
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
    rawOcrText: content,
  };
}

// --- Main OCR dispatcher ---

async function runOcr(imageDataUri: string | null): Promise<OcrResult> {
  const apiKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('CHATGPT_API_KEY');
  if (!apiKey || !imageDataUri) {
    return runOcrStub();
  }
  return runOcrVision(imageDataUri, apiKey);
}

// --- Request handler ---

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

  const requestId = generateRequestId();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header', requestId }),
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
        JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY', requestId }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auth verification
    let ownerId: string | null = null;
    if (storagePath && typeof storagePath === 'string') {
      const firstSegment = storagePath.split('/')[0];
      if (firstSegment) ownerId = firstSegment;
    }
    if (ownerId) {
      if (!anonKey) {
        return new Response(
          JSON.stringify({ error: 'Server configuration error', requestId }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const authClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userError } = await authClient.auth.getUser();
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token', requestId }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (user.id !== ownerId) {
        return new Response(
          JSON.stringify({ error: 'Not allowed to access this receipt', requestId }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Resolve image
    let imageDataUri: string | null = null;
    if (storagePath && typeof storagePath === 'string') {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const { data, error } = await supabase.storage.from('receipts').download(storagePath);
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: error?.message || 'Failed to download image from storage', requestId }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const imageBytes = new Uint8Array(await data.arrayBuffer());
      if (imageBytes.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Uploaded image is empty (0 bytes). Please re-upload.', requestId }),
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
        JSON.stringify({ error: 'Provide storage_path or image_base64', requestId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Run OCR
    console.log(`[parse-receipt] ${requestId} starting OCR`);
    const ocrResult = await runOcr(imageDataUri);
    const items = normalizeAndTagItems(ocrResult.rawItems);

    // Guardrails: check sum
    const totalsMismatch = checkTotalsMismatch(items, ocrResult.subtotal);
    if (totalsMismatch) {
      console.log(`[parse-receipt] ${requestId} totals mismatch: items=${totalsMismatch.itemSum} subtotal=${totalsMismatch.reportedSubtotal} diff=${totalsMismatch.differencePercent}%`);
    }

    console.log(`[parse-receipt] ${requestId} done: ${items.length} items, subtotal=${ocrResult.subtotal}, total=${ocrResult.total}`);

    const response: ParseReceiptResponse = {
      merchant_name: ocrResult.merchant_name,
      subtotal: ocrResult.subtotal,
      tax: ocrResult.tax,
      tip: ocrResult.tip,
      total: ocrResult.total,
      items,
      requestId,
      totalsMismatch,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Parse failed';
    console.error(`[parse-receipt] ${requestId} error: ${message}`);
    return new Response(
      JSON.stringify({ error: message, requestId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
