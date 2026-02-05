import React from 'react';
import { ChevronLeft, Copy, Share2, Home } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Stepper } from '@/components/Stepper';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Toast, useToast } from '@/components/Toast';
import { Split } from '@/types/split';
import { useCalculations } from '@/hooks/useCalculations';

interface ExportScreenProps {
  split: Split;
  onBack: () => void;
  onReturnHome: () => void;
}

export const ExportScreen: React.FC<ExportScreenProps> = ({
  split,
  onBack,
  onReturnHome
}) => {
  const { shareableText } = useCalculations(split);
  const { toast, showToast, hideToast } = useToast();
  
  const handleCopy = () => {
    navigator.clipboard.writeText(shareableText).then(() => {
      showToast('Copied to clipboard');
    });
  };
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: split.name || 'Split Summary',
          text: shareableText
        });
      } catch (error) {
        // User cancelled or error occurred
        if ((error as Error).name !== 'AbortError') {
          handleCopy(); // Fallback to copy
        }
      }
    } else {
      handleCopy(); // Fallback for browsers without share API
    }
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
            Export
          </h2>
        </div>
        
        <Stepper currentStep="export" />
        
        {/* Export Options */}
        <Card className="space-y-4">
          <h3 className="font-semibold text-white">Share your split</h3>
          <p className="text-white/60">
            Send the breakdown to your group so everyone knows what they owe.
          </p>
          
          <div className="space-y-3">
            <Button onClick={handleCopy} variant="secondary" className="w-full">
              <div className="flex items-center justify-center gap-2">
                <Copy className="h-5 w-5" />
                <span>Copy to Clipboard</span>
              </div>
            </Button>
            
            {navigator.share && (
              <Button onClick={handleShare} variant="secondary" className="w-full">
                <div className="flex items-center justify-center gap-2">
                  <Share2 className="h-5 w-5" />
                  <span>Share</span>
                </div>
              </Button>
            )}
          </div>
        </Card>
        
        {/* Preview */}
        <Card className="space-y-3">
          <h3 className="font-semibold text-white">Preview</h3>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <pre className="whitespace-pre-wrap text-sm text-white/80">
              {shareableText}
            </pre>
          </div>
        </Card>
        
        {/* Return Home */}
        <Button onClick={onReturnHome} className="w-full">
          <div className="flex items-center justify-center gap-2">
            <Home className="h-5 w-5" />
            <span>Return Home</span>
          </div>
        </Button>
      </div>
      
      <Toast message={toast.message} visible={toast.visible} onClose={hideToast} />
    </Layout>
  );
};
