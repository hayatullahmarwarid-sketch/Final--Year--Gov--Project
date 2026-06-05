import React from 'react';
import {
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/** Matches zip `MobileLayout`: `max-w-md` (~448px) centered on tablets / large phones. */
const MAX_CONTENT_WIDTH = 448;

type PublicMobileColumnProps = {
  children: React.ReactNode;
  /** Outer background (e.g. header green or page gray). */
  backgroundColor: string;
  style?: StyleProp<ViewStyle>;
};

export function PublicMobileColumn({
  children,
  backgroundColor,
  style,
}: PublicMobileColumnProps) {
  const { width } = useWindowDimensions();
  const sideGutter = width > MAX_CONTENT_WIDTH ? (width - MAX_CONTENT_WIDTH) / 2 : 0;

  return (
    <View style={[styles.outer, { backgroundColor, paddingHorizontal: sideGutter }, style]}>
      <View style={[styles.inner, { maxWidth: MAX_CONTENT_WIDTH }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    width: '100%',
  },
  inner: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
});
