import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

const DONUT_SIZE = 160;
const DONUT_STROKE = 24;
const DONUT_R = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_CX = DONUT_SIZE / 2;
const DONUT_CY = DONUT_SIZE / 2;

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
}

export function DonutChart({ segments, totalCents, formatCurrency }: DonutChartProps) {
  const filtered = segments.filter((s) => s.cents > 0);
  const circumference = 2 * Math.PI * DONUT_R;
  let offset = 0;

  const withLength = filtered.map((seg) => {
    const length = totalCents > 0 ? (seg.cents / totalCents) * circumference : 0;
    const item = { ...seg, length, offset };
    offset += length;
    return item;
  });

  return (
    <View style={styles.wrapper}>
      <View style={styles.chartContainer}>
        <Svg width={DONUT_SIZE} height={DONUT_SIZE} style={styles.svg}>
          {/* Background ring */}
          <Circle
            cx={DONUT_CX}
            cy={DONUT_CY}
            r={DONUT_R}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={DONUT_STROKE}
          />
          {withLength.map((seg) => (
            <G key={seg.category} transform={`rotate(-90, ${DONUT_CX}, ${DONUT_CY})`}>
              <Circle
                cx={DONUT_CX}
                cy={DONUT_CY}
                r={DONUT_R}
                fill="none"
                stroke={seg.color}
                strokeWidth={DONUT_STROKE}
                strokeDasharray={`${seg.length} ${circumference}`}
                strokeDashoffset={-seg.offset}
                strokeLinecap="round"
              />
            </G>
          ))}
        </Svg>
        <View style={styles.centerLabel} pointerEvents="none">
          <Text style={styles.centerAmount}>{formatCurrency(totalCents)}</Text>
          <Text style={styles.centerSubtext}>This month</Text>
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
  svg: {
    position: 'absolute',
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  centerSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
});
