import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPressable } from '@/components/ui/AppPressable';
import { palette } from '@/lib/theme';

import { DeptUploadDash } from '@/constants/dept-upload-dashboard';
import { useAppLanguage } from '@/contexts/app-language-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { DatePickerField } from '@/components/ui/IslamicDatePicker';
import { buildLocalizedBlocks, pickApiLocalizedBlock, slugifyCategoryName } from '@/lib/dept-upload-helpers';
import {
  createCategory,
  createDecree,
  getNextDecreeNumberPreview,
  type DecreeCategory,
} from '@/lib/api/decree-upload';
import { showToast } from '@/lib/adapters/toast';

type Props = {
  visible: boolean;
  categories: DecreeCategory[];
  onClose: () => void;
  onCreated: () => void;
};

const LABEL_SLATE = '#1E293B';
const BORDER = '#E2E8F0';
const BORDER_SOFT = '#E5E7EB';
const OPTIONAL_MUTED = '#94A3B8';
const PLACEHOLDER = '#94A3B8';
const DROPDOWN_BLUE = palette.primary;
const ICON_GREEN = '#166534';
const CAT_TRIGGER_BORDER = '#C1D3D2';

export function UploadDecreeFormModal({ visible, categories, onClose, onCreated }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { t } = useAppTranslation();
  const { language } = useAppLanguage();
  const textDir = 'rtl';

  const [titlePs, setTitlePs] = useState('');
  const [titleFa, setTitleFa] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [newCatModalOpen, setNewCatModalOpen] = useState(false);
  const [newCatPs, setNewCatPs] = useState('');
  const [newCatFa, setNewCatFa] = useState('');
  const [newCatBusy, setNewCatBusy] = useState(false);
  /** Until parent `categories` refreshes, show the label we just created. */
  const [pendingNewCategoryLabel, setPendingNewCategoryLabel] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [creationDate, setCreationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [contentPs, setContentPs] = useState('');
  const [contentDr, setContentDr] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [initialPublication, setInitialPublication] = useState<'draft' | 'published'>('draft');
  const [numPreview, setNumPreview] = useState<string | null>(null);

  const activeCats = useMemo(() => categories.filter((c) => c.isActive).sort((a, b) => a.name.localeCompare(b.name)), [categories]);

  const reset = useCallback(() => {
    setTitlePs('');
    setTitleFa('');
    setCategoryId('');
    setPendingNewCategoryLabel(null);
    setNewCatModalOpen(false);
    setNewCatPs('');
    setNewCatFa('');
    setDescription('');
    setCreationDate(new Date().toISOString().slice(0, 10));
    setContentPs('');
    setContentDr('');
    setErrors({});
    setCategoryOpen(false);
    setInitialPublication('draft');
    setNumPreview(null);
  }, []);

  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  useEffect(() => {
    if (!categoryId) {
      setNumPreview(null);
      return;
    }
    let cancel = false;
    void (async () => {
      const r = await getNextDecreeNumberPreview({ categoryId });
      if (cancel) return;
      if (r.ok) setNumPreview(r.data.displayLabel);
      else setNumPreview(null);
    })();
    return () => {
      cancel = true;
    };
  }, [categoryId]);

  const categoryTriggerLabel = useMemo(() => {
    if (categoryId) {
      const c = activeCats.find((x) => x.id === categoryId);
      return c?.name ?? pendingNewCategoryLabel ?? t('uploadFieldSelectCategory');
    }
    return t('uploadFieldSelectCategory');
  }, [categoryId, activeCats, pendingNewCategoryLabel]);

  const selectCategoryRow = (id: string) => {
    setCategoryId(id);
    setPendingNewCategoryLabel(null);
    setErrors((x) => ({ ...x, category: '' }));
    setCategoryOpen(false);
  };

  const selectAddNewCategory = () => {
    setNewCatPs('');
    setNewCatFa('');
    setErrors((x) => ({ ...x, category: '' }));
    setCategoryOpen(false);
    setNewCatModalOpen(true);
  };

  const clearCategorySelection = () => {
    setCategoryId('');
    setPendingNewCategoryLabel(null);
    setErrors((x) => ({ ...x, category: '' }));
    setCategoryOpen(false);
  };

  const saveNewCategoryFromModal = async () => {
    const ps = newCatPs.trim();
    if (!ps) {
      showToast(t('deptCategoryPashtoNameRequired'), 'error');
      return;
    }
    setNewCatBusy(true);
    try {
      const slug = slugifyCategoryName(ps);
      const cr = await createCategory({
        slug,
        name: ps,
        namePs: ps || null,
        nameFa: newCatFa.trim() || null,
      });
      if (!cr.ok) {
        if (cr.status === 409) {
          showToast(t('deptCategorySlugAlreadyExists'), 'error');
        } else {
          showToast(cr.message, 'error');
        }
        return;
      }
      setCategoryId(cr.data.id);
      setPendingNewCategoryLabel(cr.data.namePs ?? cr.data.name);
      setNewCatModalOpen(false);
      setNewCatPs('');
      setNewCatFa('');
      onCreated();
    } finally {
      setNewCatBusy(false);
    }
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!titlePs.trim()) e.titlePs = t('uploadFieldTitlePsRequired');
    if (!titleFa.trim()) e.titleFa = t('uploadFieldTitleFaRequired');
    if (!description.trim()) e.description = t('uploadFieldDescriptionRequired');
    if (!categoryId) e.category = t('uploadFieldSelectCategory');
    if (!creationDate.trim()) e.creationDate = t('deptCreationDateRequired');
    else {
      const d = new Date(`${creationDate.trim()}T00:00:00.000Z`);
      if (Number.isNaN(d.getTime())) e.creationDate = t('deptCreationDateInvalid');
    }
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    try {
      const catIds: string[] = [categoryId];
      const psT = titlePs.trim();
      const faT = titleFa.trim();
      const titleSummary = psT || faT;

      const localized = buildLocalizedBlocks(contentPs, contentDr);
      const localizedBlocks = localized.length ? localized : [{ locale: 'ps', bodyPlain: description.trim() }];
      const localizedContent = localizedBlocks
        .map((b) => pickApiLocalizedBlock(b))
        .filter((x): x is NonNullable<typeof x> => x != null);
      const dr = await createDecree({
        titlePs: psT,
        titleFa: faT,
        titleEn: '',
        titleSummary,
        initialPublication,
        categoryIds: catIds,
        creationDate: new Date(`${creationDate.trim()}T00:00:00.000Z`),
        metadata: { description: description.trim() },
        initialVersion: {
          changeSummary: description.trim(),
          localizedContent,
        },
      });
      if (!dr.ok) {
        showToast(dr.message, 'error');
        return;
      }

      showToast(t('uploadCreatedSuccess'), 'success');
      reset();
      onCreated();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const cardMaxH = Math.min(height * 0.9, 720);

  return (
    <>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !busy && onClose()}>
      <Pressable
        style={styles.backdrop}
        onPress={() => {
          if (categoryOpen) {
            setCategoryOpen(false);
            return;
          }
          if (!busy) onClose();
        }}
        accessibilityLabel={t('a11yClose')}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
        pointerEvents="box-none">
        <View style={[styles.card, { maxHeight: cardMaxH, marginBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('uploadNewDecreeTitle')}</Text>
            <AppPressable onPress={() => !busy && onClose()} hitSlop={12} accessibilityLabel={t('a11yClose')}>
              <Ionicons name="close" size={26} color="#94A3B8" />
            </AppPressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollPad}
            nestedScrollEnabled
            onScrollBeginDrag={() => setCategoryOpen(false)}>
            <Label required>{t('uploadTitlePsLabel')}</Label>
            <TextInput
              value={titlePs}
              onChangeText={(x) => {
                setTitlePs(x);
                setErrors((e) => ({ ...e, titlePs: '' }));
              }}
              placeholder={t('deptUploadTitlePlaceholder')}
              placeholderTextColor={PLACEHOLDER}
              multiline
              textAlign="right"
              style={[styles.inputAreaRtl, styles.inputTitle, errors.titlePs && styles.inputErr, { writingDirection: textDir }]}
              textAlignVertical="top"
            />
            {errors.titlePs ? <Text style={styles.err}>{errors.titlePs}</Text> : null}

            <Label required>{t('uploadTitleFaLabel')}</Label>
            <TextInput
              value={titleFa}
              onChangeText={(x) => {
                setTitleFa(x);
                setErrors((e) => ({ ...e, titleFa: '' }));
              }}
              placeholder={t('deptUploadTitlePlaceholder')}
              placeholderTextColor={PLACEHOLDER}
              multiline
              textAlign="right"
              style={[styles.inputAreaRtl, styles.inputTitle, errors.titleFa && styles.inputErr, { writingDirection: textDir }]}
              textAlignVertical="top"
            />
            {errors.titleFa ? <Text style={styles.err}>{errors.titleFa}</Text> : null}

            <Label required>{t('uploadCategoryLabel')}</Label>
            <View style={styles.catWrap}>
              <Pressable
                onPress={() => setCategoryOpen((o) => !o)}
                style={[styles.catTrigger, errors.category && styles.inputErr]}
                accessibilityRole="button"
                accessibilityState={{ expanded: categoryOpen }}>
                <Text style={[styles.catTriggerTxt, !categoryId && styles.catTriggerPh]} numberOfLines={1}>
                  {categoryTriggerLabel}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#64748B" />
              </Pressable>
              {categoryOpen ? (
                <View style={styles.catMenu}>
                  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="always" style={styles.catMenuScroll}>
                    <Pressable
                      onPress={clearCategorySelection}
                      style={[styles.catRow, !categoryId && styles.catRowHi]}>
                      <Text style={[styles.catRowTxt, !categoryId && styles.catRowTxtHi]}>{t('uploadFieldSelectCategory')}</Text>
                    </Pressable>
                    {activeCats.map((c) => (
                      <Pressable
                        key={c.id}
                        onPress={() => selectCategoryRow(c.id)}
                        style={[styles.catRow, categoryId === c.id && styles.catRowHi]}>
                        <Text style={[styles.catRowTxt, categoryId === c.id && styles.catRowTxtHi]} numberOfLines={1}>
                          {c.name}
                        </Text>
                      </Pressable>
                    ))}
                    <Pressable onPress={selectAddNewCategory} style={[styles.catRow, styles.catRowLast]}>
                      <Text style={styles.catRowTxt}>{t('deptCategoryAddNew')}</Text>
                    </Pressable>
                  </ScrollView>
                </View>
              ) : null}
            </View>
            {errors.category ? <Text style={styles.err}>{errors.category}</Text> : null}
            {numPreview ? (
              <Text style={styles.numPreview} accessibilityLiveRegion="polite">
                {t('deptNextNumberInCategory')}{' '}
                <Text style={styles.numPreviewStrong}>{numPreview}</Text>
              </Text>
            ) : null}

            <Text style={styles.subLbl}>{t('systemAdminTableStatus')}</Text>
            <View style={styles.segRow}>
              <Pressable
                onPress={() => setInitialPublication('draft')}
                style={[styles.segOpt, initialPublication === 'draft' && styles.segOptOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: initialPublication === 'draft' }}>
                <Text style={[styles.segOptTxt, initialPublication === 'draft' && styles.segOptTxtOn]}>{t('examStatusDraft')}</Text>
                <Text style={styles.segOptHint}>{t('deptStatusDraftHint')}</Text>
              </Pressable>
              <Pressable
                onPress={() => setInitialPublication('published')}
                style={[styles.segOpt, initialPublication === 'published' && styles.segOptOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: initialPublication === 'published' }}>
                <Text style={[styles.segOptTxt, initialPublication === 'published' && styles.segOptTxtOn]}>
                  {t('examStatusPublished')}
                </Text>
                <Text style={styles.segOptHint}>{t('deptStatusPublishedHint')}</Text>
              </Pressable>
            </View>

            <Label required>{t('deptUploadDescLabel')}</Label>
            <TextInput
              value={description}
              onChangeText={(x) => {
                setDescription(x);
                setErrors((e) => ({ ...e, description: '' }));
              }}
              placeholder={t('deptUploadDescPlaceholder')}
              placeholderTextColor={PLACEHOLDER}
              multiline
              style={[styles.inputArea, errors.description && styles.inputErr]}
              textAlignVertical="top"
            />
            {errors.description ? <Text style={styles.err}>{errors.description}</Text> : null}

            <Label required>{t('deptCreationDateLabel')}</Label>
            <DatePickerField
              value={creationDate}
              onChange={(iso) => {
                setCreationDate(iso);
                setErrors((e) => ({ ...e, creationDate: '' }));
              }}
              placeholder={t('deptCreationDatePlaceholder')}
              error={errors.creationDate}
            />
            {errors.creationDate ? <Text style={styles.err}>{errors.creationDate}</Text> : null}

            <View style={styles.sectionHead}>
              <Ionicons name="document-text" size={22} color={ICON_GREEN} />
              <Text style={styles.sectionTitle}>{t('deptUploadContentSectionTitle')}</Text>
            </View>

            <OptionalLabel>{t('deptBodyPsLabel')}</OptionalLabel>
            <TextInput
              value={contentPs}
              onChangeText={setContentPs}
              placeholder={t('deptBodyPsPlaceholder')}
              placeholderTextColor={PLACEHOLDER}
              multiline
              textAlign="right"
              style={[styles.inputAreaRtl, styles.inputAreaTall, { writingDirection: textDir }]}
              textAlignVertical="top"
            />

            <OptionalLabel>{t('deptBodyFaLabel')}</OptionalLabel>
            <TextInput
              value={contentDr}
              onChangeText={setContentDr}
              placeholder={t('deptBodyFaPlaceholder')}
              placeholderTextColor={PLACEHOLDER}
              multiline
              textAlign="right"
              style={[styles.inputAreaRtl, styles.inputAreaTall, { writingDirection: textDir }]}
              textAlignVertical="top"
            />

            <View style={styles.actions}>
              <Pressable
                onPress={() => !busy && onClose()}
                disabled={busy}
                style={({ pressed }) => [styles.btnCancel, pressed && { opacity: 0.92 }]}>
                <Text style={styles.btnCancelTxt}>{t('btnCancel')}</Text>
              </Pressable>
              <Pressable
                onPress={() => void submit()}
                disabled={busy}
                style={({ pressed }) => [styles.btnSubmit, (pressed || busy) && { opacity: 0.92 }]}>
                {busy ? (
                  <ActivityIndicator color={palette.white} />
                ) : (
                  <Text style={styles.btnSubmitTxt}>{t('btnSubmitDecree')}</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>

    <Modal
      visible={newCatModalOpen}
      transparent
      animationType="fade"
      onRequestClose={() => !newCatBusy && setNewCatModalOpen(false)}>
      <Pressable style={styles.backdrop} onPress={() => !newCatBusy && setNewCatModalOpen(false)} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav} pointerEvents="box-none">
        <View style={[styles.card, { maxHeight: 520 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('deptNewCategoryTitle')}</Text>
            <AppPressable onPress={() => !newCatBusy && setNewCatModalOpen(false)} hitSlop={12} accessibilityLabel={t('a11yClose')}>
              <Ionicons name="close" size={26} color="#94A3B8" />
            </AppPressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="always" contentContainerStyle={styles.scrollPad}>
            <Label required>{t('deptCategoryPashtoNameLabel')}</Label>
            <TextInput
              value={newCatPs}
              onChangeText={setNewCatPs}
              placeholder={t('deptCategoryPashtoNamePlaceholder')}
              placeholderTextColor={PLACEHOLDER}
              style={[styles.inputPill, styles.inputAreaRtl, { writingDirection: textDir }]}
              textAlign="right"
            />
            <OptionalLabel>{t('deptCategoryDariNameLabel')}</OptionalLabel>
            <TextInput
              value={newCatFa}
              onChangeText={setNewCatFa}
              placeholder={t('deptCategoryDariNamePlaceholder')}
              placeholderTextColor={PLACEHOLDER}
              style={[styles.inputPill, styles.inputAreaRtl, { writingDirection: textDir }]}
              textAlign="right"
            />
            <Text style={styles.hintMuted}>{t('deptCategorySlugHint')}</Text>
            <View style={[styles.actions, { marginTop: 16 }]}>
              <Pressable
                onPress={() => !newCatBusy && setNewCatModalOpen(false)}
                style={({ pressed }) => [styles.btnCancel, pressed && { opacity: 0.92 }]}>
                <Text style={styles.btnCancelTxt}>{t('btnCancel')}</Text>
              </Pressable>
              <Pressable
                onPress={() => void saveNewCategoryFromModal()}
                disabled={newCatBusy}
                style={({ pressed }) => [styles.btnSubmit, (pressed || newCatBusy) && { opacity: 0.92 }]}>
                {newCatBusy ? <ActivityIndicator color={palette.white} /> : <Text style={styles.btnSubmitTxt}>{t('btnCreate')}</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    </>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.label}>{children}</Text>
      {required ? <Text style={styles.reqStar}>*</Text> : null}
    </View>
  );
}

function OptionalLabel({ children }: { children: string }) {
  const { t } = useAppTranslation();
  return (
    <View style={styles.optRow}>
      <Text style={styles.labelPlain}>{children}</Text>
      <Text style={styles.optionalHint}>{t('deptOptionalIfUnknown')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  kav: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: palette.white,
    borderRadius: 16,
    overflow: 'hidden',
    ...DeptUploadDash.shadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: LABEL_SLATE,
    flex: 1,
  },
  scrollPad: {
    paddingHorizontal: 20,
    paddingBottom: 22,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 16,
    marginBottom: 8,
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: LABEL_SLATE,
    flexShrink: 1,
  },
  labelPlain: {
    fontSize: 14,
    fontWeight: '600',
    color: LABEL_SLATE,
  },
  reqStar: {
    color: '#DC2626',
    fontWeight: '700',
    ...Platform.select({ android: { fontFamily: 'sans-serif' }, default: {} }),
  },
  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 8,
  },
  optionalHint: {
    fontSize: 12,
    fontWeight: '500',
    color: OPTIONAL_MUTED,
  },
  hintMuted: {
    fontSize: 12,
    color: OPTIONAL_MUTED,
    marginTop: 8,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: LABEL_SLATE,
    minHeight: 48,
  },
  inputPill: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: LABEL_SLATE,
    minHeight: 48,
  },
  inputArea: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: LABEL_SLATE,
    minHeight: 100,
  },
  inputAreaRtl: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: LABEL_SLATE,
    minHeight: 120,
  },
  inputAreaTall: {
    minHeight: 120,
  },
  inputTitle: {
    minHeight: 72,
  },
  inputErr: {
    borderColor: '#F87171',
    backgroundColor: '#FEF2F2',
  },
  err: { fontSize: 12, color: '#DC2626', marginTop: 4 },
  catWrap: {
    zIndex: 20,
    marginBottom: 0,
  },
  catTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    backgroundColor: palette.white,
  },
  catTriggerNew: {
    borderColor: CAT_TRIGGER_BORDER,
  },
  catTriggerTxt: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: LABEL_SLATE,
    marginRight: 8,
  },
  catTriggerPh: {
    color: palette.black,
  },
  catMenu: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: palette.white,
    overflow: 'hidden',
    maxHeight: 280,
    ...DeptUploadDash.shadow,
  },
  catMenuScroll: {
    maxHeight: 280,
  },
  catRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_SOFT,
  },
  catRowLast: {
    borderBottomWidth: 0,
  },
  catRowHi: {
    backgroundColor: DROPDOWN_BLUE,
    borderBottomColor: DROPDOWN_BLUE,
  },
  catRowTxt: {
    fontSize: 15,
    fontWeight: '500',
    color: palette.black,
  },
  catRowTxtHi: {
    color: palette.white,
    fontWeight: '600',
  },
  numPreview: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    marginBottom: 4,
  },
  numPreviewStrong: {
    fontWeight: '700',
    color: LABEL_SLATE,
  },
  subLbl: {
    fontSize: 14,
    fontWeight: '600',
    color: LABEL_SLATE,
    marginTop: 16,
    marginBottom: 8,
  },
  segRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segOpt: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: palette.white,
  },
  segOptOn: {
    borderColor: DROPDOWN_BLUE,
    backgroundColor: palette.primaryWash,
  },
  segOptTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  segOptTxtOn: {
    color: DROPDOWN_BLUE,
  },
  segOptHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: LABEL_SLATE,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelTxt: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  btnSubmit: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSubmitTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.white,
  },
});
