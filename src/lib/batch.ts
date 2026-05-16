import * as XLSX from 'xlsx';
import type { PlacaData } from '@/types';

export interface BatchRow {
  // Required-ish
  addr?: string;
  barrio?: string;
  // Optional
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
  photoUrl?: string;
  listingUrl?: string;
  // Raw for debugging
  _raw?: Record<string, any>;
}

// Map of normalized column names → BatchRow keys.
// Includes Spanish and English variations.
const COL_MAP: Record<string, keyof BatchRow> = {
  addr: 'addr', address: 'addr', direccion: 'addr', dirección: 'addr',
  barrio: 'barrio', neighborhood: 'barrio', zona: 'barrio',
  amb: 'amb', ambientes: 'amb', rooms: 'amb',
  m2: 'm2', superficie: 'm2', metros: 'm2', area: 'm2',
  baths: 'baths', banos: 'baths', baños: 'baths', bathrooms: 'baths',
  cochera: 'cochera', parking: 'cochera', garage: 'cochera',
  price: 'price', precio: 'price', valor: 'price',
  currency: 'currency', moneda: 'currency',
  op: 'op', operacion: 'op', operación: 'op', operation: 'op',
  expensas: 'expensas', expenses: 'expensas',
  antiguedad: 'antiguedad', antigüedad: 'antiguedad', age: 'antiguedad',
  desc: 'desc', descripcion: 'desc', descripción: 'desc', description: 'desc',
  photourl: 'photoUrl', foto: 'photoUrl', photo: 'photoUrl', imagen: 'photoUrl', image: 'photoUrl',
  url: 'listingUrl', listingurl: 'listingUrl', link: 'listingUrl',
};

function normalizeKey(k: string): string {
  return String(k)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function normalizeRow(raw: Record<string, any>): BatchRow {
  const out: BatchRow = { _raw: raw };
  for (const [k, v] of Object.entries(raw)) {
    if (v == null || v === '') continue;
    const nk = normalizeKey(k);
    const targetKey = COL_MAP[nk];
    if (targetKey) {
      const strVal = String(v).trim();
      (out as any)[targetKey] = strVal;
    }
  }
  return out;
}

export function parseCSV(text: string): BatchRow[] {
  // Simple CSV parser supporting quoted fields with commas
  const lines: string[][] = [];
  let curLine: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { curLine.push(cur); cur = ''; }
      else if (ch === '\n') { curLine.push(cur); lines.push(curLine); curLine = []; cur = ''; }
      else if (ch === '\r') { /* skip */ }
      else cur += ch;
    }
  }
  if (cur.length > 0 || curLine.length > 0) { curLine.push(cur); lines.push(curLine); }
  if (lines.length < 2) return [];
  const headers = lines[0].map((h) => h.trim());
  const rows: BatchRow[] = [];
  for (let r = 1; r < lines.length; r++) {
    const line = lines[r];
    if (line.every((c) => !c || !c.trim())) continue;
    const obj: Record<string, any> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = line[c] ?? '';
    }
    rows.push(normalizeRow(obj));
  }
  return rows;
}

export function parseXLSX(arrayBuffer: ArrayBuffer): BatchRow[] {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
  return rows.map(normalizeRow);
}

export function rowToPlacaData(r: BatchRow): Partial<PlacaData> {
  // Sanitize price: leave as-is if already formatted, otherwise auto-format
  let price = r.price ?? '';
  if (price && /^\d+$/.test(price.replace(/\D/g, '')) && !price.includes('.') && !price.includes(',')) {
    price = price.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  const currency = (r.currency || 'USD').toUpperCase() as any;
  const op = r.op
    ? (r.op.toLowerCase().startsWith('alq') ? 'Alquiler' : 'Venta')
    : 'Venta';
  const cochera = (r.cochera || '').toLowerCase();
  const cocheraVal: any = ['si', 'sí', 'yes', 'true', '1'].includes(cochera) ? 'Sí' : 'No';

  return {
    addr: r.addr || '',
    barrio: r.barrio || '',
    amb: r.amb || '',
    m2: r.m2 ? r.m2.replace(/[^\d]/g, '') : '',
    baths: r.baths || '',
    cochera: cocheraVal,
    price,
    currency: ['USD', 'ARS'].includes(currency) ? currency : 'USD',
    op,
    expensas: r.expensas || '',
    antiguedad: r.antiguedad || '',
    desc: r.desc || '',
    listingUrl: r.listingUrl || '',
  };
}

// CSV template (for download)
export const CSV_TEMPLATE_HEADERS = [
  'addr', 'barrio', 'amb', 'm2', 'baths', 'cochera',
  'price', 'currency', 'op', 'expensas', 'antiguedad',
  'desc', 'photoUrl', 'listingUrl',
];

export const CSV_TEMPLATE_EXAMPLE = [
  ['Av. Cabildo 2900', 'Belgrano', '3', '92', '2', 'Sí', '245000', 'USD', 'Venta', '85000', '15', 'Piso alto con vista', 'https://ejemplo.com/foto1.jpg', 'https://zonaprop.com.ar/...'],
  ['Av. Libertador 4500', 'Belgrano', '2', '70', '1', 'No', '189000', 'USD', 'Venta', '', '', '', '', ''],
  ['Honduras 5500', 'Palermo', '1', '45', '1', 'No', '450000', 'ARS', 'Alquiler', '60000', '5', 'Frente, luminoso', '', ''],
];

export function buildCsvTemplate(): string {
  const rows = [CSV_TEMPLATE_HEADERS, ...CSV_TEMPLATE_EXAMPLE];
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}
