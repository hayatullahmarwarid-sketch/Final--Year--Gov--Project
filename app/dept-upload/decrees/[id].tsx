import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { DeptUploadDash } from '@/constants/dept-upload-dashboard';
import { FormColors } from '@/constants/form';
import { useAppLanguage } from '@/contexts/app-language-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import {
  archiveDecree,
  getDecreeById,
  patchDecree,
  publishDecree,
  type LocalizedContentBlock,
  type SerializedDecree,
} from '@/lib/api/decree-upload';
import { confirm } from '@/lib/adapters/dialog';
import { showToast } from '@/lib/adapters/toast';
import { formatDecreeNumberLabel } from '@/lib/decree-number-format';
import {
  localePlainFromBlocks,
  mergeLocalizedContentForEdit,
  pickLocalizedBaselineBlocks,
  statusLabel,
} from '@/lib/dept-upload-helpers';

function hydrateTrilingualTitles(d: SerializedDecree): { ps: string; fa: string; en: string } {
  const legacy = String(d.titleSummary ?? '').trim();
  return {
    ps: String(d.titlePs ?? '').trim() || legacy,
    fa: String(d.titleFa ?? '').trim() || legacy,
    en: String(d.titleEn ?? '').trim() || legacy,
  };
}

export default function DeptUploadDecreeDetailScreen() {
  const { t } = useAppTranslation();
  const { language } = useAppLanguage();
  const textDir = language === 'en' ? 'ltr' : 'rtl';
  const { id } = useLocalSearchParams<{ id: string }>();
  const [row, setRow] = useState<SerializedDecree | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editTitlePs, setEditTitlePs] = useState('');
  const [editTitleFa, setEditTitleFa] = useState('');
  const [editTitleEn, setEditTitleEn] = useState('');
  const [contentPs, setContentPs] = useState('');
  const [contentFa, setContentFa] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [baselineBlocks, setBaselineBlocks] = useState<LocalizedContentBlock[]>([]);
  const [savingLang, setSavingLang] = useState(false);

  const load = useCallback(async () => {
    if (!id || typeof id !== 'string') return;
    const r = await getDecreeById(id);
    if (!r.ok) {
      showToast(r.message, 'error');
      setRow(null);
    } else {
      setRow(r.data);
      const tri = hydrateTrilingualTitles(r.data);
      setEditTitlePs(tri.ps);
      setEditTitleFa(tri.fa);
      setEditTitleEn(tri.en);
      const base = pickLocalizedBaselineBlocks(r.data);
      setBaselineBlocks(base);
      setContentPs(localePlainFromBlocks(base, 'ps'));
      setContentFa(localePlainFromBlocks(base, 'fa'));
      setContentEn(localePlainFromBlocks(base, 'en'));
    }
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  React.useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const saveTitle = async () => {
    if (!row) return;
    const r = await patchDecree(row.id, {
      titlePs: editTitlePs.trim(),
      titleFa: editTitleFa.trim(),
      titleEn: editTitleEn.trim(),
    });
    if (!r.ok) showToast(r.message, 'error');
    else {
      showToast(t('deptSaved'), 'success');
      void load();
    }
  };

  const saveLanguages = async () => {
    if (!row) return;
    if (row.status === 'archived' || row.status === 'superseded') return;
    setSavingLang(true);
    try {
      const localizedContent = mergeLocalizedContentForEdit(baselineBlocks, contentPs, contentFa, contentEn);
      const r = await patchDecree(row.id, {
        draftVersion: { localizedContent },
      });
      if (!r.ok) showToast(r.message, 'error');
      else {
        showToast(t('deptSaved'), 'success');
        void load();
      }
    } finally {
      setSavingLang(false);
    }
  };

  const publish = async () => {
    if (!row) return;
    const ok = await confirm({ message: t('deptPublishThisDecree'), confirmText: t('btnPublish') });
    if (!ok) return;
    const r = await publishDecree(row.id, {});
    if (!r.ok) showToast(r.message, 'error');
    else {
      showToast(t('deptPublished'), 'success');
      void load();
    }
  };

  const archive = async () => {
    if (!row) return;
    const ok = await confirm({
      title: t('btnArchive'),
      message: t('deptArchiveThisDecree'),
      destructive: true,
      confirmText: t('btnArchive'),
    });
    if (!ok) return;
    const r = await archiveDecree(row.id, {});
    if (!r.ok) showToast(r.message, 'error');
    else {
      showToast(t('deptArchived'), 'info');
      void load();
    }
  };

  const copyLink = async () => {
    if (!row) return;
    const link = `decree:${row.id}`;
    await Clipboard.setStringAsync(link);
    showToast(t('deptReferenceCopied'), 'success');
  };

  if (loading || !row) {
    return (
      <SafeAreaView style={styles.center} edges={['bottom']}>
        <ActivityIndicator size="large" color={Brand.green} />
      </SafeAreaView>
    );
  }

  const desc =
    row.metadata && typeof row.metadata === 'object' && 'description' in row.metadata
      ? String((row.metadata as { description?: string }).description ?? '')
      : '';

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityLabel={t('a11yGoBack')}>
          <Ionicons name="chevron-back" size={24} color={Brand.green} />
        </Pressable>
        <Text style={styles.screenTitle}>
          {t('deptDecreeNumberTitle', {
            number: formatDecreeNumberLabel(row).replace(/^\#/, ''),
          })}
        </Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.green} />}>
        <View style={styles.card}>
          <Text style={styles.status}>{t('deptStatusLine', { status: statusLabel(row.status) })}</Text>
          <Text style={styles.label}>{t('uploadTitlePsLabel')}</Text>
          <TextInput
            value={editTitlePs}
            onChangeText={setEditTitlePs}
            multiline
            textAlign="right"
            style={[styles.input, styles.inputTall, { writingDirection: textDir }]}
            textAlignVertical="top"
          />
          <Text style={styles.label}>{t('uploadTitleFaLabel')}</Text>
          <TextInput
            value={editTitleFa}
            onChangeText={setEditTitleFa}
            multiline
            textAlign="right"
            style={[styles.input, styles.inputTall, { writingDirection: textDir }]}
            textAlignVertical="top"
          />
          <Text style={styles.label}>{t('uploadTitleEnLabel')}</Text>
          <TextInput value={editTitleEn} onChangeText={setEditTitleEn} multiline style={[styles.input, styles.inputTall]} textAlignVertical="top" />
          <Pressable onPress={() => void saveTitle()} style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryTxt}>{t('deptSaveTitle')}</Text>
          </Pressable>
        </View>

        {desc ? (
          <View style={styles.card}>
            <Text style={styles.label}>{t('uploadDescriptionLabel')}</Text>
            <Text style={styles.body}>{desc}</Text>
          </View>
        ) : null}

        {row.status !== 'archived' && row.status !== 'superseded' ? (
          <View style={styles.card}>
            <Text style={styles.label}>{t('deptLocalizedDraft')}</Text>
            <Text style={styles.helper}>{t('deptLangEditBlurb')}</Text>
            <Text style={styles.subLabel}>Pashto (پښتو)</Text>
            <TextInput
              value={contentPs}
              onChangeText={setContentPs}
              multiline
              textAlign="right"
              style={[styles.input, styles.inputTall, { writingDirection: textDir }]}
              textAlignVertical="top"
              editable={!savingLang}
            />
            <Text style={styles.subLabel}>Dari (دری)</Text>
            <TextInput
              value={contentFa}
              onChangeText={setContentFa}
              multiline
              textAlign="right"
              style={[styles.input, styles.inputTall, { writingDirection: textDir }]}
              textAlignVertical="top"
              editable={!savingLang}
            />
            <Text style={styles.subLabel}>English</Text>
            <TextInput
              value={contentEn}
              onChangeText={setContentEn}
              multiline
              style={[styles.input, styles.inputTall]}
              textAlignVertical="top"
              editable={!savingLang}
            />
            <Pressable
              onPress={() => void saveLanguages()}
              style={[styles.btnSecondary, savingLang && styles.btnDisabled]}
              disabled={savingLang}>
              {savingLang ? (
                <ActivityIndicator color={Brand.green} />
              ) : (
                <Text style={styles.btnSecondaryTxt}>{t('deptSaveLanguages')}</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        <View style={styles.row}>
          {row.status === 'draft' ? (
            <Pressable onPress={() => void publish()} style={[styles.btn, styles.btnGreen]}>
              <Text style={styles.btnTxt}>{t('btnPublish')}</Text>
            </Pressable>
          ) : null}
          {row.status !== 'archived' && row.status !== 'superseded' ? (
            <Pressable onPress={() => void archive()} style={[styles.btn, styles.btnRed]}>
              <Text style={styles.btnTxt}>{t('btnArchive')}</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => void copyLink()} style={[styles.btn, styles.btnGhost]}>
            <Text style={[styles.btnTxt, { color: Brand.green }]}>{t('deptCopyRef')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DeptUploadDash.pageBg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: DeptUploadDash.pageBg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  screenTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: FormColors.title },
  scroll: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: DeptUploadDash.radiusLg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: DeptUploadDash.cardBorder,
    ...DeptUploadDash.shadow,
  },
  status: { fontSize: 13, fontWeight: '600', color: Brand.gold, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '600', color: FormColors.label, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: DeptUploadDash.cardBorder,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: FormColors.title,
    minHeight: 48,
    textAlignVertical: 'top',
  },
  body: { fontSize: 14, color: FormColors.title, lineHeight: 22 },
  helper: { fontSize: 12, color: FormColors.label, lineHeight: 18, marginBottom: 12 },
  subLabel: { fontSize: 12, fontWeight: '600', color: FormColors.label, marginTop: 10, marginBottom: 6 },
  inputTall: { minHeight: 120 },
  btnDisabled: { opacity: 0.55 },
  locBlock: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
  locTag: { fontSize: 11, fontWeight: '700', color: Brand.green, marginBottom: 4 },
  btnSecondary: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.green,
  },
  btnSecondaryTxt: { color: Brand.green, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  btn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, minWidth: 120, alignItems: 'center' },
  btnGreen: { backgroundColor: Brand.green },
  btnRed: { backgroundColor: '#DC2626' },
  btnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.green },
  btnTxt: { color: '#fff', fontWeight: '700' },
});
