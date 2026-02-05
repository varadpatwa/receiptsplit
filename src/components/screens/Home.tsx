import React, { useState } from 'react';
import { Plus, Trash2, ChevronRight } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { formatDate, formatCurrency } from '@/utils/formatting';
import { getReceiptTotal } from '@/utils/calculations';
import { Split } from '@/types/split';

interface HomeScreenProps {
  splits: Split[];
  onNewSplit: () => void;
  onSelectSplit: (splitId: string) => void;
  onDeleteSplit: (splitId: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  splits,
  onNewSplit,
  onSelectSplit,
  onDeleteSplit
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const handleDeleteClick = (e: React.MouseEvent, splitId: string) => {
    e.stopPropagation();
    setDeletingId(splitId);
  };
  
  const confirmDelete = () => {
    if (deletingId) {
      onDeleteSplit(deletingId);
      setDeletingId(null);
    }
  };
  
  const cancelDelete = () => {
    setDeletingId(null);
  };
  
  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            ReceiptSplit
          </h1>
          <p className="text-white/60">
            Split bills in under 60 seconds
          </p>
        </div>
        
        {/* New Split Button */}
        <Button onClick={onNewSplit} className="w-full">
          <div className="flex items-center justify-center gap-2">
            <Plus className="h-5 w-5" />
            <span>New Split</span>
          </div>
        </Button>
        
        {/* Splits List */}
        {splits.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Recent Splits</h2>
            <div className="space-y-3">
              {splits
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map(split => (
                  <Card
                    key={split.id}
                    onClick={() => onSelectSplit(split.id)}
                    className="group relative"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-1">
                        <h3 className="font-semibold text-white">
                          {split.name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-white/60">
                          <span>{formatDate(split.updatedAt)}</span>
                          <span className="tabular-nums">
                            {formatCurrency(getReceiptTotal(split) || 0)}
                          </span>
                          <span>
                            {split.participants.length} {split.participants.length === 1 ? 'person' : 'people'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleDeleteClick(e, split.id)}
                          className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/5 hover:text-red-400"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                        <ChevronRight className="h-5 w-5 text-white/40" />
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        )}
        
        {splits.length === 0 && (
          <Card className="space-y-4 py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <Plus className="h-8 w-8 text-white/40" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">No splits yet</h3>
              <p className="text-white/60">
                Create your first split to start dividing bills with friends
              </p>
            </div>
          </Card>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-5 animate-fade-in">
          <Card className="w-full max-w-sm space-y-4 animate-slide-up">
            <h3 className="text-lg font-semibold text-white">Delete Split?</h3>
            <p className="text-white/60">
              This action cannot be undone. The split will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={cancelDelete} className="flex-1">
                Cancel
              </Button>
              <Button onClick={confirmDelete} className="flex-1 bg-red-500 text-white">
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Layout>
  );
};
