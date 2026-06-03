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

export function amenString(d: PlacaData): string {
  // Si el usuario escribió un texto manual, ese tiene prioridad sobre el auto.
  if (d.amenText && d.amenText.trim()) return d.amenText;
  const parts: string[] = [];
  if (d.amb) parts.push(`${d.amb} amb`);
  if (d.m2) parts.push(`${d.m2} m²`);
  if (d.baths) parts.push(`${d.baths} baños`);
  if (d.cochera === 'Sí') parts.push('cochera');
  return parts.join(' · ');
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

  if (style === 'formal') {
    lines.push(`${opLbl}${d.barrio ? ' — ' + d.barrio : ''}`);
    lines.push('');
    if (d.addr) lines.push(`Ubicación: ${d.addr}, ${d.barrio || ''}`.trim());
    if (d.desc) { lines.push(''); lines.push(d.desc); }
    lines.push('');
    if (d.amb) lines.push(`• ${d.amb} ambientes`);
    if (d.m2) lines.push(`• Superficie: ${d.m2} m²`);
    if (d.baths) lines.push(`• ${d.baths} baños`);
    if (d.cochera === 'Sí') lines.push('• Cochera incluida');
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
    if (d.baths) lines.push(`${d.baths} baños${d.cochera === 'Sí' ? ' · Cochera' : ''}`);
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
    if (d.cochera === 'Sí') lines.push('✅ Cochera');
    lines.push('');
    lines.push(`💰 ${d.currency} ${d.price}`);
    lines.push('');
    lines.push('⚡ Última disponible · Escribinos YA');
  } else if (style === 'casual') {
    lines.push(`${opLbl} en ${d.barrio || ''}`);
    if (d.addr) lines.push(d.addr);
    lines.push('');
    if (d.desc) { lines.push(d.desc); lines.push(''); }
    if (d.amb || d.m2) lines.push(`${d.amb || '—'} amb · ${d.m2 || '—'} m² · ${d.baths || '—'} baños${d.cochera === 'Sí' ? ' · cochera' : ''}`);
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
    if (d.cochera === 'Sí') lines.push('🚗 Cochera fija');
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
