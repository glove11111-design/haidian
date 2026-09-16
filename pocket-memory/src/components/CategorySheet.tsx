import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useStore } from '../store';
import { colors, font, radius } from '../theme';
import type { MemoryItem } from '../types';

export function CategorySheet({
  item,
  onClose,
}: {
  item: MemoryItem;
  onClose: () => void;
}) {
  const { categories, setCategory, createCategory } = useStore();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const current = categories.find((c) => c.id === item.categoryId);
  const base = categories.filter((c) => c.kind === 'base');
  const custom = categories.filter((c) => c.kind === 'custom');
  const uncat = categories.find((c) => c.kind === 'uncategorized');

  const pick = async (id: string) => {
    await setCategory(item.id, id);
    onClose();
  };

  return (
    <View style={s.overlay}>
      <Pressable style={s.dim} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.sheetWrap}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>改类目</Text>
          <Text style={s.section}>当前</Text>
          <View style={s.current}>
            <Text style={s.rowText}>{item.classifying ? '归类中' : current?.name ?? '未归类'}</Text>
            <Text style={s.quiet}>已选</Text>
          </View>
          <ScrollView style={s.list} keyboardShouldPersistTaps="handled">
            <Text style={s.section}>基础类目</Text>
            {base.map((c) => (
              <Pressable key={c.id} onPress={() => void pick(c.id)} style={s.row}>
                <View style={[s.radio, item.categoryId === c.id && s.radioOn]} />
                <Text style={s.rowText}>{c.name}</Text>
              </Pressable>
            ))}
            {custom.length > 0 && <Text style={s.section}>自建</Text>}
            {custom.map((c) => (
              <Pressable key={c.id} onPress={() => void pick(c.id)} style={s.row}>
                <View style={[s.radio, item.categoryId === c.id && s.radioOn]} />
                <Text style={s.rowText}>{c.name}</Text>
              </Pressable>
            ))}
            {uncat && (
              <Pressable onPress={() => void pick(uncat.id)} style={s.row}>
                <View style={[s.radio, item.categoryId === uncat.id && s.radioOn]} />
                <Text style={s.rowText}>{uncat.name}</Text>
              </Pressable>
            )}
          </ScrollView>
          {creating ? (
            <View style={s.createBox}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="类目名"
                placeholderTextColor={colors.muted}
                style={s.input}
                autoFocus
              />
              <Pressable
                style={s.primary}
                onPress={async () => {
                  if (!name.trim()) return;
                  await createCategory(name, item.id);
                  onClose();
                }}
              >
                <Text style={s.primaryText}>创建并套用</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={s.primary} onPress={() => setCreating(true)}>
              <Text style={s.primaryText}>新建类目</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end', zIndex: 30 },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  sheetWrap: { maxHeight: '86%' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: 16,
    paddingBottom: 22,
    maxHeight: '100%',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    marginBottom: 10,
  },
  title: { fontFamily: font, fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: 12 },
  section: { fontFamily: font, fontSize: 12, color: colors.muted, marginTop: 10, marginBottom: 6 },
  current: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.chip,
  },
  list: { maxHeight: 320 },
  row: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  radioOn: { backgroundColor: colors.ink },
  rowText: { fontFamily: font, fontSize: 16, color: colors.ink },
  quiet: { fontFamily: font, fontSize: 13, color: colors.muted },
  primary: {
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { fontFamily: font, fontSize: 16, color: colors.ink },
  createBox: { gap: 8, marginTop: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: font,
    fontSize: 16,
  },
});
