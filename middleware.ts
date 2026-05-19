// Vercel Edge Middleware: gates the entire app behind a signed cookie.
// To revoke every active session, rotate SESSION_SECRET in Vercel and redeploy.

export const config = {
  matcher: '/((?!api/(?:login|logout)|login\\.html|favicon\\.ico).*)',
};

const SECRET = process.env.SESSION_SECRET || '';

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function verifyToken(token: string): Promise<boolean> {
  if (!SECRET) return false;
  const dot = token.indexOf('.');
  if (dot < 0) return false;
  const expStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  try {
    return await crypto.subtle.verify(
      'HMAC',
      key,
      b64urlToBytes(sig),
      new TextEncoder().encode(expStr),
    );
  } catch {
    return false;
  }
}

export default async function middleware(req: Request): Promise<Response | undefined> {
  const cookieHeader = req.headers.get('cookie') || '';
  const m = cookieHeader.match(/(?:^|;\s*)placas_auth=([^;]+)/);
  if (m) {
    const ok = await verifyToken(decodeURIComponent(m[1]));
    if (ok) return; // authenticated → pass through
  }
  const url = new URL(req.url);
  url.pathname = '/login.html';
  url.search = '';
  return Response.redirect(url.toString(), 302);
}
