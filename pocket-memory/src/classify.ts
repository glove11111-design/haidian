import type { ItemType, MemoryItem, VideoKind } from './types';

const RULES: { name: string; keys: string[] }[] = [
  { name: '人物', keys: ['他', '她', '阿', '朋友', '老师', '同学', '谁', '人', '作者'] },
  { name: '场所', keys: ['店', '街', '巷', '公园', '馆', '家', '门口', '地方', '路', '城市', '开放时间'] },
  { name: '物件', keys: ['灯', '伞', '包', '杯子', '东西', '这件', '招牌'] },
  { name: '画面', keys: ['好看', '光', '颜色', '拍', '画面', '风景', '夜', '绿植', '封面'] },
  { name: '资料', keys: ['文章', '教程', '怎么', '方法', '笔记', '资料', '公众号', '分类', '经济', '课'] },
  { name: '生活', keys: ['今天', '明天', '吃饭', '带伞', '下班', '周', '傍晚', '自己录'] },
  { name: '念头', keys: ['忽然', '想到', '如果', '想', '感觉', '念头', '闪过'] },
];

export function classifyFromContent(input: {
  type: ItemType;
  text?: string;
  caption?: string;
  note?: string;
  title?: string;
  transcript?: string;
  videoKind?: VideoKind;
  sourceApp?: string;
}): string {
  const hay = [input.text, input.caption, input.note, input.title, input.transcript]
    .filter(Boolean)
    .join('\n');

  let best = { name: '', score: 0 };
  for (const rule of RULES) {
    let score = 0;
    for (const key of rule.keys) {
      if (hay.includes(key)) score += 1;
    }
    if (score > best.score) best = { name: rule.name, score };
  }
  if (best.score >= 1) return best.name;

  switch (input.type) {
    case 'image':
      return '画面';
    case 'video':
      return input.videoKind === 'own' ? '生活' : '画面';
    case 'link':
      return '资料';
    case 'audio':
      return hay ? '念头' : '未归类';
    case 'text':
      return hay.trim().length > 0 ? '念头' : '未归类';
    default:
      return '未归类';
  }
}

export function classifyItem(item: Pick<MemoryItem, 'type' | 'text' | 'caption' | 'note' | 'title' | 'transcript' | 'videoKind' | 'sourceApp'>): string {
  return classifyFromContent(item);
}
