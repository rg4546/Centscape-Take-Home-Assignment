
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import { extract } from '../src/util/parse.js';
import { fetchHtmlWithLimits } from '../src/util/fetchHtml.js';
import nock from 'nock';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('parsing fixtures', () => {
  const read = (f: string) => readFileSync(path.join(__dirname, 'fixtures', f), 'utf8');

  it('og takes precedence', () => {
    const html = read('og.html');
    const res = extract(html, 'https://example.com/og');
    expect(res.title).toBe('OG Product Title');
    expect(res.price).toBe(199.99);
    expect(res.currency).toBe('USD');
  });

  it('twitter fallback', () => {
    const html = read('twitter.html');
    const res = extract(html, 'https://example.com/tw');
    expect(res.title).toBe('TW Product');
    expect(res.price).toBe(79.99);
  });

  it('fallback selectors', () => {
    const html = read('fallback.html');
    const res = extract(html, 'https://example.com/fb');
    expect(res.title).toBe('Fallback Product');
    expect(res.price).toBe(12.50);
  });
});

describe('network guards', () => {
  it('enforces redirect cap', async () => {
    nock('https://a.com').get('/r1').reply(302, undefined, { Location: 'https://a.com/r2' });
    nock('https://a.com').get('/r2').reply(302, undefined, { Location: 'https://a.com/r3' });
    nock('https://a.com').get('/r3').reply(302, undefined, { Location: 'https://a.com/r4' });
    nock('https://a.com').get('/r4').reply(200, '<html></html>', { 'Content-Type': 'text/html' });
    await expect(fetchHtmlWithLimits('https://a.com/r1', 3)).rejects.toThrow(/Redirect limit/);
  });

  it('enforces size cap', async () => {
    const big = 'x'.repeat(600 * 1024);
    nock('https://b.com').get('/').reply(200, big, { 'Content-Type': 'text/html' });
    await expect(fetchHtmlWithLimits('https://b.com/', 3, 5000, 512*1024)).rejects.toThrow(/too large/);
  });

  it('enforces timeout', async () => {
    nock('https://slow.com').get('/').delay(6000).reply(200, '<html></html>', { 'Content-Type': 'text/html' });
    await expect(fetchHtmlWithLimits('https://slow.com/', 3, 1000)).rejects.toThrow();
  });

  it('rejects non-html', async () => {
    nock('https://img.com').get('/').reply(200, 'PNGDATA', { 'Content-Type': 'image/png' });
    await expect(fetchHtmlWithLimits('https://img.com/')).rejects.toThrow(/Unsupported/);
  });
});
