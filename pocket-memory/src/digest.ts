import type { Category, MemoryItem } from './types';
import { typeLabels } from './theme';
import { formatWhen } from './format';

export interface DigestExcerpt {
  id: string;
  line: string;
}

export interface Digest {
  topic: string;
  count: number;
  noted: number;
  byType: { label: string; n: number }[];
  byCategory: { label: string; n: number }[];
  latest?: string;
  phrases: string[];
  excerpts: DigestExcerpt[];
  reading: string;
}

function excerpt(item: MemoryItem): string {
  const line = (item.note || item.text || item.caption || item.title || item.transcript || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (line) return line.length > 48 ? `${line.slice(0, 48)}…` : line;
  if (item.type === 'image') return '一张图';
  if (item.type === 'video') return item.videoKind === 'own' ? '自己录的一段' : '一条信息流视频';
  if (item.type === 'audio') return '一段录音';
  if (item.type === 'link') return item.url || '一条链接';
  return '一条记录';
}

function recurringPhrases(items: MemoryItem[], topic: string): string[] {
  const bag = new Map<string, number>();
  const topicNorm = topic.replace(/\s+/g, '').toLowerCase();
  for (const it of items) {
    const raw = [it.note, it.text, it.caption, it.title, it.transcript].filter(Boolean).join('。');
    for (const part of raw.split(/[，。；、\n,.!?;:：]/)) {
      const t = part.replace(/\s+/g, '').trim();
      if (t.length < 2 || t.length > 12) continue;
      if (t.toLowerCase() === topicNorm) continue;
      bag.set(t, (bag.get(t) ?? 0) + 1);
    }
  }
  return [...bag.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);
}

export function buildDigest(topic: string, items: MemoryItem[], categories: Category[]): Digest {
  const typeCount = new Map<string, number>();
  const catCount = new Map<string, number>();
  let noted = 0;
  for (const it of items) {
    typeCount.set(it.type, (typeCount.get(it.type) ?? 0) + 1);
    const name = categories.find((c) => c.id === it.categoryId)?.name ?? '未归类';
    catCount.set(name, (catCount.get(name) ?? 0) + 1);
    if (it.note?.trim()) noted += 1;
  }
  const byType = [...typeCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => ({ label: typeLabels[type] ?? type, n }));
  const byCategory = [...catCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, n]) => ({ label, n }));
  const latest = items[0] ? formatWhen(items[0].createdAt) : undefined;
  const excerpts = items.slice(0, 8).map((it) => ({ id: it.id, line: excerpt(it) }));
  const phrases = recurringPhrases(items, topic);
  const topType = byType[0];
  const topCat = byCategory[0];
  const label = topic.trim() || '这一批';

  let reading: string;
  if (items.length === 0) {
    reading = `库里还没有扫到和「${label}」对得上的内容。换个词，或去库里按类扫。`;
  } else if (items.length === 1) {
    reading =
      `和「${label}」相关的目前只有 1 条，还堆不出趋势，先看这一条本身。` +
      (noted ? '这条写了备注。' : '这条还没写备注，理由以后容易忘。') +
      '这是本机按关键词扫出来的浅读，不是通读原文后的结论。';
  } else {
    reading =
      `和「${label}」相关的共 ${items.length} 条。` +
      (topType ? `最多是${topType.label}（${topType.n}）。` : '') +
      (topCat ? `类目上更集中在${topCat.label}。` : '') +
      (noted ? `${noted} 条写了备注。` : '这批几乎没写备注，只能看标题和文案。') +
      (phrases.length ? `反复出现的说法：${phrases.join('、')}。` : '') +
      (latest ? `最近一次在${latest}。` : '') +
      '这是本机按关键词扫出来的浅读，不是通读原文后的结论。';
  }

  return { topic: label, count: items.length, noted, byType, byCategory, latest, phrases, excerpts, reading };
}
