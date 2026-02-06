import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ChevronLeft } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Stepper } from '@/components/Stepper';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Split, Participant } from '@/types/split';
import { generateId } from '@/utils/formatting';
import { getPeople, addPeople } from '@/utils/peopleStorage';

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
  const [storedPeople, setStoredPeople] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Load stored people on mount
  useEffect(() => {
    setStoredPeople(getPeople());
  }, []);
  
  // Get current participant names (lowercase for comparison)
  const currentParticipantNames = split.participants.map(p => p.name.toLowerCase());
  
  // Filter out people already in current split
  const availablePeople = storedPeople.filter(
    name => !currentParticipantNames.includes(name.toLowerCase())
  );
  
  // Update suggestions as user types
  useEffect(() => {
    if (!newName.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    const query = newName.toLowerCase();
    const matching = availablePeople
      .filter(name => name.toLowerCase().includes(query))
      .slice(0, 5); // Limit to 5 suggestions
    
    setSuggestions(matching);
    setShowSuggestions(matching.length > 0);
  }, [newName, availablePeople]);
  
  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const addParticipant = (name?: string) => {
    const nameToAdd = name || newName.trim();
    if (!nameToAdd) return;
    
    // Check for duplicates (case-insensitive)
    const isDuplicate = split.participants.some(
      p => p.name.toLowerCase() === nameToAdd.toLowerCase()
    );
    
    if (isDuplicate) return;
    
    const newParticipant: Participant = {
      id: generateId(),
      name: nameToAdd.trim()
    };
    
    onUpdate({
      ...split,
      participants: [...split.participants, newParticipant]
    });
    
    setNewName('');
    setShowSuggestions(false);
  };
  
  const handleSuggestionClick = (name: string) => {
    addParticipant(name);
  };
  
  const handleQuickAdd = (name: string) => {
    addParticipant(name);
  };
  
  const handleNext = () => {
    // Save current participants to storage before proceeding
    if (split.participants.length > 0) {
      const names = split.participants.map(p => p.name);
      addPeople(names);
    }
    onNext();
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
          
          <div className="relative">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  placeholder="Enter name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  onFocus={() => {
                    if (suggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  className="w-full"
                />
                
                {/* Autocomplete Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute top-full left-0 right-0 mt-2 z-30 rounded-xl border border-white/10 bg-[#141416] shadow-lg overflow-hidden"
                  >
                    {suggestions.map((name, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSuggestionClick(name)}
                        className="w-full px-4 py-3 text-left text-white hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={() => addParticipant()} disabled={!newName.trim()}>
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {/* Recent People Chips */}
          {availablePeople.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-white/60">Recent People</p>
              <div className="flex flex-wrap gap-2">
                {availablePeople.slice(0, 10).map((name, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleQuickAdd(name)}
                    className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10 hover:border-white/30 transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
          
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
          <Button onClick={handleNext} disabled={!canProceed} className="w-full">
            Next: Assign Items
          </Button>
        </div>
      </div>
    </Layout>
  );
};
