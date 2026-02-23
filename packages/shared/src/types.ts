export interface Item {
  id: string;
  name: string;
  priceInCents: number;
  quantity: number;
  assignments: ItemAssignment[];
}

export interface ItemAssignment {
  participantId: string;
  shares: number;
}

export interface Participant {
  id: string;
  name: string;
  source?: 'friend' | 'temp';
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
  excludeMe?: boolean;
}

export interface ParticipantBreakdown {
  participantId: string;
  participantName: string;
  itemsTotal: number;
  taxTotal: number;
  tipTotal: number;
  grandTotal: number;
  items: { itemName: string; amount: number }[];
}
