export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatWhen(ts: number, now = Date.now()): string {
  const diff = now - ts;
  if (diff < 60_000) return '刚刚';
  const d = new Date(ts);
  const n = new Date(now);
  const sameDay = d.toDateString() === n.toDateString();
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (sameDay) return `今天 ${hm}`;
  const yest = new Date(now);
  yest.setDate(n.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return `昨天 ${hm}`;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function newId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function extractUrls(text: string): string[] {
  return text.match(/https?:\/\/[^\s]+/gi) ?? [];
}
