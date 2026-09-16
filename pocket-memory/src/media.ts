import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export interface PickedMedia {
  uri: string;
  thumbnailUri?: string;
  durationMs?: number;
  mime?: string;
  width?: number;
  height?: number;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function persistUri(uri: string, kind: 'image' | 'video' | 'audio' = 'image'): Promise<string> {
  if (!uri || uri.startsWith('data:')) return uri;
  if (Platform.OS !== 'web') return uri;
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    if (kind === 'image' && blob.size > 1_200_000) {
      return await shrinkImage(uri);
    }
    if (blob.size > 4_000_000) return uri;
    return await blobToDataUrl(blob);
  } catch {
    return uri;
  }
}

async function shrinkImage(uri: string, max = 1280): Promise<string> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return uri;
  return await new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => resolve(uri);
    img.src = uri;
  });
}

export async function videoPoster(uri: string): Promise<{ thumbnailUri?: string; durationMs?: number }> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return {};
  return await new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'metadata';
    video.playsInline = true;
    video.src = uri;
    const done = (thumbnailUri?: string) => {
      resolve({
        thumbnailUri,
        durationMs: Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : undefined,
      });
    };
    video.onloadeddata = () => {
      try {
        video.currentTime = Math.min(0.2, (video.duration || 1) / 4);
      } catch {
        done();
      }
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
        done(canvas.toDataURL('image/jpeg', 0.7));
      } catch {
        done();
      }
    };
    video.onerror = () => done();
    setTimeout(() => done(), 2500);
  });
}

async function ensureCamera(): Promise<boolean> {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;
  const asked = await ImagePicker.requestCameraPermissionsAsync();
  return asked.granted;
}

async function ensureLibrary(): Promise<boolean> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  const limited =
    'accessPrivileges' in current && (current as { accessPrivileges?: string }).accessPrivileges === 'limited';
  if (current.granted || limited) return true;
  const asked = await ImagePicker.requestMediaLibraryPermissionsAsync();
  const askedLimited =
    'accessPrivileges' in asked && (asked as { accessPrivileges?: string }).accessPrivileges === 'limited';
  return asked.granted || askedLimited || Platform.OS === 'web';
}

function toPicked(asset: ImagePicker.ImagePickerAsset): PickedMedia {
  return {
    uri: asset.uri,
    thumbnailUri: asset.uri,
    durationMs: asset.duration ?? undefined,
    mime: asset.mimeType,
    width: asset.width,
    height: asset.height,
  };
}

export async function pickImages(opts: { camera: boolean; multiple?: boolean }): Promise<
  { ok: true; assets: PickedMedia[] } | { ok: false; reason: 'permission' | 'cancel' }
> {
  if (opts.camera) {
    const allowed = await ensureCamera();
    if (!allowed) return { ok: false, reason: 'permission' };
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return { ok: false, reason: 'cancel' };
    const asset = toPicked(result.assets[0]);
    asset.uri = await persistUri(asset.uri, 'image');
    asset.thumbnailUri = asset.uri;
    return { ok: true, assets: [asset] };
  }

  const allowed = await ensureLibrary();
  if (!allowed) return { ok: false, reason: 'permission' };
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: opts.multiple !== false,
    quality: 0.8,
    selectionLimit: 12,
  });
  if (result.canceled || !result.assets?.length) return { ok: false, reason: 'cancel' };
  const assets: PickedMedia[] = [];
  for (const a of result.assets) {
    const picked = toPicked(a);
    picked.uri = await persistUri(picked.uri, 'image');
    picked.thumbnailUri = picked.uri;
    assets.push(picked);
  }
  return { ok: true, assets };
}

export async function pickVideo(opts: { camera: boolean }): Promise<
  { ok: true; asset: PickedMedia } | { ok: false; reason: 'permission' | 'cancel' }
> {
  if (opts.camera) {
    const allowed = await ensureCamera();
    if (!allowed) return { ok: false, reason: 'permission' };
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 60,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return { ok: false, reason: 'cancel' };
    return { ok: true, asset: await enrichVideo(toPicked(result.assets[0])) };
  }
  const allowed = await ensureLibrary();
  if (!allowed) return { ok: false, reason: 'permission' };
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]) return { ok: false, reason: 'cancel' };
  return { ok: true, asset: await enrichVideo(toPicked(result.assets[0])) };
}

async function enrichVideo(asset: PickedMedia): Promise<PickedMedia> {
  const persisted = await persistUri(asset.uri, 'video');
  const poster = await videoPoster(persisted);
  return {
    ...asset,
    uri: persisted,
    thumbnailUri: poster.thumbnailUri ?? asset.thumbnailUri,
    durationMs: poster.durationMs ?? asset.durationMs,
  };
}
