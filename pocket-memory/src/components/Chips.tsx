import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius } from '../theme';

export function Pill({
  label,
  selected,
  onPress,
  muted,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  muted?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        pill.base,
        selected && pill.on,
        muted && !selected && pill.muted,
      ]}
    >
      <Text style={[pill.text, selected && pill.textOn]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={pill.row}
    >
      {children}
    </ScrollView>
  );
}

export function GhostBtn({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[pill.ghost, danger && pill.ghostDanger]}>
      <Text style={[pill.ghostText, danger && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

const pill = StyleSheet.create({
  row: { gap: 8, paddingRight: 16, alignItems: 'center' },
  base: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.chip,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: colors.bg,
  },
  on: { backgroundColor: colors.ink },
  muted: { opacity: 0.55 },
  text: { fontFamily: font, fontSize: 13, color: colors.ink },
  textOn: { color: '#fff' },
  ghost: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.chip,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.bg,
  },
  ghostDanger: { borderColor: colors.danger },
  ghostText: { fontFamily: font, fontSize: 13, color: colors.ink },
});
