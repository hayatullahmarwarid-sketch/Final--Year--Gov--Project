import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';

import { FormColors, radius, semantic, spacing, touchTarget, typography } from '@/lib/theme';

export type FormInputProps = TextInputProps & {
  label: string;
  error?: string | null;
  /** Visual state for inline validation (e.g. valid email). */
  fieldState?: 'default' | 'valid' | 'error';
  /** Muted fill matches legacy password fields. */
  surface?: 'default' | 'muted';
  leftAccessory?: React.ReactNode;
  rightAccessory?: React.ReactNode;
  containerStyle?: ViewStyle;
  accessibilityHint?: string;
};

export function FormInput({
  label,
  error,
  fieldState = 'default',
  surface = 'default',
  leftAccessory,
  rightAccessory,
  containerStyle,
  style,
  accessibilityHint,
  ...inputProps
}: FormInputProps) {
  const showError = Boolean(error);
  const shellState = showError || fieldState === 'error' ? 'error' : fieldState === 'valid' ? 'valid' : 'default';

  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.shell,
          surface === 'muted' && styles.shellMuted,
          shellState === 'valid' && styles.shellValid,
          shellState === 'error' && styles.shellError,
        ]}>
        {leftAccessory ? <View style={styles.side}>{leftAccessory}</View> : null}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={FormColors.placeholder}
          accessibilityLabel={label}
          accessibilityHint={accessibilityHint}
          {...inputProps}
        />
        {rightAccessory ? <View style={[styles.side, styles.sideEnd]}>{rightAccessory}</View> : null}
      </View>
      {showError ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={16} color={semantic.errorText} style={styles.errorIcon} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  label: {
    ...typography.caption,
    color: FormColors.label,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: FormColors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    backgroundColor: FormColors.background,
    minHeight: touchTarget.min - 2,
  },
  shellMuted: {
    backgroundColor: FormColors.inputMutedFill,
    paddingHorizontal: spacing.sm + spacing.xxs,
  },
  shellValid: {
    borderColor: FormColors.validBorder,
    borderWidth: 1.5,
  },
  shellError: {
    borderColor: semantic.errorText,
    borderWidth: 1.5,
    backgroundColor: semantic.errorBg,
  },
  side: {
    marginEnd: spacing.xs,
  },
  sideEnd: {
    marginEnd: 0,
    marginStart: spacing.xs,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    ...typography.body,
    color: FormColors.title,
    minHeight: touchTarget.min - 6,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  errorIcon: {
    marginTop: 2,
  },
  errorText: {
    flex: 1,
    ...typography.caption,
    fontWeight: '600',
    color: semantic.errorText,
  },
});
