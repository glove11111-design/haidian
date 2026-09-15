import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { classifyItem } from './classify';
import { newId } from './format';
import type { AppSettings, Category, MemoryItem, PersistedState, SyncStatus } from './types';

const LOCAL_KEY = 'pocket-memory:local:v1';
const CLOUD_KEY = 'pocket-memory:cloud:v1';

export const BASE_CATEGORIES: Category[] = [
  { id: 'cat-idea', name: '念头', kind: 'base' },
  { id: 'cat-person', name: '人物', kind: 'base' },
  { id: 'cat-place', name: '场所', kind: 'base' },
  { id: 'cat-object', name: '物件', kind: 'base' },
  { id: 'cat-frame', name: '画面', kind: 'base' },
  { id: 'cat-ref', name: '资料', kind: 'base' },
  { id: 'cat-life', name: '生活', kind: 'base' },
  { id: 'cat-uncat', name: '未归类', kind: 'uncategorized' },
];

const defaultSettings: AppSettings = { cloudEnabled: true };

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function categoryIdByName(categories: Category[], name: string): string {
  return categories.find((c) => c.name === name)?.id ?? 'cat-uncat';
}

type DraftItem = Omit<MemoryItem, 'id' | 'createdAt' | 'classifying' | 'syncStatus' | 'categoryId'> & {
  categoryId?: string;
};

interface StoreValue {
  ready: boolean;
  items: MemoryItem[];
  categories: Category[];
  settings: AppSettings;
  cloudStatus: SyncStatus;
  ingest: (draft: DraftItem) => Promise<MemoryItem>;
  ingestMany: (drafts: DraftItem[]) => Promise<MemoryItem[]>;
  updateItem: (id: string, patch: Partial<MemoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  setCategory: (itemId: string, categoryId: string) => Promise<void>;
  createCategory: (name: string, applyToItemId?: string) => Promise<Category>;
  deleteCategory: (categoryId: string) => Promise<void>;
  setCloudEnabled: (enabled: boolean) => Promise<void>;
  retrySync: () => Promise<void>;
  restoreFromCloud: () => Promise<void>;
  search: (query: string, categoryId?: string | null) => MemoryItem[];
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>(BASE_CATEGORIES);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [cloudStatus, setCloudStatus] = useState<SyncStatus>('synced');
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemsRef = useRef(items);
  const categoriesRef = useRef(categories);
  const settingsRef = useRef(settings);
  itemsRef.current = items;
  categoriesRef.current = categories;
  settingsRef.current = settings;

  const persistLocal = useCallback((next?: Partial<PersistedState>) => {
    const payload: PersistedState = {
      items: next?.items ?? itemsRef.current,
      categories: next?.categories ?? categoriesRef.current,
      settings: next?.settings ?? settingsRef.current,
    };
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      void writeJson(LOCAL_KEY, payload);
    }, 40);
  }, []);

  const pushCloud = useCallback(async (snapshot: MemoryItem[], cats: Category[]) => {
    if (!settingsRef.current.cloudEnabled) return;
    setCloudStatus('syncing');
    try {
      await writeJson(CLOUD_KEY, { items: snapshot, categories: cats, savedAt: Date.now() });
      setItems((prev) =>
        prev.map((it) => (it.syncStatus === 'synced' ? it : { ...it, syncStatus: 'synced' as const })),
      );
      setCloudStatus('synced');
    } catch {
      setItems((prev) =>
        prev.map((it) =>
          it.syncStatus === 'synced' ? it : { ...it, syncStatus: 'failed' as const },
        ),
      );
      setCloudStatus('failed');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = await readJson<PersistedState>(LOCAL_KEY, {
        items: [],
        categories: BASE_CATEGORIES,
        settings: defaultSettings,
      });
      if (cancelled) return;
      const cats = [...BASE_CATEGORIES];
      for (const c of local.categories ?? []) {
        if (!cats.some((x) => x.id === c.id)) cats.push(c);
      }
      setItems(local.items ?? []);
      setCategories(cats);
      setSettings(local.settings ?? defaultSettings);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const scheduleClassify = useCallback((id: string) => {
    setTimeout(() => {
      setItems((prev) => {
        const current = prev.find((x) => x.id === id);
        if (!current || !current.classifying) return prev;
        const name = classifyItem(current);
        const categoryId = categoryIdByName(categoriesRef.current, name);
        const next = prev.map((x) =>
          x.id === id ? { ...x, classifying: false, categoryId } : x,
        );
        persistLocal({ items: next });
        void pushCloud(next, categoriesRef.current);
        return next;
      });
    }, 700);
  }, [persistLocal, pushCloud]);

  const ingestMany = useCallback(async (drafts: DraftItem[]) => {
    const created: MemoryItem[] = drafts.map((draft) => ({
      ...draft,
      id: newId('m'),
      createdAt: Date.now(),
      classifying: true,
      categoryId: draft.categoryId ?? 'cat-uncat',
      syncStatus: settingsRef.current.cloudEnabled ? 'pending' : 'synced',
    }));
    const next = [...created, ...itemsRef.current];
    setItems(next);
    persistLocal({ items: next });
    created.forEach((item) => scheduleClassify(item.id));
    setTimeout(() => {
      void pushCloud(
        itemsRef.current.map((it) =>
          created.some((c) => c.id === it.id) ? { ...it, syncStatus: 'syncing' } : it,
        ),
        categoriesRef.current,
      );
    }, 400);
    return created;
  }, [persistLocal, pushCloud, scheduleClassify]);

  const ingest = useCallback(async (draft: DraftItem) => {
    const [one] = await ingestMany([draft]);
    return one;
  }, [ingestMany]);

  const updateItem = useCallback(async (id: string, patch: Partial<MemoryItem>) => {
    const next = itemsRef.current.map((it) => (it.id === id ? { ...it, ...patch } : it));
    setItems(next);
    persistLocal({ items: next });
    void pushCloud(next, categoriesRef.current);
  }, [persistLocal, pushCloud]);

  const deleteItem = useCallback(async (id: string) => {
    const next = itemsRef.current.filter((it) => it.id !== id);
    setItems(next);
    persistLocal({ items: next });
    void pushCloud(next, categoriesRef.current);
  }, [persistLocal, pushCloud]);

  const setCategory = useCallback(async (itemId: string, categoryId: string) => {
    const next = itemsRef.current.map((it) =>
      it.id === itemId ? { ...it, categoryId, classifying: false } : it,
    );
    setItems(next);
    persistLocal({ items: next });
    void pushCloud(next, categoriesRef.current);
  }, [persistLocal, pushCloud]);

  const createCategory = useCallback(async (name: string, applyToItemId?: string) => {
    const trimmed = name.trim();
    const existing = categoriesRef.current.find((c) => c.name === trimmed);
    if (existing) {
      if (applyToItemId) await setCategory(applyToItemId, existing.id);
      return existing;
    }
    const cat: Category = { id: newId('cat'), name: trimmed, kind: 'custom' };
    const cats = [
      ...categoriesRef.current.filter((c) => c.kind !== 'uncategorized'),
      cat,
      ...categoriesRef.current.filter((c) => c.kind === 'uncategorized'),
    ];
    setCategories(cats);
    let nextItems = itemsRef.current;
    if (applyToItemId) {
      nextItems = itemsRef.current.map((it) =>
        it.id === applyToItemId ? { ...it, categoryId: cat.id, classifying: false } : it,
      );
      setItems(nextItems);
    }
    persistLocal({ categories: cats, items: nextItems });
    void pushCloud(nextItems, cats);
    return cat;
  }, [persistLocal, pushCloud, setCategory]);

  const deleteCategory = useCallback(async (categoryId: string) => {
    const cat = categoriesRef.current.find((c) => c.id === categoryId);
    if (!cat || cat.kind !== 'custom') return;
    const cats = categoriesRef.current.filter((c) => c.id !== categoryId);
    const nextItems = itemsRef.current.map((it) =>
      it.id === categoryId ? it : it.categoryId === categoryId ? { ...it, categoryId: 'cat-uncat' } : it,
    );
    setCategories(cats);
    setItems(nextItems);
    persistLocal({ categories: cats, items: nextItems });
    void pushCloud(nextItems, cats);
  }, [persistLocal, pushCloud]);

  const setCloudEnabled = useCallback(async (enabled: boolean) => {
    const nextSettings = { cloudEnabled: enabled };
    setSettings(nextSettings);
    persistLocal({ settings: nextSettings });
    if (enabled) {
      await pushCloud(itemsRef.current, categoriesRef.current);
    }
  }, [persistLocal, pushCloud]);

  const retrySync = useCallback(async () => {
    await pushCloud(itemsRef.current, categoriesRef.current);
  }, [pushCloud]);

  const restoreFromCloud = useCallback(async () => {
    const cloud = await readJson<{ items?: MemoryItem[]; categories?: Category[] }>(CLOUD_KEY, {});
    const cloudItems = cloud.items ?? [];
    const merged = new Map<string, MemoryItem>();
    for (const it of itemsRef.current) merged.set(it.id, it);
    for (const it of cloudItems) merged.set(it.id, { ...it, syncStatus: 'synced' });
    const nextItems = [...merged.values()].sort((a, b) => b.createdAt - a.createdAt);
    const cats = [...categoriesRef.current];
    for (const c of cloud.categories ?? []) {
      if (!cats.some((x) => x.id === c.id)) cats.push(c);
    }
    setItems(nextItems);
    setCategories(cats);
    persistLocal({ items: nextItems, categories: cats });
    setCloudStatus('synced');
  }, [persistLocal]);

  const search = useCallback((query: string, categoryId?: string | null) => {
    const q = query.trim().toLowerCase();
    return itemsRef.current.filter((it) => {
      if (categoryId && it.categoryId !== categoryId) return false;
      if (!q) return true;
      const hay = [it.text, it.caption, it.title, it.author, it.transcript, it.url, it.sourceApp]
        .filter(Boolean)
        .join('\n')
        .toLowerCase();
      return hay.includes(q);
    });
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      items,
      categories,
      settings,
      cloudStatus,
      ingest,
      ingestMany,
      updateItem,
      deleteItem,
      setCategory,
      createCategory,
      deleteCategory,
      setCloudEnabled,
      retrySync,
      restoreFromCloud,
      search,
    }),
    [
      ready,
      items,
      categories,
      settings,
      cloudStatus,
      ingest,
      ingestMany,
      updateItem,
      deleteItem,
      setCategory,
      createCategory,
      deleteCategory,
      setCloudEnabled,
      retrySync,
      restoreFromCloud,
      search,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore outside provider');
  return ctx;
}

export function useCategoryName(categoryId: string): string {
  const { categories } = useStore();
  return categories.find((c) => c.id === categoryId)?.name ?? '未归类';
}
