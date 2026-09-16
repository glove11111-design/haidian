import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CaptureBar } from '../components/CaptureBar';
import { ChipRow, GhostBtn, Pill } from '../components/Chips';
import { DigestSheet } from '../components/DigestSheet';
import { EmptyCategory, EmptySearch } from '../components/EmptyStates';
import { MixedCard } from '../components/ItemViews';
import { useStore } from '../store';
import { colors, font } from '../theme';
import type { CaptureKind, MemoryItem } from '../types';

export function FindScreen({
  onOpen,
  onChangeCategory,
  onCapture,
}: {
  onOpen: (item: MemoryItem) => void;
  onChangeCategory: (item: MemoryItem) => void;
  onCapture: (kind: CaptureKind) => void;
}) {
  const { categories, search } = useStore();
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [digestOpen, setDigestOpen] = useState(false);
  const results = useMemo(() => search(query, categoryId), [search, query, categoryId]);
  const scanning = !!categoryId && !query.trim();
  const searching = !!query.trim();

  return (
    <View style={s.page}>
      <View style={s.head}>
        <Text style={s.title}>找</Text>
        <GhostBtn label="整理" onPress={() => setDigestOpen(true)} />
      </View>
      <View style={s.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="搜正文、备注、文案、作者、标题"
          placeholderTextColor={colors.muted}
          style={s.search}
        />
      </View>
      <View style={s.chips}>
        <ChipRow>
          {categories.map((c) => (
            <Pill
              key={c.id}
              label={c.name}
              selected={categoryId === c.id}
              onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
            />
          ))}
        </ChipRow>
      </View>
      {searching ? (
        <Pressable style={s.digestBar} onPress={() => setDigestOpen(true)}>
          <Text style={s.digestBarText}>
            把「{query.trim()}」相关的 {results.length} 条整理成浅读
          </Text>
        </Pressable>
      ) : null}
      <View style={s.feed}>
        {searching && results.length === 0 && <EmptySearch onClear={() => setQuery('')} />}
        {scanning && results.length === 0 && (
          <EmptyCategory onBack={() => setCategoryId(null)} />
        )}
        {results.length > 0 && (
          <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
            {results.map((item) => (
              <MixedCard key={item.id} item={item} onOpen={onOpen} onCategory={onChangeCategory} />
            ))}
          </ScrollView>
        )}
        {!searching && !scanning && results.length === 0 && (
          <View style={s.hintBox}>
            <Text style={s.hint}>输入关键词，或按类目扫。整理可以归堆并给浅读。</Text>
          </View>
        )}
      </View>
      <CaptureBar onPick={onCapture} />
      {digestOpen && (
        <DigestSheet
          initialTopic={query}
          categoryId={categoryId}
          onClose={() => setDigestOpen(false)}
          onOpen={onOpen}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1 },
  head: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontFamily: font, fontSize: 32, fontWeight: '700', color: colors.ink },
  searchWrap: { paddingHorizontal: 16, marginBottom: 10 },
  search: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: font,
    fontSize: 16,
  },
  chips: { paddingLeft: 16, marginBottom: 8 },
  digestBar: { paddingHorizontal: 16, paddingBottom: 8 },
  digestBarText: { fontFamily: font, fontSize: 13, color: colors.ink, textDecorationLine: 'underline' },
  feed: { flex: 1, paddingHorizontal: 16 },
  hintBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { fontFamily: font, fontSize: 15, color: colors.muted, textAlign: 'center', paddingHorizontal: 24 },
});
