import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { T } from '../theme/colors';

/**
 * Renders a subtle mesh-gradient aurora behind screen content.
 * Uses SVG radial gradients for true soft-glow blobs (no blur needed).
 * Wrap your screen content in this component.
 */
export function AuroraBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.container}>
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 400 800">
        <Defs>
          <RadialGradient id="blob1" cx="15%" cy="8%" r="55%" fx="15%" fy="8%">
            <Stop offset="0%" stopColor="#6366f1" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="blob2" cx="90%" cy="30%" r="50%" fx="90%" fy="30%">
            <Stop offset="0%" stopColor="#a855f7" stopOpacity="0.06" />
            <Stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="blob3" cx="10%" cy="75%" r="45%" fx="10%" fy="75%">
            <Stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="blob4" cx="75%" cy="65%" r="40%" fx="75%" fy="65%">
            <Stop offset="0%" stopColor="#3b82f6" stopOpacity="0.04" />
            <Stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="400" height="800" fill="url(#blob1)" />
        <Rect x="0" y="0" width="400" height="800" fill="url(#blob2)" />
        <Rect x="0" y="0" width="400" height="800" fill="url(#blob3)" />
        <Rect x="0" y="0" width="400" height="800" fill="url(#blob4)" />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
});
