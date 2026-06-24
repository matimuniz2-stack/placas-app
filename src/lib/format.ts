import type { PlacaData } from '@/types';

export function formatPrice(raw: string | number): string {
  const clean = String(raw).replace(/\D/g, '');
  if (!clean) return '';
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function abbreviatePrice(raw: string): string {
  const num = parseInt(String(raw).replace(/\D/g, ''));
  if (!num) return raw;
  if (num >= 1_000_000) {
    const m = num / 1_000_000;
    return m === Math.floor(m) ? `${m}M` : `${m.toFixed(1)}M`;
  }
  if (num >= 1_000) {
    const k = num / 1_000;
    return k === Math.floor(k) ? `${k}K` : `${k.toFixed(1)}K`;
  }
  return String(num);
}

// Cantidad de cocheras: usa el campo numérico `cocheras` si está, si no cae al
// Sí/No histórico (Sí = 1).
export function cocheraCount(d: PlacaData): number {
  if (d.cocheras != null && d.cocheras !== '') {
    const n = parseInt(d.cocheras, 10);
    return isNaN(n) ? 0 : n;
  }
  return d.cochera === 'Sí' ? 1 : 0;
}
export function cocheraLabel(n: number): string {
  return n === 1 ? 'cochera' : 'cocheras';
}

// Definición ÚNICA de los datos clave que pueden ir en la línea de atributos.
// `defaultOn`: amb/m²/baños/cochera se muestran solos si tienen valor; los extras
// (apto crédito, expensas, antigüedad) van apagados hasta que el usuario los prenda.
// `label(d)` devuelve el texto del chip o null si la propiedad no tiene ese dato.
export const ATTR_DEFS: { key: string; defaultOn: boolean; label: (d: PlacaData) => string | null }[] = [
  { key: 'amb', defaultOn: true, label: (d) => (d.amb ? `${d.amb} amb` : null) },
  { key: 'm2', defaultOn: true, label: (d) => (d.m2 ? `${d.m2} m²` : null) },
  { key: 'baths', defaultOn: true, label: (d) => (d.baths ? `${d.baths} ${d.baths === '1' ? 'baño' : 'baños'}` : null) },
  { key: 'cochera', defaultOn: true, label: (d) => { const c = cocheraCount(d); return c > 0 ? `${c} ${cocheraLabel(c)}` : null; } },
  { key: 'aptoCredito', defaultOn: false, label: (d) => (d.aptoCredito ? 'Apto crédito' : null) },
  { key: 'expensas', defaultOn: false, label: (d) => (d.expensas ? `Expensas $${d.expensas}` : null) },
  { key: 'antiguedad', defaultOn: false, label: (d) => {
      if (d.antiguedad == null || d.antiguedad === '') return null;
      const n = parseInt(d.antiguedad, 10);
      return !isNaN(n) && n === 0 ? 'A estrenar' : `${d.antiguedad} años`;
    } },
];

export interface AttrItem { key: string; label: string; }

// Atributos que VAN en la placa (tienen valor y están habilitados).
export function attrItems(d: PlacaData): AttrItem[] {
  const on = d.attrsOn || {};
  const out: AttrItem[] = [];
  for (const def of ATTR_DEFS) {
    const enabled = on[def.key] ?? def.defaultOn;
    if (!enabled) continue;
    const label = def.label(d);
    if (label) out.push({ key: def.key, label });
  }
  return out;
}

// Todos los atributos que la propiedad TIENE (con valor), con su estado on/off — para
// la UI de "Datos clave" (chips para prender/apagar cada uno).
export function attrChips(d: PlacaData): { key: string; label: string; on: boolean }[] {
  const on = d.attrsOn || {};
  const out: { key: string; label: string; on: boolean }[] = [];
  for (const def of ATTR_DEFS) {
    const label = def.label(d);
    if (label) out.push({ key: def.key, label, on: on[def.key] ?? def.defaultOn });
  }
  return out;
}

export function amenString(d: PlacaData): string {
  // Si el usuario escribió un texto manual, ese tiene prioridad sobre el auto.
  if (d.amenText && d.amenText.trim()) return d.amenText;
  return attrItems(d).map((a) => a.label).join(' · ');
}

export function extrasString(d: PlacaData): string {
  const e: string[] = [];
  if (d.expensas) e.push(`Expensas $ ${d.expensas}`);
  if (d.antiguedad) e.push(`${d.antiguedad} años`);
  return e.join(' · ');
}

export function priceString(d: PlacaData, opts?: { abbreviate?: boolean }): string {
  const p = opts?.abbreviate ? abbreviatePrice(d.price) : d.price;
  return `${d.currency} ${p}`;
}

// Recorta un texto largo (p. ej. la descripción de un aviso) a su PRIMERA oración,
// para usarlo como subtítulo/bajada en la placa. Si la primera oración es muy larga,
// corta por palabra hasta `maxLen` y agrega elipsis. Evita cortar en abreviaturas
// tempranas (Av., Sr.) exigiendo un mínimo de caracteres antes del punto.
export function firstSentence(text: string, maxLen = 120): string {
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

export function slugify(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function buildCaption(d: PlacaData, style: 'formal' | 'casual' | 'premium' | 'urgente' | 'casual_emoji' = 'casual_emoji'): string {
  const lines: string[] = [];
  const opLbl = d.op === 'Venta' ? 'EN VENTA' : 'EN ALQUILER';
  const opEmoji = d.op === 'Venta' ? '🏠' : '🔑';
  const cc = cocheraCount(d);
  const ccCap = cc === 1 ? 'Cochera' : 'Cocheras';

  if (style === 'formal') {
    lines.push(`${opLbl}${d.barrio ? ' — ' + d.barrio : ''}`);
    lines.push('');
    if (d.addr) lines.push(`Ubicación: ${d.addr}, ${d.barrio || ''}`.trim());
    if (d.desc) { lines.push(''); lines.push(d.desc); }
    lines.push('');
    if (d.amb) lines.push(`• ${d.amb} ambientes`);
    if (d.m2) lines.push(`• Superficie: ${d.m2} m²`);
    if (d.baths) lines.push(`• ${d.baths} baños`);
    if (cc > 0) lines.push(`• ${cc} ${ccCap.toLowerCase()}`);
    if (d.expensas) lines.push(`• Expensas: $${d.expensas}`);
    if (d.antiguedad) lines.push(`• Antigüedad: ${d.antiguedad} años`);
    lines.push('');
    lines.push(`Valor: ${d.currency} ${d.price}`);
    lines.push('');
    lines.push('Consultas por mensaje directo.');
  } else if (style === 'premium') {
    lines.push(`✦ ${opLbl} ✦`);
    if (d.barrio) lines.push(d.barrio.toUpperCase());
    lines.push('');
    if (d.addr) lines.push(d.addr);
    if (d.desc) { lines.push(''); lines.push(`"${d.desc}"`); }
    lines.push('');
    if (d.amb) lines.push(`${d.amb} ambientes · ${d.m2 || '—'} m²`);
    if (d.baths) lines.push(`${d.baths} baños${cc > 0 ? ` · ${cc} ${ccCap}` : ''}`);
    lines.push('');
    lines.push(`${d.currency} ${d.price}`);
    lines.push('');
    lines.push('Una propiedad única, esperando ser descubierta.');
  } else if (style === 'urgente') {
    lines.push(`🚨 OPORTUNIDAD ${opLbl} 🚨`);
    lines.push(`${d.barrio || ''} · ${d.addr || ''}`);
    lines.push('');
    if (d.desc) lines.push(`👉 ${d.desc}`);
    if (d.amb) lines.push(`✅ ${d.amb} ambientes`);
    if (d.m2) lines.push(`✅ ${d.m2} m²`);
    if (d.baths) lines.push(`✅ ${d.baths} baños`);
    if (cc > 0) lines.push(`✅ ${cc} ${ccCap}`);
    lines.push('');
    lines.push(`💰 ${d.currency} ${d.price}`);
    lines.push('');
    lines.push('⚡ Última disponible · Escribinos YA');
  } else if (style === 'casual') {
    lines.push(`${opLbl} en ${d.barrio || ''}`);
    if (d.addr) lines.push(d.addr);
    lines.push('');
    if (d.desc) { lines.push(d.desc); lines.push(''); }
    if (d.amb || d.m2) lines.push(`${d.amb || '—'} amb · ${d.m2 || '—'} m² · ${d.baths || '—'} baños${cc > 0 ? ` · ${cc} ${ccCap.toLowerCase()}` : ''}`);
    lines.push('');
    lines.push(`${d.currency} ${d.price}`);
    lines.push('');
    lines.push('Mandanos DM para coordinar visita.');
  } else {
    lines.push(`${opEmoji} ${opLbl}${d.barrio ? ' · ' + d.barrio.toUpperCase() : ''}`);
    lines.push('');
    if (d.addr) lines.push(`📍 ${d.addr}`);
    if (d.desc) { lines.push(''); lines.push(d.desc); }
    lines.push('');
    if (d.amb) lines.push(`✨ ${d.amb} ambientes`);
    if (d.m2) lines.push(`📐 ${d.m2} m² cubiertos`);
    if (d.baths) lines.push(`🚿 ${d.baths} baños`);
    if (cc > 0) lines.push(`🚗 ${cc} ${ccCap.toLowerCase()}${cc === 1 ? ' fija' : ' fijas'}`);
    if (d.expensas) lines.push(`💵 Expensas: $ ${d.expensas}`);
    if (d.antiguedad) lines.push(`🏗 ${d.antiguedad} años de antigüedad`);
    lines.push('');
    lines.push(`💰 ${d.currency} ${d.price || '—'}`);
    lines.push('');
    lines.push('Consultanos por DM 📩');
  }

  lines.push('');
  const barrioTag = (d.barrio || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '');
  const tagOp = d.op === 'Venta' ? 'venta' : 'alquiler';
  const tags = ['zamboniinmobiliaria', 'propiedadesba', 'inmobiliariaba', tagOp, tagOp + 'capital'];
  if (barrioTag) tags.unshift(barrioTag, 'departamento' + barrioTag);
  lines.push(tags.map((h) => '#' + h).join(' '));
  return lines.join('\n');
}
