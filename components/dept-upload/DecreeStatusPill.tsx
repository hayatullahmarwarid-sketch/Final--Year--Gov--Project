import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { DecreeRowDisplayStatus } from '@/components/dept-upload/decrees-table-model';
import { useDeptUploadThemeColorsOptional } from '@/contexts/dept-upload-ui-context';

type Props = { status: DecreeRowDisplayStatus };

export function DecreeStatusPill({ status }: Props) {
  const c = useDeptUploadThemeColorsOptional();
  const pal = PALETTE[status];
  const resolved = status === 'draft' ? { bg: c.cardBgMuted, fg: c.textSecondary } : pal;
  return (
    <View style={[styles.pill, { backgroundColor: resolved.bg }]}>
      <Text style={[styles.pillTxt, { color: resolved.fg }]}>{status}</Text>
    </View>
  );
}

const PALETTE: Record<DecreeRowDisplayStatus, { bg: string; fg: string }> = {
  rejected: { bg: '#FEE2E2', fg: '#B91C1C' },
  pending: { bg: '#FEF3C7', fg: '#92400E' },
  draft: { bg: '#F3F4F6', fg: '#4B5563' },
  published: { bg: '#D1FAE5', fg: '#065F46' },
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  pillTxt: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
});
