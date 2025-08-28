
import { request } from 'undici';
import { AbortController } from 'node-abort-controller';
import { isPrivateHost } from './ssrf.js';
import { URL } from 'node:url';

type FetchResult = { finalUrl: string, html: string, contentType: string | null };

export async function fetchHtmlWithLimits(inputUrl: string, maxRedirects = 3, timeoutMs = 5000, maxBytes = 512 * 1024): Promise<FetchResult> {
  let url = new URL(inputUrl);
  // SSRF guard
  if (await isPrivateHost(url.hostname)) {
    throw new Error('Blocked private host');
  }

  let redirects = 0;
  let lastContentType: string | null = null;

  while (true) {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await request(url.toString(), {
        method: 'GET',
        maxRedirections: 0,
        headers: {
          'User-Agent': 'CentscapeBot/1.0 (+https://centscape.com)',
          'Accept': 'text/html,application/xhtml+xml'
        },
        signal: controller.signal
      });
      lastContentType = res.headers['content-type'] as any || null;
      // Handle redirects manually
      if ([301,302,303,307,308].includes(res.statusCode)) {
        if (redirects >= maxRedirects) throw new Error('Redirect limit exceeded');
        const loc = res.headers['location'];
        if (!loc) throw new Error('Redirect without location');
        url = new URL(loc as string, url);
        redirects++;
        continue;
      }
      // Content-Type must be text/html
      if (!lastContentType || !String(lastContentType).includes('text/html')) {
        throw new Error('Unsupported content type');
      }
      // Read stream with size cap
      const reader = res.body;
      let chunks: Buffer[] = [];
      let total = 0;
      for await (const chunk of reader) {
        const buf = Buffer.from(chunk);
        total += buf.length;
        if (total > maxBytes) {
          throw new Error('Response too large');
        }
        chunks.push(buf);
      }
      const html = Buffer.concat(chunks).toString('utf8');
      return { finalUrl: url.toString(), html, contentType: lastContentType };
    } finally {
      clearTimeout(to);
    }
  }
}
