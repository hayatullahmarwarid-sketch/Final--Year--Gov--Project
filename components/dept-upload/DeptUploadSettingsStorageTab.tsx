import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppSwitch } from '@/components/ui/AppSwitch';
import { DeptUploadDash } from '@/constants/dept-upload-dashboard';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { showToast } from '@/lib/adapters/toast';
import { getDeptUploadSettings, patchDeptUploadSettings } from '@/lib/api/dept-upload-settings';
import { getDecreeUploadDashboard, listDecrees } from '@/lib/api/decree-upload';
import { saveBackupJsonToDeviceStorage } from '@/lib/dept-upload/backup-file-save';
import { FormColors, palette } from '@/lib/theme';

const GREEN = palette.primary;
const GOLD = palette.primaryTint2;
const BLUE = palette.primaryTint1;
const ORANGE = palette.primaryShade1;

const USED_GB = 18.4;
const ALLOC_GB = 50;
const PCT_USED = (USED_GB / ALLOC_GB) * 100;
const PDF_GB = 12.1;
const IMG_GB = 4.2;
const BAK_GB = 2.1;
const SEG = [PDF_GB, IMG_GB, BAK_GB] as const;
const SEG_SUM = PDF_GB + IMG_GB + BAK_GB;

type StorageForm = {
  autoBackup: boolean;
  backupFreq: 'Daily' | 'Weekly' | 'Monthly';
  retentionDays: 30 | 60 | 90 | 180;
  destination: 'Local' | 'Cloud' | 'Both';
  autoDeleteRejected: boolean;
  deleteAfterDays: number;
};

const STORAGE_INITIAL: StorageForm = {
  autoBackup: true,
  backupFreq: 'Daily',
  retentionDays: 90,
  destination: 'Local',
  autoDeleteRejected: true,
  deleteAfterDays: 30,
};

export function DeptUploadSettingsStorageTab() {
  const { t } = useAppTranslation();
  const { width: windowW } = useWindowDimensions();
  const [form, setForm] = useState<StorageForm>(STORAGE_INITIAL);
  const [saved, setSaved] = useState<StorageForm>(STORAGE_INITIAL);
  const [deleteTrackW, setDeleteTrackW] = useState(1);
  const [footerW, setFooterW] = useState(0);
  const [backupBusy, setBackupBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const onFooterLayout = useCallback((e: LayoutChangeEvent) => {
    setFooterW(e.nativeEvent.layout.width);
  }, []);

  const foot = useMemo(() => {
    const effW = footerW > 0 ? footerW : Math.max(0, windowW - 32);
    const tight = effW < 380;
    return {
      padH: tight ? 8 : 16,
      padV: tight ? 10 : 16,
      gapOut: tight ? 6 : 10,
      gapIn: tight ? 4 : 6,
      runLineFs: tight ? 9 : 11,
      sideFs: tight ? 10 : 12,
      saveLineFs: tight ? 10 : 12,
      statusFs: tight ? 11 : 14,
      iconRun: tight ? 12 : 15,
      iconSide: tight ? 12 : 15,
      iconSave: tight ? 14 : 17,
      minH: tight ? 44 : 50,
    };
  }, [footerW, windowW]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  const reset = useCallback(() => setForm(saved), [saved]);
  const save = useCallback(async () => {
    setSaving(true);
    try {
      const r = await patchDeptUploadSettings({
        storage: {
          autoBackup: form.autoBackup,
          backupFreq: form.backupFreq.toLowerCase(),
          retentionDays: form.retentionDays,
          destination: form.destination.toLowerCase(),
          autoDeleteRejected: form.autoDeleteRejected,
          deleteAfterDays: form.deleteAfterDays,
        },
      });
      if (!r.ok) {
        showToast(r.message, 'error');
        return;
      }
      setSaved(form);
      showToast(t('deptStorageSettingsSaved'), 'success');
    } finally {
      setSaving(false);
    }
  }, [form, t]);

  const deletePct = (form.deleteAfterDays - 7) / (180 - 7);

  const onDeleteLayout = useCallback((e: LayoutChangeEvent) => {
    setDeleteTrackW(Math.max(1, e.nativeEvent.layout.width));
  }, []);

  const setDeleteFromPress = useCallback(
    (x: number) => {
      const t = Math.max(0, Math.min(1, x / deleteTrackW));
      const d = Math.round(7 + t * (180 - 7));
      setForm((f) => ({ ...f, deleteAfterDays: d }));
    },
    [deleteTrackW],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await getDeptUploadSettings();
      if (!r.ok || cancelled) return;
      const s = (r.data.storage ?? {}) as Record<string, unknown>;
      const freqRaw = String(s.backupFreq ?? 'daily').toLowerCase();
      const backupFreq = freqRaw === 'weekly' ? 'Weekly' : freqRaw === 'monthly' ? 'Monthly' : 'Daily';
      const retentionDaysNum = Number(s.retentionDays ?? 90);
      const retentionDays: StorageForm['retentionDays'] =
        retentionDaysNum <= 30 ? 30 : retentionDaysNum <= 60 ? 60 : retentionDaysNum <= 90 ? 90 : 180;
      const destRaw = String(s.destination ?? 'local').toLowerCase();
      const destination: StorageForm['destination'] =
        destRaw === 'cloud' ? 'Cloud' : destRaw === 'both' ? 'Both' : 'Local';
      const next: StorageForm = {
        autoBackup: Boolean(s.autoBackup ?? form.autoBackup),
        backupFreq,
        retentionDays,
        destination,
        autoDeleteRejected: Boolean(s.autoDeleteRejected ?? form.autoDeleteRejected),
        deleteAfterDays: Math.max(
          1,
          Math.min(3650, Number(s.deleteAfterDays ?? form.deleteAfterDays) || form.deleteAfterDays),
        ),
      };
      setForm(next);
      setSaved(next);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRunBackupNow = useCallback(async () => {
    if (backupBusy) return;
    if (form.destination !== 'Local') {
      showToast(t('deptBackupLocalOnly'), 'info');
      return;
    }
    setBackupBusy(true);
    try {
      const [dash, decrees] = await Promise.all([
        getDecreeUploadDashboard(),
        listDecrees({ page: 1, limit: 50, sort: 'updatedAt_desc' }),
      ]);
      const payload = {
        kind: 'dept_upload_backup',
        generatedAt: new Date().toISOString(),
        timezone: 'Asia/Kabul',
        storageSettings: form,
        dashboard: dash.ok ? dash.data : { error: dash.message },
        decrees: decrees.ok ? { items: decrees.items, meta: decrees.meta } : { error: decrees.message },
      };
      const fname = `dept-upload-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const out = await saveBackupJsonToDeviceStorage({ contentJson: payload, filename: fname });
      showToast(
        out.userVisible ? t('deptBackupSavedToDevice', { uri: out.savedUri }) : t('deptBackupSavedInApp'),
        'success',
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('deptBackupFailed'), 'error');
    } finally {
      setBackupBusy(false);
    }
  }, [backupBusy, form]);

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.storageHeadRow}>
          <View style={styles.storageHeadLeft}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="server-outline" size={20} color={GREEN} />
            </View>
            <View style={styles.cardHeadTxt}>
              <Text style={styles.cardTitle}>{t('deptStorageOverviewTitle')}</Text>
              <Text style={styles.cardSub}>
                {t('deptStorageOverviewSub', { used: USED_GB.toFixed(1), alloc: ALLOC_GB })}
              </Text>
            </View>
          </View>
          <Pressable style={styles.expandBtn} accessibilityRole="button">
            <Ionicons name="add" size={18} color={GREEN} />
            <Text style={styles.expandBtnTxt}>{t('deptStorageExpand')}</Text>
          </Pressable>
        </View>

        <View style={styles.usageRow}>
          <Text style={styles.usageBig}>
            18.4 / 50 <Text style={styles.usageGb}>{t('unitGb')}</Text>
          </Text>
          <View style={styles.pctPill}>
            <Text style={styles.pctPillTxt}>{t('deptStoragePctUsed', { pct: PCT_USED.toFixed(1) })}</Text>
          </View>
        </View>

        <View style={styles.mainTrack}>
          <View style={[styles.mainTrackFill, { width: `${PCT_USED}%` }]}>
            <View style={styles.segRow}>
              {SEG.map((gb, i) => (
                <View
                  key={i}
                  style={{
                    flex: gb,
                    backgroundColor: i === 0 ? GREEN : i === 1 ? GOLD : BLUE,
                  }}
                />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.breakList}>
          <BreakRow
            dotColor={GREEN}
            label={t('deptStorageBreakDecreePdfs')}
            value={t('deptStorageGbValue', { value: PDF_GB.toFixed(1) })}
            fillPct={(PDF_GB / SEG_SUM) * 100}
            fillColor={GREEN}
          />
          <BreakRow
            dotColor={GOLD}
            label={t('deptStorageBreakImages')}
            value={t('deptStorageGbValue', { value: IMG_GB.toFixed(1) })}
            fillPct={(IMG_GB / SEG_SUM) * 100}
            fillColor={GOLD}
          />
          <BreakRow
            dotColor={BLUE}
            label={t('deptStorageBreakBackups')}
            value={t('deptStorageGbValue', { value: BAK_GB.toFixed(1) })}
            fillPct={(BAK_GB / SEG_SUM) * 100}
            fillColor={BLUE}
          />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <View style={styles.cardIconWrap}>
            <Ionicons name="archive-outline" size={20} color={GREEN} />
          </View>
          <View style={styles.cardHeadTxt}>
            <Text style={styles.cardTitle}>{t('deptBackupConfigTitle')}</Text>
            <Text style={styles.cardSub}>{t('deptBackupConfigSub')}</Text>
          </View>
        </View>

        <View style={styles.backupStatus}>
          <Ionicons name="checkmark-circle" size={22} color={GREEN} />
          <View style={styles.backupStatusTxt}>
            <Text style={styles.backupStatusLine}>{t('deptBackupLastLine')}</Text>
            <Text style={styles.backupStatusSub}>{t('deptBackupLastSub')}</Text>
          </View>
        </View>

        <View style={styles.fieldGap}>
          <Text style={styles.rowTitle}>{t('deptBackupAutoTitle')}</Text>
          <Text style={styles.rowSub}>{t('deptBackupAutoSub')}</Text>
          <AppSwitch
            value={form.autoBackup}
            onValueChange={(v) => setForm((f) => ({ ...f, autoBackup: v }))}
            size="md"
            onColor={GREEN}
          />
        </View>

        <View style={styles.fieldGap}>
          <Text style={styles.rowTitle}>{t('deptBackupFreqTitle')}</Text>
          <Text style={styles.rowSub}>{t('deptBackupFreqSub')}</Text>
          <View style={styles.segment}>
            {(['Daily', 'Weekly', 'Monthly'] as const).map((seg) => {
              const on = form.backupFreq === seg;
              return (
                <Pressable
                  key={seg}
                  onPress={() => setForm((f) => ({ ...f, backupFreq: seg }))}
                  style={[styles.segBtn, on && styles.segBtnOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}>
                  <Text style={[styles.segBtnTxt, on && styles.segBtnTxtOn]}>
                    {seg === 'Daily' ? t('deptBackupFreqDaily') : seg === 'Weekly' ? t('deptBackupFreqWeekly') : t('deptBackupFreqMonthly')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.fieldGap}>
          <Text style={styles.rowTitle}>{t('deptBackupRetentionTitle')}</Text>
          <Text style={styles.rowSub}>{t('deptBackupRetentionSub')}</Text>
          <View style={styles.segment}>
            {([30, 60, 90, 180] as const).map((seg) => {
              const on = form.retentionDays === seg;
              return (
                <Pressable
                  key={seg}
                  onPress={() => setForm((f) => ({ ...f, retentionDays: seg }))}
                  style={[styles.segBtn4, on && styles.segBtnOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}>
                  <Text style={[styles.segBtnTxt, on && styles.segBtnTxtOn]}>{`${seg}d`}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.fieldGap}>
          <Text style={styles.rowTitle}>{t('deptBackupDestTitle')}</Text>
          <Text style={styles.rowSub}>{t('deptBackupDestSub')}</Text>
          <View style={styles.segment}>
            {(['Local', 'Cloud', 'Both'] as const).map((seg) => {
              const on = form.destination === seg;
              return (
                <Pressable
                  key={seg}
                  onPress={() => {
                    if (seg !== 'Local') {
                      showToast(t('deptBackupCloudNotEnabled'), 'info');
                      return;
                    }
                    setForm((f) => ({ ...f, destination: seg }));
                  }}
                  style={[styles.segBtn3, on && styles.segBtnOn, seg !== 'Local' && { opacity: 0.55 }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}>
                  <Text style={[styles.segBtnTxt, on && styles.segBtnTxtOn]}>
                    {seg === 'Local' ? t('deptBackupDestLocal') : seg === 'Cloud' ? t('deptBackupDestCloud') : t('deptBackupDestBoth')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <View style={styles.cardIconWrap}>
            <Ionicons name="layers-outline" size={20} color={GREEN} />
          </View>
          <View style={styles.cardHeadTxt}>
            <Text style={styles.cardTitle}>{t('deptCleanupTitle')}</Text>
            <Text style={styles.cardSub}>{t('deptCleanupSub')}</Text>
          </View>
        </View>

        <View style={styles.fieldGap}>
          <Text style={styles.rowTitle}>{t('deptCleanupAutoDeleteTitle')}</Text>
          <Text style={styles.rowSub}>{t('deptCleanupAutoDeleteSub')}</Text>
          <AppSwitch
            value={form.autoDeleteRejected}
            onValueChange={(v) => setForm((f) => ({ ...f, autoDeleteRejected: v }))}
            size="md"
            onColor={GREEN}
          />
        </View>

        <View style={styles.fieldGap}>
          <Text style={styles.rowTitle}>{t('deptCleanupDeleteAfterTitle', { days: form.deleteAfterDays })}</Text>
          <Text style={styles.rowSub}>{t('deptCleanupDeleteAfterSub')}</Text>
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderEdge}>7</Text>
            <Text style={styles.sliderEdge}>{t('deptCleanup180d')}</Text>
          </View>
          <Pressable
            onLayout={onDeleteLayout}
            onPress={(e) => setDeleteFromPress(e.nativeEvent.locationX)}
            style={styles.sliderTouch}
            accessibilityRole="adjustable">
            <View style={styles.sliderTrack}>
              <View style={[styles.sliderFill, { width: `${deletePct * 100}%` }]} />
            </View>
            <View style={[styles.sliderThumb, { left: `${deletePct * 100}%` }]} />
          </Pressable>
        </View>

        {/* Compression options intentionally removed (not supported). */}
      </View>

      <View
        style={[
          styles.footer,
          { paddingHorizontal: foot.padH, paddingVertical: foot.padV, gap: foot.gapOut },
        ]}
        onLayout={onFooterLayout}>
        <View style={styles.footerLeft}>
          {dirty ? (
            <View style={styles.footerWarn}>
              <Ionicons name="warning" size={16} color={ORANGE} />
              <Text style={styles.footerWarnTxt} numberOfLines={1} ellipsizeMode="tail">
                {t('settingsUnsavedChanges')}
              </Text>
            </View>
          ) : (
            <Text
              style={[styles.footerOk, { fontSize: foot.statusFs, lineHeight: foot.statusFs + 4 }]}
              numberOfLines={1}
              ellipsizeMode="tail">
              {t('settingsBarSaved')}
            </Text>
          )}
        </View>
        <View style={[styles.footerBtns, { gap: foot.gapIn, minHeight: foot.minH }]}>
          <Pressable
            style={[
              styles.runBackupBtn,
              { minHeight: foot.minH, paddingHorizontal: foot.padH > 10 ? 6 : 2, paddingVertical: 4, gap: 4 },
            ]}
            onPress={() => void onRunBackupNow()}
            disabled={backupBusy}
            accessibilityRole="button">
            <Ionicons name="sync-outline" size={foot.iconRun} color="#334155" />
            <View style={styles.runBackupTxtCol}>
              <Text style={[styles.runBackupLine, { fontSize: foot.runLineFs, lineHeight: foot.runLineFs + 3 }]}>
                {t('deptBackupRun')}
              </Text>
              <Text style={[styles.runBackupLine, { fontSize: foot.runLineFs, lineHeight: foot.runLineFs + 3 }]}>
                {t('deptBackupBackup')}
              </Text>
              <Text style={[styles.runBackupLine, { fontSize: foot.runLineFs, lineHeight: foot.runLineFs + 3 }]}>
                {t('deptBackupNow')}
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={reset}
            style={[
              styles.btnGhost,
              { minHeight: foot.minH, paddingHorizontal: foot.padH > 10 ? 6 : 2, gap: 3 },
            ]}
            accessibilityRole="button">
            <Ionicons name="refresh-outline" size={foot.iconSide} color="#334155" />
            <Text style={[styles.btnGhostTxt, { fontSize: foot.sideFs }]}>{t('settingsBarReset')}</Text>
          </Pressable>
          <Pressable
            onPress={() => void save()}
            disabled={saving}
            style={[
              styles.btnPri,
              { minHeight: foot.minH, paddingHorizontal: foot.padH > 10 ? 6 : 2, gap: 4 },
            ]}
            accessibilityRole="button">
            <Ionicons name="save-outline" size={foot.iconSave} color={palette.white} />
            <View style={styles.btnPriTxtCol}>
              <Text style={[styles.btnPriLine, { fontSize: foot.saveLineFs, lineHeight: foot.saveLineFs + 3 }]}>
                {t('btnSave')}
              </Text>
              <Text style={[styles.btnPriLine, { fontSize: foot.saveLineFs, lineHeight: foot.saveLineFs + 3 }]}>
                {t('deptSettingsWord')}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function BreakRow({
  dotColor,
  label,
  value,
  fillPct,
  fillColor,
}: {
  dotColor: string;
  label: string;
  value: string;
  fillPct: number;
  fillColor: string;
}) {
  return (
    <View style={styles.breakCard}>
      <View style={styles.breakTop}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text style={styles.breakLabel}>{label}</Text>
        <Text style={styles.breakValue}>{value}</Text>
      </View>
      <View style={styles.breakTrack}>
        <View style={[styles.breakFill, { width: `${fillPct}%`, backgroundColor: fillColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 14 },
  card: {
    backgroundColor: palette.white,
    borderRadius: DeptUploadDash.radiusLg,
    padding: 18,
    borderWidth: 1,
    borderColor: DeptUploadDash.cardBorder,
    ...DeptUploadDash.shadow,
  },
  storageHeadRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  storageHeadLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(11, 79, 46, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeadTxt: { flex: 1, minWidth: 0 },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  cardSub: { fontSize: 12, fontWeight: '500', color: DeptUploadDash.mutedText, marginTop: 4, lineHeight: 16 },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: palette.white,
  },
  expandBtnTxt: { fontSize: 12, fontWeight: '700', color: GREEN },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  usageBig: { fontSize: 28, fontWeight: '800', color: '#1E293B' },
  usageGb: { fontSize: 18, fontWeight: '700' },
  pctPill: {
    backgroundColor: 'rgba(11, 79, 46, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pctPillTxt: { fontSize: 12, fontWeight: '700', color: GREEN },
  mainTrack: {
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 16,
  },
  mainTrackFill: { height: '100%', borderRadius: 7, overflow: 'hidden' },
  segRow: { flex: 1, flexDirection: 'row', height: '100%' },
  breakList: { gap: 10 },
  breakCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
  },
  breakTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  breakLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: FormColors.title },
  breakValue: { fontSize: 13, fontWeight: '700', color: FormColors.title },
  breakTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  breakFill: { height: '100%', borderRadius: 3 },
  backupStatus: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(11, 79, 46, 0.08)',
    marginBottom: 20,
  },
  backupStatusTxt: { flex: 1 },
  backupStatusLine: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  backupStatusSub: { fontSize: 12, fontWeight: '500', color: DeptUploadDash.mutedText, marginTop: 4 },
  fieldGap: { marginBottom: 22 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: FormColors.title },
  rowSub: {
    fontSize: 12,
    fontWeight: '500',
    color: DeptUploadDash.mutedText,
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 16,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  segBtn3: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  segBtn4: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', minWidth: 0 },
  segBtnOn: { backgroundColor: palette.white, borderWidth: 1, borderColor: 'rgba(11, 79, 46, 0.45)', ...DeptUploadDash.shadow },
  segBtnTxt: { fontSize: 12, fontWeight: '600', color: FormColors.subtitle },
  segBtnTxtOn: { color: GREEN },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sliderEdge: { fontSize: 12, fontWeight: '600', color: FormColors.subtitle },
  sliderTouch: { position: 'relative', height: 36, justifyContent: 'center' },
  sliderTrack: { height: 8, borderRadius: 4, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  sliderFill: { height: '100%', backgroundColor: GREEN, borderRadius: 4 },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: GREEN,
    borderWidth: 2,
    borderColor: palette.white,
    marginLeft: -10,
    top: '50%',
    marginTop: -10,
    ...DeptUploadDash.shadow,
  },
  footer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: palette.white,
    ...DeptUploadDash.shadow,
  },
  /* ~32% : ~68% — status can shrink/ellipsis; buttons get most width and share equally. */
  footerLeft: {
    flex: 3,
    flexBasis: 0,
    minWidth: 0,
    justifyContent: 'center',
    paddingRight: 4,
  },
  footerOk: { fontWeight: '400', color: '#94A3B8' },
  footerWarn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerWarnTxt: { fontSize: 13, fontWeight: '600', color: ORANGE, flex: 1 },
  footerBtns: {
    flex: 7,
    flexBasis: 0,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  runBackupBtn: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: palette.white,
  },
  runBackupTxtCol: { flexShrink: 1, minWidth: 0, alignItems: 'center' },
  runBackupLine: {
    fontWeight: '500',
    color: '#334155',
    textAlign: 'center',
  },
  btnGhost: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: palette.white,
  },
  btnGhostTxt: { fontWeight: '500', color: '#334155' },
  btnPri: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: GREEN,
  },
  btnPriTxtCol: { flexShrink: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  btnPriLine: {
    fontWeight: '700',
    color: palette.white,
    textAlign: 'center',
  },
});
