import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font } from '../theme';

export function TabBar({
  tab,
  onChange,
}: {
  tab: 'library' | 'find';
  onChange: (tab: 'library' | 'find') => void;
}) {
  return (
    <View style={s.wrap}>
      <Pressable onPress={() => onChange('library')} style={s.item}>
        <View style={[s.mark, tab === 'library' && s.markOn]} />
        <Text style={[s.label, tab === 'library' && s.on]}>库</Text>
      </Pressable>
      <Pressable onPress={() => onChange('find')} style={s.item}>
        <View style={[s.mark, tab === 'find' && s.markOn]} />
        <Text style={[s.label, tab === 'find' && s.on]}>找</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.faint,
    paddingTop: 8,
    paddingBottom: 10,
  },
  item: { flex: 1, alignItems: 'center' },
  mark: { width: 22, height: 3, borderRadius: 2, backgroundColor: 'transparent', marginBottom: 4 },
  markOn: { backgroundColor: colors.ink },
  label: { fontFamily: font, fontSize: 13, color: colors.muted },
  on: { color: colors.ink, fontWeight: '600' },
});
