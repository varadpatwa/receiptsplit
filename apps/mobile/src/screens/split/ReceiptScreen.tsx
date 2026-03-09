import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Split, Item, SplitCategory } from '@receiptsplit/shared';
import {
  formatCurrency,
  generateId,
  generateAutoTitle,
  isValidMoneyInput,
  moneyStringToCents,
  centsToMoneyString,
} from '@receiptsplit/shared';
import { Stepper } from '../../components/Stepper';
import { useAuth } from '../../contexts/AuthContext';
import { uploadReceiptImage, parseReceiptByPath, type TotalsMismatchWarning } from '../../lib/parseReceipt';

const CATEGORIES: SplitCategory[] = ['Restaurant', 'Grocery', 'Entertainment', 'Utilities', 'Other'];

interface ReceiptScreenProps {
  split: Split;
  onUpdate: (split: Split) => void;
  onNext: () => void;
  onBack: () => void;
  saveError?: string | null;
  clearSaveError?: () => void;
}

export function ReceiptScreen({ split, onUpdate, onNext, onBack, saveError, clearSaveError }: ReceiptScreenProps) {
  const { userId } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [taxInput, setTaxInput] = useState('');
  const [tipInput, setTipInput] = useState('');
  const [parseLoading, setParseLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [totalsMismatch, setTotalsMismatch] = useState<TotalsMismatchWarning | null>(null);
  const [lastImageUri, setLastImageUri] = useState<string | null>(null);

  useEffect(() => {
    const newPriceInputs: Record<string, string> = {};
    split.items.forEach((item) => {
      newPriceInputs[item.id] = centsToMoneyString(item.priceInCents);
    });
    setPriceInputs(newPriceInputs);
    setTaxInput(centsToMoneyString(split.taxInCents));
    setTipInput(centsToMoneyString(split.tipInCents));
  }, [split.id]);

  const addItem = () => {
    const newItem: Item = {
      id: generateId(),
      name: '',
      priceInCents: 0,
      quantity: 1,
      assignments: [],
    };
    setPriceInputs((prev) => ({ ...prev, [newItem.id]: '' }));
    onUpdate({ ...split, items: [...split.items, newItem] });
  };

  const parseImageUri = async (imageUri: string) => {
    if (!userId) return;
    setParseLoading(true);
    setParseError(null);
    setTotalsMismatch(null);
    setLastImageUri(imageUri);
    try {
      const storagePath = await uploadReceiptImage(imageUri, userId);
      const parsed = await parseReceiptByPath(storagePath);
      const newItems: Item[] = parsed.items.map((it) => ({
        id: generateId(),
        name: it.label,
        priceInCents: it.unit_price,
        quantity: it.quantity,
        assignments: [],
      }));
      const merchantName = parsed.merchant_name;
      const shouldAutoTitle = !split.titleUserOverride;
      const autoTitle = shouldAutoTitle
        ? generateAutoTitle({ merchantName, category: split.category, createdAt: split.createdAt })
        : split.titleAuto;
      const nextSplit: Split = {
        ...split,
        items: newItems,
        taxInCents: parsed.tax,
        tipInCents: parsed.tip,
        receiptImagePath: storagePath,
        merchantName,
        titleAuto: autoTitle,
        ...(shouldAutoTitle ? { name: autoTitle } : {}),
      };
      onUpdate(nextSplit);
      const nextPriceInputs: Record<string, string> = {};
      newItems.forEach((item) => {
        nextPriceInputs[item.id] = centsToMoneyString(item.priceInCents);
      });
      setPriceInputs(nextPriceInputs);
      setTaxInput(centsToMoneyString(parsed.tax));
      setTipInput(centsToMoneyString(parsed.tip));
      if (parsed.totalsMismatch) {
        setTotalsMismatch(parsed.totalsMismatch);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to parse receipt';
      setParseError(message);
    } finally {
      setParseLoading(false);
    }
  };

  const ensureCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status === 'granted') return true;
    Alert.alert(
      'Camera access needed',
      'Allow camera access in Settings to scan receipts.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ],
    );
    return false;
  };

  const handleCameraCapture = async () => {
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to scan a receipt.');
      return;
    }
    const granted = await ensureCameraPermission();
    if (!granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await parseImageUri(result.assets[0].uri);
  };

  const handlePickFromLibrary = async () => {
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to scan a receipt.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Photo access needed',
        'Allow photo library access in Settings to choose a receipt image.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await parseImageUri(result.assets[0].uri);
  };

  const handleRetry = () => {
    if (lastImageUri && userId) {
      parseImageUri(lastImageUri);
    }
  };

  const updateItem = (itemId: string, updates: Partial<Item>) => {
    onUpdate({
      ...split,
      items: split.items.map((i) => (i.id === itemId ? { ...i, ...updates } : i)),
    });
  };

  const deleteItem = (itemId: string) => {
    setPriceInputs((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    onUpdate({ ...split, items: split.items.filter((i) => i.id !== itemId) });
  };

  const handlePriceChange = (itemId: string, value: string) => {
    if (!isValidMoneyInput(value)) return;
    setPriceInputs((prev) => ({ ...prev, [itemId]: value }));
    if (value !== '' && value !== '.') {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    }
  };

  const handlePriceBlur = (itemId: string) => {
    const value = priceInputs[itemId] ?? '';
    const cents = moneyStringToCents(value);
    const normalized = centsToMoneyString(cents);
    setPriceInputs((prev) => ({ ...prev, [itemId]: normalized }));
    if (cents === 0) {
      setErrors((prev) => ({ ...prev, [itemId]: 'Price must be greater than $0' }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      updateItem(itemId, { priceInCents: cents });
    }
  };

  const handleQuantityChange = (itemId: string, delta: number) => {
    const item = split.items.find((i) => i.id === itemId);
    if (!item) return;
    updateItem(itemId, { quantity: Math.max(1, item.quantity + delta) });
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
  const hasValidItems = split.items.some((item) => item.priceInCents > 0);
  const hasCategory = !!split.category;
  const canProceed = hasValidItems && Object.keys(errors).length === 0 && hasCategory;

  const handleNext = () => {
    if (!hasCategory) {
      Alert.alert('Category Required', 'Please select a category before proceeding.', [{ text: 'OK' }]);
      return;
    }
    onNext();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
          </Pressable>
          <TextInput
            style={styles.titleInput}
            value={split.name}
            onChangeText={(text) => onUpdate({ ...split, name: text, titleUserOverride: true })}
            placeholder="Split name"
            placeholderTextColor="rgba(255,255,255,0.4)"
          />
          {split.titleUserOverride && split.titleAuto ? (
            <Pressable
              onPress={() => onUpdate({ ...split, name: split.titleAuto!, titleUserOverride: false })}
              hitSlop={8}
            >
              <Ionicons name="refresh" size={18} color="rgba(255,255,255,0.4)" />
            </Pressable>
          ) : null}
        </View>
        <Stepper currentStep="receipt" />

        {saveError && clearSaveError ? (
          <Pressable style={styles.errorBanner} onPress={clearSaveError}>
            <Text style={styles.errorBannerText}>{saveError}</Text>
            <Text style={styles.errorBannerDismiss}>Dismiss</Text>
          </Pressable>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Category {!hasCategory && <Text style={styles.required}>*</Text>}</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => {
                  const updated: Split = { ...split, category: cat };
                  if (!split.titleUserOverride) {
                    const autoTitle = generateAutoTitle({ merchantName: split.merchantName, category: cat, createdAt: split.createdAt });
                    updated.titleAuto = autoTitle;
                    updated.name = autoTitle;
                  }
                  onUpdate(updated);
                }}
                style={[styles.chip, split.category === cat && styles.chipSelected]}
              >
                <Text style={[styles.chipText, split.category === cat && styles.chipTextSelected]}>{cat}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.cardTitle}>Exclude me from this split</Text>
              <Text style={styles.muted}>
                {split.excludeMe
                  ? "You won't be included and it won't count toward your spending."
                  : "You're included by default and this split will count toward your spending."}
              </Text>
            </View>
            <Switch
              value={split.excludeMe ?? false}
              onValueChange={(checked) => {
                const updated = { ...split, excludeMe: checked };
                const hasMe = updated.participants.some((p) => p.id === 'me');
                if (!checked && !hasMe) {
                  updated.participants = [{ id: 'me', name: 'Me' }, ...updated.participants];
                } else if (checked && hasMe) {
                  updated.participants = updated.participants.filter((p) => p.id !== 'me');
                }
                onUpdate(updated);
              }}
              trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#fff' }}
              thumbColor={split.excludeMe ? '#000' : '#fff'}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowSpace}>
            <Text style={styles.cardTitle}>Items</Text>
            <Pressable onPress={addItem} style={styles.iconBtn}>
              <Ionicons name="add" size={24} color="#fff" />
            </Pressable>
          </View>
          {!userId ? (
            <View style={styles.guestScanBanner}>
              <Ionicons name="lock-closed-outline" size={16} color="rgba(255,255,255,0.4)" />
              <Text style={styles.guestScanText}>Sign in to scan receipts with OCR</Text>
            </View>
          ) : parseLoading ? (
            <View style={styles.scanLoadingRow}>
              <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
              <Text style={styles.scanLoadingText}>Scanning receipt…</Text>
            </View>
          ) : (
            <View style={styles.scanRow}>
              <Pressable
                onPress={handleCameraCapture}
                style={styles.scanBtn}
              >
                <Ionicons name="camera" size={18} color="#0B0B0C" />
                <Text style={styles.scanBtnText}>Scan with camera</Text>
              </Pressable>
              <Pressable
                onPress={handlePickFromLibrary}
                style={styles.scanBtnSecondary}
              >
                <Ionicons name="images-outline" size={18} color="#fff" />
                <Text style={styles.scanBtnSecondaryText}>Choose from photos</Text>
              </Pressable>
            </View>
          )}
          {parseError ? (
            <View style={styles.parseErrorBanner}>
              <Text style={styles.parseErrorText}>{parseError}</Text>
              <View style={styles.parseErrorActions}>
                {lastImageUri && (
                  <Pressable onPress={handleRetry} style={styles.retryBtn}>
                    <Text style={styles.retryBtnText}>Retry</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => setParseError(null)}>
                  <Text style={styles.parseErrorDismiss}>Dismiss</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
          {totalsMismatch ? (
            <View style={styles.mismatchBanner}>
              <Ionicons name="warning" size={18} color="rgba(255,200,0,0.9)" />
              <View style={styles.mismatchText}>
                <Text style={styles.mismatchTitle}>Totals may not match</Text>
                <Text style={styles.mismatchSub}>
                  Item sum ({formatCurrency(totalsMismatch.itemSum)}) differs from receipt subtotal ({formatCurrency(totalsMismatch.reportedSubtotal)}) by ~{totalsMismatch.differencePercent}%. Please review.
                </Text>
              </View>
              <Pressable onPress={() => setTotalsMismatch(null)} hitSlop={8}>
                <Ionicons name="close" size={18} color="rgba(255,255,255,0.5)" />
              </Pressable>
            </View>
          ) : null}
          {split.items.length === 0 ? (
            <View style={styles.emptyItems}>
              <Text style={styles.muted}>No items yet. Add your first item.</Text>
              <Text style={styles.mutedSmall}>Tap the + button above to get started</Text>
            </View>
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
                {errors[item.id] ? <Text style={styles.errorText}>{errors[item.id]}</Text> : null}
                <View style={styles.qtyRow}>
                  <Text style={styles.muted}>Quantity:</Text>
                  <View style={styles.qtyControls}>
                    <Pressable
                      onPress={() => handleQuantityChange(item.id, -1)}
                      style={styles.qtyBtn}
                      disabled={item.quantity <= 1}
                    >
                      <Ionicons name="remove" size={18} color="#fff" />
                    </Pressable>
                    <Text style={styles.qtyNum}>{item.quantity}</Text>
                    <Pressable onPress={() => handleQuantityChange(item.id, 1)} style={styles.qtyBtn}>
                      <Ionicons name="add" size={18} color="#fff" />
                    </Pressable>
                  </View>
                  {item.quantity > 1 && (
                    <Text style={styles.muted}>{formatCurrency(item.priceInCents * item.quantity)}</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

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

        <Pressable
          onPress={handleNext}
          disabled={!hasValidItems || Object.keys(errors).length > 0}
          style={({ pressed }) => [styles.nextBtn, (!hasValidItems || Object.keys(errors).length > 0) && styles.nextBtnDisabled, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.nextBtnText}>Next: Add People</Text>
        </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0B0C' },
  container: { flex: 1 },
  scroll: { flex: 1 },
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
  required: { color: 'rgba(255,100,100,0.9)' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipSelected: { backgroundColor: '#fff', borderColor: '#fff' },
  chipText: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.8)' },
  chipTextSelected: { color: '#000' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowSpace: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itemsHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scanRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  scanBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderRadius: 8,
  },
  scanBtnText: { fontSize: 14, fontWeight: '600', color: '#0B0B0C' },
  scanBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 10,
    borderRadius: 8,
  },
  scanBtnSecondaryText: { fontSize: 14, fontWeight: '500', color: '#fff' },
  guestScanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  guestScanText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  scanLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    marginBottom: 12,
  },
  scanLoadingText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  parseErrorBanner: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  parseErrorText: { flex: 1, color: '#fca5a5', fontSize: 14, marginBottom: 8 },
  parseErrorActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  retryBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  parseErrorDismiss: { color: '#fca5a5', fontSize: 13, fontWeight: '600' },
  mismatchBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255,200,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,200,0,0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  mismatchText: { flex: 1 },
  mismatchTitle: { fontWeight: '600', color: 'rgba(255,200,0,0.9)', fontSize: 14 },
  mismatchSub: { fontSize: 13, color: 'rgba(255,200,0,0.7)', marginTop: 4 },
  flex1: { flex: 1 },
  muted: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  mutedSmall: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
  iconBtn: { padding: 8 },
  emptyItems: { paddingVertical: 24, alignItems: 'center' },
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
  errorText: { fontSize: 12, color: 'rgba(255,100,100,0.9)', marginTop: 4 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { padding: 4 },
  qtyNum: { width: 24, textAlign: 'center', color: '#fff', fontWeight: '600' },
  twoCol: { flexDirection: 'row', gap: 16 },
  field: { flex: 1 },
  label: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalMain: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 12, marginTop: 4 },
  totalLabel: { fontSize: 18, fontWeight: '600', color: '#fff' },
  totalValue: { fontSize: 18, fontWeight: '600', color: '#fff' },
  nextBtn: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: '#000', fontSize: 16, fontWeight: '600' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: { flex: 1, color: '#fca5a5', fontSize: 14 },
  errorBannerDismiss: { color: '#fca5a5', fontSize: 14, fontWeight: '600', marginLeft: 8 },
});
