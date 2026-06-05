import { Ionicons } from '@expo/vector-icons';
import { type Href, router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PublicDecreeTitleCanvas } from '@/components/decree/PublicDecreeTitleCanvas';
import type { DeptUploadThemeColors } from '@/contexts/dept-upload-ui-context';
import { useAppLanguage } from '@/contexts/app-language-context';
import { useDeptUploadThemeColorsOptional } from '@/contexts/dept-upload-ui-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { Brand } from '@/lib/theme';

import { DeptUploadDash } from '@/constants/dept-upload-dashboard';
import type { AppLanguageId } from '@/constants/languages';

export type RecentUploadRow = {
  id: string;
  titleLine: string;
  metaLine: string;
  pill: 'draft' | 'pending' | 'published' | 'archived' | 'superseded';
  /** Optional category label for preview when decree API is not loaded yet. */
  categoryHint?: string;
};

type Props = {
  rows: RecentUploadRow[];
  onSelectRow?: (row: RecentUploadRow) => void;
};

function Pill({ kind, c }: { kind: RecentUploadRow['pill']; c: DeptUploadThemeColors }) {
  const { t } = useAppTranslation();
  if (kind === 'pending') {
    return (
      <View style={[styles.pill, styles.pillPending]}>
        <Text style={styles.pillPendingTxt}>{t('examStatusPending')}</Text>
      </View>
    );
  }
  if (kind === 'published') {
    return (
      <View style={[styles.pill, styles.pillPublished]}>
        <Text style={styles.pillPublishedTxt}>{t('examStatusPublished')}</Text>
      </View>
    );
  }
  if (kind === 'archived' || kind === 'superseded') {
    return (
      <View style={[styles.pill, { backgroundColor: c.cardBgMuted }]}>
        <Text style={[styles.pillArchivedTxt, { color: c.textSecondary }]}>
          {kind === 'superseded' ? t('deptPillSuperseded') : t('deptPillArchived')}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.pill, { backgroundColor: c.cardBgMuted }]}>
      <Text style={[styles.pillDraftTxt, { color: c.textSecondary }]}>{t('examStatusDraft')}</Text>
    </View>
  );
}

export function DeptUploadRecentUploadsCard({ rows, onSelectRow }: Props) {
  const c = useDeptUploadThemeColorsOptional();
  const { t } = useAppTranslation();
  const { language } = useAppLanguage();
  return (
    <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
      <View style={styles.head}>
        <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t('deptRecentUploadsTitle')}</Text>
        <Pressable onPress={() => router.push('/dept-upload/decrees' as Href)} hitSlop={8}>
          <Text style={styles.viewAll}>{t('deptViewAllLink')}</Text>
        </Pressable>
      </View>
      {rows.length === 0 ? (
        <Text style={[styles.empty, { color: c.textMuted }]}>{t('deptNoUploadsYet')}</Text>
      ) : (
        rows.slice(0, 6).map((r) => (
          <RecentUploadRowView key={r.id} row={r} theme={c} language={language} onSelectRow={onSelectRow} />
        ))
      )}
    </View>
  );
}

function RecentUploadRowView({
  row,
  theme,
  language,
  onSelectRow,
}: {
  row: RecentUploadRow;
  theme: DeptUploadThemeColors;
  language: AppLanguageId;
  onSelectRow?: (row: RecentUploadRow) => void;
}) {
  return (
    <Pressable
      onPress={() =>
        onSelectRow ? onSelectRow(row) : router.push(`/dept-upload/decrees/${row.id}` as Href)
      }
      style={[styles.row, { borderTopColor: theme.rowDivider }]}>
      <View style={styles.rowIcon}>
        <Ionicons name="document-text" size={18} color={Brand.green} />
      </View>
      <View style={styles.rowMid}>
        <PublicDecreeTitleCanvas
          text={row.titleLine}
          language={language}
          textStyle={[styles.rowTitle, { color: theme.textPrimary }]}
        />
        <Text style={[styles.rowMeta, { color: theme.textMuted }]} numberOfLines={1}>
          {row.metaLine}
        </Text>
      </View>
      <View style={styles.rowPillWrap}>
        <Pill kind={row.pill} c={theme} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: DeptUploadDash.radiusLg,
    padding: 20,
    borderWidth: 1,
    ...DeptUploadDash.shadow,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.green,
  },
  empty: {
    fontSize: 14,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rowMid: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    alignSelf: 'stretch',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  rowPillWrap: {
    alignSelf: 'center',
  },
  rowMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillDraftTxt: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  pillPending: {
    backgroundColor: '#FEF3C7',
  },
  pillPendingTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    textTransform: 'lowercase',
  },
  pillPublished: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  pillPublishedTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.green,
    textTransform: 'lowercase',
  },
  pillArchivedTxt: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
});
