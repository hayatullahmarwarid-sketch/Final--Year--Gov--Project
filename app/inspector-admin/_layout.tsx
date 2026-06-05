import { type Href, Redirect, Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Brand } from '@/constants/brand';
import { useAuthSession } from '@/contexts/auth-session-context';
import { useAppTranslation } from '@/hooks/use-app-translation';

export default function InspectorAdminLayout() {
  const { hydrated, role } = useAuthSession();
  const { t } = useAppTranslation();

  if (!hydrated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Brand.green} accessibilityLabel={t('inspectorAdminLoadingSession')} />
      </View>
    );
  }

  if (role !== 'inspector_admin') {
    return <Redirect href={'/login' as Href} />;
  }

  return (
    <DashboardShell role="inspector_admin">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="templates" />
        <Stack.Screen name="assignments" />
        <Stack.Screen name="submissions" />
        <Stack.Screen name="implementation" />
        <Stack.Screen name="exams" />
        <Stack.Screen name="questions" />
        <Stack.Screen name="results" />
        <Stack.Screen name="certificates" />
        <Stack.Screen name="reports" />
        <Stack.Screen name="settings" />
      </Stack>
    </DashboardShell>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' },
});
