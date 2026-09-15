import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CaptureBar } from '../components/CaptureBar';
import { ChipRow, GhostBtn, Pill } from '../components/Chips';
import { EmptyCategory, EmptyLibrary, EmptyType } from '../components/EmptyStates';
import { AudioCard, GalleryTile, LinkCard, MixedCard, TextCard } from '../components/ItemViews';
import { useStore } from '../store';
import { colors, font, typeLabels } from '../theme';
import type { CaptureKind, ItemType, MemoryItem, TypeFilter } from '../types';

const TYPE_CHIPS: TypeFilter[] = ['all', 'image', 'video', 'text', 'audio', 'link'];

export function LibraryScreen({
  typeFilter,
  categoryId,
  onType,
  onCategoryFilter,
  onOpen,
  onChangeCategory,
  onSettings,
  onCapture,
}: {
  typeFilter: TypeFilter;
  categoryId: string | null;
  onType: (t: TypeFilter) => void;
  onCategoryFilter: (id: string | null) => void;
  onOpen: (item: MemoryItem) => void;
  onChangeCategory: (item: MemoryItem) => void;
  onSettings: () => void;
  onCapture: (kind: CaptureKind) => void;
}) {
  const { items, categories } = useStore();
  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (typeFilter !== 'all' && it.type !== typeFilter) return false;
      if (categoryId && it.categoryId !== categoryId) return false;
      return true;
    });
  }, [items, typeFilter, categoryId]);

  const emptyAll = items.length === 0;
  const emptyType = !emptyAll && typeFilter !== 'all' && filtered.length === 0 && !categoryId;
  const emptyCat = !emptyAll && !!categoryId && filtered.length === 0;

  return (
    <View style={s.page}>
      <View style={s.head}>
        <Text style={s.title}>库</Text>
        <GhostBtn label="设置" onPress={onSettings} />
      </View>
      <View style={s.chips}>
        <ChipRow>
          {TYPE_CHIPS.map((t) => (
            <Pill key={t} label={typeLabels[t]} selected={typeFilter === t} onPress={() => onType(t)} />
          ))}
        </ChipRow>
      </View>
      <View style={s.chips}>
        <ChipRow>
          {categories.map((c) => (
            <Pill
              key={c.id}
              label={c.name}
              selected={categoryId === c.id}
              onPress={() => onCategoryFilter(categoryId === c.id ? null : c.id)}
            />
          ))}
        </ChipRow>
      </View>
      <View style={s.feed}>
        {emptyAll && <EmptyLibrary />}
        {emptyType && <EmptyType type={typeFilter as ItemType} />}
        {emptyCat && <EmptyCategory onBack={() => onCategoryFilter(null)} />}
        {!emptyAll && !emptyType && !emptyCat && (
          <Feed items={filtered} typeFilter={typeFilter} onOpen={onOpen} onCategory={onChangeCategory} />
        )}
      </View>
      <CaptureBar onPick={onCapture} />
    </View>
  );
}

function Feed({
  items,
  typeFilter,
  onOpen,
  onCategory,
}: {
  items: MemoryItem[];
  typeFilter: TypeFilter;
  onOpen: (item: MemoryItem) => void;
  onCategory: (item: MemoryItem) => void;
}) {
  if (typeFilter === 'image' || typeFilter === 'video') {
    return (
      <ScrollView contentContainerStyle={s.gallery}>
        {items.map((item) => (
          <GalleryTile key={item.id} item={item} onOpen={onOpen} onCategory={onCategory} />
        ))}
      </ScrollView>
    );
  }
  if (typeFilter === 'text') {
    return (
      <ScrollView contentContainerStyle={s.list}>
        {items.map((item) => (
          <TextCard key={item.id} item={item} onOpen={onOpen} onCategory={onCategory} />
        ))}
      </ScrollView>
    );
  }
  if (typeFilter === 'audio') {
    return (
      <ScrollView contentContainerStyle={s.list}>
        {items.map((item) => (
          <AudioCard key={item.id} item={item} onOpen={onOpen} onCategory={onCategory} />
        ))}
      </ScrollView>
    );
  }
  if (typeFilter === 'link') {
    return (
      <ScrollView contentContainerStyle={s.list}>
        {items.map((item) => (
          <LinkCard key={item.id} item={item} onOpen={onOpen} onCategory={onCategory} />
        ))}
      </ScrollView>
    );
  }
  return (
    <ScrollView contentContainerStyle={s.list}>
      {items.map((item) => (
        <MixedCard key={item.id} item={item} onOpen={onOpen} onCategory={onCategory} />
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1 },
  head: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontFamily: font, fontSize: 32, fontWeight: '700', color: colors.ink },
  chips: { paddingLeft: 16, marginBottom: 8 },
  feed: { flex: 1, paddingHorizontal: 16 },
  list: { paddingBottom: 12 },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 12 },
});
