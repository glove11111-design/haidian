import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatClock, formatWhen } from '../format';
import { useCategoryName } from '../store';
import { colors, font, radius } from '../theme';
import type { MemoryItem } from '../types';

function CatChip({
  item,
  onPress,
}: {
  item: MemoryItem;
  onPress: (item: MemoryItem) => void;
}) {
  const name = useCategoryName(item.categoryId);
  return (
    <Pressable onPress={() => onPress(item)} hitSlop={8} style={s.chip}>
      <Text style={s.chipText}>{item.classifying ? '归类中' : name}</Text>
    </Pressable>
  );
}

function MediaBox({
  uri,
  children,
  fill,
}: {
  uri?: string;
  children?: React.ReactNode;
  fill?: boolean;
}) {
  return (
    <View style={[s.media, fill && s.mediaFill]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={s.cross} />
      )}
      {children}
    </View>
  );
}

export function MixedCard({
  item,
  onOpen,
  onCategory,
}: {
  item: MemoryItem;
  onOpen: (item: MemoryItem) => void;
  onCategory: (item: MemoryItem) => void;
}) {
  return (
    <Pressable onPress={() => onOpen(item)} onLongPress={() => onCategory(item)} style={s.card}>
      {item.type === 'image' && (
        <>
          <MediaBox uri={item.thumbnailUri || item.mediaUri || item.coverUri}>
            {item.imageCount && item.imageCount > 1 ? (
              <View style={s.badge}>
                <Text style={s.badgeText}>{item.imageCount}</Text>
              </View>
            ) : null}
          </MediaBox>
          <View style={s.metaRow}>
            <CatChip item={item} onPress={onCategory} />
            <Text style={s.oneLine} numberOfLines={1}>
              {item.caption || item.text || ''}
            </Text>
          </View>
        </>
      )}
      {item.type === 'video' && (
        <View style={s.videoRow}>
          <View style={s.thumb}>
            <MediaBox fill uri={item.thumbnailUri || item.coverUri}>
              {item.videoKind === 'social' ? (
                <View style={s.linkBadge}>
                  <Text style={s.badgeText}>链</Text>
                </View>
              ) : (
                <View style={s.play}>
                  <Text style={s.playText}>▶</Text>
                </View>
              )}
              {item.durationMs ? (
                <View style={s.dur}>
                  <Text style={s.badgeText}>{formatClock(item.durationMs)}</Text>
                </View>
              ) : null}
            </MediaBox>
          </View>
          <View style={s.videoMeta}>
            <CatChip item={item} onPress={onCategory} />
            <Text style={s.body} numberOfLines={2}>
              {item.caption || item.title || (item.videoKind === 'own' ? '自己录的一段' : '信息流视频')}
            </Text>
            <Text style={s.quiet}>{item.author || formatWhen(item.createdAt)}</Text>
          </View>
        </View>
      )}
      {item.type === 'text' && (
        <>
          <View style={s.topRow}>
            <CatChip item={item} onPress={onCategory} />
            <Text style={s.quiet}>{item.syncStatus === 'failed' ? '云还没跟上' : '本机'}</Text>
          </View>
          <Text style={s.body} numberOfLines={5}>
            {item.text}
          </Text>
        </>
      )}
      {item.type === 'audio' && (
        <>
          <View style={s.topRow}>
            <CatChip item={item} onPress={onCategory} />
            <Text style={s.quiet}>{formatClock(item.durationMs ?? 0)}</Text>
          </View>
          <Text style={[s.body, !item.transcript && { color: colors.muted }]} numberOfLines={2}>
            {item.transcript || '暂无转写'}
          </Text>
        </>
      )}
      {item.type === 'link' && (
        <>
          {item.coverUri ? (
            <MediaBox uri={item.coverUri} />
          ) : (
            <View style={s.fallback}>
              <Text style={s.fallbackTitle}>{item.title || '链接'}</Text>
              <Text style={s.quiet}>{safeHost(item.url)}</Text>
            </View>
          )}
          <View style={s.metaRow}>
            <CatChip item={item} onPress={onCategory} />
            <Text style={s.oneLine} numberOfLines={1}>
              {item.title || item.caption || item.url}
            </Text>
          </View>
          {item.author || item.sourceApp ? (
            <Text style={s.quiet}>
              {[item.author, item.sourceApp].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

export function GalleryTile({
  item,
  onOpen,
  onCategory,
}: {
  item: MemoryItem;
  onOpen: (item: MemoryItem) => void;
  onCategory: (item: MemoryItem) => void;
}) {
  return (
    <Pressable onPress={() => onOpen(item)} onLongPress={() => onCategory(item)} style={s.tile}>
      <MediaBox fill uri={item.thumbnailUri || item.mediaUri || item.coverUri}>
        {item.type === 'video' && item.videoKind === 'social' ? (
          <View style={s.linkBadge}>
            <Text style={s.badgeText}>链</Text>
          </View>
        ) : null}
        {item.type === 'video' && item.videoKind === 'own' ? (
          <View style={s.play}>
            <Text style={s.playText}>▶</Text>
          </View>
        ) : null}
        {item.type === 'video' && item.durationMs ? (
          <View style={s.dur}>
            <Text style={s.badgeText}>{formatClock(item.durationMs)}</Text>
          </View>
        ) : null}
        {item.imageCount && item.imageCount > 1 ? (
          <View style={s.badge}>
            <Text style={s.badgeText}>{item.imageCount}</Text>
          </View>
        ) : null}
        <View style={s.chipOnMedia}>
          <CatChip item={item} onPress={onCategory} />
        </View>
      </MediaBox>
    </Pressable>
  );
}

export function TextCard({
  item,
  onOpen,
  onCategory,
}: {
  item: MemoryItem;
  onOpen: (item: MemoryItem) => void;
  onCategory: (item: MemoryItem) => void;
}) {
  return (
    <Pressable onPress={() => onOpen(item)} onLongPress={() => onCategory(item)} style={s.card}>
      <View style={s.topRow}>
        <CatChip item={item} onPress={onCategory} />
        <Text style={s.quiet}>{formatWhen(item.createdAt)}</Text>
      </View>
      <Text style={s.body} numberOfLines={6}>
        {item.text}
      </Text>
    </Pressable>
  );
}

export function AudioCard({
  item,
  onOpen,
  onCategory,
}: {
  item: MemoryItem;
  onOpen: (item: MemoryItem) => void;
  onCategory: (item: MemoryItem) => void;
}) {
  return (
    <Pressable onPress={() => onOpen(item)} onLongPress={() => onCategory(item)} style={s.card}>
      <View style={s.topRow}>
        <Text style={s.playText}>▶  {formatClock(item.durationMs ?? 0)}</Text>
        <CatChip item={item} onPress={onCategory} />
      </View>
      <Text style={[s.body, !item.transcript && { color: colors.muted }]} numberOfLines={2}>
        {item.transcript || '暂无转写'}
      </Text>
    </Pressable>
  );
}

export function LinkCard({
  item,
  onOpen,
  onCategory,
}: {
  item: MemoryItem;
  onOpen: (item: MemoryItem) => void;
  onCategory: (item: MemoryItem) => void;
}) {
  return (
    <Pressable onPress={() => onOpen(item)} onLongPress={() => onCategory(item)} style={s.card}>
      {item.coverUri ? (
        <MediaBox uri={item.coverUri} />
      ) : (
        <View style={s.fallback}>
          <Text style={s.fallbackTitle}>{item.title || '链接'}</Text>
          <Text style={s.quiet}>{safeHost(item.url)}</Text>
        </View>
      )}
      <View style={s.metaRow}>
        <CatChip item={item} onPress={onCategory} />
        {item.coverUri ? (
          <Text style={s.oneLine} numberOfLines={1}>
            {item.title || item.caption}
          </Text>
        ) : null}
      </View>
      {item.author || item.sourceApp ? (
        <Text style={s.quiet}>{[item.author, item.sourceApp].filter(Boolean).join(' · ')}</Text>
      ) : null}
    </Pressable>
  );
}

function safeHost(url?: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const s = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: 12,
    marginBottom: 12,
    backgroundColor: colors.bg,
    gap: 8,
  },
  tile: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.faint,
  },
  media: {
    height: 148,
    borderRadius: 10,
    backgroundColor: colors.faint,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaFill: { height: '100%', borderRadius: 0 },
  cross: {
    width: '70%',
    height: '70%',
    borderWidth: 1,
    borderColor: '#c8c8c8',
    transform: [{ rotate: '0deg' }],
  },
  thumb: { width: 108, height: 80, overflow: 'hidden', borderRadius: 10 },
  videoRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  videoMeta: { flex: 1, gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: {
    borderWidth: 1.2,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.bg,
  },
  chipText: { fontFamily: font, fontSize: 11, color: colors.ink },
  chipOnMedia: { position: 'absolute', left: 8, bottom: 8 },
  body: { fontFamily: font, fontSize: 15, color: colors.ink, lineHeight: 22 },
  oneLine: { fontFamily: font, fontSize: 14, color: colors.ink, flex: 1 },
  quiet: { fontFamily: font, fontSize: 12, color: colors.muted },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  linkBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  dur: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: { color: '#fff', fontSize: 11, fontFamily: font },
  play: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  playText: { fontFamily: font, fontSize: 14, color: colors.ink },
  fallback: { paddingVertical: 18, paddingHorizontal: 4, gap: 6 },
  fallbackTitle: { fontFamily: font, fontSize: 22, color: colors.ink, fontWeight: '600' },
});
