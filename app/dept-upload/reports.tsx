import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  I18nManager,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeptUploadSharedAnalyticsSection } from '@/components/dept-upload/DeptUploadSharedAnalyticsSection';
import { useAuthSession } from '@/contexts/auth-session-context';
import { useDeptUploadThemeColorsOptional } from '@/contexts/dept-upload-ui-context';
import { useAppTranslation } from '@/hooks/use-app-translation';
import { showToast } from '@/lib/adapters/toast';
import { getDecreeUploadDashboard, type DecreeUploadDashboardDto } from '@/lib/api/decree-upload';
import { downloadDeptUploadAnalyticsReport } from '@/lib/dept-upload/reports-download';

const MENU_W = 200;

export default function DeptUploadReportsScreen() {
  const c = useDeptUploadThemeColorsOptional();
  const { sessionEmail } = useAuthSession();
  const { t } = useAppTranslation();
  const [dash, setDash] = useState<DecreeUploadDashboardDto | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [exporting, setExporting] = useState(false);
  const anchorRef = useRef<View>(null);

  const openMenu = useCallback(() => {
    anchorRef.current?.measureInWindow((x, y, w, h) => {
      const winW = Dimensions.get('window').width;
      const rtl = I18nManager.isRTL;
      const left = rtl ? Math.max(8, x) : Math.min(Math.max(8, x + w - MENU_W), winW - MENU_W - 8);
      setMenuPos({ top: y + h + 6, left });
      setMenuOpen(true);
    });
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const loadDash = useCallback(async () => {
    const r = await getDecreeUploadDashboard();
    if (r.ok) setDash(r.data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDash();
    }, [loadDash]),
  );

  const toggleMenu = useCallback(() => {
    if (menuOpen) closeMenu();
    else openMenu();
  }, [menuOpen, openMenu, closeMenu]);

  const exportReport = useCallback(
    async (format: 'pdf' | 'csv' | 'excel') => {
      closeMenu();
      setExporting(true);
      try {
        const r = await downloadDeptUploadAnalyticsReport(format, { generatedBy: sessionEmail });
        if (!r.ok) {
          showToast(t('deptReportsExportFailed'), 'error');
        }
      } finally {
        setExporting(false);
      }
    },
    [closeMenu, sessionEmail, t],
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.pageBg }]} edges={['bottom']}>
      <ScrollView
        style={{ flex: 1, backgroundColor: c.pageBg }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageTitle, { color: c.textPrimary }]}>{t('deptReportsAnalyticsTitle')}</Text>

        <View ref={anchorRef} collapsable={false} style={styles.exportAnchor}>
          <Pressable
            onPress={toggleMenu}
            style={[styles.exportBtn, { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', backgroundColor: c.cardBg, borderColor: c.cardBorder }]}
            accessibilityRole="button"
            accessibilityLabel={t('deptExportLabel')}
            accessibilityState={{ expanded: menuOpen }}
            disabled={exporting}>
            <View style={[styles.exportLeft, { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }]}>
              {exporting ? (
                <ActivityIndicator size="small" color={c.textPrimary} />
              ) : (
                <Ionicons name="download-outline" size={16} color={c.textPrimary} />
              )}
              <Text style={[styles.exportTxt, { color: c.textPrimary }]}>{t('deptExportLabel')}</Text>
            </View>
            <Ionicons name="chevron-down" size={14} color={c.textMuted} />
          </Pressable>
        </View>

        <DeptUploadSharedAnalyticsSection layout="reports" dashboard={dash} />
      </ScrollView>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={closeMenu}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.menuBackdrop} onPress={closeMenu} accessibilityLabel={t('deptExportDismissMenu')} />
          <View
            pointerEvents="box-none"
            style={[
              styles.menuWrap,
              {
                top: menuPos.top,
                left: Math.min(Math.max(8, menuPos.left), Dimensions.get('window').width - MENU_W - 8),
              },
            ]}>
            <View style={[styles.menuCard, { backgroundColor: c.dropdownBg, borderColor: c.cardBorder }]}>
              <Pressable
                style={[styles.menuRow, { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => void exportReport('pdf')}
                disabled={exporting}
                accessibilityRole="button"
                accessibilityLabel={t('deptExportPdfTitle')}>
                <Ionicons name="document-text-outline" size={20} color={c.textPrimary} />
                <Text style={[styles.menuRowTxt, { color: c.textPrimary, textAlign: I18nManager.isRTL ? 'right' : 'left' }]}>{t('deptExportPdfTitle')}</Text>
              </Pressable>
              <Pressable
                style={[styles.menuRow, { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => void exportReport('csv')}
                disabled={exporting}
                accessibilityRole="button"
                accessibilityLabel={t('deptExportCsvTitle')}>
                <Ionicons name="grid-outline" size={20} color={c.textPrimary} />
                <Text style={[styles.menuRowTxt, { color: c.textPrimary, textAlign: I18nManager.isRTL ? 'right' : 'left' }]}>{t('deptExportCsvTitle')}</Text>
              </Pressable>
              <Pressable
                style={[styles.menuRow, { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => void exportReport('excel')}
                disabled={exporting}
                accessibilityRole="button"
                accessibilityLabel={t('deptExportExcelTitle')}>
                <Ionicons name="logo-microsoft" size={20} color={c.textPrimary} />
                <Text style={[styles.menuRowTxt, { color: c.textPrimary, textAlign: I18nManager.isRTL ? 'right' : 'left' }]}>{t('deptExportExcelTitle')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 14,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  exportAnchor: {
    alignSelf: 'flex-start',
  },
  exportBtn: {
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 108,
    gap: 8,
  },
  exportLeft: {
    alignItems: 'center',
    gap: 6,
  },
  exportTxt: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalRoot: {
    flex: 1,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
  },
  menuWrap: {
    position: 'absolute',
    width: MENU_W,
  },
  menuCard: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  menuRow: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  menuRowTxt: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
});
