export interface Item {
  id: string;
  name: string;
  priceInCents: number;
  quantity: number;
  assignments: ItemAssignment[];
}

export interface ItemAssignment {
  participantId: string;
  shares: number; // For custom split, otherwise 1
}

export interface Participant {
  id: string;
  name: string;
}

export type SplitCategory = 'Restaurant' | 'Grocery' | 'Entertainment' | 'Utilities' | 'Other';

export interface Split {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  items: Item[];
  participants: Participant[];
  taxInCents: number;
  tipInCents: number;
  currentStep: 'receipt' | 'people' | 'assign' | 'summary' | 'export';
  category?: SplitCategory;
}

export interface ParticipantBreakdown {
  participantId: string;
  participantName: string;
  itemsTotal: number; // in cents
  taxTotal: number; // in cents
  tipTotal: number; // in cents
  grandTotal: number; // in cents
  items: {
    itemName: string;
    amount: number; // in cents
  }[];
}
