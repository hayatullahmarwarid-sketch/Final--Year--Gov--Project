import React, { useCallback, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Brand } from '@/constants/brand';
import { useAppTranslation } from '@/hooks/use-app-translation';

type Props = {
  visible: boolean;
  onSave: (dataUri: string) => void;
  onClose: () => void;
};

const W = 360;
const H = 180;

export function SignaturePadModal({ visible, onSave, onClose }: Props) {
  const { t } = useAppTranslation();
  const [paths, setPaths] = useState<string[]>([]);
  const strokeRef = useRef('');

  const appendPoint = useCallback((x: number, y: number) => {
    strokeRef.current += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    setPaths((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      next[next.length - 1] = strokeRef.current;
      return next;
    });
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX: lx, locationY: ly } = e.nativeEvent;
        const x = Math.max(0, Math.min(W, lx));
        const y = Math.max(0, Math.min(H, ly));
        strokeRef.current = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
        setPaths((p) => [...p, strokeRef.current]);
      },
      onPanResponderMove: (e) => {
        const { locationX: lx, locationY: ly } = e.nativeEvent;
        const x = Math.max(0, Math.min(W, lx));
        const y = Math.max(0, Math.min(H, ly));
        appendPoint(x, y);
      },
      onPanResponderRelease: () => {
        strokeRef.current = '';
      },
    }),
  ).current;

  const clear = () => {
    strokeRef.current = '';
    setPaths([]);
  };

  const save = () => {
    const cleaned = paths.filter((p) => p && p.length > 2);
    if (cleaned.length === 0) {
      onClose();
      return;
    }
    const body = cleaned
      .map(
        (d) =>
          `<path d="${d}" stroke="${Brand.green}" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
      )
      .join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`;
    const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    onSave(uri);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>{t('signatureSignHere')}</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('a11yClose')}>
              <Text style={styles.closeX}>{'\u2715'}</Text>
            </Pressable>
          </View>
          <View style={styles.padWrap} {...panResponder.panHandlers}>
            <Svg width={W} height={H} style={styles.svg}>
              {paths.map((d, i) => (
                <Path
                  key={`stroke-${i}`}
                  d={d}
                  stroke={Brand.green}
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </Svg>
          </View>
          <View style={styles.actions}>
            <Pressable style={styles.clearBtn} onPress={clear} accessibilityRole="button">
              <Text style={styles.clearBtnText}>{t('signatureClear')}</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={save} accessibilityRole="button">
              <Text style={styles.saveBtnText}>{t('signatureSave')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  closeX: {
    fontSize: 20,
    color: '#9CA3AF',
    paddingHorizontal: 4,
  },
  padWrap: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    alignItems: 'center',
  },
  svg: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Brand.green,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
