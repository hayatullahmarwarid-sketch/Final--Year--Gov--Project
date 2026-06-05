import { Ionicons } from '@expo/vector-icons';
import { type Href, router, usePathname } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { useInspectorLang } from '@/contexts/inspector-lang-context';

import { INSPECTOR_TRANSLATIONS } from './inspector-translations';

/** Approximate vertical space reserved by the inspector tab bar (nav row + safe inset). */
export function inspectorBottomNavOffset(insetsBottom: number): number {
  return 52 + Math.max(insetsBottom, 10);
}

export function InspectorBottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { lang } = useInspectorLang();
  const t = INSPECTOR_TRANSLATIONS[lang];

  const normalized = (pathname ?? '').replace(/\/$/, '');
  const show =
    normalized === '/inspector' ||
    normalized.startsWith('/inspector/tasks') ||
    normalized === '/inspector/sync' ||
    normalized === '/inspector/profile';

  const hideOnDeepForm = normalized.includes('/form');

  if (!show || hideOnDeepForm) return null;

  const item = (route: string, label: string, icon: keyof typeof Ionicons.glyphMap, iconActive: keyof typeof Ionicons.glyphMap) => {
    const active = route === '/inspector/tasks' ? normalized.startsWith('/inspector/tasks') : normalized === route;
    return (
      <Pressable
        key={route}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={() => router.push(route as Href)}
        style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}>
        <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
          <Ionicons name={active ? iconActive : icon} size={22} color={active ? Brand.green : '#9CA3AF'} />
        </View>
        <Text style={[styles.navLabel, active && styles.navLabelActive]} maxFontSizeMultiplier={1.2}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]} accessibilityRole="tablist">
      {item('/inspector', t.dashboard, 'grid-outline', 'grid')}
      {item('/inspector/tasks', t.tasks, 'search-outline', 'search')}
      {item('/inspector/sync', t.sync, 'refresh-outline', 'refresh')}
      {item('/inspector/profile', t.profile, 'person-outline', 'person')}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingTop: 10,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 12 },
      default: {},
    }),
  },
  navBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  navBtnPressed: { opacity: 0.85 },
  iconWrap: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  iconWrapActive: {
    backgroundColor: 'rgba(11, 79, 46, 0.1)',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  navLabelActive: {
    color: Brand.green,
  },
});
