
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StorageV1, StorageV2, WishlistItem } from './types';

const KEY = 'centscape.storage';

export async function load(): Promise<StorageV2> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return { version: 2, items: [] };
  const data = JSON.parse(raw);
  if (data.version === 2) return data as StorageV2;
  if (data.version === 1) {
    const v1 = data as StorageV1;
    // migrate to v2 by adding normalizedUrl = normalize(url)
    const items: WishlistItem[] = v1.items.map((it) => ({
      ...it,
      normalizedUrl: normalizeUrl(it.sourceUrl)
    }));
    const v2: StorageV2 = { version: 2, items };
    await AsyncStorage.setItem(KEY, JSON.stringify(v2));
    return v2;
  }
  // unknown -> reset
  const v2: StorageV2 = { version: 2, items: [] };
  await AsyncStorage.setItem(KEY, JSON.stringify(v2));
  return v2;
}

export async function save(v2: StorageV2) {
  await AsyncStorage.setItem(KEY, JSON.stringify(v2));
}

export function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    // remove UTM params
    const params = url.searchParams;
    const toDelete: string[] = [];
    params.forEach((_, k) => { if (k.toLowerCase().startsWith('utm_')) toDelete.push(k); });
    toDelete.forEach((k) => params.delete(k));
    url.search = params.toString();
    return url.toString();
  } catch {
    return u;
  }
}
