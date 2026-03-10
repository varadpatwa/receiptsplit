const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AskRequest {
  question: string;
  history?: ChatMessage[];
  splits: SplitSummary[];
}

interface AskResponse {
  answer: string;
}

function buildSystemPrompt(splits: SplitSummary[]): string {
  const totalSpent = splits.reduce((s, sp) => s + sp.totalCents, 0);
  const splitCount = splits.length;

  let dataBlock = `The user has ${splitCount} receipt splits totaling $${(totalSpent / 100).toFixed(2)}.\n\n`;

  for (const sp of splits) {
    const total = `$${(sp.totalCents / 100).toFixed(2)}`;
    const date = sp.date;
    const merchant = sp.merchantName || 'Unknown';
    const cat = sp.category || 'Uncategorized';
    const people = sp.participants.join(', ');
    const items = sp.items.map((i) => `${i.name} x${i.quantity} $${(i.priceInCents / 100).toFixed(2)}`).join('; ');

    dataBlock += `- "${sp.name}" | ${merchant} | ${cat} | ${total} | ${date} | People: ${people} | Items: ${items} | Tax: $${(sp.taxInCents / 100).toFixed(2)} Tip: $${(sp.tipInCents / 100).toFixed(2)}\n`;
  }

  return `You are Penny — the friendly AI assistant inside ReceiptSplit, an app that lets friend groups scan receipts, split bills item-by-item, and track their spending together. Users photograph receipts, the app OCR-parses them into line items, then people assign who had what so everyone pays their fair share.

You live inside the app's search screen. Users come here to quickly understand their spending without digging through receipts manually. You're their personal spending memory — you know every receipt, every item, every person they've split with. Your name is Penny because you keep track of every penny.

Here is all of the user's receipt data:

${dataBlock}

How to respond:
- Be concise. This is a mobile screen — 1-3 sentences max unless they ask for a breakdown.
- Format money as $X.XX always.
- When they ask "how much did I spend" — give the total, then a quick breakdown if categories exist.
- When they ask about a person — tell them how many splits they've done together and the totals.
- When they ask about an item — find it across receipts, show where they bought it and for how much.
- You can do math: totals, averages, comparisons, trends, per-person breakdowns.
- If they ask something not in the data, say so — don't guess or make things up.
- Sound natural and friendly, like a smart friend who remembers everything, not a corporate chatbot.
- If they ask general money questions (tipping etiquette, how to split fairly, etc.), help them — you're a money-savvy assistant.
- Never say "I'm an AI" or "As an AI" — just answer naturally.
- The user may ask follow-up questions. Use the conversation history to understand context (e.g. "what about last week?" after asking about this month).`;
}

async function askAI(
  question: string,
  history: ChatMessage[],
  splits: SplitSummary[],
  apiKey: string,
): Promise<string> {
  const systemPrompt = buildSystemPrompt(splits);

  // Build messages: system + conversation history + new question
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation history (cap at last 10 exchanges to stay within token limits)
  const recentHistory = history.slice(-20);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Add the new user message
  messages.push({ role: 'user', content: question });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 500,
      messages,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? 'Sorry, I couldn\'t generate an answer.';
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
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = (await req.json()) as AskRequest;

    if (!body.question?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Missing question' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('CHATGPT_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const answer = await askAI(body.question, body.history ?? [], body.splits ?? [], apiKey);

    return new Response(
      JSON.stringify({ answer } as AskResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Query failed';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
