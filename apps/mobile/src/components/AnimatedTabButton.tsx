import React, { useRef, useEffect } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';

/**
 * Custom tab bar button that plays a spring bounce when the tab becomes active.
 */
export function AnimatedTabButton(props: BottomTabBarButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const prevAccessibilityState = useRef(props.accessibilityState?.selected);

  useEffect(() => {
    const isNowSelected = props.accessibilityState?.selected;
    const wasPrevSelected = prevAccessibilityState.current;
    prevAccessibilityState.current = isNowSelected;

    if (isNowSelected && !wasPrevSelected) {
      // Bounce in: quick scale up then spring back
      scale.setValue(0.85);
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [props.accessibilityState?.selected, scale]);

  return (
    <Pressable
      {...props}
      style={[props.style, styles.button]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {props.children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
