import React from 'react';

interface ParticipantChipProps {
  name: string;
  selected: boolean;
  onToggle: () => void;
}

export const ParticipantChip: React.FC<ParticipantChipProps> = ({ name, selected, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-150 ${
        selected
          ? 'border-transparent bg-white text-black'
          : 'border border-white/20 bg-transparent text-white'
      }`}
    >
      {name}
    </button>
  );
};
