// Vercel serverless function. Receives ?url=<listing> and tries to extract
// basic property data from og:tags / regex heuristics.
// Supports Mercado Libre, Zonaprop and Argenprop best-effort.

export const config = { runtime: 'edge' };

const cleanText = (s: string) => s.replace(/\s+/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

function pickMeta(html: string, prop: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
  const m = html.match(re);
  return m ? cleanText(m[1]) : null;
}
function pickTitle(html: string): string | null {
  const m = html.match(/<title>([^<]+)<\/title>/i);
  return m ? cleanText(m[1]) : null;
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url).searchParams.get('url');
  if (!url) return new Response(JSON.stringify({ error: 'missing url' }), { status: 400 });

  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        'Accept-Language': 'es-AR,es;q=0.9',
      },
    });
    if (!r.ok) return new Response(JSON.stringify({ error: 'fetch failed', status: r.status }), { status: 502 });
    const html = await r.text();

    const ogTitle = pickMeta(html, 'og:title') || pickTitle(html) || '';
    const ogDesc = pickMeta(html, 'og:description') || pickMeta(html, 'description') || '';
    const ogImage = pickMeta(html, 'og:image') || '';

    // Heuristics
    const text = `${ogTitle} ${ogDesc}`;

    const ambMatch = text.match(/(\d+)\s*(?:ambient|amb\b)/i);
    const m2Match = text.match(/(\d+)\s*m²|(\d+)\s*m2|(\d+)\s*metros/i);
    const bathsMatch = text.match(/(\d+)\s*ba[ñn]os?/i);
    const priceMatchUsd = text.match(/USD?\s*\$?\s*([\d.,]+)|U\$S\s*([\d.,]+)|US\$\s*([\d.,]+)/i);
    const priceMatchArs = text.match(/\$\s*([\d.,]+)/i);

    let currency: 'USD' | 'ARS' = 'USD';
    let price = '';
    if (priceMatchUsd) {
      currency = 'USD';
      price = (priceMatchUsd[1] || priceMatchUsd[2] || priceMatchUsd[3] || '').replace(/[^\d]/g, '');
    } else if (priceMatchArs) {
      currency = 'ARS';
      price = priceMatchArs[1].replace(/[^\d]/g, '');
    }
    if (price && parseInt(price) > 0) {
      price = price.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    // Try to extract barrio (location after "en" or after dash)
    let barrio = '';
    const barrioMatch = ogTitle.match(/(?:en|,)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?:\s*[-·,|]|$)/);
    if (barrioMatch) barrio = barrioMatch[1].trim();

    // Address: lo primero antes de "en"
    let addr = '';
    const addrMatch = ogTitle.match(/^([^|·]+?)(?:\s+en\s+|,)/i);
    if (addrMatch) addr = addrMatch[1].trim();

    const op: 'Venta' | 'Alquiler' = /alquiler|rent/i.test(text) ? 'Alquiler' : 'Venta';

    const out = {
      addr: addr || ogTitle.split('-')[0].trim(),
      barrio,
      amb: ambMatch ? ambMatch[1] : '',
      m2: m2Match ? (m2Match[1] || m2Match[2] || m2Match[3] || '') : '',
      baths: bathsMatch ? bathsMatch[1] : '',
      price,
      currency,
      op,
      desc: ogDesc.slice(0, 120),
      photoUrl: ogImage,
      listingUrl: url,
    };
    return new Response(JSON.stringify(out), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'unknown' }), { status: 500 });
  }
}
