import React, { useRef } from 'react';
import type { Split } from '@receiptsplit/shared';
import { PeopleScreen } from '../split/PeopleScreen';

interface Props {
  participants: import('@receiptsplit/shared').Participant[];
  onUpdateParticipants: (p: import('@receiptsplit/shared').Participant[]) => void;
  onNext: () => void;
  onBack: () => void;
}

/**
 * Wraps the existing PeopleScreen to work with multi-split shared participants.
 * Creates a temporary "fake split" that PeopleScreen can operate on,
 * and propagates participant changes back to the multi-split context.
 */
export default function MultiSplitPeopleScreen({ participants, onUpdateParticipants, onNext, onBack }: Props) {
  // Create a fake split object for PeopleScreen to operate on
  const fakeSplitRef = useRef<Split>({
    id: '__multisplit_people__',
    name: 'Multi-Split',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    items: [],
    participants,
    taxInCents: 0,
    tipInCents: 0,
    currentStep: 'people',
  });

  // Keep the fake split's participants in sync
  fakeSplitRef.current = { ...fakeSplitRef.current, participants };

  const handleUpdate = (updatedSplit: Split) => {
    onUpdateParticipants(updatedSplit.participants);
  };

  return (
    <PeopleScreen
      split={fakeSplitRef.current}
      onUpdate={handleUpdate}
      onNext={onNext}
      onBack={onBack}
    />
  );
}
