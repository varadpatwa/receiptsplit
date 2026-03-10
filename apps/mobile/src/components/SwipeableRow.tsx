/**
 * iMessage-style swipe-to-delete row.
 *
 * Behavior:
 * - Swipe left reveals a stationary red "Delete" button behind the row (reveal style).
 * - 1:1 tracking up to ACTION_WIDTH, then rubber-band resistance.
 * - Short swipe (<40% of button width) → springs back closed.
 * - Medium swipe → snaps open, button stays tappable.
 * - Full swipe (>55% of row) or fast flick → delete button expands to fill row, triggers onDelete.
 * - Only one row can be open at a time.
 * - Tapping the row while open closes it.
 */
import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from './AnimatedPressable';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ACTION_WIDTH = 76;
const SNAP_OPEN_THRESHOLD = ACTION_WIDTH * 0.4;
const FULL_SWIPE_THRESHOLD = SCREEN_WIDTH * 0.55;

// ── Global: only one row open at a time ──
let _closeCurrentRow: (() => void) | null = null;

function registerOpen(closeFn: () => void) {
  if (_closeCurrentRow && _closeCurrentRow !== closeFn) {
    _closeCurrentRow();
  }
  _closeCurrentRow = closeFn;
}

function unregisterOpen(closeFn: () => void) {
  if (_closeCurrentRow === closeFn) {
    _closeCurrentRow = null;
  }
}
// ─────────────────────────────────────────

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
}

export function SwipeableRow({ children, onDelete }: SwipeableRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const swiping = useRef(false);
  const isOpen = useRef(false);
  const rowHeight = useRef(0);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const [collapsing, setCollapsing] = useState(false);
  const deleted = useRef(false);

  // --- helpers ---

  const close = useCallback(() => {
    isOpen.current = false;
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
    unregisterOpen(close);
  }, [translateX]);

  const snapOpen = useCallback(() => {
    isOpen.current = true;
    registerOpen(close);
    Animated.spring(translateX, {
      toValue: -ACTION_WIDTH,
      useNativeDriver: true,
      damping: 22,
      stiffness: 250,
    }).start();
  }, [translateX, close]);

  const performDelete = useCallback(() => {
    if (deleted.current) return;
    deleted.current = true;
    // Expand delete button to fill row
    Animated.timing(translateX, {
      toValue: -SCREEN_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      // Collapse row height like iMessage
      if (rowHeight.current > 0) {
        setCollapsing(true);
        heightAnim.setValue(rowHeight.current);
        Animated.timing(heightAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start(() => onDelete());
      } else {
        onDelete();
      }
    });
  }, [translateX, heightAnim, onDelete]);

  useEffect(() => () => unregisterOpen(close), [close]);

  // --- gesture ---

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gs) => {
        // Steal gesture from FlatList for clear horizontal swipes
        if (Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5) {
          return true;
        }
        return false;
      },

      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,

      onPanResponderTerminationRequest: () => !swiping.current,

      onPanResponderGrant: () => {
        translateX.stopAnimation();
        swiping.current = true;
        // Close any other open row
        if (!isOpen.current) {
          registerOpen(close);
        }
      },

      onPanResponderMove: (_, gs) => {
        const base = isOpen.current ? -ACTION_WIDTH : 0;
        const raw = base + gs.dx;

        // Don't allow swiping right past home
        if (raw >= 0) {
          translateX.setValue(0);
          return;
        }

        const abs = Math.abs(raw);
        if (abs <= ACTION_WIDTH) {
          // 1:1 tracking in the reveal zone
          translateX.setValue(raw);
        } else {
          // Rubber band past the button area (0.35x rate)
          const over = abs - ACTION_WIDTH;
          translateX.setValue(-(ACTION_WIDTH + over * 0.35));
        }
      },

      onPanResponderRelease: (_, gs) => {
        swiping.current = false;
        const base = isOpen.current ? -ACTION_WIDTH : 0;
        const raw = base + gs.dx;
        const abs = Math.abs(raw);

        // Full swipe or fast flick → delete
        if (abs > FULL_SWIPE_THRESHOLD || gs.vx < -1.2) {
          performDelete();
          return;
        }

        // Past snap threshold → snap open
        if (abs > SNAP_OPEN_THRESHOLD) {
          snapOpen();
          return;
        }

        // Below threshold → close
        close();
      },

      onPanResponderTerminate: () => {
        swiping.current = false;
        close();
      },
    })
  ).current;

  // --- delete button press ---
  const handleDeletePress = useCallback(() => {
    performDelete();
  }, [performDelete]);

  // --- measure row height for collapse animation ---
  const onLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      rowHeight.current = e.nativeEvent.layout.height;
    },
    []
  );

  return (
    <Animated.View
      style={[
        styles.container,
        collapsing && { height: heightAnim, marginBottom: heightAnim.interpolate({
          inputRange: [0, rowHeight.current || 1],
          outputRange: [0, 12],
          extrapolate: 'clamp',
        }) },
      ]}
      onLayout={onLayout}
    >
      {/* Stationary delete button behind the row */}
      <View style={styles.actionTrack}>
        <AnimatedPressable onPress={handleDeletePress} style={styles.deleteButton}>
          <View style={styles.trashCircle}>
            <Ionicons name="trash" size={20} color="#fff" />
          </View>
        </AnimatedPressable>
      </View>

      {/* Foreground row content */}
      <Animated.View
        style={[styles.foreground, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionTrack: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteButton: {
    width: ACTION_WIDTH,
    backgroundColor: '#0B0B0C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trashCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  foreground: {
    backgroundColor: '#0B0B0C',
  },
});
