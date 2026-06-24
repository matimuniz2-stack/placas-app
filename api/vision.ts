// Vercel Edge function: POST /api/vision
// Lee una foto/captura borrador de una placa y extrae los datos de la propiedad
// usando Claude con visión. Reemplaza el paso manual de "pegárselo a ChatGPT".
// El usuario aporta su propia API key de Anthropic (no proxeamos la nuestra).

export const config = { runtime: 'edge' };

interface VisionRequest {
  apiKey: string;
  image: string;       // dataURL (data:image/...;base64,XXXX) o base64 crudo
  mediaType?: string;  // ej: image/jpeg, image/png, image/webp
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 });
  }
  let body: VisionRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON' }), { status: 400 });
  }
  if (!body.apiKey) return new Response(JSON.stringify({ error: 'missing apiKey' }), { status: 400 });
  if (!body.image) return new Response(JSON.stringify({ error: 'missing image' }), { status: 400 });

  // Acepta dataURL completo o base64 crudo
  let mediaType = body.mediaType || 'image/jpeg';
  let data = body.image;
  const m = body.image.match(/^data:([^;]+);base64,(.*)$/s);
  if (m) {
    mediaType = m[1];
    data = m[2];
  }
  if (!ALLOWED.includes(mediaType)) mediaType = 'image/jpeg';

  const sysPrompt = `Sos un asistente experto en marketing inmobiliario de Buenos Aires. Te paso una imagen: un borrador/captura de una placa inmobiliaria armada a mano (puede estar desprolija, con datos sueltos, capturas de WhatsApp, avisos, etc.). Tu trabajo es LEER todo el texto de la imagen y devolver los datos estructurados, ordenados y prolijos, listos para cargar en un generador de placas. NO inventes datos que no estén en la imagen: si un campo no aparece, dejalo vacío/omitilo. Redactás en español rioplatense, prolijo y sin clichés.`;

  const userPrompt = `Extraé los datos de esta placa inmobiliaria y devolvé SOLO un JSON crudo (sin markdown, sin backticks) con esta forma exacta:

{
  "op": "Venta" | "Alquiler",
  "tipoPropiedad": "ej: Departamento, Casa, PH, Lote",
  "addr": "dirección/calle",
  "barrio": "barrio",
  "amb": "cantidad de ambientes (solo número, ej: 3)",
  "m2": "superficie en m² (solo número)",
  "baths": "cantidad de baños (solo número)",
  "cocheras": "cantidad de cocheras (solo número, 0 si no tiene)",
  "price": "precio (solo número, sin símbolos ni puntos)",
  "currency": "USD" | "ARS",
  "expensas": "monto de expensas si aparece (solo número)",
  "antiguedad": "años de antigüedad si aparece (solo número)",
  "amenities": ["lista", "de", "amenities/ambientes destacados, ej: Balcón, Cocina integrada, Pileta, Parrilla, SUM"],
  "desc": "subtítulo corto y atractivo para la placa (máx 1 oración, ~80 caracteres). Redactalo prolijo basándote en lo más vendedor de la propiedad. Ej: 'Piso alto con vista abierta y balcón aterrazado'.",
  "layoutNote": "una frase breve sugiriendo qué destacar visualmente (qué dato es el gancho)"
}

Reglas:
- Números sin símbolos ni separadores de miles (price: 185000, no "USD 185.000").
- Si no podés determinar un campo, omitilo del JSON (no pongas null ni inventes).
- amenities: máximo 6, los más vendedores.
- Si la moneda no está clara pero el precio es alto (>50000) asumí USD.`;

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
        max_tokens: 1500,
        system: sysPrompt,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
              { type: 'text', text: userPrompt },
            ],
          },
        ],
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
    if (!parsed) {
      return new Response(JSON.stringify({ error: 'no se pudo parsear', raw: text.slice(0, 500) }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Normaliza al shape de ExtractedListing del front
    const out: any = {};
    if (parsed.op === 'Venta' || parsed.op === 'Alquiler') out.op = parsed.op;
    if (parsed.tipoPropiedad) out.tipoPropiedad = String(parsed.tipoPropiedad);
    if (parsed.addr) out.addr = String(parsed.addr);
    if (parsed.barrio) out.barrio = String(parsed.barrio);
    if (parsed.amb) out.amb = String(parsed.amb).replace(/\D/g, '') || String(parsed.amb);
    if (parsed.m2) out.m2 = String(parsed.m2).replace(/\D/g, '');
    if (parsed.baths) out.baths = String(parsed.baths).replace(/\D/g, '');
    if (parsed.cocheras != null) {
      const n = parseInt(String(parsed.cocheras).replace(/\D/g, ''), 10);
      if (!isNaN(n)) {
        out.cocheras = String(n);
        out.cochera = n > 0 ? 'Sí' : 'No';
      }
    }
    if (parsed.price) out.price = String(parsed.price).replace(/\D/g, '');
    if (parsed.currency === 'USD' || parsed.currency === 'ARS') out.currency = parsed.currency;
    if (parsed.expensas) out.expensas = String(parsed.expensas).replace(/\D/g, '');
    if (parsed.antiguedad) out.antiguedad = String(parsed.antiguedad).replace(/\D/g, '');
    if (parsed.desc) out.desc = String(parsed.desc);
    if (Array.isArray(parsed.amenities)) out.amenities = parsed.amenities.map(String).slice(0, 6);
    if (parsed.layoutNote) out.layoutNote = String(parsed.layoutNote);

    return new Response(JSON.stringify(out), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'unknown error' }), { status: 500 });
  }
}
