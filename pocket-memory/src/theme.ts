import { Platform, StyleSheet } from 'react-native';

export const colors = {
  bg: '#ffffff',
  ink: '#111111',
  muted: '#8a8a8a',
  line: '#111111',
  faint: '#ececec',
  chip: '#f4f4f4',
  overlay: 'rgba(0,0,0,0.38)',
  danger: '#c43c3c',
  warn: '#8a6a00',
  warnBg: '#fff6d8',
  page: '#d8d8d8',
};

export const font = Platform.select({
  ios: 'PingFang SC',
  android: 'sans-serif',
  web: 'PingFang SC, "Noto Sans SC", "Source Han Sans SC", system-ui, sans-serif',
  default: 'System',
});

export const radius = {
  chip: 999,
  card: 16,
  btn: 14,
  sheet: 22,
};

export const typeLabels: Record<string, string> = {
  all: '全部',
  image: '图',
  video: '视频',
  text: '文字',
  audio: '音频',
  link: '链接',
};

export const captureEntries = [
  { id: 'text' as const, label: '文字', hint: '打字' },
  { id: 'photo' as const, label: '拍照·相册', hint: '拍或选图' },
  { id: 'video' as const, label: '录像', hint: '自己录' },
  { id: 'audio' as const, label: '录音', hint: '录一段' },
  { id: 'link' as const, label: '链接', hint: '粘贴网址' },
];

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
