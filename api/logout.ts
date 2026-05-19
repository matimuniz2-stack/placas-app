// POST /api/logout → clears the auth cookie for the caller.

export const config = { runtime: 'edge' };

export default async function handler(_req: Request): Promise<Response> {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'placas_auth=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
    },
  });
}
