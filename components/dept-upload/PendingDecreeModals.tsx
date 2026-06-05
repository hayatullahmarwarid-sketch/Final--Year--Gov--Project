import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '@/components/ui/AppPressable';
import { DeptUploadDash } from '@/constants/dept-upload-dashboard';
import { useAppLanguage } from '@/contexts/app-language-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import type { DecreeCategory, LocalizedContentBlock, SerializedDecree } from '@/lib/api/decree-upload';
import { getDecreeById } from '@/lib/api/decree-upload';
import { showToast } from '@/lib/adapters/toast';
import {
  localePlainFromBlocks,
  mergeLocalizedContentForEdit,
  pickLocalizedBaselineBlocks,
} from '@/lib/dept-upload-helpers';
import { FormColors, palette } from '@/lib/theme';

const SLATE = '#0F172A';
const MUTED = '#64748B';
const LABEL_GRAY = '#94A3B8';
const BORDER = '#E5E7EB';
const GREEN_PRI = FormColors.primaryButtonBg;
const GREEN_BTN = FormColors.primaryButtonBg;
const DESTRUCTIVE_FILL = FormColors.weak;

function hydrateTrilingualTitles(d: SerializedDecree): { ps: string; fa: string; en: string } {
  const legacy = String(d.titleSummary ?? '').trim();
  return {
    ps: String(d.titlePs ?? '').trim() || legacy,
    fa: String(d.titleFa ?? '').trim() || legacy,
    en: String(d.titleEn ?? '').trim() || legacy,
  };
}

type EditProps = {
  visible: boolean;
  /** When set, full decree is loaded for multilingual bodies (list views strip bodies). */
  decreeId: string | null;
  categories: DecreeCategory[];
  onClose: () => void;
  onSave: (payload: {
    titlePs: string;
    titleFa: string;
    titleEn: string;
    categoryId: string;
    notes: string;
    localizedContent: LocalizedContentBlock[];
  }) => void;
};

export function PendingEditDecreeModal({ visible, decreeId, categories, onClose, onSave }: EditProps) {
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const { language } = useAppLanguage();
  const textDir = language === 'en' ? 'ltr' : 'rtl';
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [titlePs, setTitlePs] = useState('');
  const [titleFa, setTitleFa] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [contentPs, setContentPs] = useState('');
  const [contentFa, setContentFa] = useState('');
  const [contentEn, setContentEn] = useState('');
  /** Snapshot for merge on save (preserves non ps/fa/en locales and titles). */
  const [baselineBlocks, setBaselineBlocks] = useState<LocalizedContentBlock[]>([]);
  const [catOpen, setCatOpen] = useState(false);

  const activeCats = useMemo(
    () => categories.filter((c) => c.isActive).sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  useEffect(() => {
    if (!visible || !decreeId) {
      setLoadErr(null);
      setLoading(false);
      return;
    }
    let cancel = false;
    setLoading(true);
    setLoadErr(null);
    void (async () => {
      const r = await getDecreeById(decreeId);
      if (cancel) return;
      if (!r.ok) {
        setLoadErr(r.message);
        setLoading(false);
        showToast(r.message, 'error');
        return;
      }
      const d = r.data;
      const base = pickLocalizedBaselineBlocks(d);
      setBaselineBlocks(base);
      const tri = hydrateTrilingualTitles(d);
      setTitlePs(tri.ps);
      setTitleFa(tri.fa);
      setTitleEn(tri.en);
      setCategoryId(d.categoryIds[0] ?? d.categories?.[0]?.id ?? '');
      const ch = d.activeDraftVersion?.changeSummary;
      setNotes(typeof ch === 'string' ? ch : '');
      setContentPs(localePlainFromBlocks(base, 'ps'));
      setContentFa(localePlainFromBlocks(base, 'fa'));
      setContentEn(localePlainFromBlocks(base, 'en'));
      setCatOpen(false);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [visible, decreeId]);

  const catLabel = useMemo(() => {
    const c = activeCats.find((x) => x.id === categoryId);
    return c?.name ?? 'Select category…';
  }, [activeCats, categoryId]);

  const save = () => {
    if (!titlePs.trim() || !titleFa.trim() || !titleEn.trim()) return;
    if (!categoryId) return;
    if (loading || loadErr) return;
    const localizedContent = mergeLocalizedContentForEdit(baselineBlocks, contentPs, contentFa, contentEn);
    onSave({
      titlePs: titlePs.trim(),
      titleFa: titleFa.trim(),
      titleEn: titleEn.trim(),
      categoryId,
      notes: notes.trim(),
      localizedContent,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.peBackdrop}
        onPress={() => {
          if (catOpen) setCatOpen(false);
          else onClose();
        }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.peKav}>
        <View style={[styles.peCard, { marginBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.peHead}>
            <Text style={styles.peTitle}>{t('deptEditDecree')}</Text>
            <AppPressable onPress={onClose} accessibilityLabel={t('a11yClose')}>
              <Ionicons name="close" size={26} color="#94A3B8" />
            </AppPressable>
          </View>
          <View style={styles.peDivider} />
          {loading ? (
            <View style={styles.peLoading}>
              <ActivityIndicator size="large" color={GREEN_BTN} />
              <Text style={styles.peLoadingTxt}>{t('homeLoadingDecrees')}</Text>
            </View>
          ) : loadErr ? (
            <View style={styles.peLoading}>
              <Text style={styles.peErrTxt}>{loadErr}</Text>
              <Pressable onPress={onClose} style={styles.peBtnGhost}>
                <Text style={styles.peBtnGhostTxt}>{t('a11yClose')}</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.peScroll}
              onScrollBeginDrag={() => setCatOpen(false)}>
              <Text style={styles.peLbl}>
                {t('uploadTitlePsLabel')}
                <Text style={styles.peReqStar}>*</Text>
              </Text>
              <TextInput
                value={titlePs}
                onChangeText={setTitlePs}
                multiline
                textAlign="right"
                style={[styles.peInput, styles.peTitleArea, { writingDirection: textDir }]}
                placeholderTextColor={LABEL_GRAY}
                textAlignVertical="top"
              />
              <Text style={styles.peLbl}>
                {t('uploadTitleFaLabel')}
                <Text style={styles.peReqStar}>*</Text>
              </Text>
              <TextInput
                value={titleFa}
                onChangeText={setTitleFa}
                multiline
                textAlign="right"
                style={[styles.peInput, styles.peTitleArea, { writingDirection: textDir }]}
                placeholderTextColor={LABEL_GRAY}
                textAlignVertical="top"
              />
              <Text style={styles.peLbl}>
                {t('uploadTitleEnLabel')}
                <Text style={styles.peReqStar}>*</Text>
              </Text>
              <TextInput
                value={titleEn}
                onChangeText={setTitleEn}
                multiline
                style={[styles.peInput, styles.peTitleArea]}
                placeholderTextColor={LABEL_GRAY}
                textAlignVertical="top"
              />

              <Text style={styles.peLbl}>{t('certCardCategoryLabel')}</Text>
              <View>
                <Pressable onPress={() => setCatOpen((o) => !o)} style={styles.peCatTrig}>
                  <Text style={styles.peCatTrigTxt} numberOfLines={1}>
                    {catLabel}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#64748B" />
                </Pressable>
                {catOpen ? (
                  <View style={styles.peCatMenu}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
                      {activeCats.map((c) => (
                        <Pressable
                          key={c.id}
                          onPress={() => {
                            setCategoryId(c.id);
                            setCatOpen(false);
                          }}
                          style={[styles.peCatRow, categoryId === c.id && styles.peCatRowHi]}>
                          <Text style={[styles.peCatRowTxt, categoryId === c.id && styles.peCatRowTxtHi]} numberOfLines={1}>
                            {c.name}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </View>

              <Text style={styles.peLbl}>{t('reviewFocusAcceptance')}</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder={t('reviewFocusPlaceholder')}
                placeholderTextColor={LABEL_GRAY}
                multiline
                style={[styles.peInput, styles.peArea]}
                textAlignVertical="top"
              />

              <Text style={styles.peSection}>{t('deptLocalizedDraft')}</Text>
              <Text style={styles.peHint}>{t('deptLangEditBlurb')}</Text>

              <Text style={styles.peLblOptional}>{t('uploadPashtoOptional')}</Text>
              <TextInput
                value={contentPs}
                onChangeText={setContentPs}
                placeholder={t('deptBodyPsPlaceholder')}
                placeholderTextColor={LABEL_GRAY}
                multiline
                textAlign="right"
                style={[styles.peInput, styles.peAreaTall, { writingDirection: textDir }]}
                textAlignVertical="top"
              />

              <Text style={styles.peLblOptional}>{t('uploadDariOptional')}</Text>
              <TextInput
                value={contentFa}
                onChangeText={setContentFa}
                placeholder={t('deptBodyFaPlaceholder')}
                placeholderTextColor={LABEL_GRAY}
                multiline
                textAlign="right"
                style={[styles.peInput, styles.peAreaTall, { writingDirection: textDir }]}
                textAlignVertical="top"
              />

              <Text style={styles.peLblOptional}>{t('uploadEnglishOptional')}</Text>
              <TextInput
                value={contentEn}
                onChangeText={setContentEn}
                placeholder={t('deptBodyEnPlaceholder')}
                placeholderTextColor={LABEL_GRAY}
                multiline
                style={[styles.peInput, styles.peAreaTall]}
                textAlignVertical="top"
              />

              <View style={styles.peActions}>
                <Pressable onPress={onClose} style={styles.peBtnGhost}>
                  <Text style={styles.peBtnGhostTxt}>{t('btnCancel')}</Text>
                </Pressable>
                <Pressable onPress={save} style={styles.peBtnPri}>
                  <Text style={styles.peBtnPriTxt}>{t('settingsBarSave')}</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type ApproveProps = {
  visible: boolean;
  decreeNum: string;
  onClose: () => void;
  onApprove: () => void;
};

export function ApproveDecreeModal({ visible, decreeNum, onClose, onApprove }: ApproveProps) {
  const { t } = useAppTranslation();
  const [busy, setBusy] = useState(false);

  const approve = () => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      onApprove();
      onClose();
    }, 200);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.apRoot}>
        <Pressable style={styles.apBackdrop} onPress={onClose} accessibilityLabel={t('a11yClose')} />
        <View style={styles.apCenter} pointerEvents="box-none">
          <View style={styles.apCard}>
            <View style={styles.apHead}>
              <Text style={styles.apTitle}>{t('btnPublish')}</Text>
              <AppPressable onPress={onClose} hitSlop={12} accessibilityLabel={t('a11yClose')}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </AppPressable>
            </View>
            <View style={styles.apDivider} />
            <View style={styles.apBody}>
              <View style={styles.apIconOuter}>
                <View style={styles.apIconInner}>
                  <Ionicons name="checkmark" size={32} color={palette.white} />
                </View>
              </View>
              <Text style={styles.apHeading}>{t('deptPublishThisDecree')}</Text>
              <Text style={styles.apSub}>{t('deptPublishDecreeHint')}</Text>
            </View>
            <View style={styles.apFooter}>
              <Pressable onPress={onClose} style={styles.apBtnGhost} disabled={busy}>
                <Text style={styles.apBtnGhostTxt}>{t('btnCancel')}</Text>
              </Pressable>
              <Pressable onPress={approve} style={styles.apBtnPri} disabled={busy}>
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.apBtnPriTxt}>{t('btnPublish')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

type RejectProps = {
  visible: boolean;
  decreeNum: string;
  onClose: () => void;
  onReject: (reason: string) => void;
};

type DeleteProps = {
  visible: boolean;
  decreeNum: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteDecreeConfirmModal({ visible, decreeNum, onClose, onConfirm }: DeleteProps) {
  const { t } = useAppTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.apRoot}>
        <Pressable style={styles.apBackdrop} onPress={onClose} accessibilityLabel={t('a11yClose')} />
        <View style={styles.apCenter} pointerEvents="box-none">
          <View style={[styles.apCard, styles.delCard]}>
            <Text style={styles.delTitle}>{t('deptRemoveDecreeMessage', { number: decreeNum || '—' })}</Text>
            <Text style={styles.delBody}>
              {t('certsRevokeUndo')}
            </Text>
            <View style={[styles.apFooter, styles.delFooter]}>
              <Pressable onPress={onClose} style={styles.apBtnGhost}>
                <Text style={styles.apBtnGhostTxt}>{t('btnCancel')}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onConfirm();
                  onClose();
                }}
                style={styles.rjBtnPri}>
                <Text style={styles.apBtnPriTxt}>{t('btnDelete')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function RejectDecreeModal({ visible, decreeNum, onClose, onReject }: RejectProps) {
  const { t } = useAppTranslation();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) setReason('');
  }, [visible]);

  const reject = () => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      onReject(reason.trim());
      onClose();
    }, 200);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.apRoot}>
        <Pressable style={styles.apBackdrop} onPress={onClose} accessibilityLabel={t('a11yClose')} />
        <View style={styles.apCenter} pointerEvents="box-none">
          <View style={styles.apCard}>
            <View style={styles.apHead}>
              <Text style={styles.apTitle}>{t('deptArchiveRejectTitle')}</Text>
              <AppPressable onPress={onClose} hitSlop={12} accessibilityLabel={t('a11yClose')}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </AppPressable>
            </View>
            <View style={styles.apDivider} />
            <View style={styles.apBody}>
              <View style={styles.rjIconOuter}>
                <View style={styles.rjIconInner}>
                  <Ionicons name="close" size={28} color={palette.white} />
                </View>
              </View>
              <Text style={styles.apHeading}>{t('deptArchiveThisDecree')}</Text>
              <Text style={styles.apSub}>{t('deptRejectReasonPrompt')}</Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder={t('deptRejectReasonPlaceholder')}
                placeholderTextColor={LABEL_GRAY}
                multiline
                style={styles.rjInput}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.apFooter}>
              <Pressable onPress={onClose} style={styles.apBtnGhost} disabled={busy}>
                <Text style={styles.apBtnGhostTxt}>{t('btnCancel')}</Text>
              </Pressable>
              <Pressable onPress={reject} style={styles.rjBtnPri} disabled={busy}>
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.apBtnPriTxt}>{t('a11yReject')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  peBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  peKav: { flex: 1, justifyContent: 'center', paddingHorizontal: 18 },
  peCard: {
    maxHeight: '88%',
    backgroundColor: palette.white,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 440,
    ...DeptUploadDash.shadow,
  },
  peHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },
  peTitle: { fontSize: 18, fontWeight: '700', color: SLATE, flex: 1 },
  peDivider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER },
  peLoading: { paddingVertical: 40, paddingHorizontal: 18, alignItems: 'center', gap: 12 },
  peLoadingTxt: { fontSize: 14, color: MUTED },
  peErrTxt: { fontSize: 14, color: '#B91C1C', textAlign: 'center', marginBottom: 12 },
  peScroll: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 22 },
  peSection: { fontSize: 15, fontWeight: '700', color: GREEN_PRI, marginTop: 20, marginBottom: 4 },
  peHint: { fontSize: 12, color: MUTED, lineHeight: 18, marginBottom: 4 },
  peLblOptional: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 12,
    marginBottom: 8,
  },
  peAreaTall: { minHeight: 140, textAlignVertical: 'top' },
  peTitleArea: { minHeight: 76, textAlignVertical: 'top' },
  peLbl: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 14,
    marginBottom: 8,
  },
  peReqStar: {
    color: '#DC2626',
    fontWeight: '700',
  },
  peInput: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: SLATE,
    minHeight: 48,
  },
  peArea: { minHeight: 120, textAlignVertical: 'top' },
  peCatTrig: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    backgroundColor: palette.white,
  },
  peCatTrigTxt: { flex: 1, fontSize: 15, color: SLATE, marginRight: 8 },
  peCatMenu: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: palette.white,
    overflow: 'hidden',
    ...DeptUploadDash.shadow,
  },
  peCatRow: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  peCatRowHi: { backgroundColor: '#0088FF', borderBottomColor: '#0088FF' },
  peCatRowTxt: { fontSize: 15, color: '#000000', fontWeight: '500' },
  peCatRowTxtHi: { color: palette.white, fontWeight: '600' },
  peActions: { flexDirection: 'row', gap: 12, marginTop: 22 },
  peBtnGhost: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    backgroundColor: palette.white,
  },
  peBtnGhostTxt: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  peBtnPri: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: GREEN_PRI,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peBtnPriTxt: { fontSize: 15, fontWeight: '700', color: palette.white },

  apRoot: { flex: 1 },
  apBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.5)' },
  apCenter: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22 },
  apCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: palette.white,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    ...DeptUploadDash.shadow,
  },
  apHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  apTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', flex: 1 },
  apDivider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginBottom: 20 },
  apBody: { alignItems: 'center', paddingBottom: 8 },
  apIconOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  apIconInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: GREEN_BTN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  apHeading: { fontSize: 18, fontWeight: '800', color: SLATE, textAlign: 'center', marginBottom: 8 },
  apSub: { fontSize: 14, fontWeight: '400', color: MUTED, textAlign: 'center', paddingHorizontal: 8, lineHeight: 20 },
  apFooter: { flexDirection: 'row', gap: 12, marginTop: 22 },
  apBtnGhost: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    backgroundColor: palette.white,
  },
  apBtnGhostTxt: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  apBtnPri: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: GREEN_PRI,
    alignItems: 'center',
    justifyContent: 'center',
  },
  apBtnPriTxt: { fontSize: 15, fontWeight: '700', color: palette.white },
  rjIconOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  rjIconInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: DESTRUCTIVE_FILL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rjInput: {
    marginTop: 16,
    width: '100%',
    minHeight: 100,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: SLATE,
    textAlignVertical: 'top',
  },
  rjBtnPri: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: DESTRUCTIVE_FILL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delCard: { paddingBottom: 18 },
  delTitle: { fontSize: 17, fontWeight: '800', color: SLATE, marginBottom: 8, textAlign: 'center' },
  delBody: { fontSize: 14, fontWeight: '500', color: MUTED, textAlign: 'center', marginBottom: 4, lineHeight: 20 },
  delFooter: { marginTop: 18 },
});
