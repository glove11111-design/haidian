import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppShell } from './src/components/AppShell';
import { CaptureLayer } from './src/components/CaptureBar';
import {
  AudioComposer,
  LinkComposer,
  NoteSheet,
  PermissionNote,
  PhotoChoice,
  TextComposer,
} from './src/components/CaptureFlow';
import { CategorySheet } from './src/components/CategorySheet';
import { TabBar } from './src/components/TabBar';
import { classifyUrl, parseSharedUrl } from './src/linkMeta';
import { pickImages, pickVideo } from './src/media';
import { DetailScreen } from './src/screens/DetailScreen';
import { FindScreen } from './src/screens/FindScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { StoreProvider, useStore } from './src/store';
import { colors } from './src/theme';
import type { CaptureKind, MemoryItem, TypeFilter } from './src/types';

type CaptureOverlay =
  | 'none'
  | 'layer'
  | 'photo-choice'
  | 'text'
  | 'link'
  | 'audio'
  | 'settings'
  | 'permission'
  | 'note';

function Root() {
  const { items, ingest, ingestMany, updateItem } = useStore();
  const [tab, setTab] = useState<'library' | 'find'>('library');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [rememberedType, setRememberedType] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [capture, setCapture] = useState<CaptureOverlay>('none');
  const [permissionMessage, setPermissionMessage] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [categoryItemId, setCategoryItemId] = useState<string | null>(null);
  const [noteItemIds, setNoteItemIds] = useState<string[]>([]);

  const landInLibrary = useCallback(() => {
    setTab('library');
    setTypeFilter('all');
    setCategoryFilter(null);
  }, []);

  const afterCapture = useCallback(() => {
    landInLibrary();
    setCapture('none');
  }, [landInLibrary]);

  const askNote = useCallback(
    (ids: string[]) => {
      landInLibrary();
      setNoteItemIds(ids);
      setCapture('note');
    },
    [landInLibrary],
  );

  const saveNote = async (note: string) => {
    if (note) {
      await Promise.all(noteItemIds.map((id) => updateItem(id, { note })));
    }
    setNoteItemIds([]);
    setCapture('none');
  };

  const openItem = (item: MemoryItem) => setDetailId(item.id);
  const changeCat = (item: MemoryItem) => setCategoryItemId(item.id);

  const startCapture = (kind: CaptureKind) => {
    if (kind === 'text') setCapture('text');
    else if (kind === 'link') setCapture('link');
    else if (kind === 'audio') setCapture('audio');
    else if (kind === 'photo' || kind === 'album') setCapture('photo-choice');
    else if (kind === 'video') void captureVideo();
  };

  const saveText = async (text: string) => {
    await ingest({ type: 'text', text });
    afterCapture();
  };

  const saveLink = async (raw: string) => {
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const classified = classifyUrl(url);
    const created = await ingest({
      type: classified.type,
      videoKind: classified.videoKind,
      url,
      sourceApp: classified.sourceApp,
      parseIncomplete: true,
      imageCount: classified.type === 'image' ? 1 : undefined,
    });
    afterCapture();
    try {
      const meta = await parseSharedUrl(url);
      await updateItem(created.id, {
        type: meta.type,
        videoKind: meta.videoKind,
        title: meta.title,
        caption: meta.caption,
        author: meta.author,
        sourceApp: meta.sourceApp ?? classified.sourceApp,
        coverUri: meta.coverUri,
        thumbnailUri: meta.coverUri,
        parseIncomplete: meta.parseIncomplete,
        durationMs: meta.durationMs,
      });
    } catch {
      // local item already exists
    }
  };

  const saveAudio = async (uri: string, durationMs: number) => {
    await ingest({ type: 'audio', mediaUri: uri, durationMs });
    afterCapture();
  };

  const captureImages = async (camera: boolean) => {
    const result = await pickImages({ camera, multiple: !camera });
    if (!result.ok) {
      if (result.reason === 'permission') {
        setPermissionMessage('没有相机或相册权限，去系统设置打开后再试。');
        setCapture('permission');
        return;
      }
      setCapture('none');
      return;
    }
    const created = await ingestMany(
      result.assets.map((asset) => ({
        type: 'image' as const,
        mediaUri: asset.uri,
        thumbnailUri: asset.thumbnailUri,
      })),
    );
    askNote(created.map((it) => it.id));
  };

  const captureVideo = async () => {
    let result = await pickVideo({ camera: true });
    if (!result.ok && (result.reason === 'permission' || Platform.OS === 'web')) {
      result = await pickVideo({ camera: false });
    }
    if (!result.ok) {
      if (result.reason === 'permission') {
        setPermissionMessage('没有相机或相册权限，去系统设置打开后再试。');
        setCapture('permission');
        return;
      }
      setCapture('none');
      return;
    }
    const created = await ingest({
      type: 'video',
      videoKind: 'own',
      mediaUri: result.asset.uri,
      thumbnailUri: result.asset.thumbnailUri,
      durationMs: result.asset.durationMs,
    });
    askNote([created.id]);
  };

  const detailItem = items.find((it) => it.id === detailId);
  const categoryItem = items.find((it) => it.id === categoryItemId);

  return (
    <View style={s.root}>
      {tab === 'library' ? (
        <LibraryScreen
          typeFilter={typeFilter}
          categoryId={categoryFilter}
          onType={(t) => {
            setTypeFilter(t);
            setRememberedType(t);
          }}
          onCategoryFilter={setCategoryFilter}
          onOpen={openItem}
          onChangeCategory={changeCat}
          onSettings={() => setCapture('settings')}
          onCapture={() => setCapture('layer')}
        />
      ) : (
        <FindScreen onOpen={openItem} onChangeCategory={changeCat} onCapture={() => setCapture('layer')} />
      )}
      <TabBar
        tab={tab}
        onChange={(next) => {
          if (next === 'library') setTypeFilter(rememberedType);
          setTab(next);
        }}
      />

      <CaptureLayer
        visible={capture === 'layer'}
        onClose={() => setCapture('none')}
        onPick={startCapture}
      />
      {capture === 'photo-choice' && (
        <PhotoChoice
          onClose={() => setCapture('none')}
          onCamera={() => void captureImages(true)}
          onAlbum={() => void captureImages(false)}
        />
      )}
      {capture === 'text' && (
        <TextComposer onClose={() => setCapture('none')} onSave={(t) => void saveText(t)} />
      )}
      {capture === 'link' && (
        <LinkComposer onClose={() => setCapture('none')} onSave={(u) => void saveLink(u)} />
      )}
      {capture === 'audio' && (
        <AudioComposer
          onClose={() => setCapture('none')}
          onSave={(uri, ms) => void saveAudio(uri, ms)}
          onPermission={() => {
            setPermissionMessage('没有麦克风权限，去系统设置打开后再试。');
            setCapture('permission');
          }}
        />
      )}
      {capture === 'permission' && (
        <PermissionNote message={permissionMessage} onClose={() => setCapture('none')} />
      )}
      {capture === 'note' && (
        <NoteSheet
          onSkip={() => {
            setNoteItemIds([]);
            setCapture('none');
          }}
          onSave={(note) => void saveNote(note)}
        />
      )}
      {capture === 'settings' && <SettingsScreen onClose={() => setCapture('none')} />}
      {detailItem && (
        <DetailScreen
          key={detailItem.id}
          item={detailItem}
          onClose={() => setDetailId(null)}
          onCategory={() => setCategoryItemId(detailItem.id)}
        />
      )}
      {categoryItem && (
        <CategorySheet item={categoryItem} onClose={() => setCategoryItemId(null)} />
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <AppShell>
          <Root />
        </AppShell>
        <StatusBar style="dark" />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
