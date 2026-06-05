import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Modal from 'react-native-modal';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { DeptUploadDash } from '@/constants/dept-upload-dashboard';
import { FormColors } from '@/constants/form';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { createCategory, listCategories, patchCategory, type DecreeCategory } from '@/lib/api/decree-upload';
import { showToast } from '@/lib/adapters/toast';
import { slugifyCategoryName } from '@/lib/dept-upload-helpers';

export default function DeptUploadCategoriesScreen() {
  const { t } = useAppTranslation();
  const [items, setItems] = useState<DecreeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<DecreeCategory | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [active, setActive] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await listCategories({ limit: 100 });
    if (!r.ok) showToast(r.message, 'error');
    else setItems(r.items);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setName('');
    setSlug('');
    setActive(true);
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!name.trim()) {
      showToast(t('deptCategoryNameRequired'), 'error');
      return;
    }
    const s = slug.trim() || slugifyCategoryName(name);
    const r = await createCategory({ slug: s, name: name.trim(), isActive: active });
    if (!r.ok) showToast(r.message, 'error');
    else {
      showToast(t('deptCategoryCreated'), 'success');
      setCreateOpen(false);
      void load();
    }
  };

  const openEdit = (c: DecreeCategory) => {
    setEditRow(c);
    setName(c.name);
    setSlug(c.slug);
    setActive(c.isActive);
  };

  const submitEdit = async () => {
    if (!editRow) return;
    const r = await patchCategory(editRow.id, {
      name: name.trim(),
      isActive: active,
    });
    if (!r.ok) showToast(r.message, 'error');
    else {
      showToast(t('deptCategoryUpdated'), 'success');
      setEditRow(null);
      void load();
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityLabel={t('a11yBack')}>
          <Ionicons name="chevron-back" size={24} color={Brand.green} />
        </Pressable>
        <Text style={styles.screenTitle}>{t('deptCategoriesTitle')}</Text>
        <Pressable onPress={openCreate} style={styles.plus} accessibilityLabel={t('a11yAddCategory')}>
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Brand.green} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: c }) => (
            <Pressable onPress={() => openEdit(c)} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.name}>{c.name}</Text>
                <View style={[styles.pill, !c.isActive && styles.pillOff]}>
                  <Text style={styles.pillTxt}>{c.isActive ? t('deptStatusActive') : t('deptStatusInactive')}</Text>
                </View>
              </View>
              <Text style={styles.slug}>{c.slug}</Text>
            </Pressable>
          )}
        />
      )}

      <Modal isVisible={createOpen} onBackdropPress={() => setCreateOpen(false)} style={styles.modalEnd}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheet}>
          <Text style={styles.modalTitle}>{t('deptCategoryNew')}</Text>
          <Text style={styles.label}>{t('deptCategoryNameLabel')}</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} placeholder={t('deptDisplayNamePh')} />
          <Text style={styles.label}>{t('deptCategorySlugOptional')}</Text>
          <TextInput
            value={slug}
            onChangeText={setSlug}
            style={styles.input}
            placeholder={t('deptAutoNamePh')}
            autoCapitalize="none"
          />
          <View style={styles.switchRow}>
            <Text style={styles.label}>{t('deptCategoryActive')}</Text>
            <Switch value={active} onValueChange={setActive} trackColor={{ true: Brand.green }} />
          </View>
          <View style={styles.rowBtns}>
            <Pressable onPress={() => setCreateOpen(false)} style={styles.btnGhost}>
              <Text style={styles.btnGhostTxt}>{t('btnCancel')}</Text>
            </Pressable>
            <Pressable onPress={() => void submitCreate()} style={styles.btnPri}>
              <Text style={styles.btnPriTxt}>{t('deptCategoryCreate')}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal isVisible={editRow !== null} onBackdropPress={() => setEditRow(null)} style={styles.modalEnd}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheet}>
          <Text style={styles.modalTitle}>{t('deptCategoryEdit')}</Text>
          <Text style={styles.muted}>{t('deptCategorySlugImmutable', { slug })}</Text>
          <Text style={styles.label}>{t('deptCategoryNameLabel').replace(' *', '')}</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} />
          <View style={styles.switchRow}>
            <Text style={styles.label}>{t('deptCategoryActive')}</Text>
            <Switch value={active} onValueChange={setActive} trackColor={{ true: Brand.green }} />
          </View>
          <View style={styles.rowBtns}>
            <Pressable onPress={() => setEditRow(null)} style={styles.btnGhost}>
              <Text style={styles.btnGhostTxt}>{t('deptCategoryClose')}</Text>
            </Pressable>
            <Pressable onPress={() => void submitEdit()} style={styles.btnPri}>
              <Text style={styles.btnPriTxt}>{t('btnSave')}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DeptUploadDash.pageBg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
  },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  screenTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: FormColors.title },
  plus: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: DeptUploadDash.radiusLg,
    padding: 14,
    borderWidth: 1,
    borderColor: DeptUploadDash.cardBorder,
    ...DeptUploadDash.shadow,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: FormColors.title, flex: 1 },
  slug: { fontSize: 12, color: FormColors.subtitle, marginTop: 6 },
  pill: { backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillOff: { backgroundColor: '#F3F4F6' },
  pillTxt: { fontSize: 11, fontWeight: '700', color: '#065F46' },
  modalEnd: { justifyContent: 'flex-end', margin: 0 },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8, color: FormColors.title },
  muted: { fontSize: 12, color: FormColors.subtitle, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '600', color: FormColors.label, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: DeptUploadDash.cardBorder,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    marginTop: 6,
    color: FormColors.title,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  rowBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btnGhost: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DeptUploadDash.cardBorder,
    alignItems: 'center',
  },
  btnGhostTxt: { fontWeight: '600', color: FormColors.subtitle },
  btnPri: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Brand.green, alignItems: 'center' },
  btnPriTxt: { fontWeight: '700', color: '#fff' },
});
