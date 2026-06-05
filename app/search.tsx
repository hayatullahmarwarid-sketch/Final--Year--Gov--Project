import { Ionicons } from '@expo/vector-icons';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  I18nManager,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DecreeCard } from '@/components/home/DecreeCard';
import { Brand } from '@/constants/brand';
import { FormColors } from '@/constants/form';
import { HomeColors } from '@/constants/home';
import { useAppLanguage } from '@/contexts/app-language-context';
import { getUnifiedSearch } from '@/lib/api/search';
import { apiDecreeToListItem } from '@/lib/public/decree-adapters';
import type { DecreeListItem } from '@/data/decree-models';

type ExamHit = { id: string; title: string };

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useAppLanguage();
  const params = useLocalSearchParams<{ q?: string | string[] }>();
  const initialQ = typeof params.q === 'string' ? params.q : Array.isArray(params.q) ? params.q[0] ?? '' : '';
  const [q, setQ] = useState(initialQ);
  useEffect(() => {
    const next =
      typeof params.q === 'string' ? params.q : Array.isArray(params.q) ? (params.q[0] ?? '') : '';
    if (next) setQ(next);
  }, [params.q]);
  const [loading, setLoading] = useState(false);
  const [decrees, setDecrees] = useState<DecreeListItem[]>([]);
  const [exams, setExams] = useState<ExamHit[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const run = useCallback(async () => {
    const s = q.trim();
    if (s.length < 2) {
      setErr('Type at least 2 characters');
      return;
    }
    setLoading(true);
    setErr(null);
    const r = await getUnifiedSearch(s, { type: 'all', limit: 30 });
    setLoading(false);
    if (!r.ok) {
      setErr(r.message);
      setDecrees([]);
      setExams([]);
      return;
    }
    const d = r.data;
    const dr = Array.isArray(d.decrees) ? d.decrees : [];
    const er = Array.isArray(d.exams) ? d.exams : [];
    const items: DecreeListItem[] = [];
    for (const row of dr) {
      const li = apiDecreeToListItem({
        ...(row as Record<string, unknown>),
        id: String((row as Record<string, unknown>).id ?? ''),
        decreeNumber: Number((row as Record<string, unknown>).decreeNumber ?? 0),
        titleSummary: String((row as Record<string, unknown>).titleSummary ?? ''),
        categories: [],
        categoryIds: [],
        status: String((row as Record<string, unknown>).status ?? 'active'),
        currentPublishedVersion: null,
      }, language);
      if (li) items.push(li);
    }
    setDecrees(items);
    setExams(
      er.map((e) => ({
        id: String((e as Record<string, unknown>).id ?? ''),
        title: String((e as Record<string, unknown>).title ?? 'Exam'),
      })),
    );
  }, [q, language]);

  return (
    <View style={[styles.shell, { paddingTop: insets.top + 8 }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={FormColors.title} />
        </Pressable>
        <Text style={styles.title}>Search</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={q}
          onChangeText={setQ}
          placeholder="Decrees, exams…"
          placeholderTextColor={FormColors.placeholder}
          onSubmitEditing={() => void run()}
          returnKeyType="search"
        />
        <Pressable style={styles.go} onPress={() => void run()} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="search" size={22} color="#fff" />}
        </Pressable>
      </View>
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <FlatList
        data={[
          ...exams.map((e) => ({ kind: 'exam' as const, exam: e })),
          ...decrees.map((d) => ({ kind: 'decree' as const, decree: d })),
        ]}
        keyExtractor={(item) => (item.kind === 'exam' ? `e-${item.exam.id}` : `d-${item.decree.id}`)}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        renderItem={({ item }) =>
          item.kind === 'exam' ? (
            <Pressable
              style={styles.examCard}
              onPress={() => router.push(`/exam/${item.exam.id}/instructions` as Href)}>
              <Ionicons name="school-outline" size={22} color={Brand.green} />
              <Text style={styles.examTitle}>{item.exam.title}</Text>
              <Ionicons name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#9CA3AF" />
            </Pressable>
          ) : (
            <DecreeCard item={item.decree} />
          )
        }
        ListEmptyComponent={
          !loading && q.trim().length >= 2 ? <Text style={styles.empty}>No results</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: HomeColors.pageBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: FormColors.title },
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  input: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: FormColors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  go: {
    width: 48,
    borderRadius: 12,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  err: { color: '#DC2626', paddingHorizontal: 16, marginBottom: 8 },
  examCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#fff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  examTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: FormColors.title },
  empty: { textAlign: 'center', color: FormColors.label, marginTop: 24 },
});
