import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  I18nManager,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { FormColors } from '@/constants/form';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { verifyCertificateByRef } from '@/lib/api/certificates-public';

type VerifyState =
  | { kind: 'idle' }
  | { kind: 'active'; data: VerifyData }
  | { kind: 'revoked'; data: VerifyData }
  | { kind: 'not_found' }
  | { kind: 'error'; message: string };

type VerifyData = {
  certificateNumber?: string;
  kindLabel?: string;
  rawKind?: string;
  status?: 'issued' | 'revoked';
  issuedAt?: string;
  revokedAt?: string;
  revokeReason?: string;
  holderDisplayName?: string;
  expiresLabel?: string;
  scorePct?: number | null;
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function kindLabelFromKey(key: string | undefined, t: (k: string) => string): string {
  switch (key) {
    case 'exam_pass':
      return t('certsKindExamPass');
    case 'decree_literacy':
      return t('certsKindDecreeLiteracy');
    case 'inspection_qualification':
      return t('certsKindInspectionQualification');
    case 'other':
      return t('certsKindOther');
    default:
      return '—';
  }
}

function pickExpiryFromMeta(meta: Record<string, unknown> | undefined): string {
  if (!meta) return '';
  if (typeof meta.validToYmd === 'string' && meta.validToYmd) return meta.validToYmd;
  if (typeof meta.validTo === 'string' && meta.validTo) return meta.validTo.slice(0, 10);
  return '';
}

function pickScoreFromMeta(meta: Record<string, unknown> | undefined): number | null {
  if (!meta) return null;
  const v = (meta.score ?? meta.scorePct ?? meta.passPct) as number | undefined;
  return typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null;
}

export default function VerifyCertificateScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useAppTranslation();
  const [ref, setRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<VerifyState>({ kind: 'idle' });

  const onSubmit = useCallback(async () => {
    const r = ref.trim();
    if (!r) return;
    setLoading(true);
    setState({ kind: 'idle' });

    const res = await verifyCertificateByRef(r);
    setLoading(false);
    if (!res.ok) {
      setState({ kind: 'error', message: res.message });
      return;
    }
    const root = res.data as { valid?: boolean; certificateData?: Record<string, unknown> };
    if (root.valid !== true || !root.certificateData) {
      setState({ kind: 'not_found' });
      return;
    }
    const c = root.certificateData;
    const meta = c.metadata && typeof c.metadata === 'object' ? (c.metadata as Record<string, unknown>) : undefined;
    const data: VerifyData = {
      certificateNumber: typeof c.certificateNumber === 'string' ? c.certificateNumber : undefined,
      rawKind: typeof c.kind === 'string' ? c.kind : undefined,
      kindLabel: kindLabelFromKey(typeof c.kind === 'string' ? c.kind : undefined, t),
      status: c.status === 'revoked' ? 'revoked' : 'issued',
      issuedAt: typeof c.issuedAt === 'string' ? c.issuedAt : undefined,
      revokedAt: typeof c.revokedAt === 'string' ? c.revokedAt : undefined,
      revokeReason: typeof c.revokeReason === 'string' ? c.revokeReason : undefined,
      holderDisplayName:
        typeof c.holderDisplayName === 'string' && c.holderDisplayName ? c.holderDisplayName : undefined,
      expiresLabel: pickExpiryFromMeta(meta),
      scorePct: pickScoreFromMeta(meta),
    };

    if (data.status === 'revoked') {
      setState({ kind: 'revoked', data });
    } else {
      setState({ kind: 'active', data });
    }
  }, [ref, t]);

  const onClear = useCallback(() => {
    setRef('');
    setState({ kind: 'idle' });
  }, []);

  return (
    <View style={[styles.shell, { paddingTop: insets.top + 12 }]}>
      <StatusBar style="dark" />
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <Ionicons name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={FormColors.title} />
        </Pressable>
        <Text style={styles.title} maxFontSizeMultiplier={1.2}>
          {t('verifyTitle')}
        </Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.label} maxFontSizeMultiplier={1.2}>
          {t('verifyHelpText')}
        </Text>
        <TextInput
          value={ref}
          onChangeText={setRef}
          placeholder={t('verifyPlaceholder')}
          placeholderTextColor={FormColors.placeholder}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => void onSubmit()}
        />
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            (loading || !ref.trim()) && styles.btnDisabled,
            pressed && !loading && styles.btnPressed,
          ]}
          onPress={() => void onSubmit()}
          disabled={loading || !ref.trim()}
          accessibilityRole="button"
          accessibilityLabel={t('verifyButton')}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.btnTxt} maxFontSizeMultiplier={1.15}>
              {t('verifyButton').toUpperCase()}
            </Text>
          )}
        </Pressable>

        {state.kind === 'error' ? (
          <View style={[styles.banner, styles.bannerError]}>
            <Ionicons name="warning" size={18} color="#B91C1C" />
            <Text style={[styles.bannerText, { color: '#B91C1C' }]} maxFontSizeMultiplier={1.15}>
              {state.message}
            </Text>
          </View>
        ) : null}

        {state.kind === 'not_found' ? (
          <ResultCard
            tone="muted"
            iconName="help-circle"
            iconColor="#6B7280"
            title={t('verifyStatusNotFound')}
            subtitle={t('verifyStatusNotFoundSub')}
            verifyAnotherLabel={t('verifyAnotherButton')}
            onVerifyAnother={onClear}
            t={t}
          />
        ) : null}

        {state.kind === 'active' ? (
          <ResultCard
            tone="success"
            iconName="shield-checkmark"
            iconColor="#166534"
            title={t('verifyStatusActive')}
            subtitle={t('verifyStatusActiveSub')}
            data={state.data}
            verifyAnotherLabel={t('verifyAnotherButton')}
            onVerifyAnother={onClear}
            t={t}
          />
        ) : null}

        {state.kind === 'revoked' ? (
          <ResultCard
            tone="danger"
            iconName="close-circle"
            iconColor="#B91C1C"
            title={t('verifyStatusRevoked')}
            subtitle={t('verifyStatusRevokedSub')}
            data={state.data}
            verifyAnotherLabel={t('verifyAnotherButton')}
            onVerifyAnother={onClear}
            t={t}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function ResultCard({
  tone,
  iconName,
  iconColor,
  title,
  subtitle,
  data,
  verifyAnotherLabel,
  onVerifyAnother,
  t,
}: {
  tone: 'success' | 'danger' | 'muted';
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  title: string;
  subtitle: string;
  data?: VerifyData;
  verifyAnotherLabel: string;
  onVerifyAnother: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const toneStyles =
    tone === 'success'
      ? { bg: '#F0FDF4', border: '#BBF7D0' }
      : tone === 'danger'
        ? { bg: '#FEF2F2', border: '#FECACA' }
        : { bg: '#F9FAFB', border: '#E5E7EB' };

  const titleColor = tone === 'success' ? '#14532D' : tone === 'danger' ? '#7F1D1D' : '#374151';

  return (
    <View
      style={[
        styles.resultCard,
        { backgroundColor: toneStyles.bg, borderColor: toneStyles.border },
      ]}>
      <View style={styles.resultHeader}>
        <View style={[styles.resultIcon, { borderColor: iconColor }]}>
          <Ionicons name={iconName} size={28} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.resultTitle, { color: titleColor }]} maxFontSizeMultiplier={1.2}>
            {title}
          </Text>
          <Text style={styles.resultSub} maxFontSizeMultiplier={1.2}>
            {subtitle}
          </Text>
        </View>
      </View>

      {data ? (
        <View style={styles.resultBody}>
          {data.certificateNumber ? (
            <ResultRow label={t('certsDetailCertId')} value={data.certificateNumber} mono />
          ) : null}
          {data.holderDisplayName ? (
            <ResultRow label={t('verifyHolderLabel')} value={data.holderDisplayName} emphasis />
          ) : null}
          {data.kindLabel && data.kindLabel !== '—' ? (
            <ResultRow label={t('verifyKindLabel')} value={data.kindLabel} />
          ) : null}
          <ResultRow label={t('verifyIssuedLabel')} value={formatDate(data.issuedAt)} />
          {data.expiresLabel ? (
            <ResultRow label={t('verifyExpiresLabel')} value={data.expiresLabel} />
          ) : null}
          {typeof data.scorePct === 'number' ? (
            <ResultRow label={t('verifyScoreLabel')} value={`${data.scorePct}%`} green />
          ) : null}
          {data.revokedAt ? (
            <ResultRow label={t('verifyRevokedAtLabel')} value={formatDate(data.revokedAt)} />
          ) : null}
          {data.revokeReason ? (
            <ResultRow label={t('verifyReasonLabel')} value={data.revokeReason} multiline />
          ) : null}
        </View>
      ) : null}

      <Pressable
        onPress={onVerifyAnother}
        style={({ pressed }) => [styles.againBtn, pressed && styles.againBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel={verifyAnotherLabel}>
        <Ionicons name="refresh" size={16} color={Brand.green} />
        <Text style={styles.againBtnText} maxFontSizeMultiplier={1.15}>
          {verifyAnotherLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function ResultRow({
  label,
  value,
  emphasis,
  green,
  mono,
  multiline,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  green?: boolean;
  mono?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultRowLabel} maxFontSizeMultiplier={1.2}>
        {label.toUpperCase()}
      </Text>
      <Text
        style={[
          styles.resultRowValue,
          emphasis && styles.resultRowValueEmphasis,
          green && styles.resultRowValueGreen,
          mono && styles.resultRowValueMono,
        ]}
        numberOfLines={multiline ? 6 : 2}
        maxFontSizeMultiplier={1.15}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#F9FAFB' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: '700', color: FormColors.title },
  label: { fontSize: 14, color: FormColors.label, marginBottom: 10, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: FormColors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
    color: FormColors.title,
  },
  btn: {
    backgroundColor: Brand.green,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.92,
  },
  btnDisabled: { opacity: 0.55 },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 1 },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  bannerText: { fontSize: 13, fontWeight: '600', flex: 1 },

  resultCard: {
    marginTop: 24,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 4,
  },
  resultIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 0.2 },
  resultSub: { fontSize: 13, fontWeight: '500', color: FormColors.subtitle, marginTop: 4, lineHeight: 18 },

  resultBody: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    gap: 10,
  },
  resultRow: {
    flexDirection: 'column',
    gap: 2,
  },
  resultRowLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: FormColors.label,
  },
  resultRowValue: {
    fontSize: 15,
    fontWeight: '600',
    color: FormColors.title,
  },
  resultRowValueEmphasis: {
    fontSize: 16,
    fontWeight: '800',
  },
  resultRowValueGreen: {
    color: Brand.green,
    fontWeight: '800',
  },
  resultRowValueMono: {
    fontFamily: 'monospace',
    letterSpacing: 0.4,
  },

  againBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Brand.green,
    backgroundColor: '#fff',
  },
  againBtnPressed: {
    backgroundColor: '#F0FDF4',
  },
  againBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: Brand.green,
    letterSpacing: 0.3,
  },
});
