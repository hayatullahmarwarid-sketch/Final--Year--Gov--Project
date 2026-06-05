import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { AppPressable } from '@/components/ui/AppPressable';
import { StatusBadge } from '@/components/inspector-admin/StatusBadge';
import {
  TemplateBuilderSheet,
  type TemplateBuilderValue,
} from '@/components/inspector-admin/TemplateBuilderSheet';
import type { Template } from '@/data/inspector-admin-store';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { useInspectorAdminWorkspace } from '@/hooks/use-inspector-admin-workspace';
import { showToast } from '@/lib/adapters/toast';
import {
  Brand,
  FormColors,
  palette,
  radius,
  shadowCard,
  semantic,
  spacing,
  touchTarget,
  typography,
} from '@/lib/theme';

type BuilderState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; template: Template };

export default function InspectorAdminTemplatesScreen() {
  const { t, number } = useAppTranslation();
  const { templates, decreeCatalog, actions } = useInspectorAdminWorkspace();
  const rows = useMemo(
    () => [...templates].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [templates],
  );
  const [builder, setBuilder] = useState<BuilderState>({ mode: 'closed' });

  const openCreate = useCallback(() => setBuilder({ mode: 'create' }), []);
  const openEdit = useCallback((tpl: Template) => setBuilder({ mode: 'edit', template: tpl }), []);
  const closeBuilder = useCallback(() => setBuilder({ mode: 'closed' }), []);

  const onSubmit = useCallback(
    async (value: TemplateBuilderValue) => {
      const name = value.name.trim();
      if (!name) {
        showToast(t('builderNameRequired'), 'error');
        return { ok: false };
      }
      if (builder.mode === 'edit') {
        const r = await actions.updateTemplate(builder.template.id, {
          name,
          category: value.category,
          categoryId: value.categoryId,
          decreeSelectionMode: value.decreeSelectionMode,
          selectedDecreeIds: value.selectedDecreeIds,
          inspectionLocation: value.inspectionLocation,
          status: value.status,
          fields: value.fields,
        });
        if (!r.ok) {
          showToast(r.message, 'error');
          return { ok: false, message: r.message };
        }
        showToast(t('templatesUpdated'), 'success');
        return { ok: true };
      }
      const r = await actions.createTemplate({
        name,
        category: value.category,
        categoryId: value.categoryId,
        decreeSelectionMode: value.decreeSelectionMode,
        selectedDecreeIds: value.selectedDecreeIds,
        inspectionLocation: value.inspectionLocation,
        status: value.status,
        fields: value.fields,
      });
      if (!r.ok) {
        showToast(r.message, 'error');
        return { ok: false, message: r.message };
      }
      showToast(t('inspectorAdminTemplateSaved'), 'success');
      return { ok: true };
    },
    [actions, builder, t],
  );

  const onDelete = useCallback(
    (tpl: Template) => {
      Alert.alert(
        t('templatesDeleteConfirmTitle'),
        t('templatesDeleteConfirmBody'),
        [
          { text: t('btnCancel'), style: 'cancel' },
          {
            text: t('btnDelete'),
            style: 'destructive',
            onPress: async () => {
              const r = await actions.deleteTemplate(tpl.id);
              if (!r.ok) {
                showToast(r.message, 'error');
                return;
              }
              showToast(t('templatesDeleted'), 'success');
            },
          },
        ],
        { cancelable: true },
      );
    },
    [actions, t],
  );

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <Text style={styles.heading} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {t('templatesHeading')}
        </Text>
        <AppPressable
          onPress={openCreate}
          style={styles.createBtn}
          accessibilityRole="button"
          accessibilityLabel={t('templatesCreateNew')}>
          <Ionicons name="add" size={18} color={palette.white} />
          <Text style={styles.createBtnTxt} maxFontSizeMultiplier={1.15}>
            {t('templatesCreateNew')}
          </Text>
        </AppPressable>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(x) => x.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="clipboard-outline" size={26} color={palette.neutral400} />
            </View>
            <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.2}>
              {t('templatesEmptyTitle')}
            </Text>
            <Text style={styles.emptySub} maxFontSizeMultiplier={1.2}>
              {t('templatesEmptySub')}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, shadowCard()]}>
            <View style={styles.cardTop}>
              <View style={styles.cardIcon}>
                <Ionicons name="clipboard-outline" size={18} color={palette.neutral500} />
              </View>
              <View style={styles.cardHeadSpacer} />
              <StatusBadge status={item.status} />
            </View>

            <Text style={styles.cardTitle} numberOfLines={2} maxFontSizeMultiplier={1.15}>
              {item.name}
            </Text>

            <Text style={styles.cardMeta} numberOfLines={1} maxFontSizeMultiplier={1.15}>
              {item.category.toUpperCase()}
              {'  ·  '}
              {t('templatesFieldsCount', { count: number(item.fields.length) })}
            </Text>

            {item.inspectionLocation ? (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={Brand.green} />
                <Text style={styles.locationTxt} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                  {item.inspectionLocation}
                </Text>
              </View>
            ) : null}

            <View style={styles.cardActions}>
              <AppPressable
                onPress={() => openEdit(item)}
                style={styles.editBtn}
                accessibilityRole="button"
                accessibilityLabel={t('templatesEdit')}>
                <Text style={styles.editBtnTxt} maxFontSizeMultiplier={1.1}>
                  {t('templatesEdit')}
                </Text>
              </AppPressable>
              <AppPressable
                onPress={() => onDelete(item)}
                style={styles.deleteBtn}
                accessibilityRole="button"
                accessibilityLabel={t('builderRemoveField')}>
                <Ionicons name="trash-outline" size={18} color={semantic.errorText} />
              </AppPressable>
            </View>
          </View>
        )}
      />

      <TemplateBuilderSheet
        visible={builder.mode !== 'closed'}
        mode={builder.mode === 'edit' ? 'edit' : 'create'}
        initial={
          builder.mode === 'edit'
            ? {
                name: builder.template.name,
                category: builder.template.category,
                categoryId: builder.template.selectedCategoryId,
                decreeSelectionMode: builder.template.decreeSelectionMode,
                selectedDecreeIds: builder.template.selectedDecreeIds,
                inspectionLocation: builder.template.inspectionLocation,
                status: builder.template.status,
                fields: builder.template.fields,
              }
            : undefined
        }
        categories={decreeCatalog}
        onClose={closeBuilder}
        onSubmit={onSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: FormColors.pageMuted,
  },

  /* top toolbar */
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  heading: {
    flex: 1,
    ...typography.title,
    color: FormColors.title,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: Brand.green,
    borderRadius: radius.lg,
    minHeight: touchTarget.min,
  },
  createBtnTxt: {
    color: palette.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* list */
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },

  /* empty */
  empty: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.xs,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.neutral300,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    ...typography.subtitle,
    color: FormColors.title,
    textAlign: 'center',
  },
  emptySub: {
    ...typography.bodySmall,
    color: FormColors.subtitle,
    textAlign: 'center',
    maxWidth: 280,
  },

  /* card */
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: palette.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeadSpacer: {
    flex: 1,
  },
  cardTitle: {
    marginTop: spacing.sm,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    color: FormColors.title,
  },
  cardMeta: {
    marginTop: spacing.xxs,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: palette.neutral400,
    textTransform: 'uppercase',
  },
  locationRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  locationTxt: {
    flex: 1,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
    color: Brand.green,
  },

  /* actions */
  cardActions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  editBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: palette.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnTxt: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: FormColors.subtitle,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: palette.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
