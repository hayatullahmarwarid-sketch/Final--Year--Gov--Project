import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppPressable } from '@/components/ui/AppPressable';
import { useAppTranslation } from '@/hooks/use-app-translation';
import {
  Brand,
  FormColors,
  palette,
  radius,
  shadowCard,
  spacing,
  touchTarget,
  typography,
} from '@/lib/theme';

const EXPAND_MS = 280;
const MAX_BODY = 4800;

export type CollapsibleFiltersAdminPalette = {
  cardBg: string;
  borderColor: string;
  titleColor: string;
  mutedColor: string;
  triggerIdleBg: string;
  accentColor?: string;
};

export type CollapsibleFiltersProps = {
  /** Header label; defaults to translation for bank filters */
  title?: string;
  /** Optional right-side summary when collapsed (e.g. “Showing 3 / 40”) */
  summary?: string;
  /** Shows a small numeric badge when > 0 */
  activeCount?: number;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  children: React.ReactNode;
  /** Called when Apply is pressed */
  onApply?: () => void;
  /** Called when Reset is pressed */
  onReset?: () => void;
  resetDisabled?: boolean;
  /** Show Apply / Reset row (default: true if either handler is provided) */
  showActions?: boolean;
  /** Collapse panel after Apply (default true) */
  collapseOnApply?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Optional overrides for system-admin dark surfaces */
  adminPalette?: CollapsibleFiltersAdminPalette;
  testID?: string;
};

export function CollapsibleFilters({
  title,
  summary,
  activeCount = 0,
  defaultExpanded = false,
  expanded: expandedControlled,
  onExpandedChange,
  children,
  onApply,
  onReset,
  resetDisabled,
  showActions,
  collapseOnApply = true,
  style,
  adminPalette,
  testID,
}: CollapsibleFiltersProps) {
  const { t } = useAppTranslation();
  const isControlled = expandedControlled !== undefined;
  const [expandedInner, setExpandedInner] = useState(defaultExpanded);
  const expanded = isControlled ? Boolean(expandedControlled) : expandedInner;

  const setExpanded = useCallback(
    (next: boolean) => {
      if (!isControlled) setExpandedInner(next);
      onExpandedChange?.(next);
    },
    [isControlled, onExpandedChange],
  );

  const expandProgress = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    expandProgress.value = withTiming(expanded ? 1 : 0, { duration: EXPAND_MS });
  }, [expanded, expandProgress]);

  const bodyAnimatedStyle = useAnimatedStyle(() => {
    const maxH = interpolate(expandProgress.value, [0, 1], [0, MAX_BODY]);
    const opacity = interpolate(expandProgress.value, [0, 0.08, 1], [0, 0.85, 1]);
    return {
      maxHeight: maxH,
      opacity,
      overflow: 'hidden' as const,
    };
  });

  const chevronRotation = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(expandProgress.value, [0, 1], [0, 180])}deg` }],
  }));

  const heading = title ?? t('filtersTitle');
  const applyLabel = t('filtersApply');
  const resetLabel = t('filtersReset');
  const actionsVisible = showActions ?? Boolean(onApply ?? onReset);

  const pal = adminPalette;
  const cardBg = pal?.cardBg ?? palette.white;
  const borderC = pal?.borderColor ?? palette.neutral200;
  const titleC = pal?.titleColor ?? FormColors.title;
  const mutedC = pal?.mutedColor ?? palette.neutral400;
  const accent = pal?.accentColor ?? Brand.green;
  const triggerIdle = pal?.triggerIdleBg ?? palette.neutral100;

  const onToggle = useCallback(() => {
    void Haptics.selectionAsync();
    setExpanded(!expanded);
  }, [expanded, setExpanded]);

  const handleApply = useCallback(() => {
    onApply?.();
    if (collapseOnApply) setExpanded(false);
  }, [collapseOnApply, onApply, setExpanded]);

  const triggerAccessibility = useMemo(
    () => ({
      expanded,
      label: heading,
    }),
    [expanded, heading],
  );

  return (
    <View
      testID={testID}
      style={[styles.wrap, pal ? { borderColor: borderC, backgroundColor: cardBg } : null, shadowCard(), style]}>
      <AppPressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: triggerIdle, borderColor: borderC },
          expanded && {
            borderColor: accent,
            backgroundColor: palette.primaryAlpha.a08,
          },
          pressed && styles.triggerPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={heading}
        accessibilityState={triggerAccessibility}>
        <View style={styles.triggerLeft}>
          <Ionicons name="funnel-outline" size={16} color={accent} />
          <Text style={[styles.triggerTitle, { color: titleC }]} maxFontSizeMultiplier={1.15}>
            {heading.toUpperCase()}
          </Text>
          {activeCount > 0 ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: palette.primaryAlpha.a12, borderColor: palette.primaryAlpha.a22 },
              ]}>
              <Text style={[styles.badgeText, { color: accent }]} maxFontSizeMultiplier={1.1}>
                {activeCount > 99 ? '99+' : String(activeCount)}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.triggerRight}>
          {summary ? (
            <Text style={[styles.summary, { color: mutedC }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
              {summary}
            </Text>
          ) : null}
          <Animated.View style={chevronRotation}>
            <Ionicons name="chevron-down" size={20} color={mutedC} />
          </Animated.View>
        </View>
      </AppPressable>

      <Animated.View
        style={[styles.bodyOuter, bodyAnimatedStyle]}
        pointerEvents={expanded ? 'auto' : 'none'}>
        <View style={[styles.bodyInner, { borderTopColor: borderC }]}>{children}</View>
        {actionsVisible ? (
          <View style={[styles.actionsRow, { borderTopColor: borderC }]}>
            {onReset ? (
              <AppPressable
                onPress={onReset}
                disabled={resetDisabled}
                style={({ pressed }) => [
                  styles.btnSecondary,
                  { borderColor: borderC, opacity: resetDisabled ? 0.45 : pressed ? 0.85 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={resetLabel}>
                <Ionicons name="refresh-outline" size={16} color={mutedC} />
                <Text style={[styles.btnSecondaryText, { color: mutedC }]} maxFontSizeMultiplier={1.1}>
                  {resetLabel.toUpperCase()}
                </Text>
              </AppPressable>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <AppPressable
              onPress={handleApply}
              style={({ pressed }) => [styles.btnPrimary, { opacity: pressed ? 0.92 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel={applyLabel}>
              <Text style={styles.btnPrimaryText} maxFontSizeMultiplier={1.1}>
                {applyLabel.toUpperCase()}
              </Text>
            </AppPressable>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    backgroundColor: palette.white,
    overflow: 'hidden',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touchTarget.min - 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    margin: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    backgroundColor: palette.neutral100,
  },
  triggerPressed: {
    opacity: 0.94,
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  triggerTitle: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: FormColors.title,
  },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  triggerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: '52%',
  },
  summary: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    flexShrink: 1,
    textAlign: 'right',
  },
  bodyOuter: {},
  bodyInner: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.neutral200,
    gap: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.neutral200,
    backgroundColor: palette.neutral50,
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    backgroundColor: palette.white,
  },
  btnSecondaryText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  btnPrimary: {
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? 10 : spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: Brand.green,
    minWidth: 112,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
});
