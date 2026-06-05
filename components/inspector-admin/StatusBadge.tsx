import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '@/lib/theme';

const PALETTE: Record<string, { bg: string; border: string; text: string }> = {
  active: { bg: '#DCFCE7', border: '#BBF7D0', text: '#166534' },
  draft: { bg: '#F3F4F6', border: '#E5E7EB', text: '#4B5563' },
  pending: { bg: '#FEF9C3', border: '#FDE047', text: '#854D0E' },
  approved: { bg: '#DCFCE7', border: '#BBF7D0', text: '#166534' },
  revision: { bg: '#FEE2E2', border: '#FECACA', text: '#991B1B' },
  high: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' },
  urgent: { bg: '#DC2626', border: '#DC2626', text: '#FFFFFF' },
  medium: { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309' },
  low: { bg: palette.primaryWash, border: palette.primaryWashBorder, text: palette.primaryShade2 },
  in_progress: { bg: '#E0F2FE', border: '#7DD3FC', text: '#075985' },
  published: { bg: '#DCFCE7', border: '#BBF7D0', text: '#166534' },
  revoked: { bg: '#FEE2E2', border: '#FECACA', text: '#991B1B' },
  passed: { bg: '#DCFCE7', border: '#BBF7D0', text: '#166534' },
  failed: { bg: '#FEE2E2', border: '#FECACA', text: '#991B1B' },
  submitted: { bg: '#DCFCE7', border: '#BBF7D0', text: '#166534' },
  overdue: { bg: '#FEE2E2', border: '#FECACA', text: '#991B1B' },
  archived: { bg: '#F3F4F6', border: '#E5E7EB', text: '#6B7280' },
  open: { bg: '#FEF9C3', border: '#FDE047', text: '#854D0E' },
  investigating: { bg: '#E0F2FE', border: '#7DD3FC', text: '#075985' },
  resolved: { bg: '#DCFCE7', border: '#BBF7D0', text: '#166534' },
};

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/\s+/g, '_');
  const c = PALETTE[key] ?? PALETTE.draft;
  const label = status.replace(/_/g, ' ');
  return (
    <View style={[styles.wrap, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.txt, { color: c.text }]} maxFontSizeMultiplier={1.1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  txt: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
});
