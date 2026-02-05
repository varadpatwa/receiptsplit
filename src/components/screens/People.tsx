import React, { useState } from 'react';
import { Plus, Trash2, ChevronLeft } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Stepper } from '@/components/Stepper';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Split, Participant } from '@/types/split';
import { generateId } from '@/utils/formatting';

interface PeopleScreenProps {
  split: Split;
  onUpdate: (split: Split) => void;
  onNext: () => void;
  onBack: () => void;
}

export const PeopleScreen: React.FC<PeopleScreenProps> = ({
  split,
  onUpdate,
  onNext,
  onBack
}) => {
  const [newName, setNewName] = useState('');
  
  const addParticipant = () => {
    if (!newName.trim()) return;
    
    const newParticipant: Participant = {
      id: generateId(),
      name: newName.trim()
    };
    
    onUpdate({
      ...split,
      participants: [...split.participants, newParticipant]
    });
    
    setNewName('');
  };
  
  const deleteParticipant = (participantId: string) => {
    // Remove participant and their assignments
    onUpdate({
      ...split,
      participants: split.participants.filter(p => p.id !== participantId),
      items: split.items.map(item => ({
        ...item,
        assignments: item.assignments.filter(a => a.participantId !== participantId)
      }))
    });
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addParticipant();
    }
  };
  
  const canProceed = split.participants.length >= 2;
  
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
            Add People
          </h2>
        </div>
        
        <Stepper currentStep="people" />
        
        {/* Add Participant */}
        <Card className="space-y-4">
          <h3 className="font-semibold text-white">Who's splitting?</h3>
          
          <div className="flex gap-3">
            <Input
              placeholder="Enter name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={addParticipant} disabled={!newName.trim()}>
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          
          {split.participants.length < 2 && (
            <p className="text-sm text-white/60">
              Add at least 2 people to continue
            </p>
          )}
        </Card>
        
        {/* Participants List */}
        {split.participants.length > 0 && (
          <Card className="space-y-4">
            <h3 className="font-semibold text-white">
              Participants ({split.participants.length})
            </h3>
            
            <div className="space-y-2">
              {split.participants.map((participant, index) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-semibold text-white">
                      {index + 1}
                    </div>
                    <span className="font-medium text-white">{participant.name}</span>
                  </div>
                  <button
                    onClick={() => deleteParticipant(participant.id)}
                    className="rounded-lg p-2 text-white/60 transition-colors hover:bg-red-500/20 hover:text-red-400"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}
        
        {/* Next Button */}
        <div className="space-y-3">
          {!canProceed && (
            <p className="text-center text-sm text-white/60">
              Need at least 2 people to split the bill
            </p>
          )}
          <Button onClick={onNext} disabled={!canProceed} className="w-full">
            Next: Assign Items
          </Button>
        </div>
      </div>
    </Layout>
  );
};
