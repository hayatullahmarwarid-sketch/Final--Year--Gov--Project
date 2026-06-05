import React, { useMemo, useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/brand';
import { FormColors } from '@/constants/form';
import { CATEGORIES } from '@/data/public-decrees-catalog';
import { useAppTranslation } from '@/hooks/use-app-translation';

type Props = {
  value: string;
  onChange: (decreeLabel: string) => void;
  placeholder?: string;
};

export function DecreeHierarchicalSelect({ value, onChange, placeholder }: Props) {
  const { t } = useAppTranslation();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const resolvedPlaceholder = placeholder ?? t('selectDecreePlaceholder');

  const initialExpanded = useMemo(() => {
    if (!value) return {};
    const idx = value.indexOf(': ');
    if (idx === -1) return {};
    const catName = value.slice(0, idx);
    const cat = CATEGORIES.find((c) => c.name === catName);
    return cat ? { [cat.id]: true } : {};
  }, [value]);

  const mergedExpanded = { ...initialExpanded, ...expanded };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.trigger}
        accessibilityRole="button"
        accessibilityLabel={t('a11ySelectDecree')}>
        <Text style={[styles.triggerText, !value && styles.placeholder]} numberOfLines={2}>
          {value || resolvedPlaceholder}
        </Text>
        <Text style={styles.chev}>▼</Text>
      </Pressable>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { marginTop: Math.round(Dimensions.get('window').height * 0.12) }]}>
          <Text style={styles.sheetTitle}>{t('selectDecreeCatalog')}</Text>
          <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
            {CATEGORIES.map((cat) => (
              <View key={cat.id} style={styles.catBlock}>
                <Pressable
                  style={styles.catRow}
                  onPress={() => setExpanded((p) => ({ ...p, [cat.id]: !p[cat.id] }))}>
                  <Text style={styles.chevSm}>{mergedExpanded[cat.id] ? '▼' : '▶'}</Text>
                  <Text style={styles.catName}>{cat.name}</Text>
                </Pressable>
                {mergedExpanded[cat.id] ? (
                  <View style={styles.decreeList}>
                    {cat.decrees.map((d) => {
                      const label = `${cat.name}: ${d.title}`;
                      const selected = value === label;
                      return (
                        <Pressable
                          key={d.id}
                          onPress={() => {
                            onChange(label);
                            setOpen(false);
                          }}
                          style={[styles.decreeRow, selected && styles.decreeRowOn]}>
                          <Text style={styles.decreeId}>#{d.id}</Text>
                          <Text style={[styles.decreeTitle, selected && styles.decreeTitleOn]} numberOfLines={3}>
                            {d.title}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  triggerText: { flex: 1, fontSize: 14, fontWeight: '600', color: FormColors.title },
  placeholder: { color: '#9CA3AF', fontWeight: '500' },
  chev: { fontSize: 12, color: '#9CA3AF' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    marginHorizontal: 16,
    maxHeight: Math.round(Dimensions.get('window').height * 0.72),
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12, color: FormColors.title },
  catBlock: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  chevSm: { width: 20, fontSize: 12, color: '#6B7280' },
  catName: { fontSize: 12, fontWeight: '800', color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5 },
  decreeList: { paddingStart: 28, paddingBottom: 8 },
  decreeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 4,
  },
  decreeRowOn: { backgroundColor: 'rgba(11,79,46,0.08)' },
  decreeId: { fontSize: 10, fontWeight: '800', color: Brand.green, paddingTop: 2 },
  decreeTitle: { flex: 1, fontSize: 12, fontWeight: '600', color: '#4B5563' },
  decreeTitleOn: { color: Brand.green },
});
