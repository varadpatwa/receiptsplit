import React from 'react';
import { ChevronLeft, Copy } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Stepper } from '@/components/Stepper';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Toast, useToast } from '@/components/Toast';
import { Split } from '@/types/split';
import { formatCurrency } from '@/utils/formatting';
import { useCalculations } from '@/hooks/useCalculations';

interface SummaryScreenProps {
  split: Split;
  onNext: () => void;
  onBack: () => void;
}

export const SummaryScreen: React.FC<SummaryScreenProps> = ({
  split,
  onNext,
  onBack
}) => {
  const { breakdowns, receiptTotal, shareableText } = useCalculations(split);
  const { toast, showToast, hideToast } = useToast();
  
  const handleCopy = () => {
    navigator.clipboard.writeText(shareableText).then(() => {
      showToast('Breakdown copied to clipboard');
    });
  };
  
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/5"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Summary
          </h2>
        </div>
        
        <Stepper currentStep="summary" />
        
        {/* Receipt Total */}
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-white">Receipt Total</span>
            <span className="text-2xl font-semibold tabular-nums text-white">
              {formatCurrency(receiptTotal)}
            </span>
          </div>
        </Card>
        
        {/* Per-Person Breakdowns */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Per-Person Breakdown
            </h3>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <Copy className="h-4 w-4" />
              Copy
            </button>
          </div>
          
          {breakdowns.map(breakdown => (
            <Card key={breakdown.participantId} className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-white">
                  {breakdown.participantName}
                </h4>
                <span className="text-2xl font-semibold tabular-nums text-white">
                  {formatCurrency(breakdown.grandTotal)}
                </span>
              </div>
              
              <div className="space-y-2 border-t border-white/10 pt-3">
                {/* Items */}
                {breakdown.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-sm text-white/60"
                  >
                    <span>{item.itemName}</span>
                    <span className="tabular-nums">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                
                {/* Subtotal */}
                <div className="flex justify-between font-medium text-white/80">
                  <span>Items Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(breakdown.itemsTotal)}</span>
                </div>
                
                {/* Tax */}
                {breakdown.taxTotal > 0 && (
                  <div className="flex justify-between text-sm text-white/60">
                    <span>Tax</span>
                    <span className="tabular-nums">{formatCurrency(breakdown.taxTotal)}</span>
                  </div>
                )}
                
                {/* Tip */}
                {breakdown.tipTotal > 0 && (
                  <div className="flex justify-between text-sm text-white/60">
                    <span>Tip</span>
                    <span className="tabular-nums">{formatCurrency(breakdown.tipTotal)}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
        
        {/* Next Button */}
        <Button onClick={onNext} className="w-full">
          Next: Export
        </Button>
      </div>
      
      <Toast message={toast.message} visible={toast.visible} onClose={hideToast} />
    </Layout>
  );
};
