import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  I18nManager,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { FormColors } from '@/constants/form';
import { HomeColors } from '@/constants/home';
import { CERT_DETAIL_THEME } from '@/data/certificate-detail-theme';
import type { CertificateListItem } from '@/data/certificates';
import { useUserProfile } from '@/contexts/user-profile-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { buildCertificatePdfHtml } from '@/lib/certificate-html';
import { certificatePdfFilename, saveCertificatePdfToDevice } from '@/lib/certificate-pdf-save';
import { getPublicCertificateById } from '@/lib/api/public-user';
import { apiCertificateToListItem } from '@/lib/public/exam-cert-adapters';
import { palette, primaryBtn, shadowPrimary } from '@/lib/theme';

const HEADER_RADIUS = 22;
const PAGES = 3;

function normalizeId(p: string | string[] | undefined): string {
  const raw = Array.isArray(p) ? p[0] ?? '' : p ?? '';
  if (typeof raw !== 'string') return '';
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

function PatternBg({ color }: { color: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: 8 }).map((_, r) =>
        Array.from({ length: 6 }).map((_, c) => (
          <View
            key={`${r}-${c}`}
            style={{
              position: 'absolute',
              left: c * 28 + (r % 2) * 14,
              top: r * 28,
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: color,
            }}
          />
        )),
      )}
    </View>
  );
}

export default function CertificateDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const id = normalizeId(rawId);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const horizontal = width < 360 ? 14 : 18;
  const pageW = width - horizontal * 2;
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState<'pdf' | 'print' | null>(null);
  const [item, setItem] = useState<CertificateListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fetchNonce, setFetchNonce] = useState(0);

  const { profile } = useUserProfile();
  const { t } = useAppTranslation();
  const recipient = profile.fullName.trim() || t('certificateRecipientPlaceholder');

  useEffect(() => {
    if (!id) {
      setItem(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      const r = await getPublicCertificateById(id);
      if (cancelled) return;
      setLoading(false);
      if (!r.ok) {
        setLoadError(r.message);
        setItem(null);
        return;
      }
      setItem(apiCertificateToListItem(r.data as Record<string, unknown>));
    })();
    return () => {
      cancelled = true;
    };
  }, [id, fetchNonce]);

  const theme = item ? CERT_DETAIL_THEME[item.level] : CERT_DETAIL_THEME.advanced;

  const html = useMemo(() => {
    if (!item) return '';
    return buildCertificatePdfHtml(item, recipient);
  }, [item, recipient]);

  const runPdf = useCallback(async () => {
    if (!item || !html) return;
    setBusy('pdf');
    try {
      const { uri } = await Print.printToFileAsync({ html });
      const filename = certificatePdfFilename(item.certificateId);
      const outcome = await saveCertificatePdfToDevice(uri, filename, t('certificateSavePdfDialogTitle'));
      if (outcome === 'saved_downloads') {
        Alert.alert(t('alertPdfReadyTitle'), t('certificatePdfSavedDownloads'));
      } else if (Platform.OS === 'android') {
        Alert.alert(t('alertPdfReadyTitle'), t('certificatePdfShareFallback'));
      }
    } catch (e) {
      if (e instanceof Error && e.message === 'SHARE_UNAVAILABLE') {
        Alert.alert(t('alertPdfReadyTitle'), t('alertPdfShareUnavailable'));
      } else {
        Alert.alert(t('alertPdfErrorTitle'), t('alertPdfErrorMessage'));
      }
    } finally {
      setBusy(null);
    }
  }, [html, item, t]);

  const runShare = useCallback(async () => {
    if (!item || !html) return;
    setBusy('pdf');
    try {
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: t('a11yShareCertificate'),
        });
      } else {
        await Share.share({
          message: t('certificateShareMessage', { id: item.certificateId, recipient }),
        });
      }
    } catch {
      try {
        await Share.share({
          message: t('certificateShareMessage', { id: item.certificateId, recipient }),
        });
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(null);
    }
  }, [html, item, recipient, t]);

  const runPrint = useCallback(async () => {
    if (!item || !html) return;
    setBusy('print');
    try {
      await Print.printAsync({ html });
    } catch {
      Alert.alert(t('alertPrintTitle'), t('alertPrintFailed'));
    } finally {
      setBusy(null);
    }
  }, [html, item, t]);

  const openServerPdf = useCallback(async () => {
    if (!item?.pdfUrl) return;
    try {
      const ok = await Linking.canOpenURL(item.pdfUrl);
      if (ok) await Linking.openURL(item.pdfUrl);
      else Alert.alert(t('alertPdfErrorTitle'), t('alertPdfErrorMessage'));
    } catch {
      Alert.alert(t('alertPdfErrorTitle'), t('alertPdfErrorMessage'));
    }
  }, [item, t]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / pageW);
    setPage(Math.min(PAGES - 1, Math.max(0, next)));
  };

  if (loading) {
    return (
      <View style={styles.miss}>
        <ActivityIndicator size="large" color={Brand.green} />
        <Text style={[styles.missText, { marginTop: 16 }]}>{t('certificateLoading')}</Text>
      </View>
    );
  }

  if (loadError || !item) {
    return (
      <View style={styles.miss}>
        <Text style={styles.missText}>{loadError || t('certificateNotFound')}</Text>
        <Pressable onPress={() => setFetchNonce((n) => n + 1)} accessibilityRole="button">
          <Text style={styles.missLink}>{t('certRetry')}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={{ marginTop: 16 }}>
          <Text style={styles.missLink}>{t('btnGoBack')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + 8, paddingBottom: 16 }]}>
        <View style={[styles.headerRow, { paddingHorizontal: horizontal }]}>
          <Pressable
            style={styles.backCircle}
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('a11yGoBack')}>
            <Ionicons name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={1.12}>
            {t('certificateTitle')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={[
          styles.mainContent,
          { paddingHorizontal: horizontal, paddingBottom: 20 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          onMomentumScrollEnd={onScrollEnd}
          snapToInterval={pageW}
          snapToAlignment="start"
          contentContainerStyle={styles.pagerContent}>
          <View style={{ width: pageW }}>
            <FaceOfficial item={item} recipient={recipient} theme={theme} width={pageW} t={t} />
          </View>
          <View style={{ width: pageW }}>
            <FaceCompletion item={item} recipient={recipient} theme={theme} width={pageW} t={t} />
          </View>
          <View style={{ width: pageW }}>
            <FaceScore item={item} recipient={recipient} theme={theme} width={pageW} t={t} />
          </View>
        </ScrollView>

        <View style={styles.scrollHint}>
          <Ionicons name={I18nManager.isRTL ? 'chevron-forward' : 'chevron-back'} size={14} color="#9CA3AF" />
          <View style={styles.scrollTrack}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.scrollSeg,
                  page === i && styles.scrollSegOn,
                  page === i && { backgroundColor: theme.accent },
                ]}
              />
            ))}
          </View>
          <Ionicons name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'} size={14} color="#9CA3AF" />
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.btnPrimary,
              styles.btnPrimaryFull,
              pressed && !busy && { backgroundColor: primaryBtn.activeBg },
              busy && styles.btnDisabled,
            ]}
            onPress={() => void runPdf()}
            disabled={!!busy}
            accessibilityRole="button"
            accessibilityLabel={t('a11yDownloadPdf')}>
            {busy === 'pdf' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="arrow-down-circle-outline" size={24} color="#fff" />
                <Text style={styles.btnPrimaryText}>{t('a11yDownloadPdf')}</Text>
              </>
            )}
          </Pressable>
          {item.pdfUrl ? (
            <Pressable
              style={({ pressed }) => [
                styles.btnOutlineFull,
                pressed && styles.btnOutlineFullPressed,
              ]}
              onPress={() => void openServerPdf()}
              accessibilityRole="button"
              accessibilityLabel="Open official PDF">
              <Ionicons name="document-text-outline" size={22} color={Brand.green} />
              <Text style={styles.btnOutlineFullText}>Open official PDF</Text>
            </Pressable>
          ) : null}
          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [
                styles.btnSecondary,
                pressed && !busy && styles.btnSecondaryPressed,
                busy && styles.btnDisabled,
              ]}
              onPress={() => void runShare()}
              disabled={!!busy}
              accessibilityRole="button"
              accessibilityLabel={t('a11yShareCertificate')}>
              <Ionicons name="share-outline" size={22} color={Brand.green} />
              <Text style={styles.btnSecondaryText}>{t('certificateShare')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.btnSecondary,
                pressed && !busy && styles.btnSecondaryPressed,
                busy && styles.btnDisabled,
              ]}
              onPress={() => void runPrint()}
              disabled={!!busy}
              accessibilityRole="button"
              accessibilityLabel={t('a11yPrintCertificate')}>
              {busy === 'print' ? (
                <ActivityIndicator color={Brand.green} />
              ) : (
                <>
                  <Ionicons name="print-outline" size={22} color={Brand.green} />
                  <Text style={styles.btnSecondaryText}>{t('certificatePrint')}</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function FaceOfficial({
  item,
  recipient,
  theme,
  width,
  t,
}: {
  item: CertificateListItem;
  recipient: string;
  theme: (typeof CERT_DETAIL_THEME)['advanced'];
  width: number;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  return (
    <View style={[styles.cardOuter, { width, borderColor: theme.accent }]}>
      <View style={[styles.cardTopLine, { backgroundColor: theme.accent }]} />
      <View style={styles.cardInner}>
        <PatternBg color={theme.patternDot} />
        <View style={styles.f1Row}>
          <View style={styles.f1Left}>
            <View style={[styles.emblemSun, { borderColor: theme.accent }]}>
              <Ionicons name="sunny" size={26} color={theme.accent} />
            </View>
            <Text style={styles.f1Auth} maxFontSizeMultiplier={1.05}>
              {t('certificateAuthorityName')}
            </Text>
            <Text style={styles.f1Min} maxFontSizeMultiplier={1.05}>
              {t('certificateMinistryName')}
            </Text>
          </View>
          <View style={styles.f1Right}>
            <Text style={[styles.f1Cert, { color: Brand.green }]} maxFontSizeMultiplier={1.15}>
              {t('certificateTitle')}
            </Text>
            <Text style={[styles.f1Sub, { color: theme.accent }]} maxFontSizeMultiplier={1.05}>
              {t('certificateCompletionTitle')}
            </Text>
          </View>
        </View>
        <Text style={styles.f1Body} maxFontSizeMultiplier={1.08}>
          {t('certificateCertifiedPrefix')} <Text style={styles.f1Strong}>{recipient}</Text> {t('certificateCertifiedSuffix')}
        </Text>
        <View style={styles.f1Bottom}>
          <View style={styles.qrCol}>
            <View style={styles.qrBox}>
              {item.verifyQrDataUrl ? (
                <Image
                  source={{ uri: item.verifyQrDataUrl }}
                  style={styles.qrImage}
                  accessibilityLabel="Verification QR"
                />
              ) : (
                <MaterialCommunityIcons name="qrcode" size={56} color="#9CA3AF" />
              )}
            </View>
            <Text style={styles.f1Id} maxFontSizeMultiplier={1.05}>
              {t('certificateIdLabel', { id: item.certificateId })}
            </Text>
            <Text style={styles.f1Scan} maxFontSizeMultiplier={1.05}>
              {t('certificateScanToVerify')}
            </Text>
          </View>
          <View style={styles.f1Meta}>
            <Text style={styles.f1Date} maxFontSizeMultiplier={1.05}>
              {t('certificateDateOfIssue', { date: item.dateLabel })}
            </Text>
            <View style={[styles.validPill, { borderColor: theme.accent, backgroundColor: theme.accentMuted }]}>
              <Ionicons name="shield-outline" size={14} color={theme.pillText} />
              <Text style={[styles.validPillText, { color: theme.pillText }]} maxFontSizeMultiplier={1.05}>
                {t('certificateValidForTwoYears')}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={[styles.cardBotLine, { backgroundColor: theme.accent }]} />
    </View>
  );
}

function FaceCompletion({
  item,
  recipient,
  theme,
  width,
  t,
}: {
  item: CertificateListItem;
  recipient: string;
  theme: (typeof CERT_DETAIL_THEME)['advanced'];
  width: number;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  return (
    <View style={[styles.cardOuter, { width, borderColor: theme.accent }]}>
      <View style={[styles.cardTopLine, { backgroundColor: theme.accent }]} />
      <View style={styles.cardInner}>
        <PatternBg color={theme.patternDot} />
        <Text style={[styles.f2Title, { color: Brand.green }]} maxFontSizeMultiplier={1.12}>
          {t('certificateCompletionTitle')}
        </Text>
        <Text style={styles.f2Tri} maxFontSizeMultiplier={1.05}>
          {t('certificateTriLang')}
        </Text>
        <Text style={styles.f2Lead} maxFontSizeMultiplier={1.05}>
          {t('certificateCertifiedLead')}
        </Text>
        <Text style={styles.f2Name} maxFontSizeMultiplier={1.15}>
          {recipient}
        </Text>
        <Text style={styles.f2Body} maxFontSizeMultiplier={1.05}>
          {t('certificateCompletionBody')}
        </Text>
        <View style={[styles.f2Badge, { borderColor: theme.accent, backgroundColor: theme.accentMuted }]}>
          <Text style={[styles.f2BadgeText, { color: theme.pillText }]} maxFontSizeMultiplier={1.05}>
            {item.categoryBadge}
          </Text>
        </View>
        <Text style={styles.f2Date} maxFontSizeMultiplier={1.05}>
          {t('certificateDateOfIssue', { date: item.dateLabel })}
        </Text>
        <View style={[styles.f2Valid, { borderColor: theme.accent, backgroundColor: theme.accentMuted }]}>
          <Ionicons name="time-outline" size={18} color={theme.pillText} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.f2ValidTitle, { color: theme.pillText }]} maxFontSizeMultiplier={1.05}>
              {t('certificateValidForTwoYears')}
            </Text>
            <Text style={styles.f2Expire} maxFontSizeMultiplier={1.05}>
              {t('certificateExpires', { date: item.expiresLabel })}
            </Text>
          </View>
        </View>
      </View>
      <View style={[styles.cardBotLine, { backgroundColor: theme.accent }]} />
    </View>
  );
}

function FaceScore({
  item,
  recipient,
  theme,
  width,
  t,
}: {
  item: CertificateListItem;
  recipient: string;
  theme: (typeof CERT_DETAIL_THEME)['advanced'];
  width: number;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const lastName = recipient.trim().split(/\s+/).pop() ?? recipient;
  const levelLabel =
    item.level === 'advanced'
      ? t('certLevelAdvanced')
      : item.level === 'intermediate'
        ? t('certLevelIntermediate')
        : t('certLevelBasic');

  return (
    <View style={[styles.cardOuter, { width, borderColor: theme.accent }]}>
      <View style={[styles.cardTopLine, { backgroundColor: theme.accent }]} />
      <View style={styles.cardInner}>
        <PatternBg color={theme.patternDot} />
        <View style={styles.f3Top}>
          <View style={{ flex: 1 }} />
          <View style={styles.f3ScoreCol}>
            <Text style={styles.f3Label} maxFontSizeMultiplier={1.05}>
              {t('certificateScoreAchieved')}
            </Text>
            <Text style={[styles.f3Score, { color: theme.scoreColor }]} maxFontSizeMultiplier={1.2}>
              {item.scorePct}%
            </Text>
            <Text style={styles.f3Label} maxFontSizeMultiplier={1.05}>
              {t('certificateProficiencyLevel')}
            </Text>
            <View style={[styles.f3LevelPill, { borderColor: theme.accent, backgroundColor: theme.accentMuted }]}>
              <Text style={[styles.f3LevelText, { color: theme.scoreColor }]} maxFontSizeMultiplier={1.05}>
                {levelLabel}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.f3Name} maxFontSizeMultiplier={1.15}>
          {lastName}
        </Text>
        <View style={styles.f3Sigs}>
          <View style={styles.sig}>
            <Text style={styles.sigLabel} maxFontSizeMultiplier={1.05}>
              {t('certificateHeadOfExaminations')}
            </Text>
            <View style={[styles.sigLine, { backgroundColor: theme.accent }]} />
          </View>
          <View style={[styles.sealCircle, { backgroundColor: theme.accent }]}>
            <Ionicons name="star" size={22} color="#fff" />
          </View>
          <View style={styles.sig}>
            <Text style={styles.sigLabel} maxFontSizeMultiplier={1.05}>
              {t('certificateChiefRegistrar')}
            </Text>
            <View style={[styles.sigLine, { backgroundColor: theme.accent }]} />
          </View>
        </View>
      </View>
      <View style={[styles.cardBotLine, { backgroundColor: theme.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: HomeColors.pageBg,
  },
  header: {
    backgroundColor: Brand.green,
    borderBottomLeftRadius: HEADER_RADIUS,
    borderBottomRightRadius: HEADER_RADIUS,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: { width: 40 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  mainScroll: { flex: 1 },
  mainContent: { paddingTop: 16 },
  pagerContent: {},
  scrollHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 14,
    marginBottom: 18,
  },
  scrollTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 4,
    flex: 1,
    maxWidth: 120,
  },
  scrollSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  scrollSegOn: {
    flex: 1.4,
  },
  cardOuter: {
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  cardTopLine: { height: 3, width: '100%' },
  cardBotLine: { height: 3, width: '100%' },
  cardInner: {
    padding: 14,
    minHeight: 420,
    overflow: 'hidden',
  },
  f1Row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  f1Left: { flex: 1, maxWidth: '42%', alignItems: 'center' },
  emblemSun: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  f1Auth: { fontSize: 10, fontWeight: '700', color: FormColors.title, textAlign: 'center' },
  f1Min: { fontSize: 9, fontWeight: '600', color: FormColors.label, textAlign: 'center', marginTop: 2 },
  f1Right: { flex: 1, alignItems: 'flex-end' },
  f1Cert: { fontSize: 22, fontWeight: '800' },
  f1Sub: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  f1Body: {
    fontSize: 13,
    lineHeight: 20,
    color: FormColors.title,
    textAlign: 'center',
    marginVertical: 10,
  },
  f1Strong: { fontWeight: '800' },
  f1Bottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 8 },
  qrCol: { alignItems: 'center', flex: 1 },
  qrBox: {
    width: 88,
    height: 88,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    backgroundColor: '#FAFAFA',
  },
  qrImage: { width: 80, height: 80 },
  f1Id: { fontSize: 9, fontWeight: '600', color: FormColors.subtitle, textAlign: 'center' },
  f1Scan: { fontSize: 9, color: FormColors.label, marginTop: 2 },
  f1Meta: { flex: 1, alignItems: 'flex-end', justifyContent: 'flex-end' },
  f1Date: { fontSize: 11, fontWeight: '600', color: FormColors.title, textAlign: 'right' },
  validPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 8,
  },
  validPillText: { fontSize: 11, fontWeight: '700' },
  f2Title: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  f2Tri: { fontSize: 11, color: FormColors.label, textAlign: 'center', marginVertical: 10 },
  f2Lead: { fontSize: 12, color: FormColors.subtitle, textAlign: 'center' },
  f2Name: {
    fontSize: 20,
    fontWeight: '700',
    color: HomeColors.decreeTitle,
    textAlign: 'center',
    marginVertical: 8,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  f2Body: { fontSize: 12, lineHeight: 18, color: FormColors.title, textAlign: 'center' },
  f2Badge: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 14,
  },
  f2BadgeText: { fontSize: 12, fontWeight: '700' },
  f2Date: { fontSize: 12, fontWeight: '600', color: FormColors.label, textAlign: 'center', marginTop: 16 },
  f2Valid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  f2ValidTitle: { fontSize: 13, fontWeight: '700' },
  f2Expire: { fontSize: 11, color: FormColors.label, marginTop: 4 },
  f3Top: { flexDirection: 'row', marginBottom: 8 },
  f3ScoreCol: { alignItems: 'flex-end' },
  f3Label: { fontSize: 10, color: FormColors.label, textAlign: 'right' },
  f3Score: { fontSize: 36, fontWeight: '800', marginVertical: 4 },
  f3LevelPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 4,
  },
  f3LevelText: { fontSize: 13, fontWeight: '800' },
  f3Name: {
    fontSize: 22,
    fontWeight: '700',
    color: HomeColors.decreeTitle,
    textAlign: 'center',
    marginVertical: 16,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  f3Sigs: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingHorizontal: 4,
  },
  sig: { flex: 1, alignItems: 'center' },
  sigLabel: { fontSize: 9, color: FormColors.label, marginBottom: 6 },
  sigLine: { height: 2, width: '80%', borderRadius: 1, opacity: 0.6 },
  sealCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    marginBottom: 4,
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Brand.green,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    minHeight: 56,
    ...shadowPrimary(),
  },
  btnPrimaryFull: {
    alignSelf: 'stretch',
    width: '100%',
  },
  btnOutlineFull: {
    alignSelf: 'stretch',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Brand.green,
    backgroundColor: '#fff',
    minHeight: 52,
  },
  btnOutlineFullPressed: {
    backgroundColor: palette.primaryAlpha.a08,
  },
  btnOutlineFullText: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.green,
  },
  btnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  btnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: '#D1D5DB',
    minHeight: 54,
  },
  btnSecondaryPressed: {
    backgroundColor: '#F9FAFB',
    borderColor: '#C4C9D1',
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.green,
    letterSpacing: 0.15,
  },
  btnDisabled: { opacity: 0.55 },
  miss: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: HomeColors.pageBg,
  },
  missText: { fontSize: 16, color: FormColors.label, marginBottom: 12 },
  missLink: { fontSize: 16, fontWeight: '700', color: Brand.green },
});
