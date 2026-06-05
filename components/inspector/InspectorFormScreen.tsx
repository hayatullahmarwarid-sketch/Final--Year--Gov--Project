import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { getApiBaseUrl } from '@/constants/api';
import { useInspectorSyncQueue } from '@/contexts/inspector-sync-queue-context';
import { useInspectorWorkspace } from '@/contexts/inspector-workspace-context';
import { type InspectorSyncQueueItem } from '@/data/inspector-sync-queue';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { registerInspectionEvidenceFromPicker } from '@/lib/api/files';
import { inspectorsApi } from '@/lib/api/inspectors';
import { getJwtAccessToken } from '@/lib/api/jwt-session-storage';
import { appendLocalOfflineSubmit } from '@/lib/inspector-offline-local-queue';

import { SignaturePadModal } from './SignaturePadModal';

type TemplateItem = {
  itemKey: string;
  type: string;
  label: string;
  required?: boolean;
  options?: { optionKey: string; label: string }[];
};

function parseGpsValue(v: unknown): { latitude: number; longitude: number } | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  const parts = v.split(',').map((s) => Number(s.trim()));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null;
  return { latitude: parts[0], longitude: parts[1] };
}

type TemplateSection = {
  sectionKey: string;
  title: string;
  items?: TemplateItem[];
};

function itemKey(sectionKey: string, itemKey: string) {
  return `${sectionKey}::${itemKey}`;
}

function normalizeAnswerRow(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    itemKey: String(raw.itemKey ?? ''),
    sectionKey: String(raw.sectionKey ?? ''),
    valueText: raw.valueText ?? null,
    valueNumber: raw.valueNumber ?? null,
    valueBoolean: raw.valueBoolean ?? null,
    valueDate: raw.valueDate ?? null,
    selectedOptionKeys: Array.isArray(raw.selectedOptionKeys) ? raw.selectedOptionKeys : undefined,
    evidenceFileIds: Array.isArray(raw.evidenceFileIds) ? raw.evidenceFileIds : undefined,
  };
}

function emptyAnswerRow(sectionKey: string, itemKeyStr: string): Record<string, unknown> {
  return {
    sectionKey,
    itemKey: itemKeyStr,
    valueText: null,
    valueNumber: null,
    valueBoolean: null,
    valueDate: null,
  };
}

function rowHasData(row: Record<string, unknown> | undefined): boolean {
  if (!row) return false;
  if (row.valueText != null && String(row.valueText).trim().length > 0) return true;
  if (row.valueNumber != null && row.valueNumber !== '' && !Number.isNaN(Number(row.valueNumber))) return true;
  if (row.valueBoolean === true || row.valueBoolean === false) return true;
  if (row.valueDate != null && String(row.valueDate).trim().length > 0) return true;
  if (Array.isArray(row.selectedOptionKeys) && row.selectedOptionKeys.length > 0) return true;
  if (Array.isArray(row.evidenceFileIds) && row.evidenceFileIds.length > 0) return true;
  return false;
}

export function InspectorFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const assignmentId = String(id ?? '');
  const { width } = useWindowDimensions();
  const { t, number } = useAppTranslation();
  const horizontalPad = width >= 900 ? Math.max(24, (width - 560) / 2) : width >= 768 ? 32 : 20;
  const { refresh: refreshWorkspace } = useInspectorWorkspace();
  const { setItems: setSyncQueue } = useInspectorSyncQueue();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  /** Serialized answers keyed sectionKey::itemKey */
  const [answers, setAnswers] = useState<Record<string, Record<string, unknown>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sigOpen, setSigOpen] = useState(false);
  const [sigTarget, setSigTarget] = useState<{ sectionKey: string; itemKey: string } | null>(null);

  const load = useCallback(async () => {
    if (!assignmentId) {
      setLoadError(t('inspectorMissingAssignmentId'));
      setLoading(false);
      return;
    }
    const base = getApiBaseUrl();
    const token = await getJwtAccessToken();
    if (!base || !token) {
      setLoadError(!base ? t('inspectorConfigureApi') : t('inspectorSignInApi'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const res = await inspectorsApi.getAssignment(assignmentId);
    if (!res.ok) {
      setLoadError(res.message);
      setLoading(false);
      return;
    }
    const data = res.data as Record<string, unknown>;
    setDetail(data);
    const draft = data.draftSubmission as Record<string, unknown> | undefined;
    const draftAnswers = Array.isArray(draft?.answers) ? (draft?.answers as Record<string, unknown>[]) : [];
    const next: Record<string, Record<string, unknown>> = {};
    for (const a of draftAnswers) {
      const sk = String(a.sectionKey ?? '');
      const ik = String(a.itemKey ?? '');
      if (!sk || !ik) continue;
      next[itemKey(sk, ik)] = normalizeAnswerRow(a);
    }
    setAnswers(next);
    setLoading(false);
  }, [assignmentId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const template = detail?.template as Record<string, unknown> | undefined;
  const sections = useMemo(() => (Array.isArray(template?.sections) ? (template?.sections as TemplateSection[]) : []), [template]);
  const assignment = detail?.assignment as Record<string, unknown> | undefined;
  const revisionOk = detail?.templateRevisionMatches !== false;

  const setAnswerField = useCallback((sectionKey: string, itemKeyStr: string, patch: Record<string, unknown>) => {
    const k = itemKey(sectionKey, itemKeyStr);
    setAnswers((prev) => {
      const cur = { ...(prev[k] ?? { sectionKey, itemKey: itemKeyStr }), ...patch, sectionKey, itemKey: itemKeyStr };
      return { ...prev, [k]: cur };
    });
  }, []);

  const enqueueSyncFailure = useCallback(
    (kind: 'draft' | 'submit', errorMessage: string) => {
      setSyncQueue((prev) => {
        const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const row: InspectorSyncQueueItem = {
          id,
          taskId: assignmentId,
          type: kind === 'draft' ? t('inspectorSyncQueueTypeDraft') : t('inspectorSyncQueueTypeSubmit'),
          status: 'failed',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          size: '—',
          items: [assignmentId],
          error: errorMessage,
        };
        return [row, ...prev].slice(0, 40);
      });
    },
    [assignmentId, setSyncQueue, t],
  );

  const buildAnswersList = useCallback(
    (mode: 'draft' | 'submit') => {
      const out: Record<string, unknown>[] = [];
      for (const sec of sections) {
        for (const it of sec.items ?? []) {
          const k = itemKey(sec.sectionKey, it.itemKey);
          const row = answers[k];
          if (mode === 'draft') {
            if (!rowHasData(row)) continue;
            out.push(normalizeAnswerRow(row!));
            continue;
          }
          if (!it.required && !rowHasData(row)) continue;
          out.push(row ? normalizeAnswerRow(row) : emptyAnswerRow(sec.sectionKey, it.itemKey));
        }
      }
      return out;
    },
    [answers, sections],
  );

  const onSaveDraft = async () => {
    if (!revisionOk) {
      Alert.alert(t('alertTemplateConflictTitle'), t('alertTemplateConflictMessage'));
      return;
    }
    setSavingDraft(true);
    const body = { answers: buildAnswersList('draft'), submissionKind: 'manual_draft' as const };
    const res = await inspectorsApi.saveDraft(assignmentId, body);
    setSavingDraft(false);
    if (!res.ok) {
      enqueueSyncFailure('draft', res.message);
      Alert.alert(t('alertDraftNotSavedTitle'), res.message);
    } else {
      setSyncQueue((prev) => prev.filter((q) => !(q.taskId === assignmentId && q.type === t('inspectorSyncQueueTypeDraft'))));
      await refreshWorkspace();
    }
  };

  const onSubmit = async () => {
    if (!revisionOk) {
      Alert.alert(t('alertTemplateConflictTitle'), t('alertTemplateConflictMessage'));
      return;
    }
    const answersList = buildAnswersList('submit');
    const net = await Network.getNetworkStateAsync();
    const online =
      net.isConnected === true &&
      net.isInternetReachable !== false &&
      net.isInternetReachable !== null;
    if (!online) {
      const offlineId = `off_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      await appendLocalOfflineSubmit({
        offlineId,
        assignmentId,
        answers: answersList,
        submittedAt: new Date().toISOString(),
      });
      setSyncQueue((prev) => {
        const row: InspectorSyncQueueItem = {
          id: offlineId,
          taskId: assignmentId,
          type: t('inspectorSyncQueueTypeSubmit'),
          status: 'pending',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          size: '—',
          items: [assignmentId],
        };
        return [row, ...prev].slice(0, 40);
      });
      Alert.alert(
        'Saved offline',
        'You are offline. When you reconnect, open Sync and tap Sync all to upload this inspection.',
      );
      setSuccess(true);
      return;
    }
    setSubmitting(true);
    const body = { answers: answersList };
    const res = await inspectorsApi.submit(assignmentId, body);
    setSubmitting(false);
    if (!res.ok) {
      enqueueSyncFailure('submit', res.message);
      Alert.alert(t('alertSubmitFailedTitle'), res.message);
      return;
    }
    setSyncQueue((prev) => prev.filter((q) => !(q.taskId === assignmentId && q.type === t('inspectorSyncQueueTypeSubmit'))));
    setSuccess(true);
    await refreshWorkspace();
  };

  const onPickPhoto = async (sectionKey: string, itemKeyStr: string) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('alertPermissionEvidenceTitle'), t('alertPermissionEvidenceMessage'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.75 });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    const reg = await registerInspectionEvidenceFromPicker({
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
      fileSize: asset.fileSize,
    });
    if (!reg.ok) {
      Alert.alert(t('alertUploadMetaFailedTitle'), reg.message);
      return;
    }
    const fileRow = reg.data as Record<string, unknown>;
    const fileId = String(fileRow.id ?? '');
    if (!fileId) {
      Alert.alert(t('alertUploadMetaFailedTitle'), t('alertUploadMetaMissingFile'));
      return;
    }
    const att = await inspectorsApi.attachEvidence(assignmentId, {
      fileId,
      itemKey: itemKeyStr,
    });
    if (!att.ok) {
      Alert.alert(t('alertEvidenceNotLinkedTitle'), att.message);
      return;
    }
    const k = itemKey(sectionKey, itemKeyStr);
    setAnswers((prev) => {
      const cur: Record<string, unknown> = {
        ...((prev[k] as Record<string, unknown> | undefined) ?? { sectionKey, itemKey: itemKeyStr }),
        sectionKey,
        itemKey: itemKeyStr,
      };
      const existing = Array.isArray(cur.evidenceFileIds) ? (cur.evidenceFileIds as string[]) : [];
      const nextIds = [...existing, fileId];
      return { ...prev, [k]: { ...cur, evidenceFileIds: nextIds } };
    });
  };

  const onCaptureGps = async (sectionKey: string, itemKeyStr: string) => {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('alertPermissionEvidenceTitle'), 'Location permission is required to capture GPS.');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const gps = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
    setAnswerField(sectionKey, itemKeyStr, { valueText: gps });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Brand.green} />
          <Text style={styles.centerTxt} maxFontSizeMultiplier={1.1}>
            {t('inspectorLoadingInspection')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError || !detail || !template) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.errTitle} maxFontSizeMultiplier={1.15}>
            {t('inspectorCannotLoadForm')}
          </Text>
          <Text style={styles.centerTxt} maxFontSizeMultiplier={1.1}>
            {loadError ?? t('inspectorUnknownError')}
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.back()} accessibilityRole="button">
            <Text style={styles.primaryBtnTxt}>{t('btnGoBack')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (success) {
    return (
      <SafeAreaView style={styles.safeOk} edges={['top', 'bottom']}>
        <View style={styles.okWrap}>
          <View style={styles.okIcon}>
            <Ionicons name="checkmark-circle" size={48} color="#059669" />
          </View>
          <Text style={styles.okTitle} maxFontSizeMultiplier={1.25}>
            {t('inspectorSubmissionSuccessful')}
          </Text>
          <Text style={styles.okSub} maxFontSizeMultiplier={1.2}>
            {t('inspectorSubmissionReviewMessage', { code: assignmentId.slice(-6) })}
          </Text>
          <Pressable style={styles.okBtn} onPress={() => router.replace('/inspector' as Href)} accessibilityRole="button">
            <Text style={styles.okBtnText} maxFontSizeMultiplier={1.15}>
              {t('inspectorBackToDashboard')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const taskTitle = String(assignment?.taskTitle ?? assignment?.decreeTitle ?? t('inspectorInspectionFallbackTitle'));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={t('a11yGoBack')}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerSub} maxFontSizeMultiplier={1.05}>
              {t('inspectorInspectionForm')}
            </Text>
            <Text style={styles.headerTitle} numberOfLines={2} maxFontSizeMultiplier={1.1}>
              {taskTitle}
            </Text>
          </View>
        </View>

        {!revisionOk ? (
          <View style={styles.warnBanner}>
            <Ionicons name="warning-outline" size={18} color="#B45309" />
            <Text style={styles.warnBannerTxt} maxFontSizeMultiplier={1.05}>
              {t('inspectorTemplateRevisionMismatch')}
            </Text>
          </View>
        ) : null}

        <ScrollView contentContainerStyle={{ paddingHorizontal: horizontalPad, paddingTop: 16, paddingBottom: 120 }}>
          {sections.map((sec) => (
            <View key={sec.sectionKey} style={styles.section}>
              <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.1}>
                {sec.title}
              </Text>
              {(sec.items ?? []).map((it) => {
                const k = itemKey(sec.sectionKey, it.itemKey);
                const row = answers[k] ?? { sectionKey: sec.sectionKey, itemKey: it.itemKey };
                return (
                  <View key={it.itemKey} style={styles.fieldCard}>
                    <Text style={styles.fieldLabel} maxFontSizeMultiplier={1.1}>
                      {it.label}
                      {it.required ? <Text style={styles.reqStar}> *</Text> : null}
                    </Text>
                    {it.type === 'text' ? (
                      <TextInput
                        style={styles.input}
                        value={row.valueText != null ? String(row.valueText) : ''}
                        onChangeText={(v) => setAnswerField(sec.sectionKey, it.itemKey, { valueText: v })}
                        placeholder={t('inspectorEnterTextPh')}
                        placeholderTextColor="#9CA3AF"
                        maxFontSizeMultiplier={1.2}
                      />
                    ) : null}
                    {it.type === 'number' ? (
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={row.valueNumber != null && row.valueNumber !== '' ? String(row.valueNumber) : ''}
                        onChangeText={(v) =>
                          setAnswerField(sec.sectionKey, it.itemKey, {
                            valueNumber: v === '' ? null : Number(v),
                          })
                        }
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                        maxFontSizeMultiplier={1.2}
                      />
                    ) : null}
                    {it.type === 'date' ? (
                      <TextInput
                        style={styles.input}
                        value={row.valueDate != null ? String(row.valueDate).slice(0, 10) : ''}
                        onChangeText={(v) => setAnswerField(sec.sectionKey, it.itemKey, { valueDate: v || null })}
                        placeholder={t('inspectorDatePh')}
                        placeholderTextColor="#9CA3AF"
                        maxFontSizeMultiplier={1.2}
                      />
                    ) : null}
                    {(it.type === 'checklist' || it.type === 'checkbox' || it.type === 'dropdown') && (it.options?.length ?? 0) > 0 ? (
                      <View style={styles.optWrap}>
                        {(() => {
                          const currentSelected = Array.isArray(row.selectedOptionKeys)
                            ? (row.selectedOptionKeys as string[]).map(String)
                            : [];
                          return (
                            <>
                        {(it.options ?? []).map((opt) => {
                          const keys = new Set(
                            Array.isArray(row.selectedOptionKeys) ? (row.selectedOptionKeys as string[]).map(String) : [],
                          );
                          const on = keys.has(opt.optionKey);
                          return (
                            <Pressable
                              key={opt.optionKey}
                              onPress={() => {
                                if (it.type === 'dropdown') {
                                  setAnswerField(sec.sectionKey, it.itemKey, { selectedOptionKeys: [opt.optionKey] });
                                  return;
                                }
                                const next = new Set(keys);
                                if (on) next.delete(opt.optionKey);
                                else next.add(opt.optionKey);
                                setAnswerField(sec.sectionKey, it.itemKey, { selectedOptionKeys: [...next] });
                              }}
                              style={[styles.optChip, on && styles.optChipOn]}
                              accessibilityRole="button">
                              <Text style={[styles.optChipTxt, on && styles.optChipTxtOn]} maxFontSizeMultiplier={1.05}>
                                {opt.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                        {it.type === 'dropdown' && currentSelected.length > 0 ? (
                          <Text style={styles.evHint} maxFontSizeMultiplier={1.05}>
                            Selected: {currentSelected[0]}
                          </Text>
                        ) : null}
                            </>
                          );
                        })()}
                      </View>
                    ) : null}
                    {(it.type === 'checklist' || it.type === 'checkbox') && !(it.options?.length ?? 0) ? (
                      <View style={styles.boolRow}>
                        <Pressable
                          onPress={() => setAnswerField(sec.sectionKey, it.itemKey, { valueBoolean: true })}
                          style={[styles.boolBtn, row.valueBoolean === true && styles.boolBtnOn]}
                          accessibilityRole="button">
                          <Text style={styles.boolBtnTxt}>{t('inspectorBoolYes')}</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setAnswerField(sec.sectionKey, it.itemKey, { valueBoolean: false })}
                          style={[styles.boolBtn, row.valueBoolean === false && styles.boolBtnDanger]}
                          accessibilityRole="button">
                          <Text style={styles.boolBtnTxt}>{t('inspectorBoolNo')}</Text>
                        </Pressable>
                      </View>
                    ) : null}
                    {it.type === 'photo_required' || it.type === 'photo' ? (
                      <View>
                        <Pressable style={styles.photoBtn} onPress={() => void onPickPhoto(sec.sectionKey, it.itemKey)} accessibilityRole="button">
                          <Ionicons name="image-outline" size={20} color={Brand.green} />
                          <Text style={styles.photoBtnTxt} maxFontSizeMultiplier={1.05}>
                            {t('inspectorAddEvidencePhoto')}
                          </Text>
                        </Pressable>
                        <Text style={styles.evHint} maxFontSizeMultiplier={1.05}>
                          {t('inspectorLinkedFilesCount', {
                            count: number(Array.isArray(row.evidenceFileIds) ? row.evidenceFileIds.length : 0),
                          })}
                        </Text>
                      </View>
                    ) : null}
                    {it.type === 'rating' ? (
                      <View>
                        <TextInput
                          style={styles.input}
                          keyboardType="numeric"
                          value={row.valueNumber != null && row.valueNumber !== '' ? String(row.valueNumber) : ''}
                          onChangeText={(v) => {
                            const parsed = v === '' ? null : Number(v);
                            if (parsed != null && (!Number.isFinite(parsed) || parsed < 0 || parsed > 100)) return;
                            setAnswerField(sec.sectionKey, it.itemKey, { valueNumber: parsed });
                          }}
                          placeholder="0 - 100"
                          placeholderTextColor="#9CA3AF"
                          maxFontSizeMultiplier={1.2}
                        />
                        <Text style={styles.evHint} maxFontSizeMultiplier={1.05}>
                          Compliance score from 0 to 100.
                        </Text>
                      </View>
                    ) : null}
                    {it.type === 'gps' ? (
                      <View>
                        <Pressable
                          style={styles.photoBtn}
                          onPress={() => void onCaptureGps(sec.sectionKey, it.itemKey)}
                          accessibilityRole="button">
                          <Ionicons name="locate-outline" size={20} color={Brand.green} />
                          <Text style={styles.photoBtnTxt} maxFontSizeMultiplier={1.05}>
                            Capture current location
                          </Text>
                        </Pressable>
                        {typeof row.valueText === 'string' && row.valueText.trim().length > 0 ? (
                          <View style={{ marginTop: 8 }}>
                            <Text style={styles.evHint} maxFontSizeMultiplier={1.05}>
                              {String(row.valueText)}
                            </Text>
                            {parseGpsValue(row.valueText) ? (
                              <Text style={styles.linkRetake} maxFontSizeMultiplier={1.05}>
                                Location captured successfully
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                    {it.type === 'signature' ? (
                      <View>
                        {!row.valueText ? (
                          <Pressable
                            style={styles.photoBtn}
                            onPress={() => {
                              setSigTarget({ sectionKey: sec.sectionKey, itemKey: it.itemKey });
                              setSigOpen(true);
                            }}
                            accessibilityRole="button">
                            <Ionicons name="create-outline" size={20} color={Brand.green} />
                            <Text style={styles.photoBtnTxt} maxFontSizeMultiplier={1.05}>
                              {t('inspectorCaptureSignature')}
                            </Text>
                          </Pressable>
                        ) : (
                          <View>
                            <Image source={{ uri: String(row.valueText) }} style={styles.sigPreview} contentFit="contain" />
                            <Pressable
                              onPress={() => {
                                setSigTarget({ sectionKey: sec.sectionKey, itemKey: it.itemKey });
                                setSigOpen(true);
                              }}>
                              <Text style={styles.linkRetake} maxFontSizeMultiplier={1.05}>
                                {t('inspectorRetake')}
                              </Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>

        <View style={styles.bottomBar}>
          <View style={styles.bottomRow}>
            <Pressable
              style={styles.draftBtn}
              disabled={savingDraft || !revisionOk}
              onPress={() => void onSaveDraft()}
              accessibilityRole="button">
              {savingDraft ? <ActivityIndicator color="#6B7280" /> : <Ionicons name="save-outline" size={16} color="#6B7280" />}
              <Text style={styles.draftBtnTxt} maxFontSizeMultiplier={1.05}>
                {t('inspectorSaveDraft')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.submitBtn, (!revisionOk || submitting) && styles.submitBtnOff]}
              disabled={!revisionOk || submitting}
              onPress={() => void onSubmit()}
              accessibilityRole="button">
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={styles.submitBtnTxt} maxFontSizeMultiplier={1.05}>
                    {t('btnSubmit')}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        <SignaturePadModal
          visible={sigOpen}
          onClose={() => {
            setSigOpen(false);
            setSigTarget(null);
          }}
          onSave={(uri) => {
            if (sigTarget) {
              setAnswerField(sigTarget.sectionKey, sigTarget.itemKey, { valueText: uri });
            }
            setSigOpen(false);
            setSigTarget(null);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  centerTxt: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  errTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  primaryBtn: { marginTop: 8, paddingVertical: 12, paddingHorizontal: 20, backgroundColor: Brand.green, borderRadius: 12 },
  primaryBtnTxt: { color: '#fff', fontWeight: '800' },
  header: {
    backgroundColor: Brand.green,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { padding: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '800', marginTop: 2 },
  warnBanner: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  warnBannerTxt: { flex: 1, fontSize: 12, fontWeight: '600', color: '#92400E', lineHeight: 18 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#111827', marginBottom: 10 },
  fieldCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 14,
    marginBottom: 10,
  },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8 },
  reqStar: { color: '#DC2626' },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FAFAFA',
  },
  optWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  optChipOn: { borderColor: Brand.green, backgroundColor: 'rgba(11,79,46,0.08)' },
  optChipTxt: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  optChipTxtOn: { color: Brand.green },
  boolRow: { flexDirection: 'row', gap: 8 },
  boolBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  boolBtnOn: { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
  boolBtnDanger: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  boolBtnTxt: { fontSize: 12, fontWeight: '800', color: '#374151' },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(11,79,46,0.35)',
    backgroundColor: '#fff',
  },
  photoBtnTxt: { fontSize: 12, fontWeight: '800', color: Brand.green },
  evHint: { marginTop: 6, fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
  sigPreview: { height: 100, width: '100%', backgroundColor: '#FAFAFA', borderRadius: 12 },
  linkRetake: { marginTop: 8, fontSize: 12, fontWeight: '800', color: Brand.green },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  bottomRow: { flexDirection: 'row', gap: 12 },
  draftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  draftBtnTxt: { fontSize: 12, fontWeight: '800', color: '#6B7280', letterSpacing: 0.5, textTransform: 'uppercase' },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Brand.green,
  },
  submitBtnOff: { backgroundColor: '#D1D5DB' },
  submitBtnTxt: { fontSize: 12, fontWeight: '800', color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' },
  safeOk: { flex: 1, backgroundColor: '#fff' },
  okWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  okIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  okTitle: { fontSize: 24, fontWeight: '900', color: '#111827', marginBottom: 8, textAlign: 'center' },
  okSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 32, maxWidth: 320 },
  okBtn: {
    backgroundColor: Brand.green,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  okBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
});
