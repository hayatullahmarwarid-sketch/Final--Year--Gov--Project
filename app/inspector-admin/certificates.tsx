import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppPressable } from '@/components/ui/AppPressable';
import { CollapsibleFilters } from '@/components/ui/CollapsibleFilters';
import type { Certificate, CertificateKindKey } from '@/data/inspector-admin-store';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { useInspectorAdminWorkspace } from '@/hooks/use-inspector-admin-workspace';
import { showToast } from '@/lib/adapters/toast';
import {
  Brand,
  FormColors,
  palette,
  radius,
  shadowCard,
  spacing,
  touchTarget,
  typography,
} from '@/lib/theme';

const STATUS_PALETTE: Record<Certificate['status'], { bg: string; fg: string; border: string }> = {
  active: { bg: '#DCFCE7', fg: '#166534', border: '#BBF7D0' },
  revoked: { bg: '#FEE2E2', fg: '#991B1B', border: '#FECACA' },
};

type StatusFilter = 'all' | 'active' | 'revoked';

const STATUS_FILTER_OPTIONS: { key: StatusFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'certsFilterStatusAll' },
  { key: 'active', labelKey: 'certsFilterStatusActive' },
  { key: 'revoked', labelKey: 'certsFilterStatusRevoked' },
];

function statusFilterToApi(s: StatusFilter): 'issued' | 'revoked' | undefined {
  if (s === 'active') return 'issued';
  if (s === 'revoked') return 'revoked';
  return undefined;
}

export default function InspectorAdminCertificatesScreen() {
  const { t, number } = useAppTranslation();
  const { certificates, usesLiveApi, actions, loading: workspaceLoading } = useInspectorAdminWorkspace();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [holderText, setHolderText] = useState('');
  const [search, setSearch] = useState('');

  const [refetching, setRefetching] = useState(false);
  const [refetchError, setRefetchError] = useState<string | null>(null);
  const [refetchTotal, setRefetchTotal] = useState<number | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [detail, setDetail] = useState<Certificate | null>(null);
  const [revoking, setRevoking] = useState<Certificate | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeSubmitting, setRevokeSubmitting] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!usesLiveApi) return;
    setRefetching(true);
    setRefetchError(null);
    const r = await actions.loadCertificatesPage({
      status: statusFilterToApi(statusFilter),
      holderName: holderText.trim() ? holderText.trim() : undefined,
      search: search.trim() ? search.trim() : undefined,
      page: 1,
      limit: 100,
    });
    setRefetching(false);
    if (!r.ok) {
      setRefetchError(r.message);
      setRefetchTotal(null);
      return;
    }
    setRefetchTotal(r.total);
  }, [actions, holderText, search, statusFilter, usesLiveApi]);

  useEffect(() => {
    if (!usesLiveApi) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void refetch();
    }, 250);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [refetch, usesLiveApi]);

  const rows = useMemo(() => {
    let list = [...certificates];

    if (!usesLiveApi) {
      // Mock-mode (no API): apply filters locally so the UI is honest about its state.
      if (statusFilter !== 'all') {
        list = list.filter((c) => c.status === statusFilter);
      }
      if (holderText.trim()) {
        const q = holderText.trim().toLowerCase();
        list = list.filter(
          (c) =>
            c.recipientName.toLowerCase().includes(q) ||
            (c.holderEmail ?? '').toLowerCase().includes(q),
        );
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        list = list.filter(
          (c) =>
            c.id.toLowerCase().includes(q) ||
            (c.certificateNumber ?? '').toLowerCase().includes(q) ||
            c.recipientName.toLowerCase().includes(q) ||
            c.category.toLowerCase().includes(q),
        );
      }
    }

    return list.sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  }, [certificates, holderText, search, statusFilter, usesLiveApi]);

  const totalShown = refetchTotal ?? rows.length;

  const openDetail = useCallback((cert: Certificate) => setDetail(cert), []);
  const closeDetail = useCallback(() => setDetail(null), []);

  const openRevoke = useCallback((cert: Certificate) => {
    setRevoking(cert);
    setRevokeReason('');
    setRevokeError(null);
    setRevokeSubmitting(false);
  }, []);

  const closeRevoke = useCallback(() => {
    setRevoking(null);
    setRevokeReason('');
    setRevokeError(null);
    setRevokeSubmitting(false);
  }, []);

  const onConfirmRevoke = useCallback(async () => {
    if (!revoking || revokeSubmitting) return;
    const reason = revokeReason.trim();
    if (!reason) {
      setRevokeError(t('certsRevokeReasonRequired'));
      return;
    }
    setRevokeError(null);
    setRevokeSubmitting(true);
    if (usesLiveApi) {
      const r = await actions.revokeCertificate(revoking.id, reason);
      setRevokeSubmitting(false);
      if (!r.ok) {
        showToast(r.message, 'error');
        return;
      }
      // Refresh the filtered list so the row flips to "revoked".
      void refetch();
    } else {
      const { inspectorAdminActions } = await import('@/data/inspector-admin-store');
      inspectorAdminActions.revokeCertificate(revoking.id);
      setRevokeSubmitting(false);
    }
    showToast(t('certsRevokedToast'), 'success');
    closeRevoke();
  }, [actions, refetch, revokeReason, revokeSubmitting, revoking, t, usesLiveApi, closeRevoke]);

  const resetFilters = useCallback(() => {
    setStatusFilter('all');
    setHolderText('');
    setSearch('');
  }, []);

  const filtersDirty =
    statusFilter !== 'all' || holderText.trim().length > 0 || search.trim().length > 0;

  const certsActiveFilterCount = useMemo(() => {
    let n = 0;
    if (statusFilter !== 'all') n += 1;
    if (holderText.trim()) n += 1;
    if (search.trim()) n += 1;
    return n;
  }, [holderText, search, statusFilter]);

  const colWidths = {
    id: 130,
    recipient: 160,
    kind: 130,
    category: 130,
    validity: 170,
    score: 70,
    status: 100,
    actions: 100,
  };
  const tableMinWidth =
    colWidths.id +
    colWidths.recipient +
    colWidths.kind +
    colWidths.category +
    colWidths.validity +
    colWidths.score +
    colWidths.status +
    colWidths.actions;

  const kindLabel = (kind?: CertificateKindKey | null) => {
    switch (kind) {
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
  };

  return (
    <View style={styles.root}>
      <View style={styles.headerBlock}>
        <Text style={styles.heading} maxFontSizeMultiplier={1.2}>
          {t('certsHeading').toUpperCase()}
        </Text>
        <Text style={styles.subheading} maxFontSizeMultiplier={1.2}>
          {t('certsSubtitle')}
        </Text>
      </View>

      <CollapsibleFilters
        style={styles.filtersPanel}
        summary={t('certsTotalLabel', { count: number(totalShown) })}
        activeCount={certsActiveFilterCount}
        onReset={resetFilters}
        resetDisabled={!filtersDirty}>
        <View style={styles.searchRowPanel}>
          <View style={[styles.searchBox, styles.searchBoxFlex]}>
            <Ionicons name="search-outline" size={16} color={palette.neutral400} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('certsSearch')}
              placeholderTextColor={palette.neutral400}
              style={styles.searchInput}
              maxFontSizeMultiplier={1.15}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 ? (
              <AppPressable
                onPress={() => setSearch('')}
                style={styles.clearBtn}
                accessibilityRole="button"
                accessibilityLabel={t('a11yClearSearch')}>
                <Ionicons name="close-circle" size={16} color={palette.neutral400} />
              </AppPressable>
            ) : null}
          </View>
        </View>

        <View style={styles.searchRowPanel}>
          <View style={[styles.searchBox, styles.searchBoxFlex]}>
            <Ionicons name="person-outline" size={16} color={palette.neutral400} />
            <TextInput
              value={holderText}
              onChangeText={setHolderText}
              placeholder={t('certsFilterHolderPlaceholder')}
              placeholderTextColor={palette.neutral400}
              style={styles.searchInput}
              maxFontSizeMultiplier={1.15}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {holderText.length > 0 ? (
              <AppPressable
                onPress={() => setHolderText('')}
                style={styles.clearBtn}
                accessibilityRole="button"
                accessibilityLabel={t('a11yClearSearch')}>
                <Ionicons name="close-circle" size={16} color={palette.neutral400} />
              </AppPressable>
            ) : null}
          </View>
        </View>

        <View style={styles.chipsBlockPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {STATUS_FILTER_OPTIONS.map((opt) => {
              const selected = statusFilter === opt.key;
              return (
                <AppPressable
                  key={`status-${opt.key}`}
                  onPress={() => setStatusFilter(opt.key)}
                  style={[styles.filterChip, selected && styles.filterChipSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}>
                  <Text
                    style={[styles.filterChipText, selected && styles.filterChipTextSelected]}
                    maxFontSizeMultiplier={1.15}
                    numberOfLines={1}>
                    {t(opt.labelKey)}
                  </Text>
                </AppPressable>
              );
            })}
          </ScrollView>
        </View>
      </CollapsibleFilters>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryText} maxFontSizeMultiplier={1.15} numberOfLines={1}>
          {t('certsTotalLabel', { count: number(totalShown) })}
        </Text>
      </View>

      {refetchError ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color="#B91C1C" />
          <Text style={styles.errorBannerText} maxFontSizeMultiplier={1.15} numberOfLines={2}>
            {refetchError}
          </Text>
        </View>
      ) : null}

      <View style={[styles.tableWrap, shadowCard()]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={{ minWidth: tableMinWidth }}>
          <View>
            <View style={styles.headerRow}>
              <Text style={[styles.headerCell, { width: colWidths.id }]} maxFontSizeMultiplier={1.2}>
                {t('certsColId').toUpperCase()}
              </Text>
              <Text
                style={[styles.headerCell, { width: colWidths.recipient }]}
                maxFontSizeMultiplier={1.2}>
                {t('certsColRecipient').toUpperCase()}
              </Text>
              <Text
                style={[styles.headerCell, { width: colWidths.kind }]}
                maxFontSizeMultiplier={1.2}>
                {t('certsDetailKind').toUpperCase()}
              </Text>
              <Text
                style={[styles.headerCell, { width: colWidths.category }]}
                maxFontSizeMultiplier={1.2}>
                {t('certsColCategory').toUpperCase()}
              </Text>
              <Text
                style={[styles.headerCell, { width: colWidths.validity }]}
                maxFontSizeMultiplier={1.2}>
                {t('certsColValidity').toUpperCase()}
              </Text>
              <Text style={[styles.headerCell, { width: colWidths.score }]} maxFontSizeMultiplier={1.2}>
                {t('certsDetailScore').toUpperCase()}
              </Text>
              <Text style={[styles.headerCell, { width: colWidths.status }]} maxFontSizeMultiplier={1.2}>
                {t('certsColStatus').toUpperCase()}
              </Text>
              <Text
                style={[styles.headerCell, { width: colWidths.actions }]}
                maxFontSizeMultiplier={1.2}>
                {t('certsColActions').toUpperCase()}
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {(workspaceLoading || refetching) && rows.length === 0 ? (
                <View style={[styles.emptyBlock, { minWidth: tableMinWidth }]}>
                  <ActivityIndicator color={Brand.green} />
                </View>
              ) : rows.length === 0 ? (
                <View style={[styles.emptyBlock, { minWidth: tableMinWidth }]}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="ribbon-outline" size={22} color={palette.neutral400} />
                  </View>
                  <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.2}>
                    {filtersDirty ? t('certsEmptyFiltered') : t('certsEmptyTitle')}
                  </Text>
                  <Text style={styles.emptySub} maxFontSizeMultiplier={1.2}>
                    {t('certsEmptySub')}
                  </Text>
                </View>
              ) : (
                rows.map((item, idx) => {
                  const pal = STATUS_PALETTE[item.status];
                  return (
                    <View
                      key={item.id}
                      style={[styles.row, idx === rows.length - 1 && styles.rowLast]}>
                      <View style={[styles.cell, { width: colWidths.id }]}>
                        <Text
                          style={styles.idText}
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.15}>
                          {item.certificateNumber || item.id}
                        </Text>
                      </View>
                      <View style={[styles.cell, { width: colWidths.recipient }]}>
                        <Text
                          style={styles.recipientText}
                          numberOfLines={2}
                          maxFontSizeMultiplier={1.15}>
                          {item.recipientName || '—'}
                        </Text>
                        {item.holderEmail ? (
                          <Text
                            style={styles.recipientSub}
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.15}>
                            {item.holderEmail}
                          </Text>
                        ) : null}
                      </View>
                      <View style={[styles.cell, { width: colWidths.kind }]}>
                        <Text
                          style={styles.bodyText}
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.15}>
                          {kindLabel(item.kind)}
                        </Text>
                      </View>
                      <View style={[styles.cell, { width: colWidths.category }]}>
                        <Text
                          style={styles.bodyText}
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.15}>
                          {item.category || '—'}
                        </Text>
                      </View>
                      <View style={[styles.cell, { width: colWidths.validity }]}>
                        <Text
                          style={styles.validityText}
                          numberOfLines={2}
                          maxFontSizeMultiplier={1.15}>
                          {item.issueDate || '—'} → {item.expiryDate || '—'}
                        </Text>
                      </View>
                      <View style={[styles.cell, { width: colWidths.score }]}>
                        <Text
                          style={styles.scoreText}
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.15}>
                          {typeof item.score === 'number' && Number.isFinite(item.score)
                            ? `${number(Math.round(item.score))}%`
                            : '—'}
                        </Text>
                      </View>
                      <View style={[styles.cell, { width: colWidths.status }]}>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: pal.bg, borderColor: pal.border },
                          ]}>
                          <Text
                            style={[styles.statusText, { color: pal.fg }]}
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.15}>
                            {item.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.cell, { width: colWidths.actions }]}>
                        <View style={styles.actionsRow}>
                          <AppPressable
                            onPress={() => openDetail(item)}
                            style={styles.iconBtn}
                            accessibilityRole="button"
                            accessibilityLabel={t('certsView')}>
                            <Ionicons name="eye-outline" size={18} color={Brand.green} />
                          </AppPressable>
                          {item.status === 'active' ? (
                            <AppPressable
                              onPress={() => openRevoke(item)}
                              style={styles.iconBtn}
                              accessibilityRole="button"
                              accessibilityLabel={t('certsRevoke')}>
                              <Ionicons name="shield-outline" size={18} color="#DC2626" />
                            </AppPressable>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      {/* Detail modal */}
      <Modal visible={!!detail} animationType="slide" transparent statusBarTranslucent onRequestClose={closeDetail}>
        <View style={styles.backdrop}>
          <AppPressable
            style={StyleSheet.absoluteFill}
            onPress={closeDetail}
            accessibilityLabel={t('a11yClose')}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                {t('certsDetailTitle')}
              </Text>
              <AppPressable
                onPress={closeDetail}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel={t('a11yClose')}>
                <Ionicons name="close" size={20} color={FormColors.subtitle} />
              </AppPressable>
            </View>
            {detail ? (
              <ScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
                <DetailRow
                  label={t('certsDetailCertId')}
                  value={detail.certificateNumber || detail.id}
                />
                <DetailRow
                  label={t('certsDetailRecipient')}
                  value={detail.recipientName || '—'}
                  emphasis
                />
                {detail.holderEmail ? (
                  <DetailRow label="Email" value={detail.holderEmail} />
                ) : null}
                <DetailRow label={t('certsDetailKind')} value={kindLabel(detail.kind)} />
                <DetailRow label={t('certsDetailCategory')} value={detail.category || '—'} />
                <DetailRow label={t('certsDetailIssued')} value={detail.issueDate || '—'} />
                <DetailRow label={t('certsDetailExpires')} value={detail.expiryDate || '—'} />
                <DetailRow
                  label={t('certsDetailScore')}
                  value={
                    typeof detail.score === 'number' && Number.isFinite(detail.score)
                      ? `${number(Math.round(detail.score))}%`
                      : '—'
                  }
                  green
                />
                {detail.status === 'revoked' && detail.revokeReason ? (
                  <DetailRow label={t('certsDetailRevokeReason')} value={detail.revokeReason} />
                ) : null}
                {detail.status === 'revoked' && detail.revokedAt ? (
                  <DetailRow
                    label={t('certsDetailRevokedAt')}
                    value={new Date(detail.revokedAt).toLocaleString()}
                  />
                ) : null}
                <View
                  style={[
                    styles.statusBadge,
                    {
                      alignSelf: 'flex-start',
                      marginTop: spacing.sm,
                      backgroundColor: STATUS_PALETTE[detail.status].bg,
                      borderColor: STATUS_PALETTE[detail.status].border,
                    },
                  ]}>
                  <Text
                    style={[styles.statusText, { color: STATUS_PALETTE[detail.status].fg }]}>
                    {detail.status.toUpperCase()}
                  </Text>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Revoke modal */}
      <Modal
        visible={!!revoking}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={closeRevoke}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.backdrop}>
          <AppPressable
            style={StyleSheet.absoluteFill}
            onPress={closeRevoke}
            accessibilityLabel={t('a11yClose')}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                {t('certsRevokeTitle')}
              </Text>
              <AppPressable
                onPress={closeRevoke}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel={t('a11yClose')}>
                <Ionicons name="close" size={20} color={FormColors.subtitle} />
              </AppPressable>
            </View>
            {revoking ? (
              <ScrollView
                contentContainerStyle={styles.sheetBody}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled">
                <View style={styles.warningBox}>
                  <Ionicons name="shield-outline" size={18} color="#DC2626" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.warningTitle} maxFontSizeMultiplier={1.15}>
                      {t('certsRevokeSecurity').toUpperCase()}
                    </Text>
                    <Text style={styles.warningSub} maxFontSizeMultiplier={1.15}>
                      {t('certsRevokeUndo').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.revokeTitle} maxFontSizeMultiplier={1.15}>
                  {t('certsRevokeBody', { id: revoking.certificateNumber || revoking.id })}
                </Text>
                <Text style={styles.revokeSub} maxFontSizeMultiplier={1.15}>
                  {t('certsRevokeIssued', {
                    recipient: revoking.recipientName,
                    category: revoking.category || kindLabel(revoking.kind),
                  })}
                </Text>

                <Text style={[styles.label, { marginTop: spacing.md }]} maxFontSizeMultiplier={1.2}>
                  {t('certsRevokeReason').toUpperCase()}
                </Text>
                <TextInput
                  value={revokeReason}
                  onChangeText={setRevokeReason}
                  multiline
                  numberOfLines={4}
                  style={[styles.reasonInput, styles.reasonTextarea]}
                  placeholder={t('certsRevokeReasonPlaceholder')}
                  placeholderTextColor={palette.neutral400}
                  maxFontSizeMultiplier={1.15}
                />

                {revokeError ? (
                  <Text style={styles.errorText} maxFontSizeMultiplier={1.15}>
                    {revokeError}
                  </Text>
                ) : null}
              </ScrollView>
            ) : null}
            <View style={styles.footer}>
              <AppPressable
                onPress={closeRevoke}
                style={styles.cancelBtn}
                accessibilityRole="button"
                accessibilityLabel={t('certsRevokeCancel')}>
                <Text style={styles.cancelBtnTxt} maxFontSizeMultiplier={1.15}>
                  {t('certsRevokeCancel').toUpperCase()}
                </Text>
              </AppPressable>
              <AppPressable
                onPress={() => void onConfirmRevoke()}
                disabled={revokeSubmitting}
                style={[styles.revokeBtn, revokeSubmitting && styles.revokeBtnDisabled]}
                accessibilityRole="button"
                accessibilityState={{ disabled: revokeSubmitting }}>
                {revokeSubmitting ? (
                  <ActivityIndicator color={palette.white} />
                ) : (
                  <Text style={styles.revokeBtnText} maxFontSizeMultiplier={1.15}>
                    {t('certsRevokeConfirm').toUpperCase()}
                  </Text>
                )}
              </AppPressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function DetailRow({
  label,
  value,
  emphasis,
  green,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  green?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel} maxFontSizeMultiplier={1.2}>
        {label.toUpperCase()}
      </Text>
      <Text
        style={[
          styles.detailValue,
          emphasis && styles.detailValueEmphasis,
          green && styles.detailValueGreen,
        ]}
        numberOfLines={4}
        maxFontSizeMultiplier={1.15}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: FormColors.pageMuted,
  },
  headerBlock: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  heading: {
    ...typography.title,
    color: FormColors.title,
    letterSpacing: 0.4,
  },
  subheading: {
    marginTop: spacing.xxs,
    fontSize: 12,
    fontWeight: '600',
    color: FormColors.subtitle,
  },

  filtersPanel: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  searchRowPanel: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  searchBoxFlex: {
    flex: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    backgroundColor: palette.white,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    height: touchTarget.min,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: FormColors.title,
    paddingVertical: 0,
  },
  clearBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chipsBlock: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  chipsBlockPanel: {
    marginBottom: spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    backgroundColor: palette.white,
  },
  filterChipSelected: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: FormColors.subtitle,
    letterSpacing: 0.3,
  },
  filterChipTextSelected: {
    color: palette.white,
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: FormColors.subtitle,
    letterSpacing: 0.3,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    backgroundColor: '#FEF2F2',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FECACA',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },

  tableWrap: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: palette.white,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.neutral200,
    overflow: 'hidden',
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: palette.neutral50,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.neutral200,
  },
  headerCell: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: palette.neutral500,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.neutral200,
    alignItems: 'center',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  cell: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  idText: {
    fontSize: 13,
    fontWeight: '500',
    color: FormColors.subtitle,
    letterSpacing: 0.4,
  },
  recipientText: {
    fontSize: 14,
    fontWeight: '800',
    color: FormColors.title,
  },
  recipientSub: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '500',
    color: palette.neutral500,
  },
  bodyText: {
    fontSize: 13,
    fontWeight: '500',
    color: FormColors.subtitle,
  },
  validityText: {
    fontSize: 12,
    fontWeight: '500',
    color: palette.neutral400,
    letterSpacing: 0.2,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '800',
    color: Brand.green,
  },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
  },

  emptyBlock: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.neutral300,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  emptyTitle: {
    ...typography.subtitle,
    color: FormColors.title,
    textAlign: 'center',
  },
  emptySub: {
    ...typography.bodySmall,
    color: FormColors.subtitle,
    textAlign: 'center',
    maxWidth: 300,
  },

  /* sheets */
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: palette.overlayScrim,
  },
  sheet: {
    backgroundColor: palette.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.neutral200,
  },
  sheetTitle: {
    flex: 1,
    ...typography.subtitle,
    fontWeight: '700',
    color: FormColors.title,
  },
  closeBtn: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },

  detailRow: {
    marginTop: spacing.sm,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: palette.neutral400,
  },
  detailValue: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '600',
    color: FormColors.title,
  },
  detailValueEmphasis: {
    fontSize: 16,
    fontWeight: '800',
  },
  detailValueGreen: {
    color: Brand.green,
    fontWeight: '800',
    fontSize: 16,
  },

  /* revoke */
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    backgroundColor: '#FEF2F2',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FECACA',
    marginBottom: spacing.sm,
  },
  warningTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#B91C1C',
  },
  warningSub: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#DC2626',
  },
  revokeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: FormColors.title,
    marginTop: spacing.xs,
  },
  revokeSub: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
    color: FormColors.subtitle,
    lineHeight: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: palette.neutral400,
    marginBottom: spacing.xxs,
  },
  reasonInput: {
    backgroundColor: palette.neutral100,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : spacing.sm,
    fontSize: 14,
    fontWeight: '500',
    color: FormColors.title,
    minHeight: touchTarget.min,
  },
  reasonTextarea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  errorText: {
    marginTop: spacing.sm,
    fontSize: 13,
    fontWeight: '600',
    color: '#B91C1C',
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.neutral200,
    backgroundColor: palette.white,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.neutral300,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnTxt: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    color: FormColors.title,
  },
  revokeBtn: {
    flex: 2,
    height: 46,
    borderRadius: radius.lg,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  revokeBtnDisabled: {
    opacity: 0.5,
  },
  revokeBtnText: {
    color: palette.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
