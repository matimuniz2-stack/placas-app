import type { TemplateDef } from '@/types';

export interface VariantDef {
  id: string;
  name: string;
  brand: string;
  bgColor?: string;
  textColor?: string;
  fontPrimary?: string;
  fontSecondary?: string;
  thumb: { bg: string; fg: string };
}

export const VARIANTS: VariantDef[] = [
  {
    id: 'default',
    name: 'Original',
    brand: '#de1f1a',
    thumb: { bg: '#1a1a1a', fg: '#de1f1a' },
  },
  {
    id: 'cream-editorial',
    name: 'Cream Editorial',
    brand: '#b8860b',
    bgColor: '#f4ede0',
    textColor: '#2a1810',
    fontPrimary: 'Cormorant Garamond',
    fontSecondary: 'Inter',
    thumb: { bg: '#f4ede0', fg: '#2a1810' },
  },
  {
    id: 'cinema-noir',
    name: 'Cinema Noir',
    brand: '#d4af37',
    bgColor: '#0a0a0a',
    textColor: '#f5f5f5',
    fontPrimary: 'Tenor Sans',
    fontSecondary: 'Inter',
    thumb: { bg: '#0a0a0a', fg: '#d4af37' },
  },
  {
    id: 'brutalist',
    name: 'Brutalist',
    brand: '#ff3300',
    bgColor: '#ffffff',
    textColor: '#0a0a0a',
    fontPrimary: 'Space Grotesk',
    fontSecondary: 'Inter',
    thumb: { bg: '#ffffff', fg: '#0a0a0a' },
  },
  {
    id: 'gold-premium',
    name: 'Gold Premium',
    brand: '#c9a86b',
    bgColor: '#1c1715',
    textColor: '#f0e6d2',
    fontPrimary: 'Italiana',
    fontSecondary: 'Cormorant Garamond',
    thumb: { bg: '#1c1715', fg: '#c9a86b' },
  },
  {
    id: 'swiss-grid',
    name: 'Swiss Grid',
    brand: '#0066cc',
    bgColor: '#ffffff',
    textColor: '#111111',
    fontPrimary: 'Inter',
    fontSecondary: 'IBM Plex Mono',
    thumb: { bg: '#ffffff', fg: '#0066cc' },
  },
];

export function applyVariant(tpl: TemplateDef, variantId: string): TemplateDef {
  const v = VARIANTS.find((x) => x.id === variantId) || VARIANTS[0];
  if (v.id === 'default') return tpl;
  return {
    ...tpl,
    bgColor: v.bgColor ?? tpl.bgColor,
    textColor: v.textColor ?? tpl.textColor,
  };
}
