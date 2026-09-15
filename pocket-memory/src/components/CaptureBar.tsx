import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { captureEntries, colors, font, radius } from '../theme';

export function CaptureBar({ onPick }: { onPick: (id: (typeof captureEntries)[number]['id']) => void }) {
  return (
    <View style={s.wrap}>
      {captureEntries.map((entry) => (
        <Pressable key={entry.id} onPress={() => onPick(entry.id)} style={s.btn}>
          <View style={s.dot} />
          <Text style={s.label}>{entry.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function CaptureLayer({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (id: (typeof captureEntries)[number]['id']) => void;
}) {
  if (!visible) return null;
  return (
    <View style={s.overlay}>
      <Pressable style={s.dim} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.head}>
          <Text style={s.title}>捕捉</Text>
          <Pressable onPress={onClose} style={s.close}>
            <Text style={s.closeText}>关闭</Text>
          </Pressable>
        </View>
        <View style={s.grid}>
          {captureEntries.map((entry) => (
            <Pressable key={entry.id} onPress={() => onPick(entry.id)} style={s.tile}>
              <View style={s.circle} />
              <Text style={s.tileLabel}>{entry.label}</Text>
              <Text style={s.hint}>{entry.hint}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  btn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.btn,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: colors.bg,
    minHeight: 64,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.line,
    marginBottom: 6,
  },
  label: { fontFamily: font, fontSize: 11, color: colors.ink, textAlign: 'center' },
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'center', zIndex: 20 },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  sheet: {
    marginHorizontal: 18,
    backgroundColor: colors.bg,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontFamily: font, fontSize: 18, fontWeight: '600', color: colors.ink },
  close: {
    position: 'absolute',
    right: 0,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  closeText: { fontFamily: font, fontSize: 13, color: colors.ink },
  grid: { flexDirection: 'row', gap: 8 },
  tile: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 18,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 2,
    minHeight: 180,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.line,
    marginBottom: 16,
  },
  tileLabel: { fontFamily: font, fontSize: 13, color: colors.ink, textAlign: 'center' },
  hint: { fontFamily: font, fontSize: 11, color: colors.muted, marginTop: 10, textAlign: 'center' },
});
