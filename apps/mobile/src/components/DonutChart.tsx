import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

const DONUT_SIZE = 180;
const PAD = 6; // extra room so thickened strokes don't clip
const VB = DONUT_SIZE + PAD * 2; // viewBox is larger than the rendered size
const DONUT_STROKE = 24;
const DONUT_R = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_CX = VB / 2;
const DONUT_CY = VB / 2;
const GAP = 4;

export type DonutSegment = {
  category: string;
  cents: number;
  percent: number;
  color: string;
};

interface DonutChartProps {
  segments: DonutSegment[];
  totalCents: number;
  formatCurrency: (cents: number) => string;
  periodLabel?: string;
  selectedCategory?: string | null;
}

export function DonutChart({
  segments,
  totalCents,
  formatCurrency,
  periodLabel = 'This month',
  selectedCategory,
}: DonutChartProps) {
  const filtered = segments.filter((s) => s.cents > 0);
  const circumference = 2 * Math.PI * DONUT_R;

  // Entrance animation
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const prevSegmentKey = useRef('');
  const segmentKey = filtered.map((s) => s.category + s.cents).join(',');

  useEffect(() => {
    if (segmentKey && segmentKey !== prevSegmentKey.current) {
      prevSegmentKey.current = segmentKey;
      sweepAnim.setValue(0);
      Animated.timing(sweepAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [segmentKey, sweepAnim]);

  // Center label bounce when selection changes
  const centerScale = useRef(new Animated.Value(1)).current;
  const prevSelected = useRef(selectedCategory);

  useEffect(() => {
    if (prevSelected.current !== selectedCategory) {
      prevSelected.current = selectedCategory;
      centerScale.setValue(0.85);
      Animated.spring(centerScale, {
        toValue: 1,
        friction: 5,
        tension: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedCategory, centerScale]);

  // Build segment layout with gaps
  const totalGap = filtered.length > 1 ? filtered.length * GAP : 0;
  const usableCirc = circumference - totalGap;

  let offset = 0;
  const withLength = filtered.map((seg) => {
    const length = totalCents > 0 ? (seg.cents / totalCents) * usableCirc : 0;
    const item = { ...seg, length, offset };
    offset += length + GAP;
    return item;
  });

  const selected = selectedCategory
    ? filtered.find((s) => s.category === selectedCategory)
    : null;

  const svgOpacity = sweepAnim.interpolate({
    inputRange: [0, 0.3],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const svgScale = sweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.wrapper}>
      <View style={styles.chartContainer}>
        <Animated.View
          style={[
            styles.svgWrap,
            { opacity: svgOpacity, transform: [{ scale: svgScale }] },
          ]}
        >
          <Svg width={DONUT_SIZE} height={DONUT_SIZE} viewBox={`0 0 ${VB} ${VB}`}>
            {/* Background ring */}
            <Circle
              cx={DONUT_CX}
              cy={DONUT_CY}
              r={DONUT_R}
              fill="none"
              stroke="rgba(99,102,241,0.08)"
              strokeWidth={DONUT_STROKE}
            />
            {withLength.map((seg) => {
              const isSelected = selectedCategory === seg.category;
              // Selected: thicker stroke, full opacity. Others: thinner, faded.
              const strokeW = isSelected ? DONUT_STROKE + 6 : DONUT_STROKE;
              const opacity = selectedCategory ? (isSelected ? 1 : 0.25) : 1;

              return (
                <G
                  key={seg.category}
                  transform={`rotate(-90, ${DONUT_CX}, ${DONUT_CY})`}
                  opacity={opacity}
                >
                  <Circle
                    cx={DONUT_CX}
                    cy={DONUT_CY}
                    r={DONUT_R}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={strokeW}
                    strokeDasharray={`${seg.length} ${circumference}`}
                    strokeDashoffset={-seg.offset}
                    strokeLinecap="butt"
                  />
                </G>
              );
            })}
          </Svg>
        </Animated.View>
        <View style={styles.centerLabel} pointerEvents="none">
          <Animated.View style={{ transform: [{ scale: centerScale }], alignItems: 'center' }}>
            {selected ? (
              <>
                <Text style={[styles.centerCategory, { color: selected.color }]}>
                  {selected.category}
                </Text>
                <Text style={styles.centerAmount}>
                  {formatCurrency(selected.cents)}
                </Text>
                <Text style={styles.centerSubtext}>
                  {selected.percent.toFixed(0)}% of total
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.centerAmount}>{formatCurrency(totalCents)}</Text>
                <Text style={styles.centerSubtext}>{periodLabel}</Text>
              </>
            )}
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  chartContainer: {
    width: DONUT_SIZE,
    height: DONUT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgWrap: {
    position: 'absolute',
    width: DONUT_SIZE,
    height: DONUT_SIZE,
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCategory: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  centerAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  centerSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
});
