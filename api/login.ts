// POST /api/login → validates credentials and sets a signed HttpOnly cookie.

export const config = { runtime: 'edge' };

const USERNAME = process.env.APP_USERNAME || '';
const PASSWORD = process.env.APP_PASSWORD || '';
const SECRET = process.env.SESSION_SECRET || '';
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

function bytesToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return bytesToB64url(sig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 });
  }
  if (!USERNAME || !PASSWORD || !SECRET) {
    return new Response(
      JSON.stringify({ error: 'Server not configured: missing APP_USERNAME / APP_PASSWORD / SESSION_SECRET' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON' }), { status: 400 });
  }
  const u = String(body.username || '');
  const p = String(body.password || '');

  if (!timingSafeEqual(u, USERNAME) || !timingSafeEqual(p, PASSWORD)) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid credentials' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const exp = Date.now() + MAX_AGE_SEC * 1000;
  const sig = await sign(String(exp));
  const token = `${exp}.${sig}`;

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `placas_auth=${encodeURIComponent(token)}; Path=/; Max-Age=${MAX_AGE_SEC}; HttpOnly; Secure; SameSite=Lax`,
    },
  });
}
