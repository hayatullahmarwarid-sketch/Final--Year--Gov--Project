import { Ionicons } from '@expo/vector-icons';
import { type Href, router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CollapsibleFilters } from '@/components/ui/CollapsibleFilters';
import { Brand } from '@/constants/brand';
import { FormColors } from '@/constants/form';
import { useSystemAdminRemote } from '@/contexts/system-admin-remote-context';
import { useSystemAdminUi } from '@/contexts/system-admin-ui-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { listAllPlatformUsers } from '@/lib/api/system-admin';
import { radius, spacing, touchTarget, typography } from '@/lib/theme';
import { staffRoleLabel } from '@/data/system-admin-store';
import type { SystemAdminStaffMember } from '@/lib/api/system-admin';
import { apiRoleKeyToStaffRole, resolveStaffDisplayName } from '@/lib/system-admin-mapper';

export default function SystemAdminAllUsersScreen() {
  const { t } = useAppTranslation();
  const { isDarkMode } = useSystemAdminUi();
  const { refreshRemote } = useSystemAdminRemote();
  const [rows, setRows] = useState<SystemAdminStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await listAllPlatformUsers(80);
    setLoading(false);
    if (r.ok) {
      setRows(r.items);
    } else {
      setError(r.message);
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetDirectorySearch = useCallback(() => setSearchQuery(''), []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((u) => {
      const name = (u.displayName ?? '').toLowerCase();
      const email = (u.email ?? '').toLowerCase();
      const phone = (u.phoneE164 ?? '').toLowerCase();
      const role = staffRoleLabel(apiRoleKeyToStaffRole(u.roleKey)).toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || role.includes(q);
    });
  }, [rows, searchQuery]);

  const cardSurface = isDarkMode ? '#111827' : '#fff';
  const borderC = isDarkMode ? '#1F2937' : '#F3F4F6';
  const textMuted = isDarkMode ? '#9CA3AF' : '#6B7280';
  const textTitle = isDarkMode ? '#F3F4F6' : '#111827';

  return (
    <View style={[styles.root, { backgroundColor: isDarkMode ? '#030712' : FormColors.background }]}>
      <View style={[styles.toolbar, { borderBottomColor: borderC }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('a11yBack')}>
          <Ionicons name="chevron-back" size={24} color={textTitle} />
        </Pressable>
        <Text style={[styles.toolbarTitle, { color: textTitle }]} numberOfLines={1}>
          {t('systemAdminAllPlatformUsersTitle')}
        </Text>
        <Pressable
          onPress={() => {
            void load();
            void refreshRemote();
          }}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={t('systemAdminRefreshActivity')}>
          <Ionicons name="refresh" size={22} color={textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.hint, { color: textMuted }]}>{t('systemAdminAllPlatformUsersHint')}</Text>

        <CollapsibleFilters
          title={t('systemAdminFilters')}
          summary={`${filtered.length} / ${rows.length}`}
          activeCount={searchQuery.trim() ? 1 : 0}
          onReset={resetDirectorySearch}
          resetDisabled={!searchQuery.trim()}
          adminPalette={{
            cardBg: cardSurface,
            borderColor: borderC,
            titleColor: textTitle,
            mutedColor: textMuted,
            triggerIdleBg: isDarkMode ? '#1F2937' : FormColors.inputMutedFill,
            accentColor: Brand.green,
          }}
          style={styles.directoryFilters}>
          <View style={[styles.searchField, { borderColor: borderC, backgroundColor: isDarkMode ? '#1F2937' : FormColors.inputMutedFill }]}>
            <Ionicons name="search" size={18} color={textMuted} style={styles.searchIcon} />
            <TextInput
              placeholder={t('saSearchPlaceholder')}
              placeholderTextColor={textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchInput, { color: textTitle }]}
            />
          </View>
        </CollapsibleFilters>

        {loading ? (
          <View style={styles.centerRow}>
            <ActivityIndicator color={Brand.green} />
            <Text style={{ color: textMuted, marginStart: 8 }}>{t('systemAdminSyncingDirectory')}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errBox}>
            <Text style={styles.errText}>{error}</Text>
            <Pressable onPress={() => void load()} style={styles.retry}>
              <Text style={styles.retryTxt}>{t('certRetry')}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: cardSurface, borderColor: borderC }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.tableScroll}>
            <View>
              <View
                style={[
                  styles.thRow,
                  { borderColor: borderC, backgroundColor: isDarkMode ? '#1F2937' : FormColors.inputMutedFill },
                ]}>
                <Text style={[styles.th, styles.colName, { color: textMuted }]}>{t('systemAdminTableName')}</Text>
                <Text style={[styles.th, styles.colEmail, { color: textMuted }]}>{t('systemAdminTableEmail')}</Text>
                <Text style={[styles.th, styles.colRole, { color: textMuted }]}>{t('systemAdminTableRole')}</Text>
                <Text style={[styles.th, styles.colStatus, { color: textMuted }]}>{t('systemAdminTableStatus')}</Text>
              </View>
              {filtered.map((u) => {
                const name = resolveStaffDisplayName(u);
                return (
                  <View key={u.id} style={[styles.tr, { borderColor: borderC }]}>
                    <Text style={[styles.td, styles.colName, { color: textTitle }]} numberOfLines={2}>
                      {name}
                    </Text>
                    <Text style={[styles.td, styles.colEmail, { color: textMuted }]} numberOfLines={2}>
                      {u.email ?? '—'}
                    </Text>
                    <Text style={[styles.td, styles.colRole, { color: textTitle }]}>
                      {staffRoleLabel(apiRoleKeyToStaffRole(u.roleKey))}
                    </Text>
                    <Text style={[styles.td, styles.colStatus, { color: textMuted }]} numberOfLines={1}>
                      {u.status ?? '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {filtered.length === 0 && !loading ? (
          <Text style={{ color: textMuted, textAlign: 'center', marginTop: 24 }}>{t('systemAdminNoUsersMatchSearch')}</Text>
        ) : null}

        <Pressable
          onPress={() => router.push('/system-admin/users' as Href)}
          style={[styles.manageLink, { borderColor: borderC }]}>
          <Text style={[styles.manageLinkTxt, { color: Brand.green }]}>{t('systemAdminManageRoles')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarTitle: { flex: 1, fontSize: 17, fontWeight: '800' },
  iconBtn: {
    width: touchTarget.min,
    height: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: spacing.md, paddingBottom: 40, gap: spacing.sm },
  hint: { ...typography.bodySmall, fontSize: 12, lineHeight: 18 },
  directoryFilters: {
    marginBottom: spacing.sm,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: touchTarget.min,
    paddingHorizontal: spacing.sm,
  },
  searchIcon: { marginEnd: 6 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 10 },
  centerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  errBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    gap: 8,
  },
  errText: { color: '#B91C1C', fontSize: 12 },
  retry: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#FEE2E2' },
  retryTxt: { fontSize: 11, fontWeight: '800', color: '#991B1B' },
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  tableScroll: { paddingBottom: spacing.xs },
  thRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  th: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
  },
  td: { fontSize: 12 },
  colName: { width: 160, flexGrow: 1 },
  colEmail: { width: 140 },
  colRole: { width: 180 },
  colStatus: { width: 72 },
  manageLink: {
    marginTop: spacing.md,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  manageLinkTxt: { fontSize: 13, fontWeight: '800' },
});
