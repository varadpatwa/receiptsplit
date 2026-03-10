import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Share, Alert } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import type { Split } from '@receiptsplit/shared';
import { calculateBreakdown, getReceiptTotal, generateShareableText } from '@receiptsplit/shared';
import { Stepper } from '../../components/Stepper';
import { ReceiptImageModal } from '../../components/ReceiptImageModal';
import { T } from '../../theme/colors';
import { AuroraBackground } from '../../components/AuroraBackground';

interface ExportScreenProps {
  split: Split;
  onBack: () => void;
  onReturnHome: () => void;
  onDelete: () => void;
  isGuest?: boolean;
  onSaveToAccount?: () => void;
}

export function ExportScreen({ split, onBack, onReturnHome, onDelete, isGuest, onSaveToAccount }: ExportScreenProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const breakdowns = calculateBreakdown(split);
  const shareableText = generateShareableText(split, breakdowns);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(shareableText);
      setToast('Copied to clipboard');
      setTimeout(() => setToast(null), 2000);
    } catch {
      Alert.alert('Copy failed', 'Could not copy to clipboard.');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: split.name || 'Split Summary',
        message: shareableText,
      });
    } catch (e: any) {
      if (e?.message !== 'User did not share') handleCopy();
    }
  };

  return (
    <AuroraBackground>
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <AnimatedPressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
          </AnimatedPressable>
          <Text style={styles.title}>Export</Text>
        </View>
        <Stepper currentStep="export" />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Share your split</Text>
          <Text style={styles.muted}>
            Send the breakdown to your group so everyone knows what they owe.
          </Text>
          <View style={styles.buttonGroup}>
            <AnimatedPressable onPress={handleCopy} style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.8 }]}>
              <Ionicons name="copy-outline" size={20} color="#fff" />
              <Text style={styles.secondaryBtnText}>Copy to Clipboard</Text>
            </AnimatedPressable>
            <AnimatedPressable onPress={handleShare} style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.8 }]}>
              <Ionicons name="share-outline" size={20} color="#fff" />
              <Text style={styles.secondaryBtnText}>Share</Text>
            </AnimatedPressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Preview</Text>
          <View style={styles.previewBox}>
            <Text style={styles.previewText}>{shareableText}</Text>
          </View>
        </View>

        {split.receiptImagePath ? (
          <AnimatedPressable onPress={() => setReceiptModalVisible(true)} style={({ pressed }) => [styles.secondaryBtn, { marginBottom: 16 }, pressed && { opacity: 0.8 }]}>
            <Ionicons name="receipt-outline" size={20} color="#fff" />
            <Text style={styles.secondaryBtnText}>View Receipt</Text>
          </AnimatedPressable>
        ) : null}

        {split.receiptImagePath ? (
          <ReceiptImageModal
            visible={receiptModalVisible}
            storagePath={split.receiptImagePath}
            onClose={() => setReceiptModalVisible(false)}
          />
        ) : null}

        {toast ? <Text style={styles.toast}>{toast}</Text> : null}

        {isGuest ? (
          <>
            {onSaveToAccount ? (
              <AnimatedPressable onPress={onSaveToAccount} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.8 }]}>
                <Ionicons name="cloud-upload-outline" size={20} color="#000" />
                <Text style={styles.primaryBtnText}>Save to my account</Text>
              </AnimatedPressable>
            ) : null}
            <AnimatedPressable onPress={onReturnHome} style={({ pressed }) => [styles.secondaryBtn, { marginTop: 8 }, pressed && { opacity: 0.8 }]}>
              <Ionicons name="checkmark-done" size={20} color="#fff" />
              <Text style={styles.secondaryBtnText}>Done (temporary)</Text>
            </AnimatedPressable>
          </>
        ) : (
          <>
            <AnimatedPressable onPress={onReturnHome} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.8 }]}>
              <Ionicons name="home" size={20} color="#000" />
              <Text style={styles.primaryBtnText}>Return Home</Text>
            </AnimatedPressable>
            <AnimatedPressable onPress={onDelete} style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.8 }]}>
              <Ionicons name="trash-outline" size={20} color="rgba(255,100,100,0.9)" />
              <Text style={styles.deleteBtnText}>Delete split</Text>
            </AnimatedPressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { padding: 8, marginRight: 8 },
  title: { fontSize: 22, fontWeight: '600', color: '#fff' },
  card: {
    backgroundColor: T.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.cardBorder,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 8 },
  muted: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 16 },
  buttonGroup: { gap: 12 },
  secondaryBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 8,
  },
  secondaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  previewBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
  },
  previewText: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  toast: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 12 },
  primaryBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: T.ctaBg,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  primaryBtnText: { color: T.ctaText, fontSize: 16, fontWeight: '600' },
  deleteBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,100,100,0.3)',
    borderRadius: 12,
  },
  deleteBtnText: { color: 'rgba(255,100,100,0.9)', fontSize: 16, fontWeight: '600' },
});
