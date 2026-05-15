import type { Draft } from '@/types';

function utf8ToB64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}
function b64ToUtf8(b64: string): string {
  return decodeURIComponent(escape(atob(b64)));
}

export function encodeShare(data: Partial<Draft>): string {
  const json = JSON.stringify(data);
  return utf8ToB64(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeShare(s: string): Partial<Draft> | null {
  try {
    let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return JSON.parse(b64ToUtf8(b64));
  } catch {
    return null;
  }
}

export function getShareUrl(data: Partial<Draft>): string {
  const sharable: Partial<Draft> = {
    data: data.data,
    templateId: data.templateId,
    layerOverrides: data.layerOverrides,
    theme: data.theme,
    badges: data.badges,
  };
  // omit fotos pesadas en share
  const enc = encodeShare(sharable);
  return `${location.origin}${location.pathname}#s=${enc}`;
}

export function readShareFromUrl(): Partial<Draft> | null {
  const m = location.hash.match(/[#&]s=([^&]+)/);
  if (!m) return null;
  return decodeShare(m[1]);
}
