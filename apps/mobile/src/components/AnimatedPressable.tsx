import React, { useRef, useCallback } from 'react';
import { Animated, Pressable, type PressableProps } from 'react-native';

/**
 * Drop-in replacement for Pressable that adds a subtle push/spring animation on press.
 */
export function AnimatedPressable({
  onPressIn,
  onPressOut,
  style,
  children,
  disabled,
  ...rest
}: PressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(
    (e: any) => {
      Animated.spring(scale, {
        toValue: 0.96,
        friction: 8,
        tension: 300,
        useNativeDriver: true,
      }).start();
      onPressIn?.(e);
    },
    [scale, onPressIn],
  );

  const handlePressOut = useCallback(
    (e: any) => {
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 200,
        useNativeDriver: true,
      }).start();
      onPressOut?.(e);
    },
    [scale, onPressOut],
  );

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      {...rest}
      style={style}
    >
      {typeof children === 'function' ? (
        children
      ) : (
        <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
      )}
    </Pressable>
  );
}
