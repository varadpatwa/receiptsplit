import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { formatCurrency, generateId, generateAutoTitle } from '@receiptsplit/shared';
import type { Item, Split } from '@receiptsplit/shared';
import { useAuth } from '../../contexts/AuthContext';
import { uploadReceiptImage, parseReceiptByPath } from '../../lib/parseReceipt';
import { T } from '../../theme/colors';
import { AuroraBackground } from '../../components/AuroraBackground';

interface CapturedReceipt {
  id: string;
  localUri: string;
  storagePath: string;
  merchantName?: string;
  items: Item[];
  taxInCents: number;
  tipInCents: number;
  total: number;
}

interface Props {
  onDone: (captures: CapturedReceipt[]) => void;
  onBack: () => void;
}

export type { CapturedReceipt };

export default function MultiSplitCaptureScreen({ onDone, onBack }: Props) {
  const { userId } = useAuth();
  const [captures, setCaptures] = useState<CapturedReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status === 'granted') return true;
    Alert.alert('Camera access needed', 'Allow camera access in Settings to scan receipts.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]);
    return false;
  };

  const processImage = async (uri: string) => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const storagePath = await uploadReceiptImage(uri, userId);
      const parsed = await parseReceiptByPath(storagePath);
      const items: Item[] = parsed.items.map((it) => ({
        id: generateId(),
        name: it.label,
        priceInCents: it.unit_price,
        quantity: it.quantity,
        assignments: [],
      }));
      const total = items.reduce((s, i) => s + i.priceInCents * i.quantity, 0) + parsed.tax + parsed.tip;
      setCaptures((prev) => [...prev, {
        id: generateId(),
        localUri: uri,
        storagePath,
        merchantName: parsed.merchant_name,
        items,
        taxInCents: parsed.tax,
        tipInCents: parsed.tip,
        total,
      }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to scan receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleCamera = async () => {
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to scan receipts.');
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
    await processImage(result.assets[0].uri);
  };

  const handleLibrary = async () => {
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to scan receipts.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Photo access needed', 'Allow photo library access in Settings.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await processImage(result.assets[0].uri);
  };

  const removeCapture = (id: string) => {
    setCaptures((prev) => prev.filter((c) => c.id !== id));
  };

  const handleContinue = () => {
    if (captures.length === 0) return;
    onDone(captures);
  };

  return (
    <AuroraBackground>
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <AnimatedPressable onPress={onBack} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </AnimatedPressable>
          <Text style={styles.title}>Scan Receipts</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {captures.length === 0 && !loading ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconRing}>
                <Ionicons name="scan-outline" size={40} color="rgba(129,140,248,0.6)" />
              </View>
              <Text style={styles.emptyTitle}>Scan your first receipt</Text>
              <Text style={styles.emptySubtitle}>
                Take a photo or choose from your library.{'\n'}You can add multiple receipts.
              </Text>

              <View style={styles.tipsList}>
                <View style={styles.tipRow}>
                  <Ionicons name="sunny-outline" size={18} color="rgba(255,255,255,0.35)" />
                  <Text style={styles.tipText}>Good lighting helps accuracy</Text>
                </View>
                <View style={styles.tipRow}>
                  <Ionicons name="crop-outline" size={18} color="rgba(255,255,255,0.35)" />
                  <Text style={styles.tipText}>Capture the full receipt</Text>
                </View>
                <View style={styles.tipRow}>
                  <Ionicons name="layers-outline" size={18} color="rgba(255,255,255,0.35)" />
                  <Text style={styles.tipText}>Add multiple receipts at once</Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Captured receipts */}
          {captures.map((cap, idx) => (
            <View key={cap.id} style={styles.captureCard}>
              <Image source={{ uri: cap.localUri }} style={styles.thumbnail} />
              <View style={styles.captureInfo}>
                <Text style={styles.captureName}>
                  {cap.merchantName || `Receipt ${idx + 1}`}
                </Text>
                <Text style={styles.captureDetail}>
                  {cap.items.length} item{cap.items.length !== 1 ? 's' : ''} · {formatCurrency(cap.total)}
                </Text>
              </View>
              <AnimatedPressable onPress={() => removeCapture(cap.id)} hitSlop={12}>
                <Ionicons name="close-circle" size={24} color="rgba(255,100,100,0.7)" />
              </AnimatedPressable>
            </View>
          ))}

          {/* Loading state */}
          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
              <Text style={styles.loadingText}>Scanning receipt...</Text>
            </View>
          ) : null}

          {/* Error */}
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <AnimatedPressable onPress={() => setError(null)}>
                <Text style={styles.errorDismiss}>Dismiss</Text>
              </AnimatedPressable>
            </View>
          ) : null}

          {/* Scan buttons */}
          {!loading ? (
            <View style={styles.scanSection}>
              {captures.length > 0 ? (
                <Text style={styles.addMoreLabel}>Add another receipt</Text>
              ) : null}
              <View style={styles.scanRow}>
                <AnimatedPressable style={styles.scanBtn} onPress={handleCamera}>
                  <Ionicons name="camera" size={22} color="#0B0B0C" />
                  <Text style={styles.scanBtnText}>Camera</Text>
                </AnimatedPressable>
                <AnimatedPressable style={styles.scanBtnSecondary} onPress={handleLibrary}>
                  <Ionicons name="images-outline" size={22} color="#fff" />
                  <Text style={styles.scanBtnSecondaryText}>Photos</Text>
                </AnimatedPressable>
              </View>
            </View>
          ) : null}
        </ScrollView>

        {/* Continue button */}
        {captures.length > 0 ? (
          <AnimatedPressable
            style={({ pressed }) => [styles.continueBtn, pressed && { opacity: 0.8 }]}
            onPress={handleContinue}
            disabled={loading}
          >
            <Text style={styles.continueBtnText}>
              Continue with {captures.length} receipt{captures.length !== 1 ? 's' : ''}
            </Text>
          </AnimatedPressable>
        ) : null}
      </View>
    </SafeAreaView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, padding: 20, paddingTop: 16 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '600', color: '#fff', flex: 1, textAlign: 'center', marginHorizontal: 12 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  emptyState: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  emptyIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#fff', marginBottom: 8 },
  emptySubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  tipsList: {
    marginTop: 20,
    alignSelf: 'stretch',
    gap: 10,
    paddingHorizontal: 8,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(99,102,241,0.04)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.08)',
  },
  tipText: { color: 'rgba(255,255,255,0.45)', fontSize: 14 },
  captureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.cardBorder,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  captureInfo: { flex: 1 },
  captureName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 2 },
  captureDetail: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: T.cardBg,
    borderRadius: 12,
    padding: 20,
    marginBottom: 10,
  },
  loadingText: { color: 'rgba(255,255,255,0.6)', fontSize: 15 },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: { flex: 1, color: '#fca5a5', fontSize: 14 },
  errorDismiss: { color: '#fca5a5', fontSize: 14, fontWeight: '600', marginLeft: 8 },
  scanSection: { marginTop: 20 },
  addMoreLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  scanRow: {
    flexDirection: 'row',
    gap: 12,
  },
  scanBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: T.ctaBg,
    paddingVertical: 22,
    borderRadius: 14,
  },
  scanBtnText: { fontSize: 16, fontWeight: '600', color: T.ctaText },
  scanBtnSecondary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 22,
    borderRadius: 14,
  },
  scanBtnSecondaryText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  continueBtn: {
    backgroundColor: T.ctaBg,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  continueBtnText: { color: T.ctaText, fontSize: 16, fontWeight: '600' },
});
