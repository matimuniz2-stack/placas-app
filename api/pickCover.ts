// Vercel Edge function: POST /api/pickCover
// Recibe varias fotos (thumbnails) y Claude elige cuál es la mejor PORTADA, priorizando
// el FRENTE/fachada exterior del edificio o casa. Devuelve { coverIdx, reason }.
// El usuario aporta su propia API key de Anthropic.

export const config = { runtime: 'edge' };

interface PhotoIn {
  idx: number;
  image: string; // dataURL o base64 (thumbnail)
  mediaType?: string;
}
interface PickCoverRequest {
  apiKey: string;
  photos: PhotoIn[];
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function splitImage(raw: string, fallback = 'image/jpeg'): { mediaType: string; data: string } {
  const m = raw.match(/^data:([^;]+);base64,(.*)$/s);
  let mediaType = fallback;
  let data = raw;
  if (m) {
    mediaType = m[1];
    data = m[2];
  }
  if (!ALLOWED.includes(mediaType)) mediaType = 'image/jpeg';
  return { mediaType, data };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 });
  }
  let body: PickCoverRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON' }), { status: 400 });
  }
  if (!body.apiKey) return new Response(JSON.stringify({ error: 'missing apiKey' }), { status: 400 });
  const photos = Array.isArray(body.photos) ? body.photos.slice(0, 12) : [];
  if (!photos.length) return new Response(JSON.stringify({ coverIdx: 0 }), { headers: { 'Content-Type': 'application/json' } });

  const content: any[] = [];
  for (const p of photos) {
    const { mediaType, data } = splitImage(p.image);
    content.push({ type: 'text', text: `Foto índice ${p.idx}:` });
    content.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data } });
  }
  content.push({
    type: 'text',
    text: `Sos editor de placas inmobiliarias. Mirá las fotos (cada una rotulada "Foto índice N"). Elegí la MEJOR para portada de una placa de Instagram, priorizando en este orden: (1) la FACHADA / FRENTE EXTERIOR del edificio o casa; (2) si no hay un frente claro, la mejor toma exterior (jardín, balcón, vista); (3) si todo es interior, el ambiente más amplio y vendedor (living/comedor). Devolvé SOLO un JSON crudo: {"coverIdx": <índice elegido>, "reason": "<motivo corto, máx 6 palabras, ej: 'Frente del edificio'>"}. coverIdx debe ser uno de los índices recibidos.`,
  });

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': body.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 200,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(
        JSON.stringify({ error: `Claude API ${res.status}`, detail: errText.slice(0, 500) }),
        { status: 502 },
      );
    }

    const json = (await res.json()) as any;
    const text = json?.content?.[0]?.text || '';
    let parsed: any = null;
    try {
      const mm = text.match(/\{[\s\S]*\}/);
      parsed = mm ? JSON.parse(mm[0]) : null;
    } catch {
      parsed = null;
    }

    const n = photos.length;
    const valid = (i: any) => Number.isInteger(i) && i >= 0 && i < n;
    const coverIdx = parsed && valid(parsed.coverIdx) ? parsed.coverIdx : 0;
    const reason = parsed && parsed.reason ? String(parsed.reason).slice(0, 60) : undefined;

    return new Response(JSON.stringify({ coverIdx, reason }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'unknown error' }), { status: 500 });
  }
}
