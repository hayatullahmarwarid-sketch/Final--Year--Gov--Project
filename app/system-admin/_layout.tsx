import { type Href, Redirect, Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Brand } from '@/constants/brand';
import { useAuthSession } from '@/contexts/auth-session-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { SystemAdminRemoteProvider } from '@/contexts/system-admin-remote-context';
import { SystemAdminUiProvider } from '@/contexts/system-admin-ui-context';

export default function SystemAdminLayout() {
  const { hydrated, role } = useAuthSession();
  const { t } = useAppTranslation();

  if (!hydrated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Brand.green} accessibilityLabel={t('a11yLoadingSession')} />
      </View>
    );
  }

  if (role !== 'system_admin') {
    return <Redirect href={'/login' as Href} />;
  }

  return (
    <SystemAdminRemoteProvider>
      <SystemAdminUiProvider>
        <DashboardShell role="system_admin">
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="all-users" />
            <Stack.Screen name="users" />
            <Stack.Screen name="logs" />
            <Stack.Screen name="settings" />
          </Stack>
        </DashboardShell>
      </SystemAdminUiProvider>
    </SystemAdminRemoteProvider>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' },
});
