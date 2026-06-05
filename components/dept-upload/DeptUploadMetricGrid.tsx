import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useDeptUploadThemeColorsOptional } from '@/contexts/dept-upload-ui-context';
import { Brand, palette } from '@/lib/theme';

import { DeptUploadDash } from '@/constants/dept-upload-dashboard';
import { useAppTranslation } from '@/hooks/use-app-translation';

type Props = {
  totalDecrees: string;
  publishedCount: string;
  newThisMonth: string;
  pendingApproval: string;
  totalViews: string;
  /** Shown under Total Views (e.g. PDF download count). */
  totalDownloads: string;
  /** e.g. "↗ Apr 2026" — month-over-month for unique views. */
  viewsPeriodLabel: string;
  /** MoM for new decrees, e.g. "↑ 12% MoM" vs "↓ 5% MoM" */
  newThisMonthSub?: string;
  newThisMonthSubIsUp?: boolean;
  /** MoM for views (separate from total on card). */
  viewsPeriodSub?: string;
  viewsPeriodSubIsUp?: boolean;
  onPressTotalDecrees: () => void;
  onPressNewThisMonth: () => void;
  onPressPendingApproval: () => void;
  onPressTotalViews: () => void;
};

const ORANGE = palette.primaryShade1;
const LIGHT_GREEN_ON_CARD = palette.primaryAlpha.a95;
const MINT_SUB = 'rgba(0, 136, 255, 0.35)';

export function DeptUploadMetricGrid({
  totalDecrees,
  publishedCount,
  newThisMonth,
  pendingApproval,
  totalViews,
  totalDownloads,
  viewsPeriodLabel,
  newThisMonthSub,
  newThisMonthSubIsUp = true,
  viewsPeriodSub,
  viewsPeriodSubIsUp = true,
  onPressTotalDecrees,
  onPressNewThisMonth,
  onPressPendingApproval,
  onPressTotalViews,
}: Props) {
  const c = useDeptUploadThemeColorsOptional();
  const { t } = useAppTranslation();
  const cardNeutral = [styles.card, styles.cardThemed, { backgroundColor: c.cardBg, borderColor: c.cardBorder }];
  return (
    <View style={styles.grid}>
      <Pressable
        onPress={onPressTotalDecrees}
        style={[styles.card, styles.cardGreen]}
        accessibilityRole="button"
        accessibilityLabel={t('deptMetricA11yTotalDecrees')}>
        <View style={styles.cardTopRow}>
          <View style={styles.iconMintSq}>
            <Ionicons name="document-text" size={20} color={Brand.green} />
          </View>
          <Text style={styles.cornerLblGreen}>
            {t('deptMetricPublishedCorner', { count: publishedCount })}
          </Text>
        </View>
        <Text style={styles.bigWhite}>{totalDecrees}</Text>
        <Text style={styles.footerGreen}>{t('deptMetricTotalDecrees')}</Text>
      </Pressable>

      <Pressable
        onPress={onPressNewThisMonth}
        style={cardNeutral}
        accessibilityRole="button"
        accessibilityLabel={t('deptMetricA11yNewThisMonth')}>
        <View style={styles.cardTopRow}>
          <View style={styles.iconPaleGreenCircle}>
            <Ionicons name="add" size={22} color={Brand.green} />
          </View>
          <Text
            style={[
              styles.cornerSub,
              { color: newThisMonthSubIsUp ? Brand.green : '#DC2626' },
            ]}
            numberOfLines={1}>
            {newThisMonthSub ?? '—'}
          </Text>
        </View>
        <Text style={[styles.bigDark, { color: c.textPrimary }]}>{newThisMonth}</Text>
        <Text style={[styles.footerGray, { color: c.textMuted }]}>{t('deptMetricNewThisMonth')}</Text>
      </Pressable>

      <Pressable
        onPress={onPressPendingApproval}
        style={cardNeutral}
        accessibilityRole="button"
        accessibilityLabel={t('deptMetricA11yPendingApproval')}>
        <View style={styles.cardTopRow}>
          <View style={styles.iconPaleOrangeCircle}>
            <Ionicons name="time-outline" size={20} color={ORANGE} />
          </View>
          <Text style={styles.cornerOrange}>{t('deptMetricNeedsAttention')}</Text>
        </View>
        <Text style={[styles.bigDark, { color: c.textPrimary }]}>{pendingApproval}</Text>
        <Text style={[styles.footerGray, { color: c.textMuted }]}>{t('deptMetricPendingApproval')}</Text>
      </Pressable>

      <Pressable
        onPress={onPressTotalViews}
        style={cardNeutral}
        accessibilityRole="button"
        accessibilityLabel={t('deptMetricA11yTotalViews')}>
        <View style={styles.cardTopRow}>
          <View style={styles.iconPaleBlueCircle}>
            <Ionicons name="eye-outline" size={20} color={Brand.green} />
          </View>
          <Text
            style={[
              styles.cornerSub,
              { color: viewsPeriodSubIsUp ? Brand.green : '#DC2626' },
            ]}
            numberOfLines={2}>
            {viewsPeriodSub != null && viewsPeriodSub.length > 0
              ? `${viewsPeriodSub}\n${viewsPeriodLabel}`
              : viewsPeriodLabel}
          </Text>
        </View>
        <Text style={[styles.bigDark, { color: c.textPrimary }]}>{totalViews}</Text>
        <Text style={[styles.footerGray, { color: c.textMuted }]}>{t('deptMetricTotalViews')}</Text>
        <Text style={[styles.footerSub, { color: c.textMuted }]}>{t('deptMetricDownloads', { count: totalDownloads })}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: DeptUploadDash.radiusLg,
    padding: 20,
    minHeight: 132,
    justifyContent: 'space-between',
  },
  cardThemed: {
    borderWidth: 1,
    ...DeptUploadDash.shadow,
  },
  cardGreen: {
    backgroundColor: Brand.green,
    borderWidth: 1,
    borderColor: Brand.green,
    ...DeptUploadDash.shadow,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconMintSq: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerLblGreen: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.88)',
  },
  bigWhite: {
    fontSize: 32,
    fontWeight: '800',
    color: palette.white,
    marginTop: 8,
  },
  footerGreen: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.80)',
    marginTop: 4,
  },
  iconPaleGreenCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(11, 79, 46, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPaleOrangeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(234, 88, 12, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPaleBlueCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.primaryAlpha.a10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerOrange: {
    fontSize: 10,
    fontWeight: '700',
    color: ORANGE,
    maxWidth: '52%',
    textAlign: 'right',
  },
  cornerGreenUp: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.green,
  },
  cornerSub: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
    maxWidth: '56%',
  },
  bigDark: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 8,
  },
  footerGray: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  footerSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
