import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { buildDigest } from '../digest';
import { useStore } from '../store';
import { colors, font, radius } from '../theme';
import type { MemoryItem } from '../types';

export function DigestSheet({
  initialTopic,
  categoryId,
  onClose,
  onOpen,
}: {
  initialTopic: string;
  categoryId: string | null;
  onClose: () => void;
  onOpen: (item: MemoryItem) => void;
}) {
  const { search, categories, items } = useStore();
  const [draft, setDraft] = useState(initialTopic);
  const [topic, setTopic] = useState(initialTopic.trim());
  const scoped = !!categoryId;
  const catName = categories.find((c) => c.id === categoryId)?.name;
  const matches = useMemo(() => {
    if (!topic && !scoped) return [];
    return search(topic, categoryId);
  }, [search, topic, categoryId]);
  const digest = useMemo(
    () => buildDigest(topic || catName || '这一批', matches, categories),
    [topic, catName, matches, categories],
  );
  const canRun = !!draft.trim() || scoped;
  const idle = !topic && !scoped;

  return (
    <View style={s.overlay}>
      <Pressable style={s.dim} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.head}>
          <Text style={s.title}>整理</Text>
          <Pressable onPress={onClose} style={s.close}>
            <Text style={s.closeText}>关闭</Text>
          </Pressable>
        </View>
        <Text style={s.hint}>
          {scoped ? `在「${catName}」里按词归堆。` : '输入主题，本机扫一遍库，给出浅读。'}
        </Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="比如：经济学"
          placeholderTextColor={colors.muted}
          style={s.input}
          returnKeyType="search"
          onSubmitEditing={() => canRun && setTopic(draft.trim())}
        />
        <Pressable
          style={[s.run, !canRun && { opacity: 0.4 }]}
          disabled={!canRun}
          onPress={() => setTopic(draft.trim())}
        >
          <Text style={s.runText}>{matches.length || topic || scoped ? '再扫一遍' : '开始整理'}</Text>
        </Pressable>

        <ScrollView style={s.body} contentContainerStyle={s.bodyInner}>
          {idle ? (
            <Text style={s.quiet}>先写一个主题。不会假装成大模型问答。</Text>
          ) : (
            <>
              <Text style={s.reading}>{digest.reading}</Text>
              {digest.byType.length > 0 && (
                <Text style={s.meta}>
                  类型 {digest.byType.map((x) => `${x.label} ${x.n}`).join(' · ')}
                </Text>
              )}
              {digest.byCategory.length > 0 && (
                <Text style={s.meta}>
                  类目 {digest.byCategory.map((x) => `${x.label} ${x.n}`).join(' · ')}
                </Text>
              )}
              {digest.excerpts.length > 0 && <Text style={s.section}>摘录</Text>}
              {digest.excerpts.map((ex) => {
                const item = items.find((it) => it.id === ex.id);
                return (
                  <Pressable
                    key={ex.id}
                    style={s.excerpt}
                    onPress={() => item && onOpen(item)}
                  >
                    <Text style={s.excerptText}>{ex.line}</Text>
                  </Pressable>
                );
              })}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end', zIndex: 35 },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: 16,
    paddingBottom: 20,
    maxHeight: '88%',
    minHeight: '62%',
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontFamily: font, fontSize: 18, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  close: {
    position: 'absolute',
    right: 0,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderColor: colors.line,
  },
  closeText: { fontFamily: font, fontSize: 13, color: colors.ink },
  hint: { fontFamily: font, fontSize: 13, color: colors.muted, marginBottom: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: font,
    fontSize: 16,
  },
  run: {
    marginTop: 10,
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  runText: { color: '#fff', fontFamily: font, fontSize: 16 },
  body: { marginTop: 14 },
  bodyInner: { paddingBottom: 24, gap: 8 },
  reading: { fontFamily: font, fontSize: 16, lineHeight: 24, color: colors.ink },
  meta: { fontFamily: font, fontSize: 13, color: colors.muted, lineHeight: 20 },
  section: { fontFamily: font, fontSize: 12, color: colors.muted, marginTop: 8 },
  excerpt: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 10,
  },
  excerptText: { fontFamily: font, fontSize: 14, color: colors.ink, lineHeight: 20 },
  quiet: { fontFamily: font, fontSize: 14, color: colors.muted, lineHeight: 22 },
});
