
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import { fetchHtmlWithLimits } from './util/fetchHtml.js';
import { extract } from './util/parse.js';
import { PreviewResponse } from './types.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(rateLimit, {
  max: 10,
  timeWindow: '1 minute'
});

app.post<{ Body: { url: string, raw_html?: string } }>('/preview', async (req, reply) => {
  const { url, raw_html } = req.body || {};
  if (!url || typeof url !== 'string') {
    return reply.code(400).send({ error: 'Invalid url' });
  }
  try {
    let html: string;
    let finalUrl = url;
    if (raw_html) {
      html = raw_html;
    } else {
      const fetched = await fetchHtmlWithLimits(url);
      html = fetched.html;
      finalUrl = fetched.finalUrl;
    }
    const data: PreviewResponse = extract(html, finalUrl);
    return reply.send(data);
  } catch (e: any) {
    const msg = e?.message || 'Failed to fetch/parse';
    const status = /invalid|unsupported|too large|redirect|Blocked/.test(msg) ? 400 : 502;
    return reply.code(status).send({ error: msg });
  }
});

const port = Number(process.env.PORT || 4000);
app.listen({ port, host: '0.0.0.0' }).catch(err => {
  app.log.error(err);
  process.exit(1);
});
