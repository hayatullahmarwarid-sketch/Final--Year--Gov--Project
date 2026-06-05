import { Ionicons } from '@expo/vector-icons';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { useInspectorLang } from '@/contexts/inspector-lang-context';
import { useInspectorWorkspace } from '@/contexts/inspector-workspace-context';

import { InspectorBottomNav, inspectorBottomNavOffset } from './InspectorBottomNav';
import { INSPECTOR_TRANSLATIONS } from './inspector-translations';

type Tab = 'details' | 'instructions' | 'history';

function prioStyle(priority: string) {
  switch (priority) {
    case 'high':
      return { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' };
    case 'medium':
      return { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' };
    default:
      return { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' };
  }
}

export function InspectorTaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarOffset = inspectorBottomNavOffset(insets.bottom);
  const horizontalPad = width >= 900 ? Math.max(24, (width - 560) / 2) : width >= 768 ? 32 : 20;
  const { lang } = useInspectorLang();
  const ti = INSPECTOR_TRANSLATIONS[lang];
  const { tasks, loading: workspaceLoading } = useInspectorWorkspace();
  const task = tasks.find((t) => t.id === String(id));
  const taskDisplayId = Math.max(
    1,
    tasks.findIndex((t) => t.id === String(id)) + 1,
  );
  const [tab, setTab] = useState<Tab>('details');
  if (workspaceLoading && !task) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingRoot}>
          <ActivityIndicator size="large" color={Brand.green} />
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingRoot}>
          <Text style={styles.missingTxt} maxFontSizeMultiplier={1.15}>
            {ti.assignmentNotFound}
          </Text>
          <Pressable onPress={() => router.back()} style={styles.missingBtn} accessibilityRole="button">
            <Text style={styles.missingBtnTxt}>{ti.goBack}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const ps = prioStyle(task.priority);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.root}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backRound} accessibilityRole="button">
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.topSub} maxFontSizeMultiplier={1.1}>
              {ti.taskDetailHeader}
            </Text>
            <Text style={styles.topId} maxFontSizeMultiplier={1.2}>
              #{taskDisplayId}
            </Text>
          </View>
          <Text style={[styles.prioPill, { backgroundColor: ps.bg, borderColor: ps.border, color: ps.text }]} maxFontSizeMultiplier={1.05}>
            {task.priority} {ti.prioritySuffix}
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: tabBarOffset + 100 }}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.hero, { paddingHorizontal: horizontalPad }]}>
            <Text style={styles.title} maxFontSizeMultiplier={1.25}>
              {task.title}
            </Text>
            <View style={styles.decreeRow} accessibilityRole="text">
              <Ionicons name="document-text-outline" size={14} color={Brand.green} />
              <Text style={styles.decreeText} maxFontSizeMultiplier={1.15}>
                {task.decreeTitle}
              </Text>
            </View>
            <View style={styles.grid2}>
              <View style={styles.metaBlock}>
                <View style={styles.metaIcon}>
                  <Ionicons name="location-outline" size={16} color="#9CA3AF" />
                </View>
                <View>
                  <Text style={styles.metaLabel} maxFontSizeMultiplier={1.05}>
                    {ti.locationLabel}
                  </Text>
                  <Text style={styles.metaVal} maxFontSizeMultiplier={1.1}>
                    {task.region}
                  </Text>
                </View>
              </View>
              <View style={styles.metaBlock}>
                <View style={styles.metaIcon}>
                  <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                </View>
                <View>
                  <Text style={styles.metaLabel} maxFontSizeMultiplier={1.05}>
                    {ti.deadline}
                  </Text>
                  <Text style={[styles.metaVal, { color: '#DC2626' }]} maxFontSizeMultiplier={1.1}>
                    {task.deadline}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.tabs}>
            {(['details', 'instructions', 'history'] as const).map((k) => (
              <Pressable key={k} onPress={() => setTab(k)} style={styles.tabBtn} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
                <Text style={[styles.tabText, tab === k && styles.tabTextOn]} maxFontSizeMultiplier={1.1}>
                  {k === 'details' ? ti.overviewTab : k === 'instructions' ? ti.guidelinesTab : ti.historyTab}
                </Text>
                {tab === k ? <View style={styles.tabUnderline} /> : null}
              </Pressable>
            ))}
          </View>

          <View style={[styles.panel, { paddingHorizontal: horizontalPad }]}>
            {tab === 'details' ? (
              <>
                <View style={styles.panelHeadRow}>
                  <Ionicons name="checkbox-outline" size={14} color={Brand.green} />
                  <Text style={styles.panelHead} maxFontSizeMultiplier={1.1}>
                    {ti.requiredEvidence}
                  </Text>
                </View>
                {task.requirements.map((req, idx) => (
                  <View key={idx} style={styles.reqRow}>
                    <View style={styles.reqDot} />
                    <Text style={styles.reqTxt} maxFontSizeMultiplier={1.15}>
                      {req}
                    </Text>
                  </View>
                ))}
                {task.returnReason ? (
                  <View style={styles.revisionBanner}>
                    <Ionicons name="alert-circle" size={16} color="#7C3AED" />
                    <Text style={styles.revisionBannerTxt} maxFontSizeMultiplier={1.1}>
                      {task.returnReason}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle-outline" size={18} color={Brand.green} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoTitle} maxFontSizeMultiplier={1.1}>
                      {ti.systemStatus}
                    </Text>
                    <Text style={styles.infoBody} maxFontSizeMultiplier={1.15}>
                      {ti.systemStatusBody}
                    </Text>
                  </View>
                </View>
              </>
            ) : null}

            {tab === 'instructions' ? (
              <>
                <View style={styles.panelHeadRow}>
                  <Ionicons name="alert-circle-outline" size={14} color={Brand.green} />
                  <Text style={styles.panelHead} maxFontSizeMultiplier={1.1}>
                    {ti.officialInstructions}
                  </Text>
                </View>
                <Text style={styles.instructionsBody} maxFontSizeMultiplier={1.2}>
                  {task.instructions}
                </Text>
                <Text style={styles.linkHead} maxFontSizeMultiplier={1.05}>
                  {ti.linkedResources}
                </Text>
                <Pressable style={styles.linkRow}>
                  <View style={styles.linkLeft}>
                    <Ionicons name="document-text-outline" size={18} color={Brand.green} />
                    <Text style={styles.linkTitle} maxFontSizeMultiplier={1.1}>
                      {ti.operationalHandbook}
                    </Text>
                  </View>
                  <Ionicons name="chevron-back" size={18} color="#D1D5DB" />
                </Pressable>
                <Pressable style={styles.linkRow}>
                  <View style={styles.linkLeft}>
                    <Ionicons name="clipboard-outline" size={18} color={Brand.green} />
                    <Text style={styles.linkTitle} maxFontSizeMultiplier={1.1}>
                      {ti.decreeFullText}
                    </Text>
                  </View>
                  <Ionicons name="chevron-back" size={18} color="#D1D5DB" />
                </Pressable>
              </>
            ) : null}

            {tab === 'history' ? (
              <View style={styles.timeline}>
                <View style={styles.tlRow}>
                  <View style={styles.tlDotOn}>
                    <Ionicons name="time-outline" size={14} color="#fff" />
                  </View>
                  <View style={{ flex: 1, paddingTop: 2 }}>
                    <Text style={styles.tlTitle} maxFontSizeMultiplier={1.1}>
                      {ti.currentStatus}
                    </Text>
                    <Text style={styles.tlTime} maxFontSizeMultiplier={1.05}>
                      {task.status.replace(/-/g, ' ')}
                    </Text>
                    <Text style={styles.tlNote} maxFontSizeMultiplier={1.1}>
                      {ti.auditHistoryNote}
                    </Text>
                  </View>
                </View>
                {task.returnReason ? (
                  <View style={styles.tlRow}>
                    <View style={styles.tlDotOff}>
                      <Ionicons name="refresh" size={12} color="#9CA3AF" />
                    </View>
                    <View style={{ flex: 1, paddingTop: 2 }}>
                      <Text style={styles.tlTitle} maxFontSizeMultiplier={1.1}>
                        {ti.latestReviewNote}
                      </Text>
                      <Text style={styles.tlNote} maxFontSizeMultiplier={1.1}>
                        {task.returnReason}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </ScrollView>

        <InspectorBottomNav />

        <View style={[styles.ctaBar, { bottom: tabBarOffset }]}>
          <Pressable
            onPress={() => router.push(`/inspector/tasks/${task.id}/form` as Href)}
            style={styles.ctaBtn}
            accessibilityRole="button">
            <Ionicons name="play" size={20} color="#fff" />
            <Text style={styles.ctaBtnText} maxFontSizeMultiplier={1.15}>
              {task.status === 'assigned' ? ti.startInspection : ti.resume}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  root: { flex: 1, backgroundColor: '#fff' },
  loadingRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  missingTxt: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  missingBtn: { paddingVertical: 12, paddingHorizontal: 20, backgroundColor: Brand.green, borderRadius: 12 },
  missingBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  topBar: {
    backgroundColor: Brand.green,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backRound: { padding: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' },
  topSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  topId: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 2 },
  prioPill: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  scroll: { flex: 1 },
  hero: {
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  title: { fontSize: 22, fontWeight: '900', color: '#111827', lineHeight: 28 },
  decreeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 16 },
  decreeText: { flex: 1, fontSize: 12, fontWeight: '600', color: Brand.green },
  grid2: { flexDirection: 'row', gap: 16 },
  metaBlock: { flex: 1, flexDirection: 'row', gap: 12 },
  metaIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },
  metaVal: { fontSize: 12, fontWeight: '800', color: '#1F2937', marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  tabBtn: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  tabText: { fontSize: 12, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.8, textTransform: 'uppercase' },
  tabTextOn: { color: Brand.green },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 3,
    backgroundColor: Brand.green,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  panel: { paddingTop: 20 },
  panelHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  panelHead: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 10,
  },
  reqDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#E5E7EB' },
  reqTxt: { flex: 1, fontSize: 12, fontWeight: '600', color: '#374151' },
  revisionBanner: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginBottom: 12,
  },
  revisionBannerTxt: { flex: 1, fontSize: 12, fontWeight: '600', color: '#5B21B6', lineHeight: 18 },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(11,79,46,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(11,79,46,0.12)',
    marginTop: 8,
  },
  infoTitle: { fontSize: 12, fontWeight: '800', color: Brand.green, letterSpacing: 0.3, textTransform: 'uppercase' },
  infoBody: { fontSize: 10, color: 'rgba(11,79,46,0.75)', marginTop: 4, lineHeight: 16 },
  instructionsBody: { fontSize: 14, fontWeight: '500', color: '#4B5563', lineHeight: 22 },
  linkHead: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 10,
  },
  linkLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkTitle: { fontSize: 12, fontWeight: '800', color: '#1F2937' },
  timeline: { marginTop: 8, paddingLeft: 4 },
  tlRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  tlDotOn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  tlDotOff: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  tlTitle: { fontSize: 12, fontWeight: '800', color: '#1F2937' },
  tlTime: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  tlNote: { fontSize: 10, color: '#6B7280', marginTop: 4, fontStyle: 'italic' },
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  ctaBtn: {
    backgroundColor: Brand.green,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 6,
    shadowColor: Brand.green,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  ctaBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
});
