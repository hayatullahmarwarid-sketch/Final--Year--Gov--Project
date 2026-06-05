import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeptUploadDepartmentSettings } from '@/components/dept-upload/DeptUploadDepartmentSettings';
import { useDeptUploadThemeColorsOptional } from '@/contexts/dept-upload-ui-context';

export default function DeptUploadSettingsScreen() {
  const c = useDeptUploadThemeColorsOptional();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.pageBg }]} edges={['bottom']}>
      <DeptUploadDepartmentSettings />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
