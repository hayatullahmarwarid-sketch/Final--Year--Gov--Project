import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { type Href, router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  I18nManager,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { usePublicScreenTheme } from '@/lib/public-screen-theme';
import { useNotificationInbox } from '@/contexts/notification-inbox-context';
import { usePublicUserData } from '@/contexts/public-user-data-context';
import type { InboxNotification, NotificationCategory } from '@/data/notifications-models';
import {
  navigateNotificationCertificate,
  navigateNotificationView,
} from '@/lib/notification-navigation';
import { useRedirectNonPublicFromPublicRoutes } from '@/hooks/use-redirect-non-public-from-public-routes';
import { palette } from '@/lib/theme';

type TabKey = 'all' | 'unread';

function categoryIcon(category: NotificationCategory): {
  lib: 'ion' | 'mci';
  name: keyof typeof Ionicons.glyphMap | keyof typeof MaterialCommunityIcons.glyphMap;
  bg: string;
  color: string;
} {
  switch (category) {
    case 'decree':
      return { lib: 'ion', name: 'document-text', bg: Brand.green, color: '#fff' };
    case 'certificate':
      return { lib: 'mci', name: 'ribbon', bg: Brand.gold, color: '#fff' };
    case 'exam_result':
      return { lib: 'ion', name: 'checkmark-circle', bg: Brand.green, color: '#fff' };
    case 'exam_reminder':
      return { lib: 'ion', name: 'clipboard-outline', bg: Brand.goldMuted, color: '#fff' };
    case 'account':
      return { lib: 'ion', name: 'shield-checkmark', bg: Brand.green, color: '#fff' };
  }
}

function NotificationRow({ item }: { item: InboxNotification }) {
  const { t } = useAppTranslation();
  const th = usePublicScreenTheme();
  const { data } = usePublicUserData();
  const { markRead } = useNotificationInbox();
  const meta = categoryIcon(item.category);
  const unread = !item.read;
  const chevronName = I18nManager.isRTL ? 'chevron-back' : 'chevron-forward';
  const rowBg = unread
    ? th.isDark
      ? '#334155'
      : '#F3F4F6'
    : th.cardBg;

  return (
    <Pressable
      onPress={() => {
        if (unread) void markRead(item.id);
      }}
      style={[styles.rowWrap, { backgroundColor: rowBg }]}>
      <View style={styles.rowMain}>
        {unread ? <View style={styles.unreadDot} /> : <View style={styles.unreadDotPlaceholder} />}
        <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
          {meta.lib === 'mci' ? (
            <MaterialCommunityIcons
              name={meta.name as keyof typeof MaterialCommunityIcons.glyphMap}
              size={22}
              color={meta.color}
            />
          ) : (
            <Ionicons name={meta.name as keyof typeof Ionicons.glyphMap} size={22} color={meta.color} />
          )}
        </View>
        <View style={styles.rowBody}>
          <View style={styles.titleRow}>
            <Text style={[styles.rowTitle, { color: th.textPrimary }]} maxFontSizeMultiplier={1.15} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[styles.timeLabel, { color: th.textSecondary }]} maxFontSizeMultiplier={1.05}>
              {item.timeLabel}
            </Text>
          </View>
          <Text style={[styles.rowDesc, { color: th.textSecondary }]} maxFontSizeMultiplier={1.12}>
            {item.description}
          </Text>
          <View style={styles.actionsRow}>
            {item.showPassedBadge ? (
              <View style={styles.passedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Brand.green} />
                <Text style={styles.passedText} maxFontSizeMultiplier={1.05}>
                  {t('examResultPassed')}
                </Text>
              </View>
            ) : null}
            {item.showViewButton ? (
              <Pressable
                style={({ pressed }) => [
                  styles.pillBtn,
                  { backgroundColor: th.isDark ? '#475569' : '#E5E7EB' },
                  pressed && styles.pillBtnPressed,
                ]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  if (unread) void markRead(item.id);
                  navigateNotificationView(item, data.examAttempts);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('a11yViewDetails')}>
                <Text style={styles.pillBtnText}>{t('notificationsView')}</Text>
                <Ionicons name={chevronName} size={16} color={Brand.green} />
              </Pressable>
            ) : null}
            {item.showViewCertificate ? (
              <Pressable
                style={({ pressed }) => [
                  styles.pillBtn,
                  { backgroundColor: th.isDark ? '#475569' : '#E5E7EB' },
                  pressed && styles.pillBtnPressed,
                ]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  if (unread) void markRead(item.id);
                  navigateNotificationCertificate(item);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('a11yViewCertificate')}>
                <Text style={styles.pillBtnText}>{t('notificationsViewCertificate')}</Text>
                <Ionicons name={chevronName} size={16} color={Brand.green} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  useRedirectNonPublicFromPublicRoutes();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t, number } = useAppTranslation();
  const horizontal = width < 360 ? 14 : 18;
  const { items, unreadCount, markAllRead, inboxLoading, inboxError, refreshInbox } = useNotificationInbox();
  const th = usePublicScreenTheme();
  const [tab, setTab] = useState<TabKey>('all');
  const [listRefreshing, setListRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshInbox();
    }, [refreshInbox]),
  );

  const filtered = useMemo(() => {
    if (tab === 'unread') return items.filter((i) => !i.read);
    return items;
  }, [items, tab]);

  const onMarkAll = () => {
    if (unreadCount === 0) return;
    void (async () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await markAllRead();
    })();
  };

  const onListRefresh = () => {
    void (async () => {
      setListRefreshing(true);
      await refreshInbox();
      setListRefreshing(false);
    })();
  };

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
          <View style={styles.headerSideSlot}>
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
          </View>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: th.textPrimary }]} maxFontSizeMultiplier={1.15}>
              {t('notificationsTitle')}
            </Text>
            {unreadCount > 0 ? (
              <View style={styles.headerCountBadge}>
                <Text style={styles.headerCountText} maxFontSizeMultiplier={1.1}>
                  {number(unreadCount)}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.headerSideSlot}>
            <Pressable
              style={({ pressed }) => [styles.iconHit, pressed && styles.hitPressed]}
              onPress={() => {
                void Haptics.selectionAsync();
                router.push('/notification-settings' as Href);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('a11yNotifSettings')}>
              <Ionicons name="settings-outline" size={24} color={th.textSecondary} />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={[styles.markAllRow, { paddingHorizontal: horizontal }]}
          onPress={onMarkAll}
          disabled={unreadCount === 0}
          accessibilityRole="button"
          accessibilityLabel={t('a11yMarkAllRead')}
          accessibilityState={{ disabled: unreadCount === 0 }}>
          <Ionicons
            name="checkmark-done"
            size={22}
            color={unreadCount === 0 ? th.textMuted : Brand.green}
          />
          <Text
            style={[
              styles.markAllText,
              unreadCount === 0 && { color: th.textMuted },
            ]}
            maxFontSizeMultiplier={1.1}>
            {t('notificationsMarkAllRead')}
          </Text>
        </Pressable>

        <View style={[styles.tabsRow, { paddingHorizontal: horizontal }]}>
          <Pressable
            style={styles.tabHit}
            onPress={() => setTab('all')}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'all' }}>
            <View style={styles.tabLabelBlock}>
              <Text
                style={[
                  styles.tabLabel,
                  { color: tab === 'all' ? th.textPrimary : th.textSecondary },
                ]}>
                {t('certFilterAll')}
              </Text>
            </View>
            {tab === 'all' ? <View style={styles.tabUnderline} /> : <View style={styles.tabUnderlineSpacer} />}
          </Pressable>
          <Pressable
            style={[styles.tabHit, styles.tabHitSecond]}
            onPress={() => setTab('unread')}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'unread' }}>
            <View style={styles.tabLabelBlock}>
              <View style={styles.unreadTabInner}>
                <Text
                  style={[
                    styles.tabLabel,
                    { color: tab === 'unread' ? th.textPrimary : th.textSecondary },
                  ]}>
                  {t('notificationsUnreadTab')}
                </Text>
                <View style={styles.tabUnreadDot} />
                <Text style={styles.tabUnreadCount}>{number(unreadCount)}</Text>
              </View>
            </View>
            {tab === 'unread' ? <View style={styles.tabUnderline} /> : <View style={styles.tabUnderlineSpacer} />}
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        extraData={th.isDark}
        renderItem={({ item }) => <NotificationRow item={item} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingHorizontal: horizontal, paddingBottom: 24 + insets.bottom },
        ]}
        showsVerticalScrollIndicator
        refreshControl={
          <RefreshControl
            refreshing={listRefreshing}
            onRefresh={onListRefresh}
            tintColor={Brand.green}
            colors={[Brand.green]}
          />
        }
        ListEmptyComponent={
          inboxLoading && items.length === 0 ? (
            <ActivityIndicator style={{ marginTop: 48 }} color={Brand.green} />
          ) : inboxError ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyTitle, { color: th.textPrimary }]}>{inboxError}</Text>
              <Pressable onPress={() => void refreshInbox()} accessibilityRole="button">
                <Text style={[styles.emptyHint, styles.retryLink]}>{t('certRetry')}</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={[styles.empty, { color: th.textSecondary }]} maxFontSizeMultiplier={1.12}>
              {tab === 'unread' ? t('notificationsEmptyUnread') : t('notificationsEmptyAll')}
            </Text>
          )
        }
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
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  headerSideSlot: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitPressed: {
    opacity: 0.7,
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerCountBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  markAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  markAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: Brand.green,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 4,
    gap: 28,
  },
  tabHit: {
    paddingBottom: 0,
    minWidth: 72,
  },
  tabHitSecond: {
    minWidth: 120,
  },
  tabLabelBlock: {
    paddingBottom: 10,
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  unreadTabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.green,
  },
  tabUnreadCount: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.green,
  },
  tabUnderline: {
    height: 3,
    borderRadius: 2,
    backgroundColor: Brand.green,
  },
  tabUnderlineSpacer: {
    height: 3,
  },
  listContent: {
    paddingTop: 12,
  },
  rowWrap: {
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 10,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.green,
    marginTop: 18,
  },
  unreadDotPlaceholder: {
    width: 8,
    marginTop: 18,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  rowTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  rowDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  pillBtnPressed: {
    opacity: 0.88,
  },
  pillBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.green,
  },
  passedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.primaryAlpha.a12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  passedText: {
    fontSize: 13,
    fontWeight: '800',
    color: Brand.green,
    letterSpacing: 0.5,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
  },
  retryLink: {
    color: Brand.green,
    fontWeight: '700',
  },
});
