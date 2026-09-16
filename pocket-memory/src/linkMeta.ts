import type { ItemType, VideoKind } from './types';

export interface LinkParse {
  type: ItemType;
  videoKind?: VideoKind;
  url: string;
  title?: string;
  caption?: string;
  author?: string;
  sourceApp?: string;
  coverUri?: string;
  parseIncomplete: boolean;
  durationMs?: number;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function endsHost(host: string, suffix: string): boolean {
  return host === suffix || host.endsWith(`.${suffix}`);
}

export function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  if (t.includes('.') && !t.includes(' ')) return `https://${t}`;
  return t;
}

export function classifyUrl(url: string): Pick<LinkParse, 'type' | 'videoKind' | 'sourceApp'> {
  const host = hostOf(url);
  const lower = url.toLowerCase();

  if (
    endsHost(host, 'douyin.com') ||
    endsHost(host, 'iesdouyin.com') ||
    endsHost(host, 'tiktok.com') ||
    endsHost(host, 'kuaishou.com') ||
    endsHost(host, 'bilibili.com') ||
    endsHost(host, 'b23.tv') ||
    endsHost(host, 'youtube.com') ||
    endsHost(host, 'youtu.be')
  ) {
    const sourceApp = endsHost(host, 'douyin.com') || endsHost(host, 'iesdouyin.com')
      ? '抖音'
      : endsHost(host, 'kuaishou.com')
        ? '快手'
        : endsHost(host, 'bilibili.com') || endsHost(host, 'b23.tv')
          ? '哔哩哔哩'
          : endsHost(host, 'tiktok.com')
            ? 'TikTok'
            : 'YouTube';
    return { type: 'video', videoKind: 'social', sourceApp };
  }

  if (endsHost(host, 'xiaohongshu.com') || endsHost(host, 'xhslink.com')) {
    if (lower.includes('video') || lower.includes('/v/')) {
      return { type: 'video', videoKind: 'social', sourceApp: '小红书' };
    }
    return { type: 'image', sourceApp: '小红书' };
  }

  if (endsHost(host, 'instagram.com')) {
    if (lower.includes('/reel') || lower.includes('/tv')) {
      return { type: 'video', videoKind: 'social', sourceApp: 'Instagram' };
    }
    return { type: 'image', sourceApp: 'Instagram' };
  }

  if (host.includes('weixin') || host.includes('qq.com') && lower.includes('mp.weixin')) {
    return { type: 'link', sourceApp: '公众号' };
  }
  if (endsHost(host, 'zhihu.com')) return { type: 'link', sourceApp: '知乎' };
  if (endsHost(host, 'sspai.com')) return { type: 'link', sourceApp: '少数派' };

  return { type: 'link' };
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function pickString(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

export async function parseSharedUrl(raw: string): Promise<LinkParse> {
  const url = normalizeUrl(raw);
  const classified = classifyUrl(url);
  const parsed: LinkParse = {
    type: classified.type,
    videoKind: classified.videoKind,
    url,
    sourceApp: classified.sourceApp,
    parseIncomplete: true,
  };

  try {
    const payload = (await fetchJson(
      `https://api.microlink.io/?url=${encodeURIComponent(url)}`,
      4500,
    )) as {
      status?: string;
      data?: {
        title?: string;
        description?: string;
        author?: string | { name?: string };
        publisher?: string;
        image?: { url?: string } | string;
      };
    };
    const data = payload?.data;
    if (data) {
      parsed.title = pickString(data.title);
      parsed.caption = pickString(data.description, data.title);
      parsed.author = pickString(
        typeof data.author === 'string' ? data.author : data.author?.name,
      );
      parsed.coverUri = pickString(
        typeof data.image === 'string' ? data.image : data.image?.url,
      );
      if (!parsed.sourceApp) parsed.sourceApp = pickString(data.publisher);
    }
  } catch {
    // keep incomplete
  }

  const missingCover = !parsed.coverUri;
  const missingCopy = !(parsed.caption || parsed.title);
  const missingAuthor = !parsed.author;
  parsed.parseIncomplete = missingCover || missingCopy || missingAuthor;
  if (classified.type === 'link' && !parsed.title) {
    try {
      parsed.title = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      parsed.title = url;
    }
  }
  return parsed;
}
