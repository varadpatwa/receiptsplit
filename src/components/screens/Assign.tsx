import React from 'react';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Stepper } from '@/components/Stepper';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ParticipantChip } from '@/components/ParticipantChip';
import { Split, ItemAssignment } from '@/types/split';
import { formatCurrency } from '@/utils/formatting';
import { useCalculations } from '@/hooks/useCalculations';

interface AssignScreenProps {
  split: Split;
  onUpdate: (split: Split) => void;
  onNext: () => void;
  onBack: () => void;
}

export const AssignScreen: React.FC<AssignScreenProps> = ({
  split,
  onUpdate,
  onNext,
  onBack
}) => {
  const { runningTally, allItemsAssigned } = useCalculations(split);
  
  const toggleAssignment = (itemId: string, participantId: string) => {
    const item = split.items.find(i => i.id === itemId);
    if (!item) return;
    
    const existingIndex = item.assignments.findIndex(a => a.participantId === participantId);
    
    let newAssignments: ItemAssignment[];
    
    if (existingIndex >= 0) {
      // Remove assignment
      newAssignments = item.assignments.filter((_, i) => i !== existingIndex);
    } else {
      // Add assignment with 1 share
      newAssignments = [...item.assignments, { participantId, shares: 1 }];
    }
    
    onUpdate({
      ...split,
      items: split.items.map(i =>
        i.id === itemId ? { ...i, assignments: newAssignments } : i
      )
    });
  };
  
  const isAssigned = (itemId: string, participantId: string): boolean => {
    const item = split.items.find(i => i.id === itemId);
    return item?.assignments.some(a => a.participantId === participantId) || false;
  };
  
  const unassignedItems = split.items.filter(item => item.assignments.length === 0);
  
  return (
    <div className="h-[100dvh] flex flex-col bg-[#0B0B0C]">
      {/* Subtle radial gradient for depth */}
      <div className="fixed inset-0 bg-gradient-radial from-white/[0.03] via-transparent to-transparent pointer-events-none" />
      
      <div className="mx-auto max-w-[420px] md:max-w-[560px] w-full px-5 py-6 flex flex-col flex-1 min-h-0 relative z-10">
        {/* Header - Fixed at top */}
        <div className="flex-shrink-0 space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/5"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Assign Items
            </h2>
          </div>
          
          <Stepper currentStep="assign" />
        </div>
        
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto min-h-0 -mx-5 px-5">
          <div className="space-y-4 py-4">
            {/* Running Tally - Sticky at top of scroll area */}
            <Card className="sticky top-0 z-20 bg-[#141416] backdrop-blur-sm border-b border-white/10">
              <h3 className="mb-3 font-semibold text-white">Running Tally</h3>
              <div className="space-y-2">
                {split.participants.map(participant => {
                  const tally = runningTally.get(participant.id) || 0;
                  return (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-white/80">{participant.name}</span>
                      <span className="tabular-nums font-medium text-white">
                        {formatCurrency(Math.round(tally))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
            
            {/* Unassigned Warning */}
            {unassignedItems.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500" />
                <div className="space-y-1">
                  <p className="font-medium text-yellow-500">
                    {unassignedItems.length} unassigned {unassignedItems.length === 1 ? 'item' : 'items'}
                  </p>
                  <p className="text-sm text-yellow-500/80">
                    Assign all items to continue
                  </p>
                </div>
              </div>
            )}
            
            {/* Items Assignment - Scrollable list */}
            <div className="space-y-4 pb-4">
              {split.items.map(item => {
                const itemTotal = item.priceInCents * item.quantity;
                const hasAssignment = item.assignments.length > 0;
                
                return (
                  <Card
                    key={item.id}
                    className={`space-y-4 ${
                      !hasAssignment ? 'border-yellow-500/40 bg-yellow-500/5' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">
                          {item.name || 'Unnamed item'}
                        </h3>
                        <div className="mt-1 flex items-center gap-3 text-sm text-white/60">
                          <span className="tabular-nums">{formatCurrency(item.priceInCents)}</span>
                          {item.quantity > 1 && (
                            <>
                              <span>×</span>
                              <span>{item.quantity}</span>
                              <span>=</span>
                              <span className="tabular-nums">{formatCurrency(itemTotal)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {!hasAssignment && (
                        <AlertCircle className="h-5 w-5 flex-shrink-0 text-yellow-500" />
                      )}
                    </div>
                    
                    <div>
                      <p className="mb-2 text-sm text-white/60">Who shared this?</p>
                      <div className="flex flex-wrap gap-2">
                        {split.participants.map(participant => (
                          <ParticipantChip
                            key={participant.id}
                            name={participant.name}
                            selected={isAssigned(item.id, participant.id)}
                            onToggle={() => toggleAssignment(item.id, participant.id)}
                          />
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Next Button - Fixed at bottom */}
        <div className="flex-shrink-0 pt-4">
          <Button onClick={onNext} disabled={!allItemsAssigned} className="w-full">
            Next: Review Summary
          </Button>
        </div>
      </div>
    </div>
  );
};
