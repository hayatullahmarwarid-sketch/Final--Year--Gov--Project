import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppPressable } from '@/components/ui/AppPressable';
import { useAppLanguage } from '@/contexts/app-language-context';
import { Brand, palette } from '@/lib/theme';

type Props = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  /** Visual size. `md` (default) ≈ 48×28, `sm` ≈ 40×24. */
  size?: 'sm' | 'md' | 'lg';
  /** Override on/off track colors (e.g. for dark card backgrounds). */
  onColor?: string;
  offColor?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

const SIZES = {
  sm: { track: 40, height: 24, thumb: 18, pad: 3 },
  md: { track: 50, height: 30, thumb: 24, pad: 3 },
  lg: { track: 58, height: 34, thumb: 28, pad: 3 },
} as const;

/**
 * Premium pill-style switch with a white thumb that slides between states.
 * Matches the design system's deep-green ON state and neutral OFF state,
 * and is visually consistent across iOS, Android, and tablets.
 *
 * RTL: determined by the app language (Pashto / Dari), not the device OS setting.
 * When ON in an RTL language the thumb slides to the LEFT side of the track.
 */
export function AppSwitch({
  value,
  onValueChange,
  disabled,
  size = 'md',
  onColor = Brand.green,
  offColor = palette.neutral200,
  style,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const s = SIZES[size];
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [anim, value]);

  const { language } = useAppLanguage();
  const rtl = language === 'ps' || language === 'prs';

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: rtl
      ? [s.track - s.thumb - s.pad, s.pad]
      : [s.pad, s.track - s.thumb - s.pad],
  });

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [offColor, onColor],
  });

  return (
    <AppPressable
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={[styles.wrap, disabled && styles.disabled, style]}>
      <Animated.View
        style={[
          styles.track,
          {
            width: s.track,
            height: s.height,
            borderRadius: s.height / 2,
            backgroundColor: trackColor,
          },
        ]}>
        <Animated.View
          style={[
            styles.thumb,
            {
              width: s.thumb,
              height: s.thumb,
              borderRadius: s.thumb / 2,
              transform: [{ translateX }],
            },
          ]}
        />
      </Animated.View>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 2,
  },
  disabled: {
    opacity: 0.55,
  },
  track: {
    justifyContent: 'center',
  },
  thumb: {
    backgroundColor: palette.white,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
});
