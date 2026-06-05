import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { InspectorSignaturePreview } from '@/components/inspector-admin/InspectorSignaturePreview';
import { AppPressable } from '@/components/ui/AppPressable';
import {
  addCalendarDaysFromYmd,
  type Assignment,
  type Submission,
} from '@/data/inspector-admin-store';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { registerInspectionEvidenceFromPicker } from '@/lib/api/files';
import { showToast } from '@/lib/adapters/toast';
import {
  Brand,
  FormColors,
  palette,
  radius,
  shadowCard,
  spacing,
  touchTarget,
  typography,
} from '@/lib/theme';

type ReviseInput = {
  daysAllowed: number;
  focusComment: string;
  maxDays: number;
};

function renderAnswerValue(row: {
  valueText?: string | null;
  valueNumber?: number | null;
  valueBoolean?: boolean | null;
  valueDate?: string | null;
  selectedOptionKeys?: string[];
}): string {
  if (typeof row.valueText === 'string' && row.valueText.trim()) return row.valueText;
  if (typeof row.valueNumber === 'number' && Number.isFinite(row.valueNumber)) return String(row.valueNumber);
  if (typeof row.valueBoolean === 'boolean') return row.valueBoolean ? 'Yes' : 'No';
  if (typeof row.valueDate === 'string' && row.valueDate.trim()) return row.valueDate;
  if (Array.isArray(row.selectedOptionKeys) && row.selectedOptionKeys.length > 0) return row.selectedOptionKeys.join(', ');
  return '—';
}

type Props = {
  visible: boolean;
  submission: Submission | null;
  assignment?: Assignment;
  maxDays: number;
  onClose: () => void;
  onApprove: () => Promise<{ ok: boolean; message?: string }>;
  onRevise: (input: ReviseInput) => Promise<{ ok: boolean; message?: string }>;
  onEvidenceRegistered?: (uri: string) => void;
  /**
   * When false (legacy/demo mode), photo picking still works but we do not hit
   * the files register endpoint.
   */
  registerEvidenceLive?: boolean;
};

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function SubmissionReviewSheet({
  visible,
  submission,
  assignment,
  maxDays,
  onClose,
  onApprove,
  onRevise,
  onEvidenceRegistered,
  registerEvidenceLive = true,
}: Props) {
  const { t, number } = useAppTranslation();
  const [days, setDays] = useState<string>('3');
  const [focus, setFocus] = useState<string>('');
  const [submitting, setSubmitting] = useState<'none' | 'approve' | 'revise'>('none');
  const [imagePreviewUri, setImagePreviewUri] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const initial = Math.min(maxDays || 5, 3);
    setDays(String(initial > 0 ? initial : 3));
    setFocus('');
    setSubmitting('none');
  }, [visible, maxDays]);

  const baseDays = assignment?.initialInspectionWindowDays ?? 5;

  const clampedDays = useMemo(() => {
    const raw = Number(days);
    if (!Number.isFinite(raw)) return 1;
    return Math.min(Math.max(1, Math.floor(raw)), Math.max(1, maxDays || 1));
  }, [days, maxDays]);

  const newDeadline = useMemo(
    () => addCalendarDaysFromYmd(todayYmd(), clampedDays),
    [clampedDays],
  );

  const pickEvidence = useCallback(async () => {
    if (!submission) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast(t('uploadPhotoPermissionRequired'), 'error');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.85 });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    if (registerEvidenceLive) {
      const reg = await registerInspectionEvidenceFromPicker({
        uri: asset.uri,
        mimeType: asset.mimeType ?? null,
        fileName: asset.fileName ?? null,
        fileSize: asset.fileSize ?? null,
      });
      if (!reg.ok) {
        showToast(`${t('alertUploadMetaFailedTitle')}: ${reg.message}`, 'error');
      }
    }
    onEvidenceRegistered?.(asset.uri);
    showToast(t('inspectorAdminEvidenceAttached'), 'success');
  }, [onEvidenceRegistered, registerEvidenceLive, submission, t]);

  const onConfirmRevision = useCallback(async () => {
    if (!focus.trim()) {
      showToast(t('reviewFocusRequired'), 'error');
      return;
    }
    setSubmitting('revise');
    const r = await onRevise({
      daysAllowed: clampedDays,
      focusComment: focus.trim(),
      maxDays,
    });
    setSubmitting('none');
    if (!r.ok) {
      if (r.message) showToast(r.message, 'error');
      return;
    }
    showToast(t('reviewRevisionSent'), 'success');
    onClose();
  }, [focus, clampedDays, maxDays, onRevise, onClose, t]);

  const onApproveAndArchive = useCallback(async () => {
    setSubmitting('approve');
    const r = await onApprove();
    setSubmitting('none');
    if (!r.ok) {
      if (r.message) showToast(r.message, 'error');
      return;
    }
    showToast(t('reviewApproved'), 'success');
    onClose();
  }, [onApprove, onClose, t]);

  if (!submission) {
    return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.backdrop} />
      </Modal>
    );
  }

  const answersList = Object.entries(submission.answers);
  const answerDetails = Array.isArray(submission.answerDetails) ? submission.answerDetails : [];
  const hasEvidence = submission.evidence.length > 0;
  const hasSignature = Boolean(submission.signature?.trim());
  const busy = submitting !== 'none';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}>
        <Modal
          visible={!!imagePreviewUri}
          animationType="fade"
          transparent
          statusBarTranslucent
          onRequestClose={() => setImagePreviewUri(null)}>
          <View style={styles.previewBackdrop}>
            <AppPressable
              style={StyleSheet.absoluteFill}
              onPress={() => setImagePreviewUri(null)}
              accessibilityLabel={t('a11yClose')}
            />
            <View style={styles.previewCard}>
              {imagePreviewUri ? (
                <Image source={{ uri: imagePreviewUri }} style={styles.previewImg} resizeMode="contain" />
              ) : null}
            </View>
          </View>
        </Modal>
        <AppPressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel={t('a11yClose')}
        />
        <View style={styles.sheet}>
          {/* --- Header --- */}
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {t('reviewSheetTitle')}
            </Text>
            <AppPressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel={t('a11yClose')}>
              <Ionicons name="close" size={20} color={FormColors.subtitle} />
            </AppPressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {/* Summary card */}
            <View style={[styles.summary, shadowCard()]}>
              <View style={styles.summaryIcon}>
                <Ionicons name="clipboard-outline" size={20} color={palette.neutral500} />
              </View>
              <View style={styles.summaryBody}>
                <Text style={styles.summaryTitle} numberOfLines={2} maxFontSizeMultiplier={1.15}>
                  {submission.title.toUpperCase()}
                </Text>
                <Text style={styles.summaryMeta} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                  {[submission.region, submission.date].filter(Boolean).join(' · ').toUpperCase()}
                </Text>
                {submission.categoryDecreeLabel ? (
                  <Text style={styles.summaryMeta} numberOfLines={2} maxFontSizeMultiplier={1.15}>
                    {submission.categoryDecreeLabel.toUpperCase()}
                  </Text>
                ) : null}
              </View>
              <View style={styles.summaryScore}>
                <Text style={styles.summaryScoreLabel} maxFontSizeMultiplier={1.15}>
                  {t('reviewAuditScore').toUpperCase()}
                </Text>
                <Text style={styles.summaryScoreValue} maxFontSizeMultiplier={1.2}>
                  {number(Math.round(submission.score))}%
                </Text>
              </View>
            </View>

            {submission.revisionFocusNotes ? (
              <View style={styles.priorCallout}>
                <Text style={styles.priorCalloutLabel} maxFontSizeMultiplier={1.2}>
                  {t('reviewRevisionFocusPrior').toUpperCase()}
                </Text>
                <Text style={styles.priorCalloutBody} maxFontSizeMultiplier={1.15}>
                  {submission.revisionFocusNotes}
                </Text>
              </View>
            ) : null}

            {/* Form responses */}
            <SectionHeader icon="book-outline" label={t('reviewFormResponses')} />
            {answerDetails.length === 0 && answersList.length === 0 ? (
              <Text style={styles.sectionEmpty} maxFontSizeMultiplier={1.15}>
                —
              </Text>
            ) : null}
            {answerDetails.length > 0
              ? answerDetails.map((row) => {
                  const value = renderAnswerValue(row);
                  const imageLike = typeof row.valueText === 'string' && row.valueText.startsWith('data:image');
                  const remoteImageLike = typeof row.valueText === 'string' && /^https?:\/\//i.test(row.valueText);
                  const gpsLike = typeof row.valueText === 'string' && /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(row.valueText);
                  return (
                    <View key={row.itemKey} style={styles.answerCard}>
                      <Text style={styles.answerKey} maxFontSizeMultiplier={1.15}>
                        {row.label.toUpperCase()}
                      </Text>
                      {imageLike ? (
                        <Pressable onPress={() => setImagePreviewUri(String(row.valueText))} style={styles.answerImageWrap}>
                          <Image source={{ uri: String(row.valueText) }} style={styles.answerImage} resizeMode="contain" />
                          <Text style={styles.linkText}>{t('tapToPreviewImage')}</Text>
                        </Pressable>
                      ) : remoteImageLike ? (
                        <Pressable onPress={() => void Linking.openURL(String(row.valueText))} style={styles.answerImageWrap}>
                          <Image source={{ uri: String(row.valueText) }} style={styles.answerImage} resizeMode="contain" />
                          <Text style={styles.linkText}>{t('tapToOpenInBrowser')}</Text>
                        </Pressable>
                      ) : (
                        <Text style={styles.answerValue} maxFontSizeMultiplier={1.15}>
                          {gpsLike ? `GPS: ${value}` : value}
                        </Text>
                      )}
                    </View>
                  );
                })
              : answersList.map(([k, v]) => (
                  <View key={k} style={styles.answerCard}>
                    <Text style={styles.answerKey} maxFontSizeMultiplier={1.15}>
                      {k.toUpperCase()}
                    </Text>
                    <Text style={styles.answerValue} maxFontSizeMultiplier={1.15}>
                      {String(v)}
                    </Text>
                  </View>
                ))}

            {/* Evidence */}
            <SectionHeader icon="image-outline" label={t('reviewEvidenceGallery')} />
            {hasEvidence ? (
              <View style={styles.evidenceGrid}>
                {submission.evidence.map((uri, i) => (
                  <View key={`${uri}-${i}`} style={styles.evidenceThumbWrap}>
                    <Image source={{ uri }} style={styles.evidenceThumb} resizeMode="cover" />
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.sectionEmpty} maxFontSizeMultiplier={1.15}>
                {t('reviewNoEvidence')}
              </Text>
            )}
            <AppPressable
              onPress={() => void pickEvidence()}
              style={styles.addEvidenceBtn}
              accessibilityRole="button"
              accessibilityLabel={t('reviewAddEvidence')}>
              <Ionicons name="add" size={16} color={Brand.green} />
              <Text style={styles.addEvidenceText} maxFontSizeMultiplier={1.15}>
                {t('reviewAddEvidence')}
              </Text>
            </AppPressable>

            {/* Signature */}
            <SectionHeader icon="create-outline" label={t('reviewDigitalSignature')} />
            {hasSignature ? (
              <InspectorSignaturePreview signature={submission.signature} />
            ) : (
              <View style={styles.signatureEmpty}>
                <Ionicons name="create-outline" size={24} color={palette.neutral300} />
                <Text style={styles.signatureEmptyText} maxFontSizeMultiplier={1.15}>
                  {t('reviewNoSignature')}
                </Text>
              </View>
            )}

            {/* Return for revision card */}
            <View style={styles.reviseCard}>
              <View style={styles.reviseHeader}>
                <Ionicons name="refresh-outline" size={16} color="#92400E" />
                <Text style={styles.reviseHeaderText} maxFontSizeMultiplier={1.2}>
                  {t('reviewReturnForRevision').toUpperCase()}
                </Text>
              </View>
              <Text style={styles.reviseExplainer} maxFontSizeMultiplier={1.15}>
                {t('reviewRevisionExplainer', {
                  baseDays: number(baseDays),
                  maxDays: number(maxDays || 1),
                }).replace(/<\/?strong>/g, '')}
              </Text>

              <Text style={styles.reviseLabel} maxFontSizeMultiplier={1.2}>
                {t('reviewDaysToComplete').toUpperCase()}
              </Text>
              <TextInput
                value={days}
                onChangeText={setDays}
                keyboardType="number-pad"
                style={styles.reviseInput}
                placeholder="1"
                placeholderTextColor={palette.neutral400}
                maxFontSizeMultiplier={1.15}
              />

              <View style={styles.deadlineRow}>
                <Ionicons name="time-outline" size={14} color="#92400E" />
                <Text style={styles.deadlineLabel} maxFontSizeMultiplier={1.2}>
                  {t('reviewNewDeadline').toUpperCase()}
                </Text>
              </View>
              <View style={styles.deadlineBox}>
                <Text style={styles.deadlineValue} maxFontSizeMultiplier={1.15}>
                  {newDeadline}
                </Text>
              </View>

              <Text style={styles.reviseLabel} maxFontSizeMultiplier={1.2}>
                {t('reviewFocusAcceptance').toUpperCase()}
              </Text>
              <TextInput
                value={focus}
                onChangeText={setFocus}
                multiline
                numberOfLines={4}
                style={[styles.reviseInput, styles.reviseTextarea]}
                placeholder={t('reviewFocusPlaceholder')}
                placeholderTextColor={palette.neutral400}
                maxFontSizeMultiplier={1.15}
              />
              <Text style={styles.reviseHelper} maxFontSizeMultiplier={1.15}>
                {t('reviewFocusHelper')}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actionsBlock}>
              <AppPressable
                onPress={() => void onConfirmRevision()}
                disabled={busy}
                style={[
                  styles.reviseBtn,
                  busy && styles.reviseBtnDisabled,
                ]}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                accessibilityLabel={t('reviewConfirmRevision')}>
                <Ionicons name="refresh-outline" size={16} color="#92400E" />
                <Text style={styles.reviseBtnText} maxFontSizeMultiplier={1.15}>
                  {t('reviewConfirmRevision').toUpperCase()}
                </Text>
              </AppPressable>

              <AppPressable
                onPress={() => void onApproveAndArchive()}
                disabled={busy}
                style={[styles.approveBtn, busy && styles.approveBtnDisabled]}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                accessibilityLabel={t('reviewApproveArchive')}>
                <Ionicons name="checkmark" size={18} color={palette.white} />
                <Text style={styles.approveBtnText} maxFontSizeMultiplier={1.15}>
                  {t('reviewApproveArchive').toUpperCase()}
                </Text>
              </AppPressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SectionHeader({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.sectionHead}>
      <Ionicons name={icon} size={14} color={palette.neutral400} />
      <Text style={styles.sectionHeadText} maxFontSizeMultiplier={1.2}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const AMBER_BG = '#FFFBEB';
const AMBER_BORDER = 'rgba(212, 175, 55, 0.55)';
const AMBER_TEXT = '#92400E';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: palette.overlayScrim,
  },
  sheet: {
    backgroundColor: palette.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '94%',
    overflow: 'hidden',
  },

  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  previewCard: {
    backgroundColor: palette.white,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    ...shadowCard(),
  },
  previewImg: {
    width: '100%',
    height: 320,
    backgroundColor: palette.neutral50,
  },

  /* header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.neutral200,
  },
  headerTitle: {
    flex: 1,
    ...typography.subtitle,
    fontWeight: '700',
    color: FormColors.title,
  },
  closeBtn: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },

  /* summary */
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: palette.neutral50,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
  },
  summaryBody: {
    flex: 1,
    minWidth: 0,
  },
  summaryTitle: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    color: FormColors.title,
    letterSpacing: 0.5,
  },
  summaryMeta: {
    marginTop: spacing.xxs,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: palette.neutral400,
  },
  summaryScore: {
    alignItems: 'flex-end',
    gap: spacing.xxs,
  },
  summaryScoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: palette.neutral500,
  },
  summaryScoreValue: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '800',
    color: Brand.green,
  },

  /* prior revision callout */
  priorCallout: {
    marginTop: spacing.md,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: AMBER_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AMBER_BORDER,
  },
  priorCalloutLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: AMBER_TEXT,
  },
  priorCalloutBody: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#78350F',
  },

  /* section head */
  sectionHead: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  sectionHeadText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: palette.neutral400,
  },
  sectionEmpty: {
    fontSize: 13,
    color: palette.neutral400,
    fontWeight: '500',
  },

  /* answers */
  answerCard: {
    marginBottom: spacing.xs,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    backgroundColor: palette.white,
  },
  answerKey: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: palette.neutral500,
  },
  answerValue: {
    marginTop: spacing.xxs,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: FormColors.title,
  },
  answerImageWrap: {
    marginTop: spacing.xs,
    gap: spacing.xxs,
  },
  answerImage: {
    width: '100%',
    height: 160,
    borderRadius: radius.md,
    backgroundColor: palette.neutral100,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.green,
  },

  /* evidence */
  evidenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  evidenceThumbWrap: {
    width: '31%',
    aspectRatio: 1,
    flexGrow: 0,
  },
  evidenceThumb: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    backgroundColor: palette.neutral100,
  },
  addEvidenceBtn: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: palette.rowActiveWash,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.green,
  },
  addEvidenceText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: Brand.green,
  },

  /* signature empty */
  signatureEmpty: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.neutral200,
    backgroundColor: palette.neutral50,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  signatureEmptyText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: palette.neutral400,
  },

  /* revise card (amber) */
  reviseCard: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: AMBER_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AMBER_BORDER,
  },
  reviseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginBottom: spacing.xs,
  },
  reviseHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: AMBER_TEXT,
  },
  reviseExplainer: {
    fontSize: 13,
    lineHeight: 18,
    color: '#78350F',
    marginBottom: spacing.sm,
  },
  reviseLabel: {
    marginTop: spacing.sm,
    marginBottom: spacing.xxs,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: palette.neutral500,
  },
  reviseInput: {
    backgroundColor: palette.white,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: FormColors.title,
  },
  reviseTextarea: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  deadlineRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  deadlineLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: AMBER_TEXT,
  },
  deadlineBox: {
    marginTop: spacing.xxs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.white,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AMBER_BORDER,
  },
  deadlineValue: {
    fontSize: 16,
    fontWeight: '800',
    color: FormColors.title,
    letterSpacing: 0.3,
  },
  reviseHelper: {
    marginTop: spacing.xs,
    fontSize: 11,
    lineHeight: 16,
    color: palette.neutral500,
    fontStyle: 'italic',
  },

  /* actions */
  actionsBlock: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  reviseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: AMBER_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AMBER_BORDER,
  },
  reviseBtnDisabled: {
    opacity: 0.55,
  },
  reviseBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    color: AMBER_TEXT,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 50,
    borderRadius: radius.lg,
    backgroundColor: Brand.green,
  },
  approveBtnDisabled: {
    opacity: 0.55,
  },
  approveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: palette.white,
  },
});
