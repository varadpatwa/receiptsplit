import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, ChevronLeft } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Stepper } from '@/components/Stepper';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Split, Participant } from '@/types/split';
import { generateId } from '@/utils/formatting';
import { getFriends, getFriendByName, addFriend, type Friend } from '@/utils/friends';
import { getRecentPeople, recordRecentPerson } from '@/utils/recentPeople';

interface PeopleScreenProps {
  split: Split;
  onUpdate: (split: Split) => void;
  onNext: () => void;
  onBack: () => void;
}

type SuggestionType = 
  | { type: 'friend'; friend: Friend }
  | { type: 'recent'; name: string }
  | { type: 'add-temp'; name: string }
  | { type: 'add-friend'; name: string };

export const PeopleScreen: React.FC<PeopleScreenProps> = ({
  split,
  onUpdate,
  onNext,
  onBack
}) => {
  const [newName, setNewName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  
  // Get current participant IDs (for exclusion)
  const currentParticipantIds = new Set(split.participants.map(p => p.id));
  const currentParticipantNamesLower = new Set(
    split.participants.map(p => p.name.toLowerCase())
  );
  
  // Get data sources
  const savedFriends = getFriends();
  const recentPeople = getRecentPeople();
  
  // Filter out already-added participants
  const availableFriends = savedFriends.filter(f => !currentParticipantIds.has(f.id));
  const availableRecent = recentPeople.filter(
    name => !currentParticipantNamesLower.has(name.toLowerCase())
  );
  
  // Build suggestions based on input
  const suggestions: SuggestionType[] = React.useMemo(() => {
    const query = newName.trim().toLowerCase();
    if (!query) return [];
    
    const result: SuggestionType[] = [];
    
    // Match friends (prefix first, then contains)
    const friendPrefix: Friend[] = [];
    const friendContains: Friend[] = [];
    availableFriends.forEach(friend => {
      const lower = friend.name.toLowerCase();
      if (lower.startsWith(query)) {
        friendPrefix.push(friend);
      } else if (lower.includes(query)) {
        friendContains.push(friend);
      }
    });
    friendPrefix.forEach(f => result.push({ type: 'friend', friend: f }));
    friendContains.forEach(f => result.push({ type: 'friend', friend: f }));
    
    // Match recent people (prefix first, then contains)
    const recentPrefix: string[] = [];
    const recentContains: string[] = [];
    availableRecent.forEach(name => {
      const lower = name.toLowerCase();
      if (lower.startsWith(query)) {
        recentPrefix.push(name);
      } else if (lower.includes(query)) {
        recentContains.push(name);
      }
    });
    recentPrefix.forEach(n => result.push({ type: 'recent', name: n }));
    recentContains.forEach(n => result.push({ type: 'recent', name: n }));
    
    // Check if typed value exactly matches a saved friend
    const exactMatch = getFriendByName(newName.trim());
    const typedLower = newName.trim().toLowerCase();
    const hasExactFriendMatch = exactMatch && exactMatch.name.toLowerCase() === typedLower;
    
    // Always show "Add as Temp" if there's typed text (allows duplicate names)
    if (newName.trim()) {
      result.push({ type: 'add-temp', name: newName.trim() });
    }
    
    // Only show "Add as Friend" if it's not already a saved friend
    if (newName.trim() && !hasExactFriendMatch) {
      result.push({ type: 'add-friend', name: newName.trim() });
    }
    
    return result;
  }, [newName, availableFriends, availableRecent]);
  
  // Calculate dropdown position based on input's boundingClientRect
  const updateDropdownPosition = () => {
    if (inputRef.current && inputContainerRef.current) {
      requestAnimationFrame(() => {
        if (inputRef.current && inputContainerRef.current) {
          const inputRect = inputRef.current.getBoundingClientRect();
          const containerRect = inputContainerRef.current.getBoundingClientRect();
          
          setDropdownPosition({
            top: inputRect.bottom + 8,
            left: containerRect.left,
            width: containerRect.width
          });
        }
      });
    }
  };

  // Update selected index when suggestions change
  useEffect(() => {
    if (suggestions.length > 0) {
      setSelectedIndex(0);
      setShowSuggestions(true);
      updateDropdownPosition();
    } else {
      setShowSuggestions(false);
      setDropdownPosition(null);
    }
  }, [suggestions]);

  // Update position when dropdown visibility changes
  useEffect(() => {
    if (showSuggestions && suggestions.length > 0) {
      updateDropdownPosition();
    } else {
      setDropdownPosition(null);
    }
  }, [showSuggestions]);

  // Update position on window resize and scroll
  useEffect(() => {
    if (!showSuggestions || !inputRef.current) return;

    const handleUpdate = () => {
      updateDropdownPosition();
    };

    // Use capture phase for scroll to catch all scroll events
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);
    document.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
      document.removeEventListener('scroll', handleUpdate, true);
    };
  }, [showSuggestions]);
  
  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        inputContainerRef.current &&
        !inputContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
      return;
    }
    
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showSuggestions && suggestions.length > 0 && selectedIndex >= 0) {
        handleSuggestionSelect(suggestions[selectedIndex]);
      } else if (newName.trim()) {
        // Add as temp if no suggestions
        addParticipantAsTemp(newName.trim());
      }
      return;
    }
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (showSuggestions && suggestions.length > 0) {
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
      }
      return;
    }
    
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (showSuggestions && suggestions.length > 0) {
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      }
      return;
    }
  };
  
  const addParticipant = (participant: Participant) => {
    onUpdate({
      ...split,
      participants: [...split.participants, participant]
    });
    
    // Record as recent person
    recordRecentPerson(participant.name);
    
    setNewName('');
    setShowSuggestions(false);
  };
  
  const addParticipantAsTemp = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    
    const participant: Participant = {
      id: generateId(),
      name: trimmed,
      source: 'temp'
    };
    
    addParticipant(participant);
  };
  
  const addParticipantAsFriend = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    
    // Add to friends storage
    const friend = addFriend(trimmed);
    
    // Add as participant
    const participant: Participant = {
      id: friend.id, // Use friend's stable ID
      name: friend.name,
      source: 'friend'
    };
    
    addParticipant(participant);
  };
  
  const handleSuggestionSelect = (suggestion: SuggestionType) => {
    switch (suggestion.type) {
      case 'friend':
        const participant: Participant = {
          id: suggestion.friend.id,
          name: suggestion.friend.name,
          source: 'friend'
        };
        addParticipant(participant);
        break;
      case 'recent':
        addParticipantAsTemp(suggestion.name);
        break;
      case 'add-temp':
        addParticipantAsTemp(suggestion.name);
        break;
      case 'add-friend':
        addParticipantAsFriend(suggestion.name);
        break;
    }
  };
  
  const handleNext = () => {
    // Record all participants as recent
    split.participants.forEach(p => recordRecentPerson(p.name));
    onNext();
  };
  
  const deleteParticipant = (participantId: string) => {
    onUpdate({
      ...split,
      participants: split.participants.filter(p => p.id !== participantId),
      items: split.items.map(item => ({
        ...item,
        assignments: item.assignments.filter(a => a.participantId !== participantId)
      }))
    });
  };
  
  const canProceed = split.participants.length >= 2;
  
  return (
    <Layout>
      <div className="space-y-6 overflow-visible">
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
        <Card className="space-y-4 overflow-visible">
          <h3 className="font-semibold text-white">Who's splitting?</h3>
          
          <div className="relative z-[1000]" ref={inputContainerRef}>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  placeholder="Enter name"
                  value={newName}
                  onChange={e => {
                    setNewName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    if (suggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  className="w-full"
                />
              </div>
              <Button 
                onClick={() => {
                  if (newName.trim()) {
                    addParticipantAsTemp(newName.trim());
                  }
                }} 
                disabled={!newName.trim()}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {/* Typeahead Dropdown (Portal) */}
          {showSuggestions && suggestions.length > 0 && dropdownPosition && createPortal(
            <div
              ref={dropdownRef}
              className="fixed z-[9999] rounded-xl border border-white/10 bg-[#151517] shadow-lg overflow-hidden max-h-[300px] overflow-y-auto"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`
              }}
            >
              {suggestions.map((suggestion, index) => {
                let displayText = '';
                let badgeText = '';
                let badgeColor = '';
                
                switch (suggestion.type) {
                  case 'friend':
                    displayText = suggestion.friend.name;
                    badgeText = 'Saved';
                    badgeColor = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
                    break;
                  case 'recent':
                    displayText = suggestion.name;
                    badgeText = 'Recent';
                    badgeColor = 'bg-white/10 text-white/80 border-white/20';
                    break;
                  case 'add-temp':
                    displayText = `Add "${suggestion.name}" as Temp`;
                    badgeText = '';
                    break;
                  case 'add-friend':
                    displayText = `Add "${suggestion.name}" as Friend`;
                    badgeText = '';
                    break;
                }
                
                return (
                  <button
                    key={`${suggestion.type}-${index}`}
                    type="button"
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className={`w-full px-4 py-3 text-left text-white hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0 flex items-center justify-between ${
                      index === selectedIndex ? 'bg-white/5' : ''
                    }`}
                  >
                    <span>{displayText}</span>
                    {badgeText && (
                      <span className={`rounded-full px-2 py-0.5 text-xs border ${badgeColor}`}>
                        {badgeText}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>,
            document.body
          )}
          
          {/* Recent People Chips (capped to 5) */}
          {availableRecent.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-white/60">Recent People</p>
              <div className="flex flex-wrap gap-2">
                {availableRecent.slice(0, 5).map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => addParticipantAsTemp(name)}
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
          <Card className="space-y-4 relative z-0">
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
                    <div className="flex flex-col">
                      <span className="font-medium text-white">{participant.name}</span>
                      {participant.source && (
                        <span className="text-xs text-white/50">
                          {participant.source === 'friend' ? 'Saved friend' : 'Temp'}
                        </span>
                      )}
                    </div>
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
