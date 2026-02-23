import React, { useState, useMemo } from 'react';
import { Plus, Trash2, ChevronRight } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { formatDate, formatCurrency } from '@/utils/formatting';
import { getReceiptTotal } from '@/utils/calculations';
import { Split, SplitCategory } from '@/types/split';

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
  const [selectedCategory, setSelectedCategory] = useState<SplitCategory | 'All' | 'Uncategorized'>('All');
  
  // Get unique categories from splits
  const categories = useMemo(() => {
    const cats = new Set<SplitCategory | 'Uncategorized'>();
    splits.forEach(split => {
      cats.add(split.category || 'Uncategorized');
    });
    return Array.from(cats).sort((a, b) => {
      // Put "Uncategorized" at the end
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });
  }, [splits]);
  
  // Filter splits by category
  const filteredSplits = useMemo(() => {
    if (selectedCategory === 'All') return splits;
    return splits.filter(split => (split.category || 'Uncategorized') === selectedCategory);
  }, [splits, selectedCategory]);
  
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
        
        {/* Category Filter */}
        {splits.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Recent Splits</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedCategory === 'All'
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-white/80 border border-white/10 hover:bg-white/10'
                }`}
              >
                All
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-white/80 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Splits List */}
        {filteredSplits.length > 0 && (
          <div className="space-y-3">
            {filteredSplits
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .map(split => {
                const category = split.category || 'Uncategorized';
                const isUncategorized = !split.category;
                return (
                  <Card
                    key={split.id}
                    onClick={() => onSelectSplit(split.id)}
                    className="group relative"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">
                            {split.name}
                          </h3>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${
                            isUncategorized 
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              : 'bg-white/10 text-white/80'
                          }`}>
                            {category}
                          </span>
                        </div>
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
                );
              })}
          </div>
        )}
        
        {splits.length > 0 && filteredSplits.length === 0 && (
          <Card className="space-y-4 py-12 text-center">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">No splits in this category</h3>
              <p className="text-white/60">
                Try selecting a different category or create a new split
              </p>
            </div>
          </Card>
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
              <Button onClick={confirmDelete} className="flex-1 bg-white text-black">
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Layout>
  );
};
