import { Ionicons } from '@expo/vector-icons';
import { type Href, router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  I18nManager,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DecreeCard } from '@/components/home/DecreeCard';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { usePublicScreenTheme } from '@/lib/public-screen-theme';
import { usePublicUserData } from '@/contexts/public-user-data-context';
import type { DecreeListItem } from '@/data/decree-models';
import { listPublicBookmarksPage } from '@/lib/api/public-user';
import { showToast } from '@/lib/adapters/toast';
import { apiBookmarkToListItem, apiDecreeToListItem } from '@/lib/public/decree-adapters';
import { downloadPublicDecreePdf } from '@/lib/public/public-decree-download';
import { useRedirectNonPublicFromPublicRoutes } from '@/hooks/use-redirect-non-public-from-public-routes';
import { useAppLanguage } from '@/contexts/app-language-context';

export default function BookmarkedDecreesScreen() {
  useRedirectNonPublicFromPublicRoutes();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useAppTranslation();
  const th = usePublicScreenTheme();
  const { language } = useAppLanguage();
  const horizontal = width < 360 ? 14 : 18;
  const { active, data: publicData } = usePublicUserData();
  const bookmarkIdsKey = publicData.bookmarkedDecreeIds.join(',');
  const [items, setItems] = useState<DecreeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const load = useCallback(async () => {
    if (!active) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await listPublicBookmarksPage({ page: 1, limit: 100 });
    if (!res.ok) {
      setError(res.message);
      setItems([]);
      setLoading(false);
      return;
    }
    const rows: DecreeListItem[] = [];
    for (const b of res.items) {
      const li = apiBookmarkToListItem(b as Record<string, unknown>, language);
      if (li) rows.push(li);
    }
    const seen = new Set(rows.map((r) => r.id));
    const localIds = bookmarkIdsKey ? bookmarkIdsKey.split(',') : [];
    for (const id of localIds) {
      if (!id || seen.has(id)) continue;
      rows.push(
        apiDecreeToListItem({
          id,
          decreeNumber: 0,
          titleSummary: '—',
          categories: [],
          categoryIds: [],
          status: 'active',
          currentPublishedVersion: null,
        }, language),
      );
      seen.add(id);
    }
    setItems(rows);
    setLoading(false);
  }, [active, bookmarkIdsKey, language]);

  useEffect(() => {
    void load();
  }, [load, nonce]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onDecreeDownload = useCallback(
    async (item: DecreeListItem) => {
      try {
        await downloadPublicDecreePdf(item.id, { suggestedName: `decree-${item.indexLabel}`, locale: language });
      } catch (e) {
        showToast(e instanceof Error ? e.message : t('decreeDownloadFailed'), 'error');
        throw e;
      }
    },
    [t, language],
  );

  return (
    <View style={[styles.shell, { backgroundColor: th.pageBg }]}>
      <StatusBar style={th.isDark ? 'light' : 'dark'} />
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            backgroundColor: th.elevatedSurface,
            borderBottomColor: th.divider,
          },
        ]}>
        <View style={[styles.headerRow, { paddingHorizontal: horizontal }]}>
          <Pressable
            style={({ pressed }) => [styles.iconHit, pressed && styles.hitPressed]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('a11yGoBack')}>
            <Ionicons
              name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'}
              size={24}
              color={th.textPrimary}
            />
          </Pressable>
          <Text style={[styles.headerTitle, { color: th.textPrimary }]} maxFontSizeMultiplier={1.15}>
            {t('profileBookmarked')}
          </Text>
          <View style={styles.headerSide} />
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        extraData={th.isDark}
        renderItem={({ item }) => (
          <DecreeCard
            item={item}
            onView={() => router.push(`/decree/${item.id}` as Href)}
            onDownload={() => onDecreeDownload(item)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingHorizontal: horizontal, paddingBottom: 24 + insets.bottom },
        ]}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 48 }} color={th.textPrimary} />
          ) : error ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: th.textPrimary }]}>{error}</Text>
              <Pressable onPress={() => setNonce((n) => n + 1)} accessibilityRole="button">
                <Text style={[styles.emptyHint, { color: th.textSecondary }]}>{t('certRetry')}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="bookmark-outline" size={40} color={th.iconMuted} />
              <Text style={[styles.emptyTitle, { color: th.textPrimary }]} maxFontSizeMultiplier={1.12}>
                {active ? t('bookmarksEmptyTitle') : t('bookmarksSignInTitle')}
              </Text>
              <Text style={[styles.emptyHint, { color: th.textSecondary }]} maxFontSizeMultiplier={1.08}>
                {active
                  ? t('bookmarksEmptyHint')
                  : t('bookmarksSignInHint')}
              </Text>
            </View>
          )
        }
        showsVerticalScrollIndicator
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitPressed: {
    opacity: 0.75,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSide: {
    width: 44,
  },
  listContent: {
    paddingTop: 12,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
