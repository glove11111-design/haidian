import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font } from '../theme';
import type { ItemType } from '../types';

const typeEmpty: Record<ItemType, string> = {
  image: '还没有图',
  video: '还没有视频',
  text: '还没有文字',
  audio: '还没有音频',
  link: '还没有链接',
};

export function EmptyLibrary() {
  return (
    <View style={s.center}>
      <Text style={s.line}>想到或看到，丢进去就好</Text>
    </View>
  );
}

export function EmptyType({ type }: { type: ItemType }) {
  return (
    <View style={s.center}>
      <Text style={s.line}>{typeEmpty[type]}</Text>
      <Text style={s.sub}>用下面的入口，或从别的 App 分享进来</Text>
    </View>
  );
}

export function EmptyCategory({ onBack }: { onBack: () => void }) {
  return (
    <View style={s.center}>
      <Text style={s.line}>这一类还是空的</Text>
      <Pressable onPress={onBack} style={s.link}>
        <Text style={s.linkText}>回全部</Text>
      </Pressable>
    </View>
  );
}

export function EmptySearch({ onClear }: { onClear: () => void }) {
  return (
    <View style={s.center}>
      <Text style={s.line}>换个词，或去库里按类扫</Text>
      <Pressable onPress={onClear} style={s.link}>
        <Text style={s.linkText}>清空搜索</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  line: { fontFamily: font, fontSize: 16, color: colors.ink, textAlign: 'center' },
  sub: { fontFamily: font, fontSize: 13, color: colors.muted, marginTop: 8, textAlign: 'center' },
  link: { marginTop: 12, borderBottomWidth: 1, borderBottomColor: colors.ink },
  linkText: { fontFamily: font, fontSize: 14, color: colors.ink },
});
