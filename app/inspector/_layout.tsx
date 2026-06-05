import { type Href, Redirect, Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuthSession } from '@/contexts/auth-session-context';
import { InspectorLangProvider } from '@/contexts/inspector-lang-context';
import { InspectorSyncQueueProvider } from '@/contexts/inspector-sync-queue-context';
import { InspectorWorkspaceProvider } from '@/contexts/inspector-workspace-context';
import { palette } from '@/lib/theme';

export default function InspectorLayout() {
  const { hydrated, role } = useAuthSession();

  if (!hydrated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  if (role !== 'inspector') {
    return <Redirect href={'/inspector-login' as Href} />;
  }

  return (
    <InspectorLangProvider>
      <InspectorSyncQueueProvider>
        <InspectorWorkspaceProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="tasks" />
            <Stack.Screen name="sync" />
            <Stack.Screen name="profile" />
          </Stack>
        </InspectorWorkspaceProvider>
      </InspectorSyncQueueProvider>
    </InspectorLangProvider>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' },
});
