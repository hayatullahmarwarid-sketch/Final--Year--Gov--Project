import { useMemo } from 'react';
import { Platform, Pressable, type PressableProps, type PressableStateCallbackType, type StyleProp, type ViewStyle } from 'react-native';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { androidRipple, touchTarget } from '@/lib/theme';

export type AppPressableProps = PressableProps & {
  /** When true, uses a stronger primary-tinted ripple on Android. */
  variant?: 'default' | 'primary';
};

function mergeHitSlop(
  slop: PressableProps['hitSlop'],
): NonNullable<PressableProps['hitSlop']> | undefined {
  if (slop == null) {
    return { top: 12, bottom: 12, left: 12, right: 12 };
  }
  if (typeof slop === 'number') {
    const n = Math.max(slop, 12);
    return { top: n, bottom: n, left: n, right: n };
  }
  return {
    top: Math.max(slop.top ?? 0, 12),
    bottom: Math.max(slop.bottom ?? 0, 12),
    left: Math.max(slop.left ?? 0, 12),
    right: Math.max(slop.right ?? 0, 12),
  };
}

export function AppPressable({
  style,
  hitSlop,
  variant = 'default',
  android_ripple,
  ...rest
}: AppPressableProps) {
  const reduceMotion = useReducedMotion();

  const ripple = useMemo(() => {
    if (Platform.OS !== 'android') return undefined;
    if (android_ripple) return android_ripple;
    return {
      color: variant === 'primary' ? androidRipple.primary : androidRipple.neutral,
      borderless: false,
    };
  }, [android_ripple, variant]);

  const resolvedStyle = useMemo(() => {
    return (state: PressableStateCallbackType): StyleProp<ViewStyle> => {
      const base = typeof style === 'function' ? style(state) : style;
      const pressedStyle: ViewStyle | null =
        state.pressed && !reduceMotion && Platform.OS === 'ios' ? { opacity: 0.88 } : null;
      return [base, pressedStyle];
    };
  }, [style, reduceMotion]);

  return (
    <Pressable {...rest} hitSlop={mergeHitSlop(hitSlop)} android_ripple={ripple} style={resolvedStyle} />
  );
}

export const minTouchSizeStyle: ViewStyle = {
  minWidth: touchTarget.min,
  minHeight: touchTarget.min,
  alignItems: 'center',
  justifyContent: 'center',
};
