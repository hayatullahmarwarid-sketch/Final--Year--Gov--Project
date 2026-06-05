import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AdminSettingsNative } from '@/components/system-admin/AdminSettingsNative';

export default function SystemAdminSettingsScreen() {
  return (
    <View style={styles.root}>
      <AdminSettingsNative />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
