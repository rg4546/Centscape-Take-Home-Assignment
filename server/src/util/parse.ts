
import * as cheerio from 'cheerio';
import { PreviewResponse } from '../types.js';
import { URL } from 'node:url';

function textOrNull(s?: string): string | null {
  if (!s) return null;
  const t = s.trim();
  return t.length ? t : null;
}

function parsePrice(str: string): { price: number | null, currency: string | null } {
  const m = str.match(/([€£$₹]|USD|EUR|GBP|INR)\s?([0-9]+(?:[.,][0-9]{2})?)/i);
  if (!m) return { price: null, currency: null };
  const sym = m[1];
  const num = parseFloat(m[2].replace(',', ''));
  const currency = {'$':'USD','€':'EUR','£':'GBP','₹':'INR'}[sym] || (sym.toUpperCase());
  return { price: isNaN(num) ? null : num, currency };
}

export function extract(html: string, sourceUrl: string): PreviewResponse {
  const $ = cheerio.load(html);
  const url = new URL(sourceUrl);

  // Open Graph
  const ogTitle = $('meta[property="og:title"]').attr('content');
  const ogImage = $('meta[property="og:image"]').attr('content');
  const ogPrice = $('meta[property="product:price:amount"]').attr('content');
  const ogCurrency = $('meta[property="product:price:currency"]').attr('content');

  if (ogTitle || ogImage || ogPrice) {
    return {
      title: textOrNull(ogTitle),
      image: textOrNull(ogImage),
      price: ogPrice ? parseFloat(ogPrice) : null,
      currency: textOrNull(ogCurrency),
      siteName: textOrNull($('meta[property="og:site_name"]').attr('content')) || url.hostname,
      sourceUrl
    };
  }

  // Twitter Card
  const twTitle = $('meta[name="twitter:title"]').attr('content');
  const twImage = $('meta[name="twitter:image"]').attr('content');
  const twPrice = $('meta[name="twitter:data1"]').attr('content');
  if (twTitle || twImage || twPrice) {
    const pp = twPrice ? parsePrice(twPrice) : { price: null, currency: null };
    return {
      title: textOrNull(twTitle),
      image: textOrNull(twImage),
      price: pp.price,
      currency: pp.currency,
      siteName: url.hostname,
      sourceUrl
    };
  }

  // oEmbed (link type=application/json+oembed) — here we only surface site name if available
  const oembed = $('link[type="application/json+oembed"]').attr('href');
  if (oembed) {
    return {
      title: textOrNull($('title').first().text()),
      image: textOrNull($('img').first().attr('src')),
      price: null,
      currency: null,
      siteName: url.hostname,
      sourceUrl
    };
  }

  // Fallback
  const title = $('title').first().text();
  const firstImg = $('img[src]').first().attr('src') || null;
  let priceText = $('[class*="price"], [id*="price"], [data-test*="price"]').first().text() || '';
  if (!priceText) {
    priceText = $('body').text().slice(0, 1000);
  }
  const { price, currency } = parsePrice(priceText);

  return {
    title: textOrNull(title),
    image: textOrNull(firstImg),
    price,
    currency,
    siteName: url.hostname,
    sourceUrl
  };
}
