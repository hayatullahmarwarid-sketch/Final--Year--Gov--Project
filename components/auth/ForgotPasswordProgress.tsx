import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Brand } from '@/constants/brand';
import { FormColors } from '@/constants/form';

type ForgotPasswordProgressProps = {
  step: 1 | 2 | 3;
};

/** Three-step forgot-password indicator (pill + dots per mock). */
export function ForgotPasswordProgress({ step }: ForgotPasswordProgressProps) {
  return (
    <View style={styles.row}>
      {step === 1 ? (
        <>
          <View style={[styles.pill, styles.filled]} />
          <View style={styles.circleOutline} />
          <View style={styles.circleOutline} />
        </>
      ) : step === 2 ? (
        <>
          <View style={[styles.dot, styles.filled]} />
          <View style={[styles.dot, styles.filled]} />
          <View style={styles.circleOutline} />
        </>
      ) : (
        <>
          <View style={[styles.dot, styles.filled]} />
          <View style={[styles.dot, styles.filled]} />
          <View style={[styles.pill, styles.filled]} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  pill: {
    width: 44,
    height: 8,
    borderRadius: 4,
    backgroundColor: FormColors.segmentEmpty,
  },
  filled: {
    backgroundColor: Brand.green,
  },
  circleOutline: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: FormColors.border,
    backgroundColor: FormColors.background,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: FormColors.segmentEmpty,
  },
});
