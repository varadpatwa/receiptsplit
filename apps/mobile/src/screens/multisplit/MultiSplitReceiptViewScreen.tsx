import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Split, Item } from '@receiptsplit/shared';
import {
  formatCurrency, generateId, isValidMoneyInput, moneyStringToCents, centsToMoneyString,
} from '@receiptsplit/shared';

interface Props {
  split: Split;
  onUpdate: (split: Split) => void;
  onBack: () => void;
}

export default function MultiSplitReceiptViewScreen({ split, onUpdate, onBack }: Props) {
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [taxInput, setTaxInput] = useState('');
  const [tipInput, setTipInput] = useState('');

  useEffect(() => {
    const inputs: Record<string, string> = {};
    split.items.forEach((item) => {
      inputs[item.id] = centsToMoneyString(item.priceInCents);
    });
    setPriceInputs(inputs);
    setTaxInput(centsToMoneyString(split.taxInCents));
    setTipInput(centsToMoneyString(split.tipInCents));
  }, [split.id]);

  const addItem = () => {
    const newItem: Item = { id: generateId(), name: '', priceInCents: 0, quantity: 1, assignments: [] };
    setPriceInputs((prev) => ({ ...prev, [newItem.id]: '' }));
    onUpdate({ ...split, items: [...split.items, newItem] });
  };

  const updateItem = (itemId: string, updates: Partial<Item>) => {
    onUpdate({ ...split, items: split.items.map((i) => (i.id === itemId ? { ...i, ...updates } : i)) });
  };

  const deleteItem = (itemId: string) => {
    setPriceInputs((prev) => { const next = { ...prev }; delete next[itemId]; return next; });
    onUpdate({ ...split, items: split.items.filter((i) => i.id !== itemId) });
  };

  const handlePriceChange = (itemId: string, value: string) => {
    if (!isValidMoneyInput(value)) return;
    setPriceInputs((prev) => ({ ...prev, [itemId]: value }));
  };

  const handlePriceBlur = (itemId: string) => {
    const value = priceInputs[itemId] ?? '';
    const cents = moneyStringToCents(value);
    setPriceInputs((prev) => ({ ...prev, [itemId]: centsToMoneyString(cents) }));
    updateItem(itemId, { priceInCents: cents });
  };

  const handleTaxBlur = () => {
    const cents = moneyStringToCents(taxInput);
    setTaxInput(centsToMoneyString(cents));
    onUpdate({ ...split, taxInCents: cents });
  };

  const handleTipBlur = () => {
    const cents = moneyStringToCents(tipInput);
    setTipInput(centsToMoneyString(cents));
    onUpdate({ ...split, tipInCents: cents });
  };

  const subtotal = split.items.reduce((sum, item) => sum + item.priceInCents * item.quantity, 0);
  const total = subtotal + split.taxInCents + split.tipInCents;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
            </Pressable>
            <TextInput
              style={styles.titleInput}
              value={split.name}
              onChangeText={(text) => onUpdate({ ...split, name: text, titleUserOverride: true })}
              placeholder="Receipt name"
              placeholderTextColor="rgba(255,255,255,0.4)"
            />
          </View>

          {/* Items */}
          <View style={styles.card}>
            <View style={styles.rowSpace}>
              <Text style={styles.cardTitle}>Items</Text>
              <Pressable onPress={addItem} style={styles.iconBtn}>
                <Ionicons name="add" size={24} color="#fff" />
              </Pressable>
            </View>
            {split.items.length === 0 ? (
              <Text style={styles.muted}>No items yet.</Text>
            ) : (
              split.items.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemRow}>
                    <TextInput
                      style={[styles.input, styles.inputFlex]}
                      placeholder="Item name"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={item.name}
                      onChangeText={(t) => updateItem(item.id, { name: t })}
                    />
                    <TextInput
                      style={[styles.input, styles.inputPrice]}
                      placeholder="$0.00"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={priceInputs[item.id] ?? ''}
                      onChangeText={(t) => handlePriceChange(item.id, t)}
                      onBlur={() => handlePriceBlur(item.id)}
                      keyboardType="decimal-pad"
                    />
                    <Pressable onPress={() => deleteItem(item.id)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={20} color="rgba(255,100,100,0.9)" />
                    </Pressable>
                  </View>
                  {item.quantity > 1 && (
                    <Text style={styles.muted}>Qty: {item.quantity} · {formatCurrency(item.priceInCents * item.quantity)}</Text>
                  )}
                </View>
              ))
            )}
          </View>

          {/* Tax & Tip */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tax & Tip</Text>
            <View style={styles.twoCol}>
              <View style={styles.field}>
                <Text style={styles.label}>Tax</Text>
                <TextInput
                  style={styles.input}
                  placeholder="$0.00"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={taxInput}
                  onChangeText={(t) => isValidMoneyInput(t) && setTaxInput(t)}
                  onBlur={handleTaxBlur}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Tip</Text>
                <TextInput
                  style={styles.input}
                  placeholder="$0.00"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={tipInput}
                  onChangeText={(t) => isValidMoneyInput(t) && setTipInput(t)}
                  onBlur={handleTipBlur}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          {/* Total */}
          <View style={styles.card}>
            <View style={styles.totalRow}>
              <Text style={styles.muted}>Subtotal</Text>
              <Text style={styles.muted}>{formatCurrency(subtotal)}</Text>
            </View>
            {split.taxInCents > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.muted}>Tax</Text>
                <Text style={styles.muted}>{formatCurrency(split.taxInCents)}</Text>
              </View>
            )}
            {split.tipInCents > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.muted}>Tip</Text>
                <Text style={styles.muted}>{formatCurrency(split.tipInCents)}</Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.totalMain]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
            </View>
          </View>

          {/* Done */}
          <Pressable
            style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.8 }]}
            onPress={onBack}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0B0C' },
  flex: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 4 },
  backBtn: { padding: 8, marginRight: 4 },
  titleInput: { flex: 1, fontSize: 22, fontWeight: '600', color: '#fff', padding: 0 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  rowSpace: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  iconBtn: { padding: 8 },
  muted: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  itemCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    marginBottom: 12,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputFlex: { flex: 1 },
  inputPrice: { width: 80, textAlign: 'right' },
  deleteBtn: { padding: 8 },
  twoCol: { flexDirection: 'row', gap: 16 },
  field: { flex: 1 },
  label: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalMain: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 12, marginTop: 4 },
  totalLabel: { fontSize: 18, fontWeight: '600', color: '#fff' },
  totalValue: { fontSize: 18, fontWeight: '600', color: '#fff' },
  doneBtn: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  doneBtnText: { color: '#000', fontSize: 16, fontWeight: '600' },
});
