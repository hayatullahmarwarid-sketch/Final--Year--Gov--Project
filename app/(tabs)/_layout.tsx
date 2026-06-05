import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { type Href, router, Tabs } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { HapticTab } from '@/components/haptic-tab';
import { useAuthSession } from '@/contexts/auth-session-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { Brand, FormColors, palette, shadowTabBar, spacing, typography } from '@/lib/theme';


/******************************************************************
--PUBLIC_TABS_LAYOUT--
Public user tab shell; non-public roles must not stay on home tabs (deep links).
Unauthenticated sessions must not mount tab content (auth gate + redirect to login).
******************************************************************/
export default function TabLayout() {
  const { hydrated, role } = useAuthSession();
  const { t } = useAppTranslation();
  const colorScheme = useColorScheme();
  const tabOptions = useMemo(
    () => ({
      tabBarActiveTintColor: Brand.green,
      tabBarInactiveTintColor: colorScheme === 'dark' ? '#94A3B8' : palette.neutral400,
      headerShown: false,
      tabBarButton: HapticTab,
      tabBarStyle: [
        styles.tabBar,
        {
          backgroundColor: colorScheme === 'dark' ? '#0F172A' : FormColors.background,
          borderTopColor: colorScheme === 'dark' ? '#1E293B' : palette.neutral100,
        },
      ],
      tabBarLabelStyle: styles.tabLabel,
      tabBarIconStyle: styles.tabIcon,
    }),
    [colorScheme],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (role === null) {
      router.replace('/login' as Href);
      return;
    }
    // -----------Redirect_non_public_roles_from_public_tabs-----------
    if (role === 'dept_upload') {
      router.replace('/dept-upload' as Href);
      return;
    }
    if (role === 'inspector') {
      router.replace('/inspector' as Href);
      return;
    }
    if (role === 'system_admin') {
      router.replace('/system-admin' as Href);
      return;
    }
    if (role === 'inspector_admin') {
      router.replace('/inspector-admin' as Href);
    }
  }, [hydrated, role]);

  const gateBg = colorScheme === 'dark' ? '#0F172A' : FormColors.background;

  if (!hydrated) {
    return (
      <View style={[styles.authGate, { backgroundColor: gateBg }]}>
        <ActivityIndicator size="large" color={Brand.green} accessibilityLabel={t('a11yLoadingSession')} />
      </View>
    );
  }

  if (role !== 'public') {
    return (
      <View style={[styles.authGate, { backgroundColor: gateBg }]}>
        <ActivityIndicator size="large" color={Brand.green} accessibilityLabel={t('a11yRedirecting')} />
      </View>
    );
  }

  return (
    <DashboardShell role="public" hideTopBar>
    <Tabs screenOptions={tabOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabHome'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size ?? 20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="decrees"
        options={{
          title: t('tabDecrees'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="book-open-outline" size={size ?? 20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="exams"
        options={{
          title: t('tabExams'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="fountain-pen" size={size ?? 20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="certificates"
        options={{
          title: t('tabCertificates'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="trophy-outline" size={size ?? 20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabProfile'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size ?? 20} color={color} />
          ),
        }}
      />
    </Tabs>
    </DashboardShell>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: FormColors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.neutral100,
    paddingTop: spacing.xs,
    height: Platform.OS === 'ios' ? 88 : 68,
    ...shadowTabBar(),
  },
  tabLabel: {
    ...typography.caption,
    fontWeight: '600',
  },
  tabIcon: {
    marginBottom: -2,
  },
  authGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
