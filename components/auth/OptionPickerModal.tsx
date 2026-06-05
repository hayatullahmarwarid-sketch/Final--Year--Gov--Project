import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { FormColors } from '@/constants/form';
import { useAppTranslation } from '@/hooks/use-app-translation';

type OptionPickerModalProps = {
  visible: boolean;
  title: string;
  options: { id: string; label: string }[];
  selectedId: string | null;
  onSelect: (id: string, label: string) => void;
  onClose: () => void;
};

export function OptionPickerModal({
  visible,
  title,
  options,
  selectedId,
  onSelect,
  onClose,
}: OptionPickerModalProps) {
  const { t } = useAppTranslation();
  const { height } = useWindowDimensions();
  const maxList = Math.min(height * 0.55, 420);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={['bottom']} style={styles.safe}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('a11yClose')}>
                <Ionicons name="close" size={26} color={FormColors.title} />
              </Pressable>
            </View>
            <FlatList
              style={{ maxHeight: maxList }}
              data={options}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = item.id === selectedId;
                return (
                  <Pressable
                    style={[styles.optionRow, active && styles.optionRowActive]}
                    onPress={() => {
                      onSelect(item.id, item.label);
                      onClose();
                    }}>
                    <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                      {item.label}
                    </Text>
                    {active ? <Ionicons name="checkmark" size={22} color={Brand.green} /> : null}
                  </Pressable>
                );
              }}
            />
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: FormColors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  safe: {
    paddingBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: FormColors.border,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: FormColors.title,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  optionRowActive: {
    backgroundColor: 'rgba(11, 79, 46, 0.06)',
  },
  optionLabel: {
    fontSize: 16,
    color: FormColors.title,
  },
  optionLabelActive: {
    fontWeight: '600',
    color: Brand.green,
  },
});
