import React from 'react';
import Svg, { Circle, G, Rect } from 'react-native-svg';

import { useAppTranslation } from '@/hooks/use-app-translation';
import { palette } from '@/lib/theme';

type EmblemMarkProps = {
  size?: number;
  gold?: string;
};

/** Layer: `Emblem` — official-style mark (interlaced squares / eightfold geometry), minimal line weight. */
export function EmblemMark({ size = 88, gold = palette.primary }: EmblemMarkProps) {
  const { t } = useAppTranslation();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel={t('a11yAppEmblem')}>
      <Circle cx="50" cy="50" r="46" stroke={gold} strokeWidth="2.25" fill="none" />
      <G transform="translate(50, 50)">
        <Rect
          x={-22}
          y={-22}
          width={44}
          height={44}
          stroke={gold}
          strokeWidth="2"
          fill="none"
        />
        <Rect
          x={-22}
          y={-22}
          width={44}
          height={44}
          stroke={gold}
          strokeWidth="2"
          fill="none"
          transform="rotate(45)"
        />
      </G>
    </Svg>
  );
}
