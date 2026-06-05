import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeptUploadDash } from '@/constants/dept-upload-dashboard';
import { useDeptUploadThemeColorsOptional } from '@/contexts/dept-upload-ui-context';
import { palette } from '@/lib/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQS = [
  {
    id: '1',
    q: 'How do I upload a new decree?',
    a: "Click 'Upload New Decree' from the dashboard or the Decree Management section. Fill in the required metadata and attach the PDF file.",
  },
  {
    id: '2',
    q: 'What is the approval workflow?',
    a: '',
  },
  {
    id: '3',
    q: 'How do I export reports?',
    a: '',
  },
  {
    id: '4',
    q: 'What file formats are supported?',
    a: '',
  },
];

export default function DeptUploadHelpScreen() {
  const c = useDeptUploadThemeColorsOptional();
  const [openId, setOpenId] = useState<string>('1');

  const toggle = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((prev) => (prev === id ? '' : id));
  }, []);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.pageBg }]} edges={['bottom']}>
      <ScrollView
        style={{ flex: 1, backgroundColor: c.pageBg }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageTitle, { color: c.textPrimary }]}>Help & Support</Text>

        <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
          {FAQS.map((item) => {
            const expanded = openId === item.id;
            return (
              <View key={item.id} style={[styles.faqItem, { borderBottomColor: c.rowDivider }]}>
                <Pressable
                  onPress={() => toggle(item.id)}
                  style={styles.faqHead}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}>
                  <View style={styles.faqIconWrap}>
                    <Ionicons name="help" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.faqQ, { color: c.textPrimary }]} numberOfLines={expanded ? undefined : 2}>
                    {item.q}
                  </Text>
                  <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={c.textMuted} />
                </Pressable>
                {expanded && item.a ? <Text style={[styles.faqA, { color: c.textSecondary }]}>{item.a}</Text> : null}
              </View>
            );
          })}
        </View>

        <View style={[styles.supportCard, { backgroundColor: c.cardBgMuted, borderColor: c.cardBorder }]}>
          <View style={styles.supportIconWrap}>
            <Ionicons name="help" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.supportTxt}>
            <Text style={[styles.supportTitle, { color: c.textPrimary }]}>Need more help?</Text>
            <Text style={[styles.supportBody, { color: c.textSecondary }]}>
              Contact the IT support team at support@decrees.gov
            </Text>
          </View>
        </View>
      </ScrollView>
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
  card: {
    borderRadius: DeptUploadDash.radiusLg,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: DeptUploadDash.cardBorder,
    ...DeptUploadDash.shadow,
  },
  faqItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
  },
  faqHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  faqIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqQ: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  faqA: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
    paddingLeft: 60,
    paddingRight: 16,
    paddingBottom: 14,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 18,
    borderRadius: DeptUploadDash.radiusLg,
    borderWidth: 1,
  },
  supportIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportTxt: { flex: 1, minWidth: 0 },
  supportTitle: { fontSize: 16, fontWeight: '800' },
  supportBody: { marginTop: 6, fontSize: 14, fontWeight: '500', lineHeight: 20 },
});
