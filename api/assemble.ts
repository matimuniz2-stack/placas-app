// Vercel Edge function: POST /api/assemble
// "Armá los textos por mí": recibe los datos del aviso y Claude saca el TÍTULO-diferencial
// (el gancho vendedor que va grande en la placa, NO la dirección), confirma tipo de
// propiedad y operación, y prolija el copy. NO toca las fotos: la portada la elige el usuario.
// El usuario aporta su propia API key de Anthropic.

export const config = { runtime: 'edge' };

interface AssembleRequest {
  apiKey: string;
  data: Record<string, any>;
  extras?: { permuta?: boolean; aptoCredito?: boolean; notes?: string };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 });
  }
  let body: AssembleRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON' }), { status: 400 });
  }
  if (!body.apiKey) return new Response(JSON.stringify({ error: 'missing apiKey' }), { status: 400 });
  const d = body.data || {};
  const ex = body.extras || {};

  const datosTxt = `DATOS DEL AVISO:
- Operación: ${d.op || '(no especificada)'}
- Tipo de propiedad: ${d.tipoPropiedad || '(no especificado)'}
- Dirección: ${d.addr || '(no especificada)'}
- Barrio/Zona: ${d.barrio || '(no especificado)'}
- Ciudad: ${d.city || '(no especificada)'}
- Ambientes: ${d.amb || '(?)'}
- m²: ${d.m2 || '(?)'}
- Baños: ${d.baths || '(?)'}
- Cocheras: ${d.cocheras || '(?)'}
- Precio: ${d.currency || ''} ${d.price || '(?)'}
- Antigüedad: ${d.antiguedad || '(?)'}
- Descripción del listing: ${d.desc || '(ninguna)'}
- Notas del usuario: ${ex.notes || '(ninguna)'}`;

  const sysPrompt = `Sos un copywriter experto en marketing inmobiliario de Buenos Aires/Mar del Plata. Escribís en español rioplatense, sin clichés ("tu próximo hogar", "donde los sueños cobran vida", etc.). Tu especialidad: encontrar EL diferencial más vendedor de una propiedad y convertirlo en un título corto y potente para una placa de Instagram.`;

  const instr = `${datosTxt}

Devolvé SOLO un JSON crudo (sin markdown ni backticks) con esta forma EXACTA:

{
  "titulo": "EL DIFERENCIAL como título de la placa. 2 a 5 palabras, lo más vendedor de la propiedad. Ejemplos del estilo correcto: 'Exclusivo 4 ambientes', 'A estrenar con cochera', 'Vista al mar', 'Reciclado a nuevo', 'Piso alto luminoso', 'Con balcón aterrazado'. NUNCA uses la dirección ni el barrio como título. Sin punto final.",
  "tipoPropiedad": "Departamento | Casa | PH | Lote | Local | Oficina (deducilo de los datos)",
  "op": "Venta" | "Alquiler"
}

Reglas:
- El "titulo" es lo MÁS importante: tiene que ser un gancho real basado en los datos (cantidad de ambientes, estado/antigüedad, amenities, m², ubicación premium). Capitalización tipo título normal (primera mayúscula), no TODO MAYÚSCULAS.
- Si la antigüedad es 0 o "a estrenar", es un fuerte diferencial.
- No inventes características que no estén en los datos/descripción.
- Respetá la operación y el tipo que ya vienen en los datos si están claros; si no, deducilos.`;

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
        max_tokens: 400,
        system: sysPrompt,
        messages: [{ role: 'user', content: instr }],
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

    const out: any = {};
    if (parsed.titulo) out.titulo = String(parsed.titulo).replace(/["']/g, '').trim();
    if (parsed.tipoPropiedad) out.tipoPropiedad = String(parsed.tipoPropiedad).trim();
    if (parsed.op === 'Venta' || parsed.op === 'Alquiler') out.op = parsed.op;

    return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'unknown error' }), { status: 500 });
  }
}
