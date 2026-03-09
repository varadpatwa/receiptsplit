import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { SplitInviteView, SplitItemClaim } from '@receiptsplit/shared';
import { formatCurrency } from '@receiptsplit/shared';
import { fetchInvite, claimItem, unclaimItem } from '@/lib/splitInvites';

const GUEST_NAME_KEY = 'receiptsplit_guest_name';

export const JoinSplitScreen: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [invite, setInvite] = useState<SplitInviteView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guestName, setGuestName] = useState(() => localStorage.getItem(GUEST_NAME_KEY) || '');
  const [nameSubmitted, setNameSubmitted] = useState(() => !!localStorage.getItem(GUEST_NAME_KEY));
  const [claiming, setClaiming] = useState<number | null>(null);

  const loadInvite = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchInvite(token);
      setInvite(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial load + polling
  useEffect(() => {
    loadInvite();
    const interval = setInterval(loadInvite, 5000);
    return () => clearInterval(interval);
  }, [loadInvite]);

  const handleSubmitName = () => {
    const trimmed = guestName.trim();
    if (!trimmed) return;
    localStorage.setItem(GUEST_NAME_KEY, trimmed);
    setGuestName(trimmed);
    setNameSubmitted(true);
  };

  const handleClaim = async (itemIndex: number) => {
    if (!token || !guestName.trim() || claiming !== null) return;
    setClaiming(itemIndex);
    try {
      await claimItem(token, itemIndex, guestName.trim());
      await loadInvite();
    } catch (e) {
      // Might be a duplicate claim - refresh anyway
      await loadInvite();
    } finally {
      setClaiming(null);
    }
  };

  const handleUnclaim = async (claim: SplitItemClaim) => {
    if (!token || claiming !== null) return;
    setClaiming(claim.itemIndex);
    try {
      await unclaimItem(token, claim.id, claim.claimerName);
      await loadInvite();
    } catch {
      await loadInvite();
    } finally {
      setClaiming(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] flex flex-col items-center justify-center px-5">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">🔗</div>
          <h1 className="text-xl font-semibold text-white mb-2">
            {error?.includes('expired') ? 'Link Expired' : 'Invalid Link'}
          </h1>
          <p className="text-white/60">
            {error || 'This invite link is not valid.'}
          </p>
        </div>
      </div>
    );
  }

  const isFinalized = invite.status === 'final';

  // Build claims lookup: itemIndex -> claims[]
  const claimsByItem: Record<number, SplitItemClaim[]> = {};
  for (const c of invite.claims) {
    if (!claimsByItem[c.itemIndex]) claimsByItem[c.itemIndex] = [];
    claimsByItem[c.itemIndex].push(c);
  }

  const itemsTotal = invite.items.reduce((sum, i) => sum + i.priceInCents * i.quantity, 0);
  const grandTotal = itemsTotal + invite.taxInCents + invite.tipInCents;

  // Calculate how much this guest owes
  const myClaimedItems = invite.claims.filter(c => c.claimerName === guestName.trim());
  const myTotal = myClaimedItems.reduce((sum, c) => {
    const item = invite.items[c.itemIndex];
    if (!item) return sum;
    const itemClaims = claimsByItem[c.itemIndex] || [];
    // Split evenly among all claimers of this item
    return sum + Math.round((item.priceInCents * item.quantity) / itemClaims.length);
  }, 0);

  // Proportional tax/tip for "your share"
  const myProportion = itemsTotal > 0 ? myTotal / itemsTotal : 0;
  const myTax = Math.round(invite.taxInCents * myProportion);
  const myTip = Math.round(invite.tipInCents * myProportion);
  const myGrandTotal = myTotal + myTax + myTip;

  return (
    <div className="min-h-screen bg-[#0B0B0C] px-4 py-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-white">{invite.splitTitle}</h1>
          {invite.merchantName ? (
            <p className="text-white/60 mt-1">{invite.merchantName}</p>
          ) : null}
          <p className="text-white/40 text-sm mt-1">
            {new Date(invite.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}Total: {formatCurrency(grandTotal)}
          </p>
        </div>

        {/* Finalized Banner */}
        {isFinalized ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 text-center">
            <div className="text-green-400 text-lg font-semibold mb-1">Split Finalized</div>
            <p className="text-white/50 text-sm">The owner has locked this split. No more changes.</p>
          </div>
        ) : null}

        {/* Name Input */}
        {!nameSubmitted ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
            <label className="block text-sm font-medium text-white/80 mb-2">
              What's your name?
            </label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitName()}
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/40"
              autoFocus
            />
            <button
              onClick={handleSubmitName}
              disabled={!guestName.trim()}
              className="w-full mt-3 py-3 bg-white text-black font-semibold rounded-lg disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-6">
            <span className="text-white/60 text-sm">
              {isFinalized ? 'Viewing as' : 'Claiming as'} <span className="text-white font-medium">{guestName}</span>
            </span>
            {!isFinalized ? (
              <button
                onClick={() => { setNameSubmitted(false); localStorage.removeItem(GUEST_NAME_KEY); }}
                className="text-white/40 text-sm underline hover:text-white/60"
              >
                Change
              </button>
            ) : null}
          </div>
        )}

        {/* Finalized Summary — prominent */}
        {isFinalized && nameSubmitted && myClaimedItems.length > 0 ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 mb-6 text-center">
            <div className="text-white/60 text-sm font-medium mb-1">You owe</div>
            <div className="text-green-400 text-3xl font-bold">{formatCurrency(myGrandTotal)}</div>
            <p className="text-white/40 text-sm mt-2">
              {myClaimedItems.length} item{myClaimedItems.length !== 1 ? 's' : ''}
              {myTax > 0 ? ` + ${formatCurrency(myTax)} tax` : ''}
              {myTip > 0 ? ` + ${formatCurrency(myTip)} tip` : ''}
            </p>
          </div>
        ) : null}

        {/* My Summary (non-finalized) */}
        {!isFinalized && nameSubmitted && myClaimedItems.length > 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-white font-medium">Your share</span>
              <span className="text-white font-semibold text-lg">{formatCurrency(myGrandTotal)}</span>
            </div>
            <p className="text-white/40 text-sm mt-1">
              {myClaimedItems.length} item{myClaimedItems.length !== 1 ? 's' : ''} claimed
              {invite.taxInCents > 0 ? ' · tax/tip split proportionally' : ''}
            </p>
          </div>
        ) : null}

        {/* Items */}
        <div className="space-y-2">
          {invite.items.map((item, idx) => {
            const itemClaims = claimsByItem[idx] || [];
            const myClaim = itemClaims.find(c => c.claimerName === guestName.trim());
            const isMine = !!myClaim;
            const isLoading = claiming === idx;

            return (
              <div
                key={idx}
                className={`bg-white/5 border rounded-xl p-4 transition-colors ${
                  isMine ? 'border-green-500/40 bg-green-500/5' : 'border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium truncate">{item.name}</span>
                      {item.quantity > 1 ? (
                        <span className="text-white/40 text-sm">×{item.quantity}</span>
                      ) : null}
                    </div>
                    <span className="text-white/60 text-sm">
                      {formatCurrency(item.priceInCents * item.quantity)}
                    </span>
                    {/* Show claimers */}
                    {itemClaims.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {itemClaims.map((c) => (
                          <span
                            key={c.id}
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              c.claimerName === guestName.trim()
                                ? 'bg-green-500/20 text-green-300'
                                : 'bg-white/10 text-white/50'
                            }`}
                          >
                            {c.claimerName === guestName.trim() ? 'You' : c.claimerName}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Claim/Unclaim button — hidden when finalized */}
                  {nameSubmitted && !isFinalized ? (
                    <button
                      onClick={() => isMine ? handleUnclaim(myClaim!) : handleClaim(idx)}
                      disabled={isLoading}
                      className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isLoading
                          ? 'bg-white/10 text-white/30'
                          : isMine
                          ? 'bg-green-500/20 text-green-300 hover:bg-red-500/20 hover:text-red-300'
                          : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                      }`}
                    >
                      {isLoading ? '...' : isMine ? 'Mine ✓' : 'Claim'}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        {invite.taxInCents > 0 || invite.tipInCents > 0 ? (
          <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-4">
            {invite.taxInCents > 0 ? (
              <div className="flex justify-between text-white/60 text-sm">
                <span>Tax</span>
                <span>{formatCurrency(invite.taxInCents)}</span>
              </div>
            ) : null}
            {invite.tipInCents > 0 ? (
              <div className="flex justify-between text-white/60 text-sm mt-1">
                <span>Tip</span>
                <span>{formatCurrency(invite.tipInCents)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-white font-semibold mt-2 pt-2 border-t border-white/10">
              <span>Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="text-center mt-8 mb-4">
          <p className="text-white/30 text-xs">
            Powered by ReceiptSplit
          </p>
        </div>
      </div>
    </div>
  );
};
