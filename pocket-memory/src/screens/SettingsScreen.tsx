import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../store';
import { colors, font } from '../theme';

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const { settings, cloudStatus, items, setCloudEnabled, retrySync, restoreFromCloud } = useStore();
  const failed = items.some((it) => it.syncStatus === 'failed');
  const statusText =
    !settings.cloudEnabled
      ? '已关闭'
      : cloudStatus === 'syncing'
        ? '同步中'
        : cloudStatus === 'failed' || failed
          ? '失败，可重试'
          : '已同步';

  return (
    <View style={s.page}>
      <View style={s.top}>
        <Text style={s.title}>设置</Text>
        <Pressable onPress={onClose} style={s.ghost}>
          <Text style={s.ghostText}>关闭</Text>
        </Pressable>
      </View>
      <View style={s.block}>
        <Text style={s.label}>本机</Text>
        <Text style={s.value}>已收下 {items.length} 条，都在这台设备上</Text>
      </View>
      <View style={s.block}>
        <Text style={s.label}>云</Text>
        <Text style={s.value}>{statusText}</Text>
        {(cloudStatus === 'failed' || failed) && (
          <Text style={s.warn}>本机已有；云还没跟上</Text>
        )}
        <Pressable style={s.row} onPress={() => void setCloudEnabled(!settings.cloudEnabled)}>
          <Text style={s.rowText}>{settings.cloudEnabled ? '关闭云同步' : '开启云同步'}</Text>
        </Pressable>
        <Pressable style={s.row} onPress={() => void retrySync()}>
          <Text style={s.rowText}>重试同步</Text>
        </Pressable>
        <Pressable style={s.row} onPress={() => void restoreFromCloud()}>
          <Text style={s.rowText}>从云恢复</Text>
        </Pressable>
      </View>
      <View style={s.block}>
        <Text style={s.label}>权限</Text>
        <Text style={s.value}>拍照、相册、麦克风按系统询问。关掉后，对应捕捉会提示不可用。</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  page: { ...StyleSheet.absoluteFill, backgroundColor: colors.bg, zIndex: 40, padding: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontFamily: font, fontSize: 28, fontWeight: '700', color: colors.ink },
  ghost: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ghostText: { fontFamily: font, fontSize: 14, color: colors.ink },
  block: { marginBottom: 22, gap: 8 },
  label: { fontFamily: font, fontSize: 13, color: colors.muted },
  value: { fontFamily: font, fontSize: 16, color: colors.ink, lineHeight: 22 },
  warn: { fontFamily: font, fontSize: 13, color: colors.danger },
  row: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  rowText: { fontFamily: font, fontSize: 15, color: colors.ink },
});
