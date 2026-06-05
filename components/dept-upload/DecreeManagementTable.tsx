import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DecreeStatusPill } from '@/components/dept-upload/DecreeStatusPill';
import {
  decreeRowActions,
  decreeRowDisplayStatus,
  decreeViewsCount,
  type DecreeTableSortKey,
  type SortDir,
} from '@/components/dept-upload/decrees-table-model';
import { DeptUploadDash } from '@/constants/dept-upload-dashboard';
import { formatDecreeNumberLabel } from '@/lib/decree-number-format';
import type { SerializedDecree } from '@/lib/api/decree-upload';
import { useAppLanguage } from '@/contexts/app-language-context';
import { useDeptUploadThemeColorsOptional } from '@/contexts/dept-upload-ui-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { pickPublicDecreeTitleFromRow } from '@/lib/decree-title-typography';

const W_NUM = 44;
const W_CAT = 108;
const W_STAT = 92;
const W_VIEWS = 56;
const W_ACT = 132;

function SortGlyph({ active, dir }: { active: boolean; dir: SortDir | null }) {
  const c = useDeptUploadThemeColorsOptional();
  if (!active || dir === null) {
    return <Ionicons name="swap-vertical-outline" size={14} color={c.textMuted} />;
  }
  return <Ionicons name={dir === 'desc' ? 'chevron-down' : 'chevron-up'} size={14} color="#047857" />;
}

function truncateTitle(s: string, max = 34): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}

type Props = {
  rows: SerializedDecree[];
  sortKey: DecreeTableSortKey;
  sortDir: SortDir;
  onSort: (key: DecreeTableSortKey) => void;
  onEdit: (d: SerializedDecree) => void;
  onDelete: (d: SerializedDecree) => void;
  onAccept: (d: SerializedDecree) => void;
  onReject: (d: SerializedDecree) => void;
};

export function DecreeManagementTable({ rows, sortKey, sortDir, onSort, onEdit, onDelete, onAccept, onReject }: Props) {
  const c = useDeptUploadThemeColorsOptional();
  const { t, number } = useAppTranslation();
  const { language } = useAppLanguage();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={[styles.wrap, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
        <View style={[styles.headerRow, { borderBottomColor: c.cardBorder, backgroundColor: c.cardBgMuted }]}>
          <Pressable style={[styles.hNum, styles.hPress]} onPress={() => onSort('num')}>
            <Text style={[styles.hTxt, { color: c.textMuted }]}>{t('deptTableColNumber')}</Text>
            <SortGlyph active={sortKey === 'num'} dir={sortKey === 'num' ? sortDir : null} />
          </Pressable>
          <Pressable style={[styles.hTitle, styles.hPress]} onPress={() => onSort('title')}>
            <Text style={[styles.hTxt, { color: c.textMuted }]}>{t('submissionsColTitle')}</Text>
            <SortGlyph active={sortKey === 'title'} dir={sortKey === 'title' ? sortDir : null} />
          </Pressable>
          <Pressable style={[styles.hCat, styles.hPress]} onPress={() => onSort('category')}>
            <Text style={[styles.hTxt, { color: c.textMuted }]}>{t('certCardCategoryLabel')}</Text>
            <SortGlyph active={sortKey === 'category'} dir={sortKey === 'category' ? sortDir : null} />
          </Pressable>
          <Pressable style={[styles.hStat, styles.hPress]} onPress={() => onSort('status')}>
            <Text style={[styles.hTxt, { color: c.textMuted }]}>{t('systemAdminTableStatus')}</Text>
            <SortGlyph active={sortKey === 'status'} dir={sortKey === 'status' ? sortDir : null} />
          </Pressable>
          <Pressable style={[styles.hViews, styles.hPress]} onPress={() => onSort('views')}>
            <Text style={[styles.hTxt, { color: c.textMuted }]}>{t('deptPreviewViewsLabel')}</Text>
            <SortGlyph active={sortKey === 'views'} dir={sortKey === 'views' ? sortDir : null} />
          </Pressable>
          <Text style={[styles.hTxt, styles.hAct, { color: c.textMuted }]}>{t('resultsColActions')}</Text>
        </View>

        {rows.map((d) => {
          const ui = decreeRowDisplayStatus(d);
          const act = decreeRowActions(ui);
          const v = decreeViewsCount(d);
          const cat = d.categories[0]?.name ?? '—';
          return (
            <View key={d.id} style={[styles.row, { borderBottomColor: c.rowDivider }]}>
              <Text style={[styles.colNum, { color: c.textPrimary }]}>{formatDecreeNumberLabel(d)}</Text>
              <Text style={[styles.colTitle, { color: c.textSecondary }]} numberOfLines={1}>
                {truncateTitle(
                  pickPublicDecreeTitleFromRow(
                    {
                      titleSummary: d.titleSummary,
                      titlePs: d.titlePs,
                      titleFa: d.titleFa,
                      titleEn: d.titleEn,
                    },
                    language,
                  ),
                )}
              </Text>
              <Text style={[styles.colCat, { color: c.textMuted }]} numberOfLines={1}>
                {cat}
              </Text>
              <View style={styles.colStat}>
                <DecreeStatusPill status={ui} />
              </View>
              <Text style={[styles.colViews, { color: c.textSecondary }]}>{number(v)}</Text>
              <View style={styles.colAct}>
                {act.edit ? (
                  <Pressable hitSlop={8} onPress={() => onEdit(d)} accessibilityLabel={t('a11yEdit')}>
                    <Ionicons name="pencil-outline" size={20} color="#0088FF" />
                  </Pressable>
                ) : null}
                {act.accept ? (
                  <Pressable hitSlop={8} onPress={() => onAccept(d)} accessibilityLabel={t('btnConfirm')}>
                    <Ionicons name="checkmark-circle-outline" size={22} color="#10B981" />
                  </Pressable>
                ) : null}
                {act.reject ? (
                  <Pressable hitSlop={8} onPress={() => onReject(d)} accessibilityLabel={t('a11yReject')}>
                    <Ionicons name="close-circle" size={22} color="#EF4444" />
                  </Pressable>
                ) : null}
                {act.delete ? (
                  <Pressable hitSlop={8} onPress={() => onDelete(d)} accessibilityLabel={t('btnDelete')}>
                    <Ionicons name="trash-outline" size={18} color={c.textMuted} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minWidth: 620,
    borderRadius: DeptUploadDash.radiusLg,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    ...DeptUploadDash.shadow,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  hPress: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hTxt: { fontSize: 11, fontWeight: '600' },
  hNum: { width: W_NUM },
  hTitle: { flex: 1, minWidth: 120 },
  hCat: { width: W_CAT },
  hStat: { width: W_STAT },
  hViews: { width: W_VIEWS },
  hAct: { width: W_ACT, textAlign: 'right' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colNum: {
    width: W_NUM,
    fontSize: 13,
    fontWeight: '700',
  },
  colTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    minWidth: 120,
    paddingRight: 8,
  },
  colCat: {
    width: W_CAT,
    fontSize: 13,
    fontWeight: '500',
  },
  colStat: { width: W_STAT, alignItems: 'flex-start' },
  colViews: {
    width: W_VIEWS,
    fontSize: 13,
    fontWeight: '600',
  },
  colAct: {
    width: W_ACT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
