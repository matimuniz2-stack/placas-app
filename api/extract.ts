// Vercel Edge function: GET /api/extract?url=<listing>
// Extracts property data + multiple photos from Mercado Libre / Zonaprop / Argenprop / generic OG.

export const config = { runtime: 'edge' };

const cleanText = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

// Recorta a la primera oración (subtítulo de la placa) en vez de cortar a N chars
// en medio de un párrafo. Evita cortar en abreviaturas tempranas (Av., Sr.).
function firstSentence(text: string, maxLen = 120): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const re = /[.!?](?=\s|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean))) {
    if (m.index >= 25) {
      const s = clean.slice(0, m.index + 1).trim();
      if (s.length <= maxLen) return s;
      break;
    }
  }
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen).replace(/\s+\S*$/, '').trim() + '…';
}

function pickMeta(html: string, prop: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
  const m = html.match(re);
  return m ? cleanText(m[1]) : null;
}
function pickTitle(html: string): string | null {
  const m = html.match(/<title>([^<]+)<\/title>/i);
  return m ? cleanText(m[1]) : null;
}

function extractImages(html: string, url: string): string[] {
  const out = new Set<string>();

  // og:image and og:image:N
  const ogRe = /<meta[^>]+(?:property|name)=["']og:image(?::\d+)?["'][^>]+content=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = ogRe.exec(html))) out.add(m[1]);

  // Site-specific patterns
  if (/mercadolibre|mlstatic/i.test(url + html)) {
    // ML uses mlstatic.com with patterns like D_NQ_NP_  or  -O.webp / -O.jpg
    const mlRe = /https?:\/\/[\w.-]*mlstatic\.com\/[^"'\s)]+\.(?:jpg|jpeg|webp|png)/gi;
    while ((m = mlRe.exec(html))) {
      // upgrade to high-res variant
      const hi = m[0].replace(/-[A-Z]\./, '-F.');
      out.add(hi);
    }
  }
  if (/zonaprop|naventcdn/i.test(url + html)) {
    const zpRe = /https?:\/\/img10?\.naventcdn\.com\/[^"'\s)]+/gi;
    while ((m = zpRe.exec(html))) out.add(m[0]);
  }
  if (/argenprop|aprcdn/i.test(url + html)) {
    const apRe = /https?:\/\/[\w.-]*aprcdn\.com\/[^"'\s)]+/gi;
    while ((m = apRe.exec(html))) out.add(m[0]);
  }
  // Tokko / ficha.info (microsites Next.js): las fotos NO están en <img> ni en og:image,
  // viven en un array JSON embebido como static.tokkobroker.com/pictures/<id>_<hash>.jpg.
  // (Solo /pictures/ — /logos/, /sm_pics/ (el og), /userprofile/ son branding, no la propiedad.)
  if (/tokkobroker|ficha\.info/i.test(url + html)) {
    const tkRe = /https?:\/\/[\w.-]*tokkobroker\.com\/pictures\/\w+\.(?:jpg|jpeg|webp|png)/gi;
    while ((m = tkRe.exec(html))) out.add(m[0]);
  }

  // Generic: <img src> from product galleries
  const imgRe = /<img[^>]+(?:data-src|src)=["']([^"']+\.(?:jpg|jpeg|webp|png)[^"']*)["']/gi;
  while ((m = imgRe.exec(html))) {
    const src = m[1];
    if (/avatar|logo|icon|sprite|placeholder|small/i.test(src)) continue;
    if (src.startsWith('data:')) continue;
    if (out.size < 12) out.add(src);
  }

  // Resolve relative URLs
  const base = new URL(url);
  const resolved = Array.from(out).map((u) => {
    try {
      return new URL(u, base).toString();
    } catch {
      return u;
    }
  });

  // Decode HTML entities in URLs (&amp; → &) and skip tiny thumbnails
  const decoded = resolved.map((u) =>
    u.replace(/&amp;/g, '&').replace(/&#x2F;/g, '/').replace(/&#39;/g, "'")
  );

  // Filter out tiny / non-content images
  const filtered = decoded.filter((u) => {
    if (/avatar|logo|icon|sprite|placeholder|spinner|loader|favicon/i.test(u)) return false;
    // Tokko: tfw_images son el branding de la inmobiliaria (logo), no fotos de la propiedad
    if (/tokkobroker\.com\/tfw_images\//i.test(u)) return false;
    // Tokko: sm_pics/<id>_og.jpg es la miniatura del og:image (chica/comprimida) —
    // si hay fotos reales en /pictures/ usamos esas en alta resolución.
    if (/tokkobroker\.com\/sm_pics\//i.test(u)) return false;
    if (/tokkobroker\.com\/userprofile\//i.test(u)) return false;
    // skip very small images (heuristic: width param < 200)
    const sizeMatch = u.match(/(\d+)px[-_x]/);
    if (sizeMatch && parseInt(sizeMatch[1]) < 200) return false;
    return true;
  });

  // Dedup by stripping size variants
  const dedup = new Map<string, string>();
  for (const u of filtered) {
    const key = u.split('?')[0].replace(/-[A-Z]\.(jpg|jpeg|webp|png)/, '').replace(/\/(thumb\/)?\d+px-/, '/');
    if (!dedup.has(key)) dedup.set(key, u);
  }

  return Array.from(dedup.values()).slice(0, 30);
}

// Parser del payload de Tokko (ficha.info y microsites Next.js de inmobiliarias).
// Los datos vienen como JSON con comillas escapadas (\") dentro del HTML. Desescapamos
// una vez y leemos los campos con regex normales. Devuelve solo lo que encuentra.
function parseTokkoJson(html: string): Partial<{
  addr: string; barrio: string; city: string; tipoPropiedad: string;
  amb: string; m2: string; baths: string; price: string; currency: 'USD' | 'ARS';
  op: 'Venta' | 'Alquiler'; expensas: string; antiguedad: string; desc: string;
  cochera: 'Sí' | 'No'; cocheras: string; aptoCredito: boolean;
}> {
  const j = html.replace(/\\"/g, '"').replace(/\\u003c/g, '<').replace(/\\u003e/g, '>');
  const out: any = {};

  // operations: {"Sale":["USD 77.000"]} | {"Rent":["$ 350.000"]}
  const opM = j.match(/"operations":\{"(Sale|Rent|TemporaryRent|Lease)":\["([^"]+)"/i);
  if (opM) {
    out.op = /sale/i.test(opM[1]) ? 'Venta' : 'Alquiler';
    const priceStr = opM[2];
    const cur = /usd|u\$s|us\$/i.test(priceStr) ? 'USD' : 'ARS';
    out.currency = cur;
    const num = priceStr.replace(/[^\d]/g, '');
    if (num) out.price = num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  // type: {"id":2,"name":"Departamento"}
  const typeM = j.match(/"type":\{"id":\d+,"name":"([^"]+)"/i);
  if (typeM) out.tipoPropiedad = typeM[1].trim();

  // address / location
  const addrM = j.match(/"(?:fake_address|address)":"([^"]+)"/i);
  if (addrM) out.addr = addrM[1].trim();
  const locM = j.match(/"location":"([^"]+)"/i);
  if (locM) {
    const parts = locM[1].split('|').map((s) => s.trim()).filter(Boolean);
    if (parts.length) out.city = parts[0];
    // si hay un segmento de barrio antes de la ciudad/zona, usalo
    if (parts.length >= 4) out.barrio = parts[0];
  }
  // Barrio: Tokko mete la zona en la descripción ("Zona Aldrey", "Barrio Norte").
  // El location suele ser región (Mar Del Plata | Costa Atlántica), así que buscamos acá.
  if (!out.barrio) {
    const zonaM = j.match(/(?:[Zz]ona|[Bb]arrio|[Bb][°º]\.?)\s+([A-ZÁÉÍÓÚ][a-záéíóúñ]+(?:\s+(?:de|del|la)\s+[A-ZÁÉÍÓÚ][a-záéíóúñ]+)?)/);
    if (zonaM) out.barrio = zonaM[1].trim();
  }

  // atributos {"key":"room_amount","name":"Ambientes","value":2}
  // valor numérico directo, o string "37 m²" + "original_value":37
  const attrNum = (key: string): string | null => {
    const re = new RegExp(`"key":"${key}"[^}]*?"value":\\s*(?:"([^"]*)"|([0-9.]+))`, 'i');
    const m = j.match(re);
    if (!m) return null;
    const raw = (m[1] ?? m[2] ?? '').trim();
    const digits = raw.replace(/[^\d]/g, '');
    return digits || null;
  };
  const origNum = (key: string): string | null => {
    const m = j.match(new RegExp(`"key":"${key}"[^}]*?"original_value":\\s*([0-9.]+)`, 'i'));
    return m ? m[1].replace(/\..*$/, '') : null;
  };

  const amb = attrNum('room_amount');
  if (amb) out.amb = amb;
  const baths = attrNum('bathroom_amount');
  if (baths) out.baths = baths;
  const m2 = origNum('roofed_surface') || origNum('total_surface') || origNum('surface');
  if (m2) out.m2 = m2;
  const parking = attrNum('parking_lot_amount') || attrNum('garage');
  if (parking) { out.cocheras = parking; out.cochera = parseInt(parking) > 0 ? 'Sí' : 'No'; }

  // antigüedad: "A estrenar"/"A construir" → 0 años; número → ese número
  const ageM = j.match(/"key":"age"[^}]*?"value":"([^"]*)"/i);
  if (ageM) {
    const v = ageM[1].toLowerCase();
    if (/estrenar|nuevo|a construir|en construcc/i.test(v)) out.antiguedad = '0';
    else { const n = v.replace(/[^\d]/g, ''); if (n) out.antiguedad = n; }
  }

  // apto crédito
  const credM = j.match(/"key":"credit_eligible"[^}]*?"value":"([^"]*)"/i);
  if (credM && /\b(s[ií]|apto)\b/i.test(credM[1])) out.aptoCredito = true;

  // expensas: aparecen en la descripción como "Expensas: $102.000"
  const expM = j.match(/expensas?\s*:?\s*\$?\s*([\d.]+)/i);
  if (expM) out.expensas = expM[1].replace(/[^\d]/g, '');

  return out;
}

// Amenities/características que buscamos en el texto del listing. La clave es la
// regex; el valor, la etiqueta linda para la placa.
const AMENITY_PATTERNS: [RegExp, string][] = [
  [/pileta|piscina/i, 'Pileta'],
  [/parrilla/i, 'Parrilla'],
  [/quincho/i, 'Quincho'],
  [/balc[oó]n/i, 'Balcón'],
  [/terraza/i, 'Terraza'],
  [/jard[ií]n/i, 'Jardín'],
  [/patio/i, 'Patio'],
  [/gimnasio|\bgym\b/i, 'Gimnasio'],
  [/\bsum\b|sal[oó]n de usos/i, 'SUM'],
  [/solarium|solárium/i, 'Solarium'],
  [/jacuzzi|hidromasaje/i, 'Hidromasaje'],
  [/seguridad|vigilancia|porter[ií]a 24/i, 'Seguridad'],
  [/lavadero|laundry/i, 'Lavadero'],
  [/baulera/i, 'Baulera'],
  [/ascensor/i, 'Ascensor'],
  [/aire acondicionado|\ba\/?a\b/i, 'Aire acond.'],
  [/calefacci[oó]n|radiadores|losa radiante/i, 'Calefacción'],
  [/amoblado|amueblado/i, 'Amoblado'],
  [/vista al mar|frente al mar/i, 'Vista al mar'],
  [/apto profesional/i, 'Apto profesional'],
  [/apto cr[eé]dito/i, 'Apto crédito'],
  [/mascotas/i, 'Acepta mascotas'],
];

// Texto visible del HTML (sin scripts/estilos/tags) para buscar amenities; los
// listings las muestran como ítems de características, no en los metadatos OG.
function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

function extractAmenities(html: string, ogText: string): string[] {
  const text = `${ogText} ${visibleText(html).slice(0, 60000)}`;
  const found: string[] = [];
  for (const [re, label] of AMENITY_PATTERNS) {
    if (re.test(text)) found.push(label);
  }
  return found;
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url).searchParams.get('url');
  if (!url) return new Response(JSON.stringify({ error: 'missing url' }), { status: 400 });

  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        'Accept-Language': 'es-AR,es;q=0.9',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!r.ok)
      return new Response(JSON.stringify({ error: 'fetch failed', status: r.status }), { status: 502 });
    const html = await r.text();

    const ogTitle = pickMeta(html, 'og:title') || pickTitle(html) || '';
    const ogDesc = pickMeta(html, 'og:description') || pickMeta(html, 'description') || '';
    const photos = extractImages(html, url);

    const text = `${ogTitle} ${ogDesc}`;

    const ambMatch = text.match(/(\d+)\s*(?:ambient|amb\b|dorm|hab)/i);
    const m2Match =
      text.match(/(\d+)\s*m²/i) || text.match(/(\d+)\s*m2/i) || text.match(/(\d+)\s*metros/i);
    const bathsMatch = text.match(/(\d+)\s*ba[ñn]os?/i);
    const priceUsd = text.match(/(?:USD?|U\$S|US\$|u\$s)\s*\$?\s*([\d.,]+)/i);
    const priceArs = text.match(/\$\s*([\d.,]+)/i);

    let currency: 'USD' | 'ARS' = 'USD';
    let price = '';
    if (priceUsd) {
      currency = 'USD';
      price = priceUsd[1].replace(/[^\d]/g, '');
    } else if (priceArs) {
      currency = 'ARS';
      price = priceArs[1].replace(/[^\d]/g, '');
    }
    if (price && parseInt(price) > 0) {
      price = price.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    let barrio = '';
    let addr = '';
    let tipoPropiedad = '';
    let op: 'Venta' | 'Alquiler' = /alquiler|rent/i.test(text) ? 'Alquiler' : 'Venta';

    // Patrón Tokko / sitios de inmobiliarias: "Tipo en Operación en Barrio - Dirección"
    // (ej: "Departamento en Alquiler-Venta en Guemes - Las Heras al 2900").
    const structured = ogTitle.match(
      /^([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)\s+en\s+(Alquiler[-\s]?Venta|Venta[-\s]?Alquiler|Venta|Alquiler)\s+en\s+(.+?)\s+-\s+(.+)$/i
    );
    if (structured) {
      tipoPropiedad = structured[1].trim();
      op = /venta/i.test(structured[2]) ? 'Venta' : 'Alquiler';
      barrio = structured[3].trim();
      addr = structured[4].trim();
    } else {
      const barrioMatch = ogTitle.match(/(?:en|,)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?:\s*[-·,|]|$)/);
      if (barrioMatch) barrio = barrioMatch[1].trim();
      const addrMatch = ogTitle.match(/^([^|·]+?)(?:\s+en\s+|,)/i);
      if (addrMatch) addr = addrMatch[1].trim();
      if (!addr && ogTitle) addr = ogTitle.split('-')[0].split('|')[0].trim();
    }

    const amenities = extractAmenities(html, text);
    const cocheraMatch = text.match(/(\d+)?\s*cocheras?/i) || (/cochera|garaje|garage/i.test(visibleText(html)) ? ([null, ''] as any) : null);

    // Datos base (OG / título). Para sitios Tokko (ficha.info, microsites de
    // inmobiliarias) parseamos el JSON embebido, que trae todo mucho más completo.
    const out: any = {
      addr,
      barrio,
      ...(tipoPropiedad ? { tipoPropiedad } : {}),
      amb: ambMatch ? ambMatch[1] : '',
      m2: m2Match ? m2Match[1] || m2Match[2] || m2Match[3] || '' : '',
      baths: bathsMatch ? bathsMatch[1] : '',
      price,
      currency,
      op,
      desc: firstSentence(ogDesc),
      cochera: cocheraMatch ? ('Sí' as const) : ('No' as const),
      cocheras: cocheraMatch && cocheraMatch[1] ? cocheraMatch[1] : '',
      amenities,
      photoUrl: photos[0] || '',
      photoUrls: photos,
      listingUrl: url,
    };

    if (/tokkobroker|ficha\.info/i.test(url + html)) {
      const tk = parseTokkoJson(html);
      // Los campos del JSON de Tokko pisan a los del OG cuando existen.
      for (const [k, v] of Object.entries(tk)) {
        if (v !== undefined && v !== null && v !== '') out[k] = v;
      }
    }
    return new Response(JSON.stringify(out), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'unknown' }), { status: 500 });
  }
}
