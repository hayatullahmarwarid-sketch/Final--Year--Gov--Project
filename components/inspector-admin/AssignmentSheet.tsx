import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppPressable } from '@/components/ui/AppPressable';
import { CalendarField } from '@/components/inspector-admin/CalendarField';
import type { Assignment, FieldInspector, Template } from '@/data/inspector-admin-store';
import { useAppTranslation } from '@/hooks/use-app-translation';
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

export type SingleAssignmentValue = {
  templateId: string;
  inspectorUserId: string;
  deadlineYmd: string;
  priority: Assignment['priority'];
};

export type BulkAssignmentValue = {
  templateId: string;
  inspectorUserIds: string[];
  deadlineYmd: string;
  priority: Assignment['priority'];
};

type BaseProps = {
  visible: boolean;
  templates: Template[];
  inspectors: FieldInspector[];
  onClose: () => void;
};

type SingleProps = BaseProps & {
  mode: 'single';
  onSubmit: (value: SingleAssignmentValue) => Promise<{ ok: boolean; message?: string }>;
};

type BulkProps = BaseProps & {
  mode: 'bulk';
  onSubmit: (value: BulkAssignmentValue) => Promise<{ ok: boolean; message?: string }>;
};

type Props = SingleProps | BulkProps;

const SINGLE_PRIORITIES: Assignment['priority'][] = ['low', 'medium', 'high', 'urgent'];
const BULK_PRIORITIES: Assignment['priority'][] = ['low', 'medium', 'high'];

export function AssignmentSheet(props: Props) {
  const { t } = useAppTranslation();
  const isBulk = props.mode === 'bulk';

  const [templateId, setTemplateId] = useState('');
  const [templateOpen, setTemplateOpen] = useState(false);

  const [inspectorId, setInspectorId] = useState('');
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorIds, setInspectorIds] = useState<string[]>([]);

  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<Assignment['priority']>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!props.visible) return;
    setTemplateId('');
    setTemplateOpen(false);
    setInspectorId('');
    setInspectorIds([]);
    setInspectorOpen(false);
    setDeadline('');
    setPriority('medium');
    setSubmitting(false);
    setErrorMsg(null);
  }, [props.visible]);

  const title = isBulk ? t('assignmentBulkTitle') : t('assignmentNewTitle');
  const primaryLabel = isBulk ? t('assignmentInitializeBulk') : t('assignmentConfirm');
  const priorities = isBulk ? BULK_PRIORITIES : SINGLE_PRIORITIES;

  const selectedTemplate = useMemo(
    () => props.templates.find((tpl) => tpl.id === templateId) ?? null,
    [props.templates, templateId],
  );
  const selectedInspector = useMemo(
    () => props.inspectors.find((i) => i.id === inspectorId) ?? null,
    [props.inspectors, inspectorId],
  );

  const toggleInspector = useCallback((id: string) => {
    setInspectorIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const onConfirm = useCallback(async () => {
    if (submitting) return;
    setErrorMsg(null);

    if (isBulk) {
      if (!templateId) {
        setErrorMsg(t('assignmentErrorPickTemplate'));
        return;
      }
      if (inspectorIds.length === 0) {
        setErrorMsg(t('assignmentErrorPickInspectors'));
        return;
      }
      if (!deadline) {
        setErrorMsg(t('assignmentErrorPickDeadline'));
        return;
      }
      setSubmitting(true);
      const r = await (props as BulkProps).onSubmit({
        templateId,
        inspectorUserIds: inspectorIds,
        deadlineYmd: deadline,
        priority,
      });
      setSubmitting(false);
      if (!r.ok) {
        if (r.message) setErrorMsg(r.message);
        return;
      }
      props.onClose();
      return;
    }

    if (!templateId) {
      setErrorMsg(t('assignmentErrorPickTemplate'));
      return;
    }
    if (!inspectorId) {
      setErrorMsg(t('assignmentErrorPickInspector'));
      return;
    }
    if (!deadline) {
      setErrorMsg(t('assignmentErrorPickDeadline'));
      return;
    }
    setSubmitting(true);
    const r = await (props as SingleProps).onSubmit({
      templateId,
      inspectorUserId: inspectorId,
      deadlineYmd: deadline,
      priority,
    });
    setSubmitting(false);
    if (!r.ok) {
      if (r.message) setErrorMsg(r.message);
      return;
    }
    props.onClose();
  }, [
    submitting,
    isBulk,
    templateId,
    inspectorIds,
    deadline,
    priority,
    props,
    t,
    inspectorId,
  ]);

  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={props.onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}>
        <AppPressable
          style={StyleSheet.absoluteFill}
          onPress={props.onClose}
          accessibilityLabel={t('a11yClose')}
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {title}
            </Text>
            <AppPressable
              onPress={props.onClose}
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
            {/* --- Template --- */}
            <Text style={styles.label}>
              {(isBulk ? t('assignmentSharedTemplate') : t('assignmentSelectTemplate')).toUpperCase()}
            </Text>
            <AppPressable
              onPress={() => {
                setTemplateOpen((v) => !v);
                setInspectorOpen(false);
              }}
              style={styles.select}
              accessibilityRole="button"
              accessibilityState={{ expanded: templateOpen }}
              accessibilityLabel={t('assignmentSelectTemplate')}>
              <Text
                style={[styles.selectText, !selectedTemplate && styles.selectPlaceholder]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.15}>
                {selectedTemplate?.name ?? t('assignmentChooseTemplate')}
              </Text>
              <Ionicons
                name={templateOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={FormColors.subtitle}
              />
            </AppPressable>
            {templateOpen ? (
              <View style={[styles.selectMenu, shadowCard()]}>
                <AppPressable
                  onPress={() => {
                    setTemplateId('');
                    setTemplateOpen(false);
                  }}
                  style={[styles.selectMenuRow, !templateId && styles.selectMenuRowActive]}
                  accessibilityRole="button">
                  <Text
                    style={[styles.selectMenuText, !templateId && styles.selectMenuTextActive]}>
                    {t('assignmentChooseTemplate')}
                  </Text>
                </AppPressable>
                {props.templates.map((tpl) => {
                  const on = tpl.id === templateId;
                  return (
                    <AppPressable
                      key={tpl.id}
                      onPress={() => {
                        setTemplateId(tpl.id);
                        setTemplateOpen(false);
                      }}
                      style={[styles.selectMenuRow, on && styles.selectMenuRowActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}>
                      <Text
                        style={[styles.selectMenuText, on && styles.selectMenuTextActive]}
                        numberOfLines={1}>
                        {tpl.name}
                      </Text>
                    </AppPressable>
                  );
                })}
              </View>
            ) : null}

            {/* --- Inspector(s) --- */}
            <Text style={[styles.label, { marginTop: spacing.md }]}>
              {(isBulk
                ? t('assignmentSelectRegionalInspectors')
                : t('assignmentAssignInspector')
              ).toUpperCase()}
            </Text>
            {isBulk ? (
              <View>
                <View style={styles.inspectorGrid}>
                  {props.inspectors.map((i) => {
                    const on = inspectorIds.includes(i.id);
                    return (
                      <AppPressable
                        key={i.id}
                        onPress={() => toggleInspector(i.id)}
                        style={[styles.inspectorChip, on && styles.inspectorChipOn]}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={`${i.name} — ${i.regionLabel}`}>
                        <Text
                          style={[styles.inspectorChipText, on && styles.inspectorChipTextOn]}
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.15}>
                          {i.name}
                        </Text>
                        <Ionicons
                          name={on ? 'checkmark-circle' : 'add'}
                          size={16}
                          color={on ? Brand.green : palette.neutral400}
                        />
                      </AppPressable>
                    );
                  })}
                </View>
                <Text style={styles.selectedCount} maxFontSizeMultiplier={1.2}>
                  {t('assignmentTotalSelected', { count: inspectorIds.length }).toUpperCase()}
                </Text>
              </View>
            ) : (
              <>
                <AppPressable
                  onPress={() => {
                    setInspectorOpen((v) => !v);
                    setTemplateOpen(false);
                  }}
                  style={styles.select}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: inspectorOpen }}
                  accessibilityLabel={t('assignmentAssignInspector')}>
                  <Text
                    style={[styles.selectText, !selectedInspector && styles.selectPlaceholder]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.15}>
                    {selectedInspector
                      ? `${selectedInspector.name} — ${selectedInspector.regionLabel}`
                      : t('assignmentChooseInspector')}
                  </Text>
                  <Ionicons
                    name={inspectorOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={FormColors.subtitle}
                  />
                </AppPressable>
                {inspectorOpen ? (
                  <View style={[styles.selectMenu, shadowCard()]}>
                    <AppPressable
                      onPress={() => {
                        setInspectorId('');
                        setInspectorOpen(false);
                      }}
                      style={[styles.selectMenuRow, !inspectorId && styles.selectMenuRowActive]}
                      accessibilityRole="button">
                      <Text
                        style={[styles.selectMenuText, !inspectorId && styles.selectMenuTextActive]}>
                        {t('assignmentChooseInspector')}
                      </Text>
                    </AppPressable>
                    {props.inspectors.map((i) => {
                      const on = i.id === inspectorId;
                      return (
                        <AppPressable
                          key={i.id}
                          onPress={() => {
                            setInspectorId(i.id);
                            setInspectorOpen(false);
                          }}
                          style={[styles.selectMenuRow, on && styles.selectMenuRowActive]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}>
                          <Text
                            style={[styles.selectMenuText, on && styles.selectMenuTextActive]}
                            numberOfLines={1}>
                            {i.name} — {i.regionLabel}
                          </Text>
                        </AppPressable>
                      );
                    })}
                  </View>
                ) : null}
              </>
            )}

            {/* --- Deadline --- */}
            <Text style={[styles.label, { marginTop: spacing.md }]}>
              {(isBulk ? t('assignmentSharedDeadline') : t('assignmentDeadline')).toUpperCase()}
            </Text>
            <CalendarField
              value={deadline}
              onChange={setDeadline}
              accessibilityLabel={t('assignmentDeadline')}
            />

            {/* --- Priority --- */}
            <Text style={[styles.label, { marginTop: spacing.md }]}>
              {(isBulk ? t('assignmentPriority') : t('assignmentPriorityLevel')).toUpperCase()}
            </Text>
            <View style={styles.prioritySegment}>
              {priorities.map((p) => {
                const on = p === priority;
                return (
                  <AppPressable
                    key={p}
                    onPress={() => setPriority(p)}
                    style={[styles.priorityBtn, on && styles.priorityBtnOn]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={t(`priority${p.charAt(0).toUpperCase() + p.slice(1)}`)}>
                    <Text
                      style={[styles.priorityText, on && styles.priorityTextOn]}
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.15}>
                      {t(`priority${p.charAt(0).toUpperCase() + p.slice(1)}`).toUpperCase()}
                    </Text>
                  </AppPressable>
                );
              })}
            </View>

            {errorMsg ? (
              <Text style={styles.errorText} maxFontSizeMultiplier={1.15}>
                {errorMsg}
              </Text>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <AppPressable
              onPress={props.onClose}
              style={styles.cancelBtn}
              accessibilityRole="button"
              accessibilityLabel={t('assignmentCancel')}>
              <Text style={styles.cancelText} maxFontSizeMultiplier={1.15}>
                {t('assignmentCancel').toUpperCase()}
              </Text>
            </AppPressable>
            <AppPressable
              onPress={() => void onConfirm()}
              disabled={submitting}
              style={[styles.confirmBtn, submitting && styles.confirmBtnDisabled]}
              accessibilityRole="button"
              accessibilityState={{ disabled: submitting }}
              accessibilityLabel={primaryLabel}>
              <Text style={styles.confirmText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {primaryLabel.toUpperCase()}
              </Text>
            </AppPressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: palette.neutral400,
    marginBottom: spacing.xs,
  },

  /* Select */
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: palette.neutral100,
    borderRadius: radius.md,
    minHeight: touchTarget.min,
  },
  selectText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: FormColors.title,
  },
  selectPlaceholder: {
    color: palette.neutral400,
    fontWeight: '500',
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  selectMenuRowActive: {
    backgroundColor: palette.rowActiveWash,
  },
  selectMenuText: {
    fontSize: 15,
    color: FormColors.title,
    fontWeight: '500',
  },
  selectMenuTextActive: {
    color: Brand.green,
    fontWeight: '700',
  },

  /* Inspector multi-chip grid */
  inspectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  inspectorChip: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.neutral200,
    backgroundColor: palette.white,
    minHeight: touchTarget.min,
  },
  inspectorChipOn: {
    borderColor: Brand.green,
    backgroundColor: palette.rowActiveWash,
  },
  inspectorChipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: FormColors.title,
  },
  inspectorChipTextOn: {
    color: Brand.green,
    fontWeight: '700',
  },
  selectedCount: {
    marginTop: spacing.xs,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: palette.neutral500,
  },

  /* Priority segment */
  prioritySegment: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  priorityBtn: {
    flex: 1,
    height: 42,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.neutral200,
    backgroundColor: palette.white,
    paddingHorizontal: spacing.xs,
  },
  priorityBtnOn: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: FormColors.subtitle,
  },
  priorityTextOn: {
    color: palette.white,
  },

  /* Error */
  errorText: {
    marginTop: spacing.sm,
    fontSize: 13,
    fontWeight: '600',
    color: '#B91C1C',
  },

  /* Footer */
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
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.neutral300,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    color: FormColors.title,
  },
  confirmBtn: {
    flex: 2,
    height: 46,
    borderRadius: radius.lg,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    color: palette.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
