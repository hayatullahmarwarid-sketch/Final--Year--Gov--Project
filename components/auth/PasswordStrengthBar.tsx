import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FormColors } from '@/constants/form';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { isPasswordPolicyValid } from '@/lib/validation/password-policy';

export type PasswordStrength = 'none' | 'weak' | 'medium' | 'strong';

/** Aligns with registration policy: strong = meets all rules; otherwise partial progress. */
export function scorePasswordStrength(password: string): PasswordStrength {
  if (!password) return 'none';
  if (isPasswordPolicyValid(password)) return 'strong';
  let met = 0;
  if (password.length >= 8) met++;
  if (/[a-z]/.test(password)) met++;
  if (/[A-Z]/.test(password)) met++;
  if (/\d/.test(password)) met++;
  if (/[^A-Za-z0-9]/.test(password)) met++;
  if (met <= 2) return 'weak';
  return 'medium';
}

type PasswordStrengthBarProps = {
  strength: PasswordStrength;
};

export function PasswordStrengthBar({ strength }: PasswordStrengthBarProps) {
  const { t } = useAppTranslation();
  if (strength === 'none') return null;

  const filled =
    strength === 'weak' ? 1 : strength === 'medium' ? 2 : 3;
  const color =
    strength === 'weak'
      ? FormColors.weak
      : strength === 'medium'
        ? FormColors.medium
        : FormColors.strong;
  const label =
    strength === 'weak'
      ? t('passwordStrengthWeak')
      : strength === 'medium'
        ? t('passwordStrengthMedium')
        : t('passwordStrengthStrong');

  return (
    <View style={styles.wrap}>
      <View style={styles.barRow}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.segment,
              { backgroundColor: i < filled ? color : FormColors.segmentEmpty },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color }]} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
  },
  barRow: {
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  label: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
  },
});
