import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { Ionicons } from '@expo/vector-icons';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastConfig {
  message: string;
  variant?: ToastVariant;
  /** Auto-dismiss duration in ms. 0 = no auto-dismiss. Default 3000. */
  duration?: number;
  /** Optional action button (e.g. "Undo") */
  action?: { label: string; onPress: () => void };
}

interface ToastProps {
  config: ToastConfig | null;
  onDismiss: () => void;
}

const VARIANT_STYLES: Record<ToastVariant, { bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { bg: '#1a3a2a', icon: 'checkmark-circle' },
  error: { bg: '#3a1a1a', icon: 'alert-circle' },
  info: { bg: '#1a2a3a', icon: 'information-circle' },
};

export function Toast({ config, onDismiss }: ToastProps) {
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 80, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }, [onDismiss, translateY, opacity]);

  useEffect(() => {
    if (!config) return;

    // Animate in
    translateY.setValue(80);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 300 }),
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    // Auto-dismiss
    const duration = config.duration ?? 3000;
    if (duration > 0) {
      timerRef.current = setTimeout(dismiss, duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [config, dismiss, translateY, opacity]);

  if (!config) return null;

  const variant = config.variant ?? 'info';
  const { bg, icon } = VARIANT_STYLES[variant];

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: bg, transform: [{ translateY }], opacity }]}
      pointerEvents="box-none"
    >
      <AnimatedPressable style={styles.inner} onPress={dismiss}>
        <Ionicons name={icon} size={20} color="#fff" style={styles.icon} />
        <Text style={styles.message} numberOfLines={2}>{config.message}</Text>
        {config.action && (
          <AnimatedPressable
            onPress={() => { config.action!.onPress(); dismiss(); }}
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
            hitSlop={8}
          >
            <Text style={styles.actionText}>{config.action.label}</Text>
          </AnimatedPressable>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 9999,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  icon: { flexShrink: 0 },
  message: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  actionBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
