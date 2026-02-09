import React, { useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { formatCurrency } from '@/utils/formatting';
import { useSplits } from '@/hooks/useSplits';
import {
  getSplitsThisMonth,
  getTotalSpendingCents,
  getCategoryTotals,
  type CategoryTotal,
} from '@/utils/spendingAggregation';

const CATEGORY_COLORS: Record<string, string> = {
  Restaurant: '#f97316',
  Grocery: '#22c55e',
  Entertainment: '#a855f7',
  Utilities: '#3b82f6',
  Other: '#64748b',
  Uncategorized: '#94a3b8',
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? '#94a3b8';
}

const DONUT_SIZE = 160;
const DONUT_STROKE = 24;
const DONUT_R = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_CX = DONUT_SIZE / 2;
const DONUT_CY = DONUT_SIZE / 2;

function DonutChart({ totals }: { totals: CategoryTotal[] }) {
  const totalCents = totals.reduce((s, t) => s + t.cents, 0);
  const circumference = 2 * Math.PI * DONUT_R;
  let offset = 0;

  const segments = totals
    .filter(t => t.cents > 0)
    .map(t => {
      const length = totalCents > 0 ? (t.cents / totalCents) * circumference : 0;
      const seg = { ...t, length, offset };
      offset += length;
      return seg;
    });

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width={DONUT_SIZE} height={DONUT_SIZE} className="flex-shrink-0">
        <circle
          cx={DONUT_CX}
          cy={DONUT_CY}
          r={DONUT_R}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={DONUT_STROKE}
        />
        {segments.map((seg, i) => (
          <circle
            key={seg.category}
            cx={DONUT_CX}
            cy={DONUT_CY}
            r={DONUT_R}
            fill="none"
            stroke={getCategoryColor(seg.category)}
            strokeWidth={DONUT_STROKE}
            strokeDasharray={`${seg.length} ${circumference}`}
            strokeDashoffset={-seg.offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${DONUT_CX} ${DONUT_CY})`}
          />
        ))}
      </svg>
      <div className="mt-2 text-center">
        <div className="text-2xl font-bold tabular-nums text-white">
          {formatCurrency(totalCents)}
        </div>
        <div className="text-sm text-white/60">This month</div>
      </div>
    </div>
  );
}

export const SpendingScreen: React.FC = () => {
  const { splits } = useSplits();

  const { totalCents, categoryTotals } = useMemo(() => {
    const thisMonth = getSplitsThisMonth(splits);
    const total = getTotalSpendingCents(thisMonth);
    const byCategory = getCategoryTotals(thisMonth);
    return {
      totalCents: total,
      categoryTotals: byCategory,
    };
  }, [splits]);

  const hasData = totalCents > 0;

  return (
    <Layout>
      <div className="space-y-6 pb-24">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Spending
          </h1>
          <p className="text-white/60">
            Total = sum of split totals · This month
          </p>
        </div>

        <Card className="space-y-6 p-6">
          {hasData ? (
            <>
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-flex-start sm:gap-8">
                <DonutChart totals={categoryTotals} />
                <div className="w-full flex-1 space-y-3">
                  <h3 className="font-semibold text-white">By category</h3>
                  {categoryTotals
                    .filter(t => t.cents > 0)
                    .map(t => (
                      <div
                        key={t.category}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="h-3 w-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getCategoryColor(t.category) }}
                          />
                          <span className="text-white">{t.category}</span>
                        </div>
                        <div className="text-right">
                          <span className="tabular-nums font-medium text-white">
                            {formatCurrency(t.cents)}
                          </span>
                          <span className="ml-2 text-sm text-white/60">
                            {t.percent.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center">
              <p className="text-white/60">No spending this month yet.</p>
              <p className="mt-1 text-sm text-white/40">
                Splits you add will show here by category.
              </p>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};
