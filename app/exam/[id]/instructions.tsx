import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, I18nManager, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { FormColors } from '@/constants/form';
import { HomeColors } from '@/constants/home';
import type { ExamListItem } from '@/data/exams';
import { getExamRulesFromListItem } from '@/data/exam-content';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { getPublicExamById } from '@/lib/api/public-user';
import { apiExamSummaryToListItem } from '@/lib/public/exam-cert-adapters';

const HEADER_RADIUS = 22;
const CATEGORY_PILL_BG = 'rgba(212, 175, 55, 0.28)';
const CATEGORY_PILL_TEXT = '#6B5B2E';
const CANCEL_LINK = '#6B9BD1';

function normalizeId(p: string | string[] | undefined): string {
  if (Array.isArray(p)) return p[0] ?? '';
  return p ?? '';
}

export default function ExamInstructionsScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = normalizeId(params.id);
  const insets = useSafeAreaInsets();
  const { t, number } = useAppTranslation();
  const horizontal = 16;
  const [agreed, setAgreed] = useState(false);
  const [exam, setExam] = useState<ExamListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchNonce, setFetchNonce] = useState(0);

  useEffect(() => {
    if (!id) {
      setExam(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const r = await getPublicExamById(id);
      if (cancelled) return;
      setLoading(false);
      if (!r.ok) {
        setError(r.message);
        setExam(null);
        return;
      }
      setExam(apiExamSummaryToListItem(r.data as Record<string, unknown>));
    })();
    return () => {
      cancelled = true;
    };
  }, [id, fetchNonce]);

  const rules = exam ? getExamRulesFromListItem(exam) : null;

  const ruleLines = useMemo(() => {
    if (!rules) {
      return [
        { icon: 'help-circle-outline' as const, text: t('examRuleQuestions', { count: number(25) }) },
        { icon: 'time-outline' as const, text: t('examRuleTimeLimit', { minutes: number(45) }) },
        { icon: 'disc-outline' as const, text: t('examRulePassMark', { percent: number(55) }) },
        { icon: 'arrow-forward-circle-outline' as const, text: t('examRuleNoBack') },
        { icon: 'hourglass-outline' as const, text: t('examRuleAutoSubmit') },
      ];
    }
    return [
      { icon: 'help-circle-outline' as const, text: t('examRuleQuestions', { count: number(rules.totalQuestions) }) },
      { icon: 'time-outline' as const, text: t('examRuleTimeLimit', { minutes: number(rules.durationMin) }) },
      { icon: 'disc-outline' as const, text: t('examRulePassMark', { percent: number(rules.passMarkPct) }) },
      { icon: 'arrow-forward-circle-outline' as const, text: t('examRuleNoBack') },
      { icon: 'hourglass-outline' as const, text: t('examRuleAutoSubmit') },
    ];
  }, [number, rules, t]);

  if (loading) {
    return (
      <View style={styles.fallback}>
        <ActivityIndicator size="large" color={Brand.green} />
        <Text style={[styles.fallbackText, { marginTop: 16 }]}>{t('examLoading')}</Text>
      </View>
    );
  }

  if (error || !exam || !rules) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>{error || t('examNotFound')}</Text>
        <Pressable onPress={() => setFetchNonce((n) => n + 1)} accessibilityRole="button">
          <Text style={styles.fallbackLink}>{t('certRetry')}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={{ marginTop: 16 }}>
          <Text style={styles.fallbackLink}>{t('btnGoBack')}</Text>
        </Pressable>
      </View>
    );
  }

  const startEnabled = agreed;

  const onStart = () => {
    if (!startEnabled) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace(`/exam/${exam.id}/take` as Href);
  };

  return (
    <View style={styles.shell}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + 8, paddingBottom: 18 }]}>
        <View style={[styles.headerRow, { paddingHorizontal: horizontal }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel={t('a11yGoBack')}>
            <Ionicons name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={1.15}>
            {t('examInstructionsTitle')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontal, paddingBottom: 28 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.subjectTop}>
            <View style={styles.subjectIconWrap}>
              <MaterialCommunityIcons name="school" size={26} color={Brand.green} />
            </View>
            <View style={styles.subjectTextCol}>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText} maxFontSizeMultiplier={1.05}>
                  {exam.category}
                </Text>
              </View>
              <Text style={styles.examTitle} maxFontSizeMultiplier={1.12}>
                {exam.title}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.rulesHeading} maxFontSizeMultiplier={1.1}>
            {t('examRulesTitle')}
          </Text>
          {ruleLines.map((row, idx) => (
            <View key={row.text}>
              {idx > 0 ? <View style={styles.ruleDivider} /> : null}
              <View style={styles.ruleRow}>
                <View style={styles.ruleIconCircle}>
                  <Ionicons name={row.icon} size={20} color={Brand.green} />
                </View>
                <Text style={styles.ruleText} maxFontSizeMultiplier={1.1}>
                  {row.text}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Pressable
            style={styles.checkboxRow}
            onPress={() => {
              setAgreed((v) => !v);
              void Haptics.selectionAsync();
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}>
            <View style={[styles.checkboxOuter, agreed && styles.checkboxOuterOn]}>
              {agreed ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
            </View>
            <Text style={styles.checkboxLabel} maxFontSizeMultiplier={1.1}>
              {t('examRulesConfirm')}
            </Text>
          </Pressable>

          <View style={styles.cardDivider} />

          <Pressable
            style={[styles.startBtn, !startEnabled && styles.startBtnDisabled]}
            disabled={!startEnabled}
            onPress={onStart}
            accessibilityRole="button"
            accessibilityState={{ disabled: !startEnabled }}>
            <Ionicons
              name="school"
              size={22}
              color={startEnabled ? '#fff' : FormColors.disabledButtonText}
            />
            <Text
              style={[styles.startBtnLabel, !startEnabled && styles.startBtnLabelDisabled]}
              maxFontSizeMultiplier={1.1}>
              {t('examStartExam')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={styles.cancelWrap}
            accessibilityRole="button"
            accessibilityLabel={t('a11yCancel')}>
            <Text style={styles.cancelText} maxFontSizeMultiplier={1.1}>
              {t('examCancel')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: HomeColors.pageBg,
  },
  header: {
    backgroundColor: Brand.green,
    borderBottomLeftRadius: HEADER_RADIUS,
    borderBottomRightRadius: HEADER_RADIUS,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 18,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  subjectTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  subjectIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: FormColors.iconMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectTextCol: {
    flex: 1,
    minWidth: 0,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: CATEGORY_PILL_BG,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: CATEGORY_PILL_TEXT,
  },
  examTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: HomeColors.decreeTitle,
    lineHeight: 24,
  },
  rulesHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: FormColors.title,
    marginBottom: 12,
  },
  ruleDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: FormColors.dividerMuted,
    marginVertical: 12,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ruleIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: FormColors.iconMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: FormColors.subtitle,
    lineHeight: 22,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  checkboxOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: FormColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxOuterOn: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: HomeColors.decreeTitle,
    lineHeight: 22,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: FormColors.dividerMuted,
    marginVertical: 18,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Brand.green,
    paddingVertical: 16,
    borderRadius: 999,
    minHeight: 54,
    ...Platform.select({
      ios: {
        shadowColor: Brand.green,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  startBtnDisabled: {
    backgroundColor: FormColors.disabledButtonBg,
    elevation: 0,
    shadowOpacity: 0,
  },
  startBtnLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  startBtnLabelDisabled: {
    color: FormColors.disabledButtonText,
  },
  cancelWrap: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: CANCEL_LINK,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: HomeColors.pageBg,
  },
  fallbackText: {
    fontSize: 16,
    color: FormColors.label,
    marginBottom: 12,
  },
  fallbackLink: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.green,
  },
});
