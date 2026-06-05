import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  I18nManager,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppPressable } from '@/components/ui/AppPressable';
import type { Template, TemplateField } from '@/data/inspector-admin-store';
import { useAppTranslation } from '@/hooks/use-app-translation';
import {
  Brand,
  FormColors,
  palette,
  radius,
  semantic,
  shadowCard,
  spacing,
  touchTarget,
  typography,
} from '@/lib/theme';

type TFunc = (key: string, options?: Record<string, unknown>) => string;

type BuilderType = 'text' | 'yes_no' | 'photo' | 'gps' | 'rating' | 'signature';

type PaletteEntry = {
  type: BuilderType;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  typeLabelKey: string;
  defaultLabelKey: string;
};

const PALETTE: PaletteEntry[] = [
  {
    type: 'text',
    labelKey: 'builderFieldText',
    icon: 'document-text-outline',
    typeLabelKey: 'builderTypeText',
    defaultLabelKey: 'builderDefaultLabelText',
  },
  {
    type: 'yes_no',
    labelKey: 'builderFieldYesNo',
    icon: 'checkmark-circle-outline',
    typeLabelKey: 'builderTypeYesNo',
    defaultLabelKey: 'builderDefaultLabelYesNo',
  },
  {
    type: 'photo',
    labelKey: 'builderFieldPhoto',
    icon: 'image-outline',
    typeLabelKey: 'builderTypePhoto',
    defaultLabelKey: 'builderDefaultLabelPhoto',
  },
  {
    type: 'gps',
    labelKey: 'builderFieldGps',
    icon: 'location-outline',
    typeLabelKey: 'builderTypeGps',
    defaultLabelKey: 'builderDefaultLabelGps',
  },
  {
    type: 'rating',
    labelKey: 'builderFieldRating',
    icon: 'star-outline',
    typeLabelKey: 'builderTypeRating',
    defaultLabelKey: 'builderDefaultLabelRating',
  },
  {
    type: 'signature',
    labelKey: 'builderFieldSignature',
    icon: 'create-outline',
    typeLabelKey: 'builderTypeSignature',
    defaultLabelKey: 'builderDefaultLabelSignature',
  },
];

type TemplateCategory = {
  id: string;
  name: string;
  decrees: { id: string; title: string; decreeVersionId?: string }[];
};

function typeLabelFor(type: TemplateField['type'], t: TFunc): string {
  switch (type) {
    case 'yes_no':
      return t('builderTypeYesNo');
    case 'photo':
      return t('builderTypePhoto');
    case 'gps':
      return t('builderTypeGps');
    case 'rating':
      return t('builderTypeRating');
    case 'signature':
      return t('builderTypeSignature');
    case 'notes':
      return t('builderTypeNotes');
    case 'text':
    default:
      return t('builderTypeText');
  }
}

function makeId(): string {
  return `f_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

export type TemplateBuilderValue = {
  name: string;
  category: string;
  categoryId: string;
  decreeSelectionMode: 'category' | 'decrees';
  selectedDecreeIds: string[];
  inspectionLocation: string;
  status: Template['status'];
  fields: TemplateField[];
};

type Props = {
  visible: boolean;
  mode: 'create' | 'edit';
  categories: TemplateCategory[];
  initial?: Partial<TemplateBuilderValue>;
  onClose: () => void;
  onSubmit: (value: TemplateBuilderValue) => Promise<{ ok: boolean; message?: string }>;
};

export function TemplateBuilderSheet({ visible, mode, categories, initial, onClose, onSubmit }: Props) {
  const { t } = useAppTranslation();
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [selectionMode, setSelectionMode] = useState<'category' | 'decrees'>('category');
  const [selectedDecreeIds, setSelectedDecreeIds] = useState<string[]>([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Record<string, boolean>>({});
  const [location, setLocation] = useState('');
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [saving, setSaving] = useState(false);

  const defaultCategoryId = categories[0]?.id ?? '';
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c] as const)),
    [categories],
  );
  const activeCategory = categoryMap.get(categoryId) ?? null;

  useEffect(() => {
    if (!visible) return;
    setName(initial?.name ?? '');
    const fallbackByName =
      initial?.category && initial.category.trim()
        ? categories.find((c) => c.name.toLowerCase() === initial.category!.trim().toLowerCase())?.id
        : null;
    const requestedCategoryId =
      (initial?.categoryId && categoryMap.has(initial.categoryId) ? initial.categoryId : null) ??
      fallbackByName ??
      defaultCategoryId;
    setCategoryId(requestedCategoryId);
    setSelectionMode(initial?.decreeSelectionMode === 'decrees' ? 'decrees' : 'category');
    setSelectedDecreeIds(initial?.selectedDecreeIds ?? []);
    setLocation(initial?.inspectionLocation ?? '');
    setFields(initial?.fields ?? []);
    setCategoryOpen(false);
    setExpandedCategoryIds(requestedCategoryId ? { [requestedCategoryId]: true } : {});
    setSaving(false);
  }, [visible, initial, defaultCategoryId, categoryMap]);

  const addField = useCallback(
    (entry: PaletteEntry) => {
      setFields((prev) => [
        ...prev,
        {
          id: makeId(),
          type: entry.type as TemplateField['type'],
          label: t(entry.defaultLabelKey),
          required: false,
        },
      ]);
    },
    [t],
  );

  const updateField = useCallback((id: string, patch: Partial<TemplateField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const moveField = useCallback((id: string, dir: -1 | 1) => {
    setFields((prev) => {
      const i = prev.findIndex((f) => f.id === id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    const resolvedCategory = activeCategory ?? categories[0] ?? null;
    if (!resolvedCategory) {
      setSaving(false);
      return;
    }
    const normalizedDecreeIds =
      selectionMode === 'decrees'
        ? selectedDecreeIds.filter((id) => resolvedCategory.decrees.some((d) => d.id === id))
        : [];
    if (selectionMode === 'decrees' && normalizedDecreeIds.length === 0) {
      setSaving(false);
      return;
    }
    const res = await onSubmit({
      name,
      category: resolvedCategory.name,
      categoryId: resolvedCategory.id,
      decreeSelectionMode: selectionMode,
      selectedDecreeIds: normalizedDecreeIds,
      inspectionLocation: location,
      status: 'active',
      fields,
    });
    setSaving(false);
    if (res.ok) {
      onClose();
    }
  }, [saving, onSubmit, name, activeCategory, categories, selectionMode, selectedDecreeIds, location, fields, onClose]);

  const title = mode === 'edit' ? t('builderEditTitle') : t('builderVisualTitle');
  const submitLabel = mode === 'edit' ? t('builderSaveChanges') : t('builderSavePublish');
  const canSave =
    name.trim().length > 0 &&
    !!activeCategory &&
    (selectionMode === 'category' || selectedDecreeIds.length > 0);
  const selectedCategoryLabel = activeCategory?.name ?? 'Select category';

  const toggleCategoryExpand = useCallback((id: string) => {
    setExpandedCategoryIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const selectWholeCategory = useCallback(
    (id: string) => {
      setCategoryId(id);
      setSelectionMode('category');
      setSelectedDecreeIds([]);
    },
    [],
  );

  const toggleDecreeSelection = useCallback(
    (id: string, decreeId: string) => {
      setCategoryId(id);
      setSelectionMode('decrees');
      setSelectedDecreeIds((prev) =>
        prev.includes(decreeId) ? prev.filter((x) => x !== decreeId) : [...prev, decreeId],
      );
    },
    [],
  );

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
        <AppPressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel={t('a11yCloseMenu')}
        />
        <View style={styles.sheet}>
          {/* --- Header --- */}
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {title}
            </Text>
            <AppPressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel={t('a11yClose')}>
              <Ionicons name="close" size={22} color={FormColors.subtitle} />
            </AppPressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {/* --- Field palette --- */}
            <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.2}>
              {t('builderFieldPalette')}
            </Text>
            <View style={styles.paletteGrid}>
              {PALETTE.map((entry) => (
                <AppPressable
                  key={entry.type}
                  onPress={() => addField(entry)}
                  style={styles.paletteBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t(entry.labelKey)}>
                  <Ionicons name={entry.icon} size={18} color={FormColors.subtitle} />
                  <Text style={styles.paletteText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                    {t(entry.labelKey)}
                  </Text>
                </AppPressable>
              ))}
            </View>

            {/* --- Category --- */}
            <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]} maxFontSizeMultiplier={1.2}>
              {t('builderCategory')}
            </Text>
            <AppPressable
              onPress={() => setCategoryOpen((v) => !v)}
              style={styles.selectBtn}
              accessibilityRole="button"
              accessibilityState={{ expanded: categoryOpen }}
              accessibilityLabel={t('builderCategory')}>
              <Text style={styles.selectText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {selectedCategoryLabel}
              </Text>
              <Ionicons
                name={categoryOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={FormColors.subtitle}
              />
            </AppPressable>
            {categoryOpen ? (
              <View style={[styles.selectMenu, shadowCard()]}>
                {categories.map((cat) => {
                  const isExpanded = !!expandedCategoryIds[cat.id];
                  const isWholeSelected = categoryId === cat.id && selectionMode === 'category';
                  const decreeCount = cat.decrees.length;
                  return (
                    <View key={cat.id}>
                      <View style={[styles.selectMenuRow, isWholeSelected && styles.selectMenuRowActive]}>
                        <AppPressable
                          onPress={() => toggleCategoryExpand(cat.id)}
                          style={styles.expandBtn}
                          accessibilityRole="button"
                          accessibilityLabel={`Expand ${cat.name}`}>
                          <Ionicons
                            name={isExpanded ? 'chevron-down' : I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'}
                            size={16}
                            color={FormColors.subtitle}
                          />
                        </AppPressable>
                        <Text style={[styles.selectMenuText, isWholeSelected && styles.selectMenuTextActive]} numberOfLines={1}>
                          {cat.name}
                          {` (${decreeCount})`}
                        </Text>
                        <AppPressable
                          onPress={() => selectWholeCategory(cat.id)}
                          style={styles.wholeCategoryBtn}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isWholeSelected }}
                          accessibilityLabel={`Select whole ${cat.name} category`}>
                          <Ionicons
                            name={isWholeSelected ? 'checkmark-circle' : 'ellipse-outline'}
                            size={18}
                            color={isWholeSelected ? Brand.green : FormColors.subtitle}
                          />
                        </AppPressable>
                      </View>
                      {isExpanded
                        ? cat.decrees.map((decree) => {
                            const selected = categoryId === cat.id && selectedDecreeIds.includes(decree.id);
                            return (
                              <AppPressable
                                key={decree.id}
                                onPress={() => toggleDecreeSelection(cat.id, decree.id)}
                                style={styles.decreeRow}
                                accessibilityRole="button"
                                accessibilityState={{ selected }}
                                accessibilityLabel={decree.title}>
                                <Ionicons
                                  name={selected ? 'checkbox' : 'square-outline'}
                                  size={17}
                                  color={selected ? Brand.green : FormColors.subtitle}
                                />
                                <Text style={styles.decreeText} numberOfLines={1}>
                                  {decree.title}
                                </Text>
                              </AppPressable>
                            );
                          })
                        : null}
                    </View>
                  );
                })}
              </View>
            ) : null}

            {/* --- Template name (bold heading / placeholder) --- */}
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('builderTemplateNamePlaceholder')}
              placeholderTextColor={palette.neutral400}
              style={styles.nameInput}
              maxLength={120}
            />

            {/* --- Inspection location --- */}
            <View style={styles.locationLabelRow}>
              <Ionicons name="location-outline" size={14} color={Brand.green} />
              <Text style={styles.locationLabel} maxFontSizeMultiplier={1.2}>
                {t('builderInspectionLocation').toUpperCase()}
              </Text>
            </View>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder={t('builderLocationPlaceholder')}
              placeholderTextColor={palette.neutral400}
              style={styles.locationInput}
            />
            <Text style={styles.helper} maxFontSizeMultiplier={1.2}>
              {t('builderLocationHelper')}
            </Text>

            {/* --- Canvas --- */}
            <View style={styles.canvas}>
              {fields.length === 0 ? (
                <View style={styles.canvasEmpty}>
                  <View style={styles.canvasPlusChip}>
                    <Ionicons name="add" size={24} color={palette.neutral400} />
                  </View>
                  <Text style={styles.canvasEmptyTitle} maxFontSizeMultiplier={1.2}>
                    {t('builderCanvasEmptyTitle')}
                  </Text>
                  <Text style={styles.canvasEmptyHint} maxFontSizeMultiplier={1.2}>
                    {t('builderCanvasEmptyHint').toUpperCase()}
                  </Text>
                </View>
              ) : (
                fields.map((field, idx) => (
                  <FieldCard
                    key={field.id}
                    index={idx + 1}
                    field={field}
                    typeLabel={typeLabelFor(field.type, t)}
                    onChangeLabel={(label) => updateField(field.id, { label })}
                    onMoveUp={idx > 0 ? () => moveField(field.id, -1) : undefined}
                    onMoveDown={idx < fields.length - 1 ? () => moveField(field.id, 1) : undefined}
                    onRemove={() => removeField(field.id)}
                    t={t}
                  />
                ))
              )}
            </View>
          </ScrollView>

          {/* --- Footer actions --- */}
          <View style={styles.footer}>
            <AppPressable
              onPress={onClose}
              style={styles.discardBtn}
              accessibilityRole="button"
              accessibilityLabel={t('builderDiscard')}>
              <Text style={styles.discardText} maxFontSizeMultiplier={1.15}>
                {t('builderDiscard').toUpperCase()}
              </Text>
            </AppPressable>
            <AppPressable
              onPress={() => void handleSubmit()}
              disabled={!canSave || saving}
              style={[styles.saveBtn, (!canSave || saving) && styles.saveBtnDisabled]}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave || saving }}
              accessibilityLabel={submitLabel}>
              <Text style={styles.saveText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {submitLabel.toUpperCase()}
              </Text>
            </AppPressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type FieldCardProps = {
  index: number;
  field: TemplateField;
  typeLabel: string;
  onChangeLabel: (label: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove: () => void;
  t: TFunc;
};

function FieldCard({ index, field, typeLabel, onChangeLabel, onMoveUp, onMoveDown, onRemove, t }: FieldCardProps) {
  return (
    <View style={[styles.fieldCard, shadowCard()]}>
      <View style={styles.fieldHeader}>
        <View style={styles.fieldIndex}>
          <Text style={styles.fieldIndexText} maxFontSizeMultiplier={1.1}>
            {index}
          </Text>
        </View>
        <Text style={styles.fieldType} maxFontSizeMultiplier={1.2}>
          {typeLabel}
        </Text>
        <View style={styles.fieldActions}>
          {onMoveUp ? (
            <AppPressable
              onPress={onMoveUp}
              style={styles.fieldAction}
              accessibilityRole="button"
              accessibilityLabel={t('builderMoveUp')}>
              <Ionicons name="arrow-up" size={16} color={FormColors.subtitle} />
            </AppPressable>
          ) : null}
          {onMoveDown ? (
            <AppPressable
              onPress={onMoveDown}
              style={styles.fieldAction}
              accessibilityRole="button"
              accessibilityLabel={t('builderMoveDown')}>
              <Ionicons name="arrow-down" size={16} color={FormColors.subtitle} />
            </AppPressable>
          ) : null}
          <AppPressable
            onPress={onRemove}
            style={styles.fieldAction}
            accessibilityRole="button"
            accessibilityLabel={t('builderRemoveField')}>
            <Ionicons name="trash-outline" size={16} color={semantic.errorText} />
          </AppPressable>
        </View>
      </View>
      <TextInput
        value={field.label}
        onChangeText={onChangeLabel}
        style={styles.fieldLabelInput}
        placeholder={t('builderDefaultLabelText')}
        placeholderTextColor={palette.neutral400}
      />
      {field.type === 'signature' ? (
        <View style={styles.signaturePreviewWrap}>
          <Text style={styles.signaturePreviewLabel} maxFontSizeMultiplier={1.2}>
            {t('builderSignaturePreview').toUpperCase()}
          </Text>
          <View style={styles.signatureBox}>
            <Ionicons name="create-outline" size={26} color={palette.neutral300} />
            <Text style={styles.signatureHint} maxFontSizeMultiplier={1.2}>
              {t('builderSignHere').toUpperCase()}
            </Text>
          </View>
          <View style={styles.signatureActions}>
            <View style={styles.signatureChip}>
              <Ionicons name="refresh-outline" size={14} color={FormColors.subtitle} />
              <Text style={styles.signatureChipText}>{t('builderClear').toUpperCase()}</Text>
            </View>
            <View style={styles.signatureChip}>
              <Ionicons name="checkmark" size={14} color={FormColors.subtitle} />
              <Text style={styles.signatureChipText}>
                {t('builderConfirmSignature').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

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
    maxHeight: '92%',
    overflow: 'hidden',
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

  /* scroll body */
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },

  /* section labels */
  sectionLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: palette.neutral400,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },

  /* palette grid */
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  paletteBtn: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: palette.white,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
  },
  paletteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    color: FormColors.title,
  },

  /* select */
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: palette.neutral100,
    borderRadius: radius.md,
    minHeight: 44,
  },
  selectText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: FormColors.title,
  },
  selectMenu: {
    marginTop: spacing.xs,
    backgroundColor: palette.white,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    overflow: 'hidden',
  },
  selectMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  expandBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wholeCategoryBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectMenuRowActive: {
    backgroundColor: palette.rowActiveWash,
  },
  selectMenuText: {
    flex: 1,
    fontSize: 15,
    color: FormColors.title,
    fontWeight: '500',
  },
  selectMenuTextActive: {
    color: Brand.green,
    fontWeight: '700',
  },
  decreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
    paddingLeft: spacing.xl,
    backgroundColor: palette.neutral50,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.neutral200,
    minHeight: 40,
  },
  decreeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    color: FormColors.title,
    fontWeight: '500',
  },

  /* name input */
  nameInput: {
    marginTop: spacing.lg,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    color: FormColors.title,
    paddingVertical: spacing.xs,
  },

  /* location */
  locationLabelRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  locationLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: Brand.green,
  },
  locationInput: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: palette.neutral100,
    borderRadius: radius.md,
    fontSize: 15,
    color: FormColors.title,
    minHeight: 44,
  },
  helper: {
    marginTop: spacing.xs,
    fontSize: 11,
    lineHeight: 15,
    color: palette.neutral500,
  },

  /* canvas */
  canvas: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  canvasEmpty: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.xs,
  },
  canvasPlusChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.neutral200,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  canvasEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.neutral400,
  },
  canvasEmptyHint: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1,
    color: palette.neutral400,
    textAlign: 'center',
  },

  /* field card */
  fieldCard: {
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fieldIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldIndexText: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.neutral500,
  },
  fieldType: {
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: Brand.gold,
    textTransform: 'uppercase',
  },
  fieldActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  fieldAction: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabelInput: {
    marginTop: spacing.xs,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: FormColors.title,
    paddingVertical: spacing.xxs,
  },

  /* signature preview */
  signaturePreviewWrap: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    backgroundColor: palette.neutral50,
  },
  signaturePreviewLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1,
    color: palette.neutral400,
    marginBottom: spacing.xs,
  },
  signatureBox: {
    minHeight: 96,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.neutral200,
    borderStyle: 'dashed',
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  signatureHint: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1,
    color: palette.neutral400,
  },
  signatureActions: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  signatureChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: palette.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
  },
  signatureChipText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: FormColors.subtitle,
  },

  /* footer */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.neutral200,
    backgroundColor: palette.white,
  },
  discardBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral300,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    color: FormColors.title,
  },
  saveBtn: {
    flex: 2,
    height: 46,
    borderRadius: radius.lg,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveText: {
    color: palette.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

export { PALETTE as BUILDER_PALETTE };
