export interface BgPreset {
  id: string;
  name: string;
  css: string;
}

export const BACKGROUNDS: BgPreset[] = [
  { id: 'gradient-warm', name: 'Cálido', css: 'linear-gradient(135deg, #f4ede0 0%, #c4ad7a 100%)' },
  { id: 'gradient-cool', name: 'Frío', css: 'linear-gradient(135deg, #e0eaf4 0%, #7a99c4 100%)' },
  { id: 'gradient-dark', name: 'Oscuro', css: 'linear-gradient(135deg, #2a2a2a 0%, #0a0a0a 100%)' },
  { id: 'gradient-rose', name: 'Rosé', css: 'linear-gradient(135deg, #f4e0e0 0%, #c47a7a 100%)' },
  { id: 'gradient-noir', name: 'Noir', css: 'linear-gradient(180deg, #1c1715 0%, #0a0a0a 100%)' },
  { id: 'solid-cream', name: 'Crema', css: '#f4ede0' },
  { id: 'solid-noir', name: 'Negro', css: '#0a0a0a' },
  { id: 'solid-paper', name: 'Papel', css: '#fafaf5' },
  { id: 'pattern-dots', name: 'Dots', css: 'radial-gradient(#c4ad7a 1.5px, #f4ede0 1.5px) 0 0/20px 20px' },
  { id: 'pattern-grid', name: 'Grid', css: 'linear-gradient(#e5e5e5 1px, transparent 1px) 0 0/24px 24px, linear-gradient(90deg, #e5e5e5 1px, #fafafa 1px) 0 0/24px 24px' },
];
