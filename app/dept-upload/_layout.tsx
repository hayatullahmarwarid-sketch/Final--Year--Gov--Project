import { type Href, Redirect, Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { DeptSessionIdleGate } from '@/components/dept-upload/DeptSessionIdleGate';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Brand } from '@/constants/brand';
import { useAuthSession } from '@/contexts/auth-session-context';
import { DeptUploadSettingsProvider } from '@/contexts/dept-upload-settings-context';
import { DeptUploadUiProvider } from '@/contexts/dept-upload-ui-context';
import { DeptUploadWorkspaceProvider } from '@/contexts/dept-upload-workspace-context';
import { bumpActivity } from '@/lib/session/activity-tracker';
import { useAppTranslation } from '@/hooks/use-app-translation';

export default function DeptUploadLayout() {
  const { hydrated, role } = useAuthSession();
  const { t } = useAppTranslation();

  if (!hydrated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Brand.green} accessibilityLabel={t('inspectorAdminLoadingSession')} />
      </View>
    );
  }

  if (role !== 'dept_upload') {
    return <Redirect href={'/login' as Href} />;
  }

  return (
    <DeptUploadSettingsProvider>
      <DeptUploadUiProvider>
        <DeptUploadWorkspaceProvider>
          <View style={{ flex: 1 }} onTouchStart={() => bumpActivity()}>
            <DeptSessionIdleGate>
              <DashboardShell role="dept_upload">
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="decrees" />
                  <Stack.Screen name="categories" />
                  <Stack.Screen name="reports" />
                  <Stack.Screen name="help" />
                  <Stack.Screen name="settings" />
                </Stack>
              </DashboardShell>
            </DeptSessionIdleGate>
          </View>
        </DeptUploadWorkspaceProvider>
      </DeptUploadUiProvider>
    </DeptUploadSettingsProvider>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' },
});
