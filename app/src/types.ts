
export type WishlistItem = {
  id: string;
  title: string | null;
  image: string | null;
  price: number | null;
  currency: string | null;
  siteName: string | null;
  sourceUrl: string;
  createdAt: string;
  normalizedUrl: string;
};

export type StorageV1 = { version: 1, items: Omit<WishlistItem, 'normalizedUrl'>[] };
export type StorageV2 = { version: 2, items: WishlistItem[] };
