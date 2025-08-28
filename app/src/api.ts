
const base = (global as any).expo?.manifest2?.extra?.serverUrl || (require('../app.json').expo.extra.serverUrl);

export type Preview = {
  title: string | null;
  image: string | null;
  price: number | null;
  currency: string | null;
  siteName: string | null;
  sourceUrl: string;
};

export async function fetchPreview(url: string): Promise<Preview> {
  const res = await fetch(`${base}/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || 'Failed to fetch preview');
  }
  return res.json();
}
