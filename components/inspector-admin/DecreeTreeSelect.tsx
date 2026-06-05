import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppPressable } from '@/components/ui/AppPressable';
import { useAppTranslation } from '@/hooks/use-app-translation';
import {
  Brand,
  FormColors,
  palette,
  radius,
  shadowCard,
  spacing,
  touchTarget,
} from '@/lib/theme';

export type DecreePickOption = {
  id: string;
  number: number;
  title: string;
  /** Optional version id for backend assignment creation (live API). */
  decreeVersionId?: string;
};

export type DecreeTreeCategory = {
  id: string;
  name: string;
  decrees: DecreePickOption[];
};

type BaseProps = {
  categories: DecreeTreeCategory[];
  placeholder?: string;
  /** Optional heading shown above the trigger (e.g. "SELECT DECREE"). */
};

type SingleProps = BaseProps & {
  mode?: 'single';
  selectedId: string | null;
  onChange: (option: DecreePickOption | null, categoryId: string | null) => void;
};

type MultiProps = BaseProps & {
  mode: 'multi';
  selectedIds: string[];
  onChange: (selected: { id: string; categoryId: string; option: DecreePickOption }[]) => void;
};

type Props = SingleProps | MultiProps;

export function DecreeTreeSelect(props: Props) {
  const { t } = useAppTranslation();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const isMulti = props.mode === 'multi';

  const selectedCount = useMemo(() => {
    if (isMulti) return (props as MultiProps).selectedIds.length;
    return (props as SingleProps).selectedId ? 1 : 0;
  }, [isMulti, props]);

  const summary = useMemo(() => {
    if (!isMulti) {
      const single = props as SingleProps;
      if (!single.selectedId) return null;
      for (const cat of props.categories) {
        const d = cat.decrees.find((x) => x.id === single.selectedId);
        if (d) return d.title;
      }
      return null;
    }
    if (selectedCount === 0) return null;
    if (selectedCount === 1) {
      const first = (props as MultiProps).selectedIds[0];
      for (const cat of props.categories) {
        const d = cat.decrees.find((x) => x.id === first);
        if (d) return d.title;
      }
    }
    return `${selectedCount} selected`;
  }, [isMulti, props, selectedCount]);

  const placeholder = props.placeholder ?? t('assignmentChooseDecree');

  const toggleCategory = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const categoryAllSelected = (cat: DecreeTreeCategory): boolean => {
    if (!isMulti || cat.decrees.length === 0) return false;
    const ids = new Set((props as MultiProps).selectedIds);
    return cat.decrees.every((d) => ids.has(d.id));
  };

  const categoryAnySelected = (cat: DecreeTreeCategory): boolean => {
    if (!isMulti) return false;
    const ids = new Set((props as MultiProps).selectedIds);
    return cat.decrees.some((d) => ids.has(d.id));
  };

  const toggleCategoryAll = (cat: DecreeTreeCategory) => {
    if (!isMulti) return;
    const multi = props as MultiProps;
    const current = new Set(multi.selectedIds);
    const allOn = categoryAllSelected(cat);
    if (allOn) {
      for (const d of cat.decrees) current.delete(d.id);
    } else {
      for (const d of cat.decrees) current.add(d.id);
    }
    const nextPicks: { id: string; categoryId: string; option: DecreePickOption }[] = [];
    for (const c of props.categories) {
      for (const d of c.decrees) {
        if (current.has(d.id)) nextPicks.push({ id: d.id, categoryId: c.id, option: d });
      }
    }
    multi.onChange(nextPicks);
  };

  const toggleDecree = (cat: DecreeTreeCategory, d: DecreePickOption) => {
    if (isMulti) {
      const multi = props as MultiProps;
      const current = new Set(multi.selectedIds);
      if (current.has(d.id)) current.delete(d.id);
      else current.add(d.id);
      const nextPicks: { id: string; categoryId: string; option: DecreePickOption }[] = [];
      for (const c of props.categories) {
        for (const item of c.decrees) {
          if (current.has(item.id)) nextPicks.push({ id: item.id, categoryId: c.id, option: item });
        }
      }
      multi.onChange(nextPicks);
      return;
    }
    const single = props as SingleProps;
    if (single.selectedId === d.id) {
      single.onChange(null, null);
    } else {
      single.onChange(d, cat.id);
      setOpen(false);
    }
  };

  return (
    <View>
      <AppPressable
        onPress={() => setOpen((v) => !v)}
        style={styles.trigger}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={placeholder}>
        <Text
          style={[styles.triggerText, !summary && styles.triggerPlaceholder]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.15}>
          {summary ?? placeholder}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={FormColors.subtitle}
        />
      </AppPressable>

      {open ? (
        <View style={[styles.panel, shadowCard()]}>
          <ScrollView
            style={styles.panelScroll}
            contentContainerStyle={styles.panelContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled>
            {props.categories.length === 0 ? (
              <Text style={styles.emptyText} maxFontSizeMultiplier={1.15}>
                {t('decreeTreeNoCategories')}
              </Text>
            ) : null}
            {props.categories.map((cat) => {
              const exp = expanded[cat.id] ?? false;
              const allOn = categoryAllSelected(cat);
              const anyOn = categoryAnySelected(cat);
              return (
                <View key={cat.id} style={styles.catBlock}>
                  <View style={styles.catRow}>
                    <AppPressable
                      onPress={() => toggleCategory(cat.id)}
                      style={styles.catToggle}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: exp }}
                      accessibilityLabel={t('decreeTreeToggleCategory', { category: cat.name })}>
                      <Ionicons
                        name={exp ? 'chevron-down' : 'chevron-forward'}
                        size={14}
                        color={FormColors.subtitle}
                      />
                      <Text style={styles.catName} maxFontSizeMultiplier={1.15}>
                        {cat.name.toUpperCase()}
                      </Text>
                    </AppPressable>
                    {isMulti ? (
                      <AppPressable
                        onPress={() => toggleCategoryAll(cat)}
                        style={[
                          styles.catCheckBtn,
                          allOn && styles.catCheckBtnOn,
                          !allOn && anyOn && styles.catCheckBtnPartial,
                        ]}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: allOn }}
                        accessibilityLabel={t('decreeTreeSelectAll', { category: cat.name })}>
                        {allOn ? (
                          <Ionicons name="checkmark" size={14} color={palette.white} />
                        ) : anyOn ? (
                          <Ionicons name="remove" size={14} color={Brand.green} />
                        ) : null}
                      </AppPressable>
                    ) : null}
                  </View>
                  {exp ? (
                    <View style={styles.decreeList}>
                      {cat.decrees.length === 0 ? (
                        <Text style={styles.emptyText}>{t('decreeTreeNoCategories')}</Text>
                      ) : null}
                      {cat.decrees.map((d) => {
                        const selected = isMulti
                          ? (props as MultiProps).selectedIds.includes(d.id)
                          : (props as SingleProps).selectedId === d.id;
                        return (
                          <AppPressable
                            key={d.id}
                            onPress={() => toggleDecree(cat, d)}
                            style={[styles.decreeRow, selected && styles.decreeRowOn]}
                            accessibilityRole={isMulti ? 'checkbox' : 'button'}
                            accessibilityState={{ selected, checked: selected }}
                            accessibilityLabel={d.title}>
                            <Text style={styles.decreeNumber} maxFontSizeMultiplier={1.15}>
                              #{d.number}
                            </Text>
                            <Text
                              style={[styles.decreeTitle, selected && styles.decreeTitleOn]}
                              numberOfLines={3}
                              maxFontSizeMultiplier={1.15}>
                              {d.title}
                            </Text>
                            {isMulti ? (
                              <View style={[styles.leafCheck, selected && styles.leafCheckOn]}>
                                {selected ? (
                                  <Ionicons name="checkmark" size={12} color={palette.white} />
                                ) : null}
                              </View>
                            ) : selected ? (
                              <Ionicons name="checkmark" size={16} color={Brand.green} />
                            ) : null}
                          </AppPressable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: palette.neutral100,
    borderRadius: radius.md,
    minHeight: touchTarget.min,
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: FormColors.title,
  },
  triggerPlaceholder: {
    color: palette.neutral400,
    fontWeight: '500',
  },
  panel: {
    marginTop: spacing.xs,
    backgroundColor: palette.white,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    overflow: 'hidden',
  },
  panelScroll: {
    maxHeight: 300,
  },
  panelContent: {
    paddingVertical: spacing.xs,
  },
  emptyText: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 13,
    color: palette.neutral500,
  },
  catBlock: {
    paddingHorizontal: spacing.xs,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  catToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  catName: {
    fontSize: 12,
    fontWeight: '800',
    color: FormColors.title,
    letterSpacing: 1.2,
  },
  catCheckBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: palette.neutral300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
  },
  catCheckBtnOn: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
  catCheckBtnPartial: {
    borderColor: Brand.green,
  },
  decreeList: {
    paddingStart: spacing.lg,
    paddingEnd: spacing.xs,
    paddingBottom: spacing.xs,
  },
  decreeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
  },
  decreeRowOn: {
    backgroundColor: palette.rowActiveWash,
  },
  decreeNumber: {
    width: 24,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
    color: palette.neutral400,
    paddingTop: 1,
  },
  decreeTitle: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: FormColors.subtitle,
    fontWeight: '500',
  },
  decreeTitleOn: {
    color: Brand.green,
    fontWeight: '700',
  },
  leafCheck: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: palette.neutral300,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  leafCheckOn: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
});
