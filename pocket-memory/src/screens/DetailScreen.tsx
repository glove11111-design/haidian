import { useAudioPlayer } from 'expo-audio';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatClock, formatWhen } from '../format';
import { useCategoryName, useStore } from '../store';
import { colors, font } from '../theme';
import type { MemoryItem } from '../types';

export function DetailScreen({
  item,
  onClose,
  onCategory,
}: {
  item: MemoryItem;
  onClose: () => void;
  onCategory: () => void;
}) {
  const { deleteItem, updateItem } = useStore();
  const cat = useCategoryName(item.categoryId);
  const [confirm, setConfirm] = useState(false);

  return (
    <View style={s.page}>
      <View style={s.top}>
        <Pressable onPress={onClose} style={s.ghost}>
          <Text style={s.ghostText}>关闭</Text>
        </Pressable>
        <Pressable onPress={onCategory} style={s.chip}>
          <Text style={s.chipText}>{item.classifying ? '归类中' : cat}</Text>
        </Pressable>
        <Text style={s.quiet}>{formatWhen(item.createdAt)}</Text>
        <Text style={s.quiet}>{item.syncStatus === 'failed' ? '云还没跟上' : '本机'}</Text>
        <Pressable onPress={() => setConfirm(true)} style={s.ghost}>
          <Text style={[s.ghostText, { color: colors.danger }]}>删除</Text>
        </Pressable>
      </View>
      {confirm && (
        <View style={s.confirm}>
          <Text style={s.copy}>删除这条？删了就从本机拿走。</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Pressable style={s.playBar} onPress={() => setConfirm(false)}>
              <Text style={s.copy}>取消</Text>
            </Pressable>
            <Pressable
              style={[s.playBar, { borderColor: colors.danger }]}
              onPress={() => {
                void deleteItem(item.id);
                onClose();
              }}
            >
              <Text style={[s.copy, { color: colors.danger }]}>删除</Text>
            </Pressable>
          </View>
        </View>
      )}
      <ScrollView contentContainerStyle={s.body}>
        {item.type === 'text' && <TextBody item={item} onChange={(text) => void updateItem(item.id, { text })} />}
        {item.type === 'image' && <ImageBody item={item} />}
        {item.type === 'video' && item.videoKind === 'own' && <OwnVideoBody item={item} />}
        {item.type === 'video' && item.videoKind !== 'own' && <SocialBody item={item} openLabel="打开原帖" />}
        {item.type === 'audio' && <AudioBody item={item} />}
        {item.type === 'link' && <SocialBody item={item} openLabel="打开网页" />}
      </ScrollView>
    </View>
  );
}

function TextBody({ item, onChange }: { item: MemoryItem; onChange: (text: string) => void }) {
  const [text, setText] = useState(item.text ?? '');
  return (
    <TextInput
      value={text}
      onChangeText={setText}
      onBlur={() => onChange(text)}
      multiline
      style={s.article}
    />
  );
}

function ImageBody({ item }: { item: MemoryItem }) {
  const uris = [item.mediaUri || item.coverUri, ...(item.extraImageUris ?? [])].filter(Boolean) as string[];
  return (
    <View style={{ gap: 12 }}>
      {uris.map((uri) => (
        <Image key={uri} source={{ uri }} style={s.hero} contentFit="cover" />
      ))}
      {item.caption ? <Text style={s.copy}>{item.caption}</Text> : null}
      {item.author || item.sourceApp ? (
        <Text style={s.meta}>
          {item.author} {item.sourceApp ? `来自${item.sourceApp}` : ''}
        </Text>
      ) : null}
      {item.parseIncomplete ? <Incomplete item={item} /> : null}
    </View>
  );
}

function OwnVideoBody({ item }: { item: MemoryItem }) {
  if (!item.mediaUri) {
    return <Text style={s.meta}>成片在本机，打开设备后可播。</Text>;
  }
  return <OwnVideoPlayer uri={item.mediaUri} durationMs={item.durationMs} />;
}

function OwnVideoPlayer({ uri, durationMs }: { uri: string; durationMs?: number }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return (
    <View style={{ gap: 12 }}>
      <VideoView player={player} style={s.hero} nativeControls contentFit="contain" />
      <Pressable
        style={s.playBar}
        onPress={() => {
          if (player.playing) player.pause();
          else player.play();
        }}
      >
        <Text style={s.copy}>▶  {formatClock(durationMs ?? 0)}</Text>
      </Pressable>
    </View>
  );
}

function SocialBody({ item, openLabel }: { item: MemoryItem; openLabel: string }) {
  const open = () => {
    if (item.url) void Linking.openURL(item.url);
  };
  return (
    <View style={{ gap: 12 }}>
      {item.coverUri || item.thumbnailUri ? (
        <View>
          <Image source={{ uri: item.coverUri || item.thumbnailUri }} style={s.hero} contentFit="cover" />
          {item.type === 'video' ? (
            <View style={s.chain}>
              <Text style={s.chainText}>链</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={s.fallback}>
          <Text style={s.big}>{item.title || '已收下'}</Text>
          <Text style={s.meta}>{item.url}</Text>
        </View>
      )}
      {item.caption || item.title ? <Text style={s.copy}>{item.caption || item.title}</Text> : null}
      {item.author || item.sourceApp ? (
        <Text style={s.meta}>
          {[item.author, item.sourceApp ? `来自${item.sourceApp}` : ''].filter(Boolean).join('  ')}
        </Text>
      ) : null}
      {item.parseIncomplete ? <Incomplete item={item} /> : null}
      {item.url ? (
        <Pressable style={s.cta} onPress={open}>
          <Text style={s.ctaText}>{openLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function AudioBody({ item }: { item: MemoryItem }) {
  if (!item.mediaUri) {
    return (
      <View style={{ gap: 12 }}>
        <View style={s.playBar}>
          <Text style={s.copy}>▶  {formatClock(item.durationMs ?? 0)}</Text>
        </View>
        {item.transcript ? <Text style={s.copy}>{item.transcript}</Text> : <Text style={s.meta}>暂无转写</Text>}
      </View>
    );
  }
  return <AudioPlayerBlock uri={item.mediaUri} durationMs={item.durationMs} transcript={item.transcript} />;
}

function AudioPlayerBlock({
  uri,
  durationMs,
  transcript,
}: {
  uri: string;
  durationMs?: number;
  transcript?: string;
}) {
  const player = useAudioPlayer(uri);
  return (
    <View style={{ gap: 12 }}>
      <Pressable
        style={s.playBar}
        onPress={() => {
          if (player.playing) player.pause();
          else player.play();
        }}
      >
        <Text style={s.copy}>▶  {formatClock(durationMs ?? 0)}</Text>
      </Pressable>
      {transcript ? <Text style={s.copy}>{transcript}</Text> : <Text style={s.meta}>暂无转写</Text>}
    </View>
  );
}

function Incomplete({ item }: { item: MemoryItem }) {
  return (
    <View style={s.warn}>
      <Text style={s.warnText}>
        已收下，但还缺{!item.coverUri ? '封面' : ''}
        {!item.coverUri && !(item.caption || item.title) ? '、' : ''}
        {!(item.caption || item.title) ? '文案' : ''}
        {!(item.caption || item.title) && !item.author ? '、' : ''}
        {!item.author ? '作者' : ''}。可打开原帖，稍后会再试。
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  page: { ...StyleSheet.absoluteFill, backgroundColor: colors.bg, zIndex: 40 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  ghost: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ghostText: { fontFamily: font, fontSize: 13, color: colors.ink },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontFamily: font, fontSize: 13, color: colors.ink },
  quiet: { fontFamily: font, fontSize: 12, color: colors.muted },
  body: { padding: 16, paddingBottom: 40, gap: 12 },
  article: { fontFamily: font, fontSize: 17, lineHeight: 26, color: colors.ink, minHeight: 200 },
  hero: { width: '100%', height: 220, borderRadius: 14, backgroundColor: colors.faint },
  copy: { fontFamily: font, fontSize: 16, lineHeight: 24, color: colors.ink },
  meta: { fontFamily: font, fontSize: 13, color: colors.muted },
  cta: {
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaText: { color: '#fff', fontFamily: font, fontSize: 16 },
  playBar: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
  },
  chain: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chainText: { color: '#fff', fontSize: 12, fontFamily: font },
  fallback: { paddingVertical: 20, gap: 8 },
  big: { fontFamily: font, fontSize: 24, fontWeight: '700', color: colors.ink },
  warn: { backgroundColor: colors.warnBg, borderRadius: 10, padding: 10 },
  warnText: { fontFamily: font, fontSize: 13, color: colors.warn, lineHeight: 20 },
  confirm: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
  },
});
