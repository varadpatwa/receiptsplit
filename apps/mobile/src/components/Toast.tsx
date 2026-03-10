import React, { useEffect, useRef, useCallback } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';

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

    translateY.setValue(80);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 300 }),
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    const duration = config.duration ?? 3000;
    if (duration > 0) {
      timerRef.current = setTimeout(dismiss, duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [config, dismiss, translateY, opacity]);

  if (!config) return null;

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }], opacity }]}
      pointerEvents="box-none"
    >
      {config.action ? (
        <AnimatedPressable
          style={({ pressed }) => [styles.inner, pressed && { opacity: 0.6 }]}
          onPress={() => { config.action!.onPress(); dismiss(); }}
        >
          <Text style={styles.actionText}>Undo</Text>
        </AnimatedPressable>
      ) : (
        <AnimatedPressable style={styles.inner} onPress={dismiss}>
          <Text style={styles.message}>{config.message}</Text>
        </AnimatedPressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    left: 40,
    right: 40,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  message: {
    color: '#1a1a1a',
    fontSize: 15,
    fontWeight: '500',
  },
  actionText: {
    color: '#6366f1',
    fontSize: 15,
    fontWeight: '700',
  },
});
