import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { formatClock } from '../format';
import { persistUri, pickImages, pickVideo } from '../media';
import { colors, font, radius } from '../theme';
import type { CaptureKind } from '../types';

export function PhotoChoice({
  onCamera,
  onAlbum,
  onClose,
}: {
  onCamera: () => void;
  onAlbum: () => void;
  onClose: () => void;
}) {
  return (
    <View style={s.overlay}>
      <Pressable style={s.dim} onPress={onClose} />
      <View style={s.choice}>
        <Text style={s.title}>拍照·相册</Text>
        <Pressable style={s.row} onPress={onCamera}>
          <Text style={s.rowText}>拍照</Text>
        </Pressable>
        <Pressable style={s.row} onPress={onAlbum}>
          <Text style={s.rowText}>相册</Text>
        </Pressable>
        <Pressable style={s.cancel} onPress={onClose}>
          <Text style={s.quiet}>取消</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function PermissionNote({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <View style={s.overlay}>
      <Pressable style={s.dim} onPress={onClose} />
      <View style={s.choice}>
        <Text style={s.title}>这项捕捉不可用</Text>
        <Text style={s.body}>{message}</Text>
        <Pressable style={s.row} onPress={onClose}>
          <Text style={s.rowText}>知道了</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function TextComposer({
  onSave,
  onClose,
}: {
  onSave: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  return (
    <ComposerShell title="文字" onClose={onClose}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="想到的一句，丢进去就好"
        placeholderTextColor={colors.muted}
        multiline
        autoFocus
        style={s.area}
      />
      <Pressable
        style={[s.save, !text.trim() && { opacity: 0.4 }]}
        disabled={!text.trim()}
        onPress={() => onSave(text.trim())}
      >
        <Text style={s.saveText}>收下</Text>
      </Pressable>
    </ComposerShell>
  );
}

export function LinkComposer({
  onSave,
  onClose,
}: {
  onSave: (url: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState('');
  return (
    <ComposerShell title="链接" onClose={onClose}>
      <Text style={s.hint}>粘贴网址。网页进链接；抖音等视频帖进视频（封面+打开原帖）。</Text>
      <TextInput
        value={url}
        onChangeText={setUrl}
        placeholder="https://"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        style={s.input}
      />
      <Pressable
        style={[s.save, !url.trim() && { opacity: 0.4 }]}
        disabled={!url.trim()}
        onPress={() => onSave(url.trim())}
      >
        <Text style={s.saveText}>收下</Text>
      </Pressable>
    </ComposerShell>
  );
}

export function AudioComposer({
  onSave,
  onClose,
  onPermission,
}: {
  onSave: (uri: string, durationMs: number) => void;
  onClose: () => void;
  onPermission: () => void;
}) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 200);
  const [ready, setReady] = useState(false);

  const start = async () => {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      onPermission();
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setReady(true);
  };

  const stopAndSave = async () => {
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri) {
      onClose();
      return;
    }
    const persisted = await persistUri(uri, 'audio');
    onSave(persisted, state.durationMillis ?? 0);
  };

  return (
    <ComposerShell title="录音" onClose={onClose}>
      <Text style={s.clock}>{formatClock(state.durationMillis ?? 0)}</Text>
      <Text style={s.hint}>{state.isRecording ? '正在录…' : '录一段，停下来就收下'}</Text>
      {!state.isRecording ? (
        <Pressable style={s.save} onPress={() => void start()}>
          <Text style={s.saveText}>{ready ? '再录一段' : '开始录音'}</Text>
        </Pressable>
      ) : (
        <Pressable style={s.save} onPress={() => void stopAndSave()}>
          <Text style={s.saveText}>停并收下</Text>
        </Pressable>
      )}
    </ComposerShell>
  );
}

export function NoteSheet({
  onSkip,
  onSave,
}: {
  onSkip: () => void;
  onSave: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  return (
    <ComposerShell title="已收下" onClose={onSkip}>
      <Text style={s.hint}>补一句为什么收，免得以后忘。可跳过。</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="比如：这盏灯的颜色以后想用"
        placeholderTextColor={colors.muted}
        multiline
        autoFocus
        style={s.area}
      />
      <Pressable style={s.save} onPress={() => onSave(note.trim())}>
        <Text style={s.saveText}>{note.trim() ? '写好了' : '先不写'}</Text>
      </Pressable>
      <Pressable style={s.cancel} onPress={onSkip}>
        <Text style={s.quiet}>跳过</Text>
      </Pressable>
    </ComposerShell>
  );
}

function ComposerShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={s.overlay}>
      <Pressable style={s.dim} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.sheet}>
          <View style={s.head}>
            <Text style={s.title}>{title}</Text>
            <Pressable onPress={onClose} style={s.close}>
              <Text style={s.closeText}>关闭</Text>
            </Pressable>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

export async function runMediaCapture(
  kind: CaptureKind,
): Promise<
  | { kind: 'images'; assets: Awaited<ReturnType<typeof pickImages>> }
  | { kind: 'video'; asset: Awaited<ReturnType<typeof pickVideo>> }
> {
  if (kind === 'photo') return { kind: 'images', assets: await pickImages({ camera: true }) };
  if (kind === 'album') return { kind: 'images', assets: await pickImages({ camera: false, multiple: true }) };
  return { kind: 'video', asset: await pickVideo({ camera: kind === 'video' }) };
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end', zIndex: 25 },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: 16,
    paddingBottom: 24,
  },
  choice: {
    margin: 16,
    backgroundColor: colors.bg,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontFamily: font, fontSize: 18, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  close: {
    position: 'absolute',
    right: 0,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderColor: colors.line,
  },
  closeText: { fontFamily: font, fontSize: 13, color: colors.ink },
  area: {
    minHeight: 140,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 12,
    fontFamily: font,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 12,
    fontFamily: font,
    fontSize: 16,
    marginTop: 8,
  },
  hint: { fontFamily: font, fontSize: 13, color: colors.muted, marginBottom: 4 },
  save: {
    marginTop: 12,
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontFamily: font, fontSize: 16 },
  row: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  rowText: { fontFamily: font, fontSize: 16, color: colors.ink },
  cancel: { alignItems: 'center', paddingVertical: 8 },
  quiet: { fontFamily: font, fontSize: 14, color: colors.muted },
  body: { fontFamily: font, fontSize: 14, color: colors.ink, textAlign: 'center', marginVertical: 8 },
  clock: { fontFamily: font, fontSize: 28, textAlign: 'center', marginVertical: 8, color: colors.ink },
});
