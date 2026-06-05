import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PublicDecreeTitleCanvas } from '@/components/decree/PublicDecreeTitleCanvas';
import { AppPressable } from '@/components/ui/AppPressable';
import type { RecentUploadRow } from '@/components/dept-upload/DeptUploadRecentUploadsCard';
import type { AppLanguageId } from '@/constants/languages';
import { DeptUploadDash } from '@/constants/dept-upload-dashboard';
import { useAppLanguage } from '@/contexts/app-language-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { formatDecreeNumberLabel } from '@/lib/decree-number-format';
import { Brand, FormColors, palette } from '@/lib/theme';
import {
  getDecreeById,
  patchDecree,
  type DecreeCategory,
  type LocalizedContentBlock,
  type SerializedDecree,
} from '@/lib/api/decree-upload';
import { showToast } from '@/lib/adapters/toast';
import { pickPublicDecreeTitleFromRow } from '@/lib/decree-title-typography';
import {
  localePlainFromBlocks,
  mergeLocalizedContentForEdit,
  pickLocalizedBaselineBlocks,
  statusLabel,
} from '@/lib/dept-upload-helpers';
import { buildDeptUploadDecreePdfHtml, decreePdfFilename, saveGeneratedPdfToDeviceStorage } from '@/lib/dept-upload/decree-pdf-download';

const SLATE = '#1E293B';
const MUTED = '#64748B';
const LABEL_GRAY = '#94A3B8';
const BORDER = '#E5E7EB';
const CARD_BG = '#F3F4F6';
const ICON_GREEN = '#166534';

export type DecreePreviewModel = {
  id: string;
  decreeLabel: string;
  subtitle: string;
  category: string;
  status: string;
  views: string;
  uploadedBy: string;
  uploadDate: string;
  creationDate: string;
  summary: string;
};

function parseTitleLine(titleLine: string): { num: string; title: string } {
  const m = titleLine.match(/Decree\s*#(\S+)\s*[—–-]\s*(.+)/i);
  if (m) return { num: m[1].trim(), title: m[2].trim() };
  return { num: '—', title: titleLine.trim() };
}

function hydrateTrilingualTitlesFromDecree(d: SerializedDecree): { ps: string; fa: string; en: string } {
  const legacy = String(d.titleSummary ?? '').trim();
  const ps = String(d.titlePs ?? '').trim() || legacy;
  const fa = String(d.titleFa ?? '').trim() || legacy;
  const en = String(d.titleEn ?? '').trim() || legacy;
  return { ps, fa, en };
}

function parseMetaLine(metaLine: string): { by: string; date: string } {
  const idx = metaLine.lastIndexOf(' - ');
  if (idx === -1) return { by: '—', date: metaLine.trim() || '—' };
  return { by: metaLine.slice(0, idx).trim(), date: metaLine.slice(idx + 3).trim() };
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function metaFromDecree(d: SerializedDecree): { by: string; views: string } {
  const m = d.metadata && typeof d.metadata === 'object' ? (d.metadata as Record<string, unknown>) : {};
  const by =
    (typeof d.uploadedBy === 'string' && d.uploadedBy.trim()) ? d.uploadedBy.trim() :
    typeof m.uploadedBy === 'string'
      ? m.uploadedBy
      : typeof m.uploaded_by === 'string'
        ? m.uploaded_by
        : '—';
  const v = typeof m.views === 'number' ? String(m.views) : typeof m.views === 'string' ? m.views : '0';
  return { by, views: v };
}

function summaryFromDecree(d: SerializedDecree): string {
  const m = d.metadata && typeof d.metadata === 'object' ? (d.metadata as { description?: string }).description : '';
  if (m && String(m).trim()) return String(m).trim();
  const draft = d.activeDraftVersion?.changeSummary;
  if (draft && String(draft).trim()) return String(draft).trim();
  return '';
}

export function buildPreviewModel(
  row: RecentUploadRow,
  decree: SerializedDecree | null,
  language: AppLanguageId,
): DecreePreviewModel {
  const { num, title } = parseTitleLine(row.titleLine);
  const { by, date } = parseMetaLine(row.metaLine);

  if (decree) {
    const cat = decree.categories?.[0]?.name ?? '—';
    const meta = metaFromDecree(decree);
    const sum = summaryFromDecree(decree);
    return {
      id: decree.id,
      decreeLabel: `Decree ${formatDecreeNumberLabel(decree)}`,
      subtitle: pickPublicDecreeTitleFromRow(
        {
          titleSummary: decree.titleSummary,
          titlePs: decree.titlePs,
          titleFa: decree.titleFa,
          titleEn: decree.titleEn,
        },
        language,
      ),
      category: cat,
      status: statusLabel(decree.status).replace(/\s+/g, ' ').toLowerCase(),
      views: meta.views,
      uploadedBy: meta.by,
      uploadDate: formatDate(decree.createdAt),
      creationDate: formatDate(decree.creationDate),
      summary: sum.trim() ? sum : 'No description on file.',
    };
  }

  return {
    id: row.id,
    decreeLabel: `Decree #${num}`,
    subtitle: title,
    category: row.categoryHint ?? '—',
    status: row.pill,
    views: '0',
    uploadedBy: by,
    uploadDate: date,
    creationDate: '—',
    summary: 'No description on file.',
  };
}

function exportText(m: DecreePreviewModel): string {
  return `${m.decreeLabel}\n${m.subtitle}\n\nCategory: ${m.category}\nStatus: ${m.status}\nViews: ${m.views}\nUploaded: ${m.uploadDate}\nCreated: ${m.creationDate}\n\n${m.summary}`;
}

type PreviewProps = {
  visible: boolean;
  row: RecentUploadRow | null;
  decree: SerializedDecree | null;
  loading: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDownloaded: () => void;
};

export function DecreePreviewModal({ visible, row, decree, loading, onClose, onEdit, onDownloaded }: PreviewProps) {
  const { t } = useAppTranslation();
  const { language } = useAppLanguage();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const model = useMemo(() => (row ? buildPreviewModel(row, decree, language) : null), [row, decree, language]);

  const shareDecree = useCallback(async () => {
    if (!model) return;
    try {
      await Share.share({
        title: model.decreeLabel,
        message: exportText(model),
      });
    } catch {
      showToast(t('alertCouldNotSend'), 'error');
    }
  }, [model, t]);

  const downloadDecree = useCallback(async () => {
    if (!model) return;
    try {
      if (!decree) {
        showToast(t('decreeNotFound'), 'error');
        return;
      }
      const html = await buildDeptUploadDecreePdfHtml(decree);
      const { uri } = await Print.printToFileAsync({ html });
      const filename = decreePdfFilename(decree);
      const saved = await saveGeneratedPdfToDeviceStorage({ localUri: uri, filename });

      if (saved.userVisible) {
        Alert.alert(t('deptDownloadedTitle'), t('deptDownloadedToDevice'));
      } else {
        // iOS typically requires a share sheet for “Save to Files”; provide it as a helpful fallback.
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
        } else {
          Alert.alert(t('deptDownloadedTitle'), t('deptDownloadedToAppStorage'));
        }
      }
      onDownloaded();
    } catch {
      showToast(t('decreeDownloadFailed'), 'error');
    }
  }, [model, decree, onDownloaded, t]);

  if (!row || !model) return null;

  const maxH = Math.min(height * 0.9, 720);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={pvStyles.backdrop} onPress={onClose} accessibilityLabel={t('a11yClose')} />
      <View style={[pvStyles.center, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={[pvStyles.card, { maxHeight: maxH }]}>
          <View style={pvStyles.head}>
            <Text style={pvStyles.title}>{t('deptPreviewTitle')}</Text>
            <AppPressable onPress={onClose} hitSlop={12} accessibilityLabel={t('a11yClose')}>
              <Ionicons name="close" size={26} color="#94A3B8" />
            </AppPressable>
          </View>

          {loading ? (
            <View style={pvStyles.loading}>
              <ActivityIndicator size="large" color={Brand.green} />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={pvStyles.scroll}>
              <View style={pvStyles.hero}>
                <View style={pvStyles.heroIcon}>
                  <Ionicons name="document-text" size={28} color={ICON_GREEN} />
                </View>
                <View style={pvStyles.heroText}>
                  <Text style={pvStyles.heroNum}>{model.decreeLabel}</Text>
                  <PublicDecreeTitleCanvas text={model.subtitle} language={language} textStyle={pvStyles.heroSub} />
                </View>
              </View>

              <View style={pvStyles.grid}>
                <InfoTile label={t('certCardCategoryLabel')} value={model.category} />
                <InfoTile label={t('systemAdminTableStatus')} value={model.status} />
                <InfoTile label={t('deptPreviewViewsLabel')} value={model.views} />
                <InfoTile label={t('deptPreviewUploadedByLabel')} value={model.uploadedBy} />
                <InfoTile label={t('deptPreviewUploadDateLabel')} value={model.uploadDate} />
                <InfoTile label={t('deptPreviewCreationDateLabel')} value={model.creationDate} />
              </View>

              <View style={pvStyles.summaryBox}>
                <Text style={pvStyles.summaryLbl}>{t('uploadDescriptionLabel')}</Text>
                <Text style={pvStyles.summaryBody}>{model.summary}</Text>
              </View>

              <View style={pvStyles.footer}>
                <OutlineBtn icon="create-outline" label={t('a11yEdit')} onPress={onEdit} />
                <OutlineBtn icon="download-outline" label={t('decreeDownload')} onPress={downloadDecree} />
                <OutlineBtn icon="share-social-outline" label={t('certificateShare')} onPress={shareDecree} />
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={pvStyles.tile}>
      <Text style={pvStyles.tileLbl}>{label}</Text>
      <Text style={pvStyles.tileVal} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function OutlineBtn({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={pvStyles.outlineBtn} accessibilityRole="button">
      <Ionicons name={icon} size={18} color={MUTED} />
      <Text style={pvStyles.outlineBtnTxt}>{label}</Text>
    </Pressable>
  );
}

const pvStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.white,
    borderRadius: 18,
    overflow: 'hidden',
    ...DeptUploadDash.shadow,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: SLATE, flex: 1 },
  loading: { paddingVertical: 48, alignItems: 'center' },
  scroll: { paddingHorizontal: 18, paddingBottom: 20 },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 18,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    alignSelf: 'stretch',
  },
  heroNum: { fontSize: 17, fontWeight: '800', color: SLATE },
  heroSub: {
    minWidth: 0,
    fontSize: 14,
    fontWeight: '500',
    color: MUTED,
    marginTop: 4,
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  tile: {
    flex: 1,
    minWidth: '46%',
    maxWidth: '50%',
    backgroundColor: CARD_BG,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  tileLbl: { fontSize: 11, fontWeight: '600', color: LABEL_GRAY, marginBottom: 6 },
  tileVal: { fontSize: 15, fontWeight: '700', color: SLATE },
  summaryBox: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  summaryLbl: { fontSize: 12, fontWeight: '600', color: LABEL_GRAY, marginBottom: 8 },
  summaryBody: { fontSize: 14, fontWeight: '500', color: MUTED, lineHeight: 22, marginBottom: 12 },
  footer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: palette.white,
  },
  outlineBtnTxt: { fontSize: 13, fontWeight: '600', color: MUTED },
});

type EditProps = {
  visible: boolean;
  decree: SerializedDecree | null;
  row: RecentUploadRow | null;
  categories: DecreeCategory[];
  onClose: () => void;
  onSaved: () => void;
};

export function EditDecreeModal({ visible, decree, row, categories, onClose, onSaved }: EditProps) {
  const insets = useSafeAreaInsets();
  const { t } = useAppTranslation();
  const { language } = useAppLanguage();
  const textDir = 'rtl';
  const [titlePs, setTitlePs] = useState('');
  const [titleFa, setTitleFa] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [contentPs, setContentPs] = useState('');
  const [contentFa, setContentFa] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [baselineBlocks, setBaselineBlocks] = useState<LocalizedContentBlock[]>([]);
  const [busy, setBusy] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [fetchedDecree, setFetchedDecree] = useState<SerializedDecree | null>(null);

  const activeCats = useMemo(() => categories.filter((c) => c.isActive).sort((a, b) => a.name.localeCompare(b.name)), [categories]);

  const effectiveDecree = decree ?? fetchedDecree;

  useEffect(() => {
    if (!visible) {
      setFetchedDecree(null);
      return;
    }
    if (decree) {
      setFetchedDecree(null);
      return;
    }
    if (!row?.id) return;
    let cancel = false;
    void (async () => {
      const r = await getDecreeById(row.id);
      if (!cancel && r.ok) setFetchedDecree(r.data);
    })();
    return () => {
      cancel = true;
    };
  }, [visible, decree, row?.id]);

  useEffect(() => {
    if (!visible) return;
    const d = effectiveDecree;
    if (d) {
      const tri = hydrateTrilingualTitlesFromDecree(d);
      setTitlePs(tri.ps);
      setTitleFa(tri.fa);
      setTitleEn(tri.en);
      setCategoryId(d.categories?.[0]?.id ?? activeCats[0]?.id ?? '');
      const draft = d.activeDraftVersion?.changeSummary;
      setNotes(draft && String(draft).trim() ? String(draft) : '');
      const base = pickLocalizedBaselineBlocks(d);
      setBaselineBlocks(base);
      setContentPs(localePlainFromBlocks(base, 'ps'));
      setContentFa(localePlainFromBlocks(base, 'fa'));
      setContentEn(localePlainFromBlocks(base, 'en'));
    } else if (row) {
      const t0 = parseTitleLine(row.titleLine).title;
      setTitlePs(t0);
      setTitleFa(t0);
      setTitleEn(t0);
      setCategoryId(activeCats[0]?.id ?? '');
      setNotes('');
      setBaselineBlocks([]);
      setContentPs('');
      setContentFa('');
      setContentEn('');
    }
  }, [visible, effectiveDecree, row, activeCats]);

  const catLabel = useMemo(() => {
    const c = activeCats.find((x) => x.id === categoryId);
    return c?.name ?? t('uploadFieldSelectCategory');
  }, [activeCats, categoryId]);

  const isDraftDecree = effectiveDecree?.status === 'draft';

  const save = async (publish: boolean) => {
    if (!effectiveDecree) {
      showToast(t('decreeNotFound'), 'error');
      return;
    }
    if (!titlePs.trim() || !titleFa.trim()) {
      showToast(t('uploadFieldTitleRequired'), 'error');
      return;
    }
    if (!categoryId) {
      showToast(t('uploadFieldSelectCategory'), 'error');
      return;
    }
    setBusy(true);
    try {
      const localizedContent = mergeLocalizedContentForEdit(baselineBlocks, contentPs, contentFa, contentEn);
      const r = await patchDecree(effectiveDecree.id, {
        titlePs: titlePs.trim(),
        titleFa: titleFa.trim(),
        titleEn: titleEn.trim(),
        categoryIds: [categoryId],
        draftVersion: {
          changeSummary: notes.trim() || null,
          localizedContent,
        },
        ...(publish ? { publish: true } : {}),
      });
      if (!r.ok) {
        showToast(r.message, 'error');
        return;
      }
      showToast(publish ? t('deptPublished') : t('deptSaved'), 'success');
      onSaved();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !busy && onClose()}>
      <Pressable
        style={edStyles.backdrop}
        onPress={() => {
          if (catOpen) setCatOpen(false);
          else if (!busy) onClose();
        }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={edStyles.kav}>
        <View style={[edStyles.card, { marginBottom: Math.max(insets.bottom, 12) }]}>
          <View style={edStyles.head}>
            <Text style={edStyles.title}>{t('deptEditDecree')}</Text>
            <AppPressable onPress={() => !busy && onClose()} accessibilityLabel={t('a11yClose')}>
              <Ionicons name="close" size={26} color="#94A3B8" />
            </AppPressable>
          </View>
          <View style={edStyles.divider} />

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={edStyles.scroll}
            onScrollBeginDrag={() => setCatOpen(false)}>
            <Text style={edStyles.lbl}>
              {t('uploadTitlePsLabel')}
              <Text style={edStyles.reqStar}>*</Text>
            </Text>
            <TextInput
              value={titlePs}
              onChangeText={setTitlePs}
              multiline
              textAlign="right"
              style={[edStyles.input, edStyles.titleArea, { writingDirection: textDir }]}
              placeholderTextColor={LABEL_GRAY}
              textAlignVertical="top"
              editable={!busy}
            />
            <Text style={edStyles.lbl}>
              {t('uploadTitleFaLabel')}
              <Text style={edStyles.reqStar}>*</Text>
            </Text>
            <TextInput
              value={titleFa}
              onChangeText={setTitleFa}
              multiline
              textAlign="right"
              style={[edStyles.input, edStyles.titleArea, { writingDirection: textDir }]}
              placeholderTextColor={LABEL_GRAY}
              textAlignVertical="top"
              editable={!busy}
            />
            <Text style={edStyles.lbl}>{t('certCardCategoryLabel')}</Text>
            <View>
              <Pressable onPress={() => setCatOpen((o) => !o)} style={edStyles.catTrig} disabled={busy}>
                <Text style={edStyles.catTrigTxt} numberOfLines={1}>
                  {catLabel}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#64748B" />
              </Pressable>
              {catOpen ? (
                <View style={edStyles.catMenu}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
                    {activeCats.map((c) => (
                      <Pressable
                        key={c.id}
                        onPress={() => {
                          setCategoryId(c.id);
                          setCatOpen(false);
                        }}
                        style={[edStyles.catRow, categoryId === c.id && edStyles.catRowHi]}>
                        <Text style={[edStyles.catRowTxt, categoryId === c.id && edStyles.catRowTxtHi]} numberOfLines={1}>
                          {c.name}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>

            <Text style={edStyles.lbl}>{t('reviewFocusAcceptance')}</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder={t('reviewFocusPlaceholder')}
              placeholderTextColor={LABEL_GRAY}
              multiline
              style={[edStyles.input, edStyles.area]}
              textAlignVertical="top"
              editable={!busy}
            />

            <Text style={edStyles.section}>{t('deptLocalizedDraft')}</Text>
            <Text style={edStyles.hint}>{t('deptLangEditBlurb')}</Text>

            <Text style={edStyles.lblOpt}>{t('uploadPashtoOptional')}</Text>
            <TextInput
              value={contentPs}
              onChangeText={setContentPs}
              placeholder={t('deptBodyPsPlaceholder')}
              placeholderTextColor={LABEL_GRAY}
              multiline
              textAlign="right"
              style={[edStyles.input, edStyles.areaTall, { writingDirection: textDir }]}
              textAlignVertical="top"
              editable={!busy}
            />

            <Text style={edStyles.lblOpt}>{t('uploadDariOptional')}</Text>
            <TextInput
              value={contentFa}
              onChangeText={setContentFa}
              placeholder={t('deptBodyFaPlaceholder')}
              placeholderTextColor={LABEL_GRAY}
              multiline
              textAlign="right"
              style={[edStyles.input, edStyles.areaTall, { writingDirection: textDir }]}
              textAlignVertical="top"
              editable={!busy}
            />

            <View style={edStyles.actions}>
              <Pressable onPress={() => !busy && onClose()} style={edStyles.btnGhost} disabled={busy}>
                <Text style={edStyles.btnGhostTxt}>{t('btnCancel')}</Text>
              </Pressable>
              {isDraftDecree ? (
                <>
                  <Pressable onPress={() => void save(false)} style={edStyles.btnGhost} disabled={busy}>
                    {busy ? <ActivityIndicator color={MUTED} size="small" /> : <Text style={edStyles.btnGhostTxt}>{t('inspectorSaveDraft')}</Text>}
                  </Pressable>
                  <Pressable onPress={() => void save(true)} style={edStyles.btnPri} disabled={busy}>
                    {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={edStyles.btnPriTxt}>{t('btnPublish')}</Text>}
                  </Pressable>
                </>
              ) : (
                <Pressable onPress={() => void save(false)} style={edStyles.btnPri} disabled={busy}>
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={edStyles.btnPriTxt}>{t('settingsBarSave')}</Text>}
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const edStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  kav: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  card: {
    maxHeight: '88%',
    backgroundColor: palette.white,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 440,
    ...DeptUploadDash.shadow,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: SLATE, flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER },
  scroll: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 22 },
  lbl: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 14,
    marginBottom: 8,
  },
  reqStar: {
    color: '#DC2626',
    fontWeight: '700',
  },
  section: { fontSize: 15, fontWeight: '700', color: ICON_GREEN, marginTop: 18, marginBottom: 4 },
  hint: { fontSize: 12, color: MUTED, lineHeight: 18, marginBottom: 4 },
  lblOpt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: SLATE,
    minHeight: 48,
  },
  area: { minHeight: 120, textAlignVertical: 'top' },
  areaTall: { minHeight: 140, textAlignVertical: 'top' },
  titleArea: { minHeight: 76, textAlignVertical: 'top' },
  catTrig: {
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
  catTrigTxt: { flex: 1, fontSize: 15, color: SLATE, marginRight: 8 },
  catMenu: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: palette.white,
    overflow: 'hidden',
    ...DeptUploadDash.shadow,
  },
  catRow: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  catRowHi: { backgroundColor: '#0088FF', borderBottomColor: '#0088FF' },
  catRowTxt: { fontSize: 15, color: '#000000', fontWeight: '500' },
  catRowTxtHi: { color: palette.white, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 22 },
  btnGhost: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    backgroundColor: palette.white,
  },
  btnGhostTxt: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  btnPri: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: FormColors.primaryButtonBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPriTxt: { fontSize: 15, fontWeight: '700', color: palette.white },
});
