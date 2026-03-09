import type { SplitInviteView, SplitItemClaim } from '@receiptsplit/shared';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function functionUrl(path: string): string {
  return `${SUPABASE_URL}/functions/v1/split-invite/${path}`;
}

export async function fetchInvite(token: string): Promise<SplitInviteView> {
  const res = await fetch(functionUrl(token));
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load invite');
  return data;
}

export async function claimItem(
  token: string,
  itemIndex: number,
  claimerName: string,
  claimType: 'full' | 'share' = 'full',
): Promise<SplitItemClaim> {
  const res = await fetch(functionUrl(`${token}/claim`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemIndex, claimerName, claimType }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to claim item');
  return data;
}

export async function unclaimItem(
  token: string,
  claimId: string,
  claimerName: string,
): Promise<void> {
  const res = await fetch(functionUrl(`${token}/unclaim`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claimId, claimerName }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to unclaim');
  }
}
