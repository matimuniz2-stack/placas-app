// Vercel Edge function: POST /api/caption
// Generates an Instagram caption using Anthropic Claude.
// The user supplies their own ANTHROPIC API key (we DO NOT proxy our own).

export const config = { runtime: 'edge' };

interface CaptionRequest {
  apiKey: string;
  data: {
    addr?: string;
    barrio?: string;
    amb?: string;
    m2?: string;
    baths?: string;
    cochera?: string;
    price?: string;
    currency?: string;
    op?: string;
    expensas?: string;
    antiguedad?: string;
    desc?: string;
  };
  tone?: 'formal' | 'casual' | 'premium' | 'urgente' | 'storytelling' | 'natural';
  handle?: string;
  variants?: number;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 });
  }
  let body: CaptionRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON' }), { status: 400 });
  }
  if (!body.apiKey) return new Response(JSON.stringify({ error: 'missing apiKey' }), { status: 400 });
  if (!body.data) return new Response(JSON.stringify({ error: 'missing data' }), { status: 400 });

  const tone = body.tone || 'natural';
  const handle = body.handle || '@zamboni.inmobiliaria';
  const variants = Math.max(1, Math.min(5, body.variants || 3));
  const d = body.data;

  const sysPrompt = `Sos un copywriter argentino especializado en marketing inmobiliario para Instagram en Buenos Aires. Escribís captions cortos, en español rioplatense, con buena puntuación, sin clichés (evitá "tu próximo hogar", "donde los sueños cobran vida", etc.). Conocés los barrios porteños y usás emojis con criterio (sin abusar). Generás hashtags relevantes localizados.`;

  const tonePrompt = {
    formal: 'Tono: formal, profesional, ideal para clientes corporativos o premium alto. Sin emojis o solo 1-2.',
    casual: 'Tono: cercano, amigable, conversacional. Emojis con moderación.',
    premium: 'Tono: elegante, sofisticado, evoca lujo y exclusividad. Vocabulario refinado.',
    urgente: 'Tono: scarcity, oportunidad, llamada a la acción fuerte. "Última unidad", "Solo este mes".',
    storytelling: 'Tono: narrativo, visualizá la vida del que vive ahí. Cuenta una pequeña historia.',
    natural: 'Tono: equilibrado, profesional pero humano. Como hablaría un agente real con su contacto. Sin sonar a comercial pesado.',
  }[tone];

  const userPrompt = `Generá ${variants} captions distintos para este post de Instagram inmobiliario:

DATOS:
${d.op ? '- Operación: ' + d.op : ''}
${d.addr ? '- Dirección: ' + d.addr : ''}
${d.barrio ? '- Barrio: ' + d.barrio : ''}
${d.amb ? '- Ambientes: ' + d.amb : ''}
${d.m2 ? '- Superficie: ' + d.m2 + ' m²' : ''}
${d.baths ? '- Baños: ' + d.baths : ''}
${d.cochera === 'Sí' ? '- Con cochera' : ''}
${d.price ? '- Precio: ' + (d.currency || '') + ' ' + d.price : ''}
${d.expensas ? '- Expensas: $' + d.expensas : ''}
${d.antiguedad ? '- Antigüedad: ' + d.antiguedad + ' años' : ''}
${d.desc ? '- Descripción extra: ' + d.desc : ''}

CUENTA: ${handle}

${tonePrompt}

INSTRUCCIONES:
- Cada caption ~80-150 palabras
- Hook fuerte en la primera línea (sin clickbait)
- Líneas cortas (móvil-first)
- Termina con CTA realista ("Consultanos por DM" o variantes)
- 8-12 hashtags al final, mezclando: barrio específico, tipo de operación, propiedad, marca general
- Variá entre los 3 captions: no repitas estructura ni hook

FORMATO DE RESPUESTA JSON ESTRICTO:
{
  "captions": [
    { "text": "...caption completo con hashtags al final..." },
    { "text": "..." },
    { "text": "..." }
  ]
}
Sin markdown, sin backticks, sólo el JSON crudo.`;

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
        max_tokens: 2200,
        system: sysPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(
        JSON.stringify({ error: `Claude API ${res.status}`, detail: errText.slice(0, 500) }),
        { status: 502 },
      );
    }

    const data = await res.json() as any;
    const text = data?.content?.[0]?.text || '';
    let parsed: any = null;
    try {
      // Extract JSON even if there's extra text around
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    } catch {
      parsed = null;
    }
    if (!parsed?.captions) {
      // Fallback: return as single caption
      return new Response(JSON.stringify({ captions: [{ text }] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(parsed), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message || 'unknown error' }),
      { status: 500 },
    );
  }
}
