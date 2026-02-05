import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronLeft, Minus } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Stepper } from '@/components/Stepper';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Split, Item } from '@/types/split';
import { generateId, formatCurrency, isValidMoneyInput, moneyStringToCents, centsToMoneyString } from '@/utils/formatting';

interface ReceiptScreenProps {
  split: Split;
  onUpdate: (split: Split) => void;
  onNext: () => void;
  onBack: () => void;
}

export const ReceiptScreen: React.FC<ReceiptScreenProps> = ({
  split,
  onUpdate,
  onNext,
  onBack
}) => {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  // Local string state for money inputs (allows natural typing)
  const [priceInputs, setPriceInputs] = useState<{ [itemId: string]: string }>({});
  const [taxInput, setTaxInput] = useState<string>('');
  const [tipInput, setTipInput] = useState<string>('');
  
  // Initialize string states from cents values when split ID changes (new split loaded)
  useEffect(() => {
    const newPriceInputs: { [itemId: string]: string } = {};
    split.items.forEach(item => {
      newPriceInputs[item.id] = centsToMoneyString(item.priceInCents);
    });
    setPriceInputs(newPriceInputs);
    setTaxInput(centsToMoneyString(split.taxInCents));
    setTipInput(centsToMoneyString(split.tipInCents));
  }, [split.id]); // Only reset when split ID changes (new split)
  
  const addItem = () => {
    const newItem: Item = {
      id: generateId(),
      name: '',
      priceInCents: 0,
      quantity: 1,
      assignments: []
    };
    
    // Initialize empty string for new item's price input
    setPriceInputs({ ...priceInputs, [newItem.id]: '' });
    
    onUpdate({
      ...split,
      items: [...split.items, newItem]
    });
  };
  
  const updateItem = (itemId: string, updates: Partial<Item>) => {
    onUpdate({
      ...split,
      items: split.items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      )
    });
  };
  
  const deleteItem = (itemId: string) => {
    const newPriceInputs = { ...priceInputs };
    delete newPriceInputs[itemId];
    setPriceInputs(newPriceInputs);
    
    onUpdate({
      ...split,
      items: split.items.filter(item => item.id !== itemId)
    });
  };
  
  const handlePriceChange = (itemId: string, value: string) => {
    // Validate input format (allows natural typing)
    if (!isValidMoneyInput(value)) {
      return; // Don't update if invalid
    }
    
    // Update local string state
    setPriceInputs({ ...priceInputs, [itemId]: value });
    
    // Clear errors on valid input
    if (value !== '' && value !== '.') {
      const newErrors = { ...errors };
      delete newErrors[itemId];
      setErrors(newErrors);
    }
  };
  
  const handlePriceBlur = (itemId: string) => {
    const value = priceInputs[itemId] || '';
    const cents = moneyStringToCents(value);
    
    // Normalize and update the display string
    const normalized = centsToMoneyString(cents);
    setPriceInputs({ ...priceInputs, [itemId]: normalized });
    
    // Update the actual cents value
    if (cents === 0) {
      const newErrors = { ...errors, [itemId]: 'Price must be greater than $0' };
      setErrors(newErrors);
    } else {
      const newErrors = { ...errors };
      delete newErrors[itemId];
      setErrors(newErrors);
      updateItem(itemId, { priceInCents: cents });
    }
  };
  
  const handleQuantityChange = (itemId: string, delta: number) => {
    const item = split.items.find(i => i.id === itemId);
    if (!item) return;
    
    const newQuantity = Math.max(1, item.quantity + delta);
    updateItem(itemId, { quantity: newQuantity });
  };
  
  const handleTaxChange = (value: string) => {
    if (!isValidMoneyInput(value)) {
      return;
    }
    setTaxInput(value);
  };
  
  const handleTaxBlur = () => {
    const cents = moneyStringToCents(taxInput);
    const normalized = centsToMoneyString(cents);
    setTaxInput(normalized);
    onUpdate({ ...split, taxInCents: cents });
  };
  
  const handleTipChange = (value: string) => {
    if (!isValidMoneyInput(value)) {
      return;
    }
    setTipInput(value);
  };
  
  const handleTipBlur = () => {
    const cents = moneyStringToCents(tipInput);
    const normalized = centsToMoneyString(cents);
    setTipInput(normalized);
    onUpdate({ ...split, tipInCents: cents });
  };
  
  // Prevent mousewheel from changing values while focused
  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    if (document.activeElement === e.currentTarget) {
      e.currentTarget.blur();
    }
  };
  
  const subtotal = split.items.reduce((sum, item) => sum + (item.priceInCents * item.quantity), 0);
  const total = subtotal + split.taxInCents + split.tipInCents;
  
  const hasValidItems = split.items.some(item => item.priceInCents > 0);
  const canProceed = hasValidItems && Object.keys(errors).length === 0;
  
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
            Receipt Entry
          </h2>
        </div>
        
        <Stepper currentStep="receipt" />
        
        {/* Items */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Items</h3>
            <button
              onClick={addItem}
              className="rounded-lg p-2 text-white transition-colors hover:bg-white/10"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          
          {split.items.length === 0 ? (
            <div className="space-y-4 py-8 text-center">
              <p className="text-white/60">No items yet. Add your first item.</p>
              <p className="text-sm text-white/40">
                Tap the + button above to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {split.items.map(item => (
                <div key={item.id} className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex gap-3">
                    <Input
                      placeholder="Item name"
                      value={item.name}
                      onChange={e => updateItem(item.id, { name: e.target.value })}
                      className="flex-1"
                    />
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="$0.00"
                      value={priceInputs[item.id] ?? ''}
                      onChange={e => handlePriceChange(item.id, e.target.value)}
                      onBlur={() => handlePriceBlur(item.id)}
                      onWheel={handleWheel}
                      error={errors[item.id]}
                      className="w-24 tabular-nums"
                    />
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="rounded-lg p-2 text-white/60 transition-colors hover:bg-red-500/20 hover:text-red-400"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white/60">Quantity:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleQuantityChange(item.id, -1)}
                        className="rounded-lg p-1 text-white transition-colors hover:bg-white/10"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center tabular-nums text-white">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.id, 1)}
                        className="rounded-lg p-1 text-white transition-colors hover:bg-white/10"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {item.quantity > 1 && (
                      <span className="ml-auto text-sm text-white/60 tabular-nums">
                        {formatCurrency(item.priceInCents * item.quantity)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        
        {/* Tax & Tip */}
        <Card className="space-y-4">
          <h3 className="font-semibold text-white">Tax & Tip</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Tax"
              type="text"
              inputMode="decimal"
              placeholder="$0.00"
              value={taxInput}
              onChange={e => handleTaxChange(e.target.value)}
              onBlur={handleTaxBlur}
              onWheel={handleWheel}
              className="tabular-nums"
            />
            <Input
              label="Tip"
              type="text"
              inputMode="decimal"
              placeholder="$0.00"
              value={tipInput}
              onChange={e => handleTipChange(e.target.value)}
              onBlur={handleTipBlur}
              onWheel={handleWheel}
              className="tabular-nums"
            />
          </div>
        </Card>
        
        {/* Total */}
        <Card>
          <div className="space-y-2">
            <div className="flex justify-between text-white/60">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            {split.taxInCents > 0 && (
              <div className="flex justify-between text-white/60">
                <span>Tax</span>
                <span className="tabular-nums">{formatCurrency(split.taxInCents)}</span>
              </div>
            )}
            {split.tipInCents > 0 && (
              <div className="flex justify-between text-white/60">
                <span>Tip</span>
                <span className="tabular-nums">{formatCurrency(split.tipInCents)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-white/10 pt-2 text-lg font-semibold text-white">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>
        </Card>
        
        {/* Next Button */}
        <Button onClick={onNext} disabled={!canProceed} className="w-full">
          Next: Add People
        </Button>
      </div>
    </Layout>
  );
};
