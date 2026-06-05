import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Brand } from '@/constants/brand';
import { useAppTranslation } from '@/hooks/use-app-translation';

type ExamScoreRingProps = {
  percent: number;
  passed: boolean;
  size?: number;
  strokeWidth?: number;
};

/** Circular score gauge — green fill when passed, red when failed. */
export function ExamScoreRing({
  percent,
  passed,
  size = 152,
  strokeWidth = 12,
}: ExamScoreRingProps) {
  const { t, number } = useAppTranslation();
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, percent));
  const strokeDashoffset = circumference * (1 - pct / 100);

  const color = passed ? Brand.green : '#DC2626';
  const track = passed ? 'rgba(11, 79, 46, 0.12)' : '#E5E7EB';

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg
        width={size}
        height={size}
        accessibilityLabel={t('examScoreRingA11y', { score: number(percent) })}>
        <Circle cx={cx} cy={cy} r={r} stroke={track} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, styles.center]}>
        <Text style={[styles.pct, { color }]} maxFontSizeMultiplier={1.2}>
          {number(percent)}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pct: {
    fontSize: 36,
    fontWeight: '800',
  },
});
