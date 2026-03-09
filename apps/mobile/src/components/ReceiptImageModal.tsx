import React, { useState, useEffect } from 'react';
import { Modal, View, Image, Pressable, StyleSheet, ActivityIndicator, Text, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface ReceiptImageModalProps {
  visible: boolean;
  storagePath: string;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function ReceiptImageModal({ visible, storagePath, onClose }: ReceiptImageModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !storagePath) return;
    setLoading(true);
    setError(null);
    supabase.storage
      .from('receipts')
      .createSignedUrl(storagePath, 3600)
      .then(({ data, error: err }) => {
        if (err || !data?.signedUrl) {
          setError('Could not load receipt image');
        } else {
          setImageUrl(data.signedUrl);
        }
      })
      .catch(() => setError('Could not load receipt image'))
      .finally(() => setLoading(false));
  }, [visible, storagePath]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
        {loading ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  image: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.75,
  },
  errorText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
});
