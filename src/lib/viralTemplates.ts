// Pre-built viral reel templates. Each template describes the entire structure
// of the reel: per-slot duration, motion, transition INTO that slot, plus the
// global effects pack settings. The user only drops their photos/videos into
// the slots and the rest is done.
import type {
  MotionStyle,
  Transition,
  ColorGrade,
  EffectsLevel,
  TextStyle,
  MediaItem,
} from './reel';

import type { Format } from '@/types';

export interface ReelSlot {
  duration: number;            // seconds for this slot
  motion: MotionStyle;
  transition: Transition;      // transition INTO this slot (ignored on first)
  transitionDuration: number;
}

export interface ViralTemplate {
  id: string;
  name: string;
  category: 'classic' | 'energetic' | 'cinematic' | 'premium' | 'social';
  description: string;
  slots: ReelSlot[];

  // Global settings applied when this template is selected
  format: Format;
  fps: 24 | 30 | 60;
  kenBurnsZoom: number;        // 1 + delta
  effectsLevel: EffectsLevel;
  colorGrade: ColorGrade;
  speedRamp: boolean;
  zoomPunch: boolean;
  lightLeak: boolean;
  filmGrain: boolean;
  rgbSplit: boolean;
  glitchFlash: boolean;
  vignette: boolean;
  cinematicLook: boolean;
  hd: boolean;
  intro: boolean;
  outro: boolean;
  textOverlays: TextStyle;
}

// Helper: build N identical slots
const repeat = (n: number, slot: Omit<ReelSlot, 'transition' | 'transitionDuration'>, transition: Transition = 'fade', tD = 0.4): ReelSlot[] =>
  Array.from({ length: n }, () => ({ ...slot, transition, transitionDuration: tD }));

// Helper: alternating zoom-in/zoom-out (smooth continuity)
const alternating = (n: number, duration: number, transition: Transition = 'fade', tD = 0.45): ReelSlot[] =>
  Array.from({ length: n }, (_, i) => ({
    duration,
    motion: (i % 2 === 0 ? 'zoom-in' : 'zoom-out') as MotionStyle,
    transition,
    transitionDuration: tD,
  }));

export const VIRAL_TEMPLATES: ViralTemplate[] = [
  // ── ENERGETIC ─────────────────────────────────────────────────────────────
  {
    id: 'quick-tour',
    name: 'Quick Tour',
    category: 'energetic',
    description: '6 cortes rápidos, zoom punch, ritmo TikTok',
    slots: alternating(6, 1.3, 'cut', 0),
    format: 'story', fps: 30, kenBurnsZoom: 1.22,
    effectsLevel: 'viral', colorGrade: 'punchy-estate',
    speedRamp: false, zoomPunch: true, lightLeak: false, filmGrain: true,
    rgbSplit: true, glitchFlash: true, vignette: true, cinematicLook: false,
    hd: true, intro: false, outro: true, textOverlays: 'bold',
  },
  {
    id: 'viral-flash',
    name: 'Viral Flash',
    category: 'energetic',
    description: '9 slots ultra rápidos, flash blanco entre cortes',
    slots: alternating(9, 0.9, 'cut', 0),
    format: 'story', fps: 30, kenBurnsZoom: 1.30,
    effectsLevel: 'viral', colorGrade: 'punchy-estate',
    speedRamp: true, zoomPunch: true, lightLeak: false, filmGrain: false,
    rgbSplit: true, glitchFlash: true, vignette: true, cinematicLook: false,
    hd: true, intro: false, outro: true, textOverlays: 'bold',
  },
  {
    id: 'slide-show',
    name: 'Slide Show',
    category: 'energetic',
    description: '5 slots con transiciones slide laterales',
    slots: [
      { duration: 1.8, motion: 'pan-right', transition: 'cut', transitionDuration: 0 },
      { duration: 1.8, motion: 'pan-left',  transition: 'slide-left', transitionDuration: 0.4 },
      { duration: 1.8, motion: 'pan-right', transition: 'slide-left', transitionDuration: 0.4 },
      { duration: 1.8, motion: 'pan-left',  transition: 'slide-left', transitionDuration: 0.4 },
      { duration: 2.5, motion: 'zoom-in',   transition: 'slide-left', transitionDuration: 0.4 },
    ],
    format: 'story', fps: 30, kenBurnsZoom: 1.18,
    effectsLevel: 'viral', colorGrade: 'cold-blue',
    speedRamp: false, zoomPunch: true, lightLeak: false, filmGrain: false,
    rgbSplit: false, glitchFlash: false, vignette: true, cinematicLook: false,
    hd: true, intro: false, outro: true, textOverlays: 'bold',
  },

  // ── CINEMATIC ─────────────────────────────────────────────────────────────
  {
    id: 'cinematic-walkthrough',
    name: 'Cinematic Walkthrough',
    category: 'cinematic',
    description: '5 escenas slow pan, fade suave, color teal',
    slots: [
      { duration: 3.5, motion: 'pan-right', transition: 'fade', transitionDuration: 0.8 },
      { duration: 3.5, motion: 'pan-left',  transition: 'fade', transitionDuration: 0.8 },
      { duration: 3.5, motion: 'zoom-in',   transition: 'fade', transitionDuration: 0.8 },
      { duration: 3.5, motion: 'pan-down',  transition: 'fade', transitionDuration: 0.8 },
      { duration: 4.0, motion: 'zoom-out',  transition: 'fade', transitionDuration: 0.8 },
    ],
    format: 'story', fps: 30, kenBurnsZoom: 1.14,
    effectsLevel: 'cinematic', colorGrade: 'cinematic-teal',
    speedRamp: false, zoomPunch: false, lightLeak: true, filmGrain: true,
    rgbSplit: false, glitchFlash: false, vignette: true, cinematicLook: true,
    hd: true, intro: true, outro: true, textOverlays: 'elegant',
  },
  {
    id: 'house-story',
    name: 'House Story',
    category: 'cinematic',
    description: 'Narrativa de 5 ambientes (exterior, living, dormi, baño, vista)',
    slots: [
      { duration: 2.8, motion: 'zoom-out',  transition: 'fade', transitionDuration: 0.5 },
      { duration: 3.0, motion: 'pan-right', transition: 'fade', transitionDuration: 0.5 },
      { duration: 3.0, motion: 'pan-left',  transition: 'fade', transitionDuration: 0.5 },
      { duration: 3.0, motion: 'pan-up',    transition: 'fade', transitionDuration: 0.5 },
      { duration: 3.5, motion: 'zoom-in',   transition: 'fade', transitionDuration: 0.5 },
    ],
    format: 'story', fps: 30, kenBurnsZoom: 1.16,
    effectsLevel: 'cinematic', colorGrade: 'warm-sunset',
    speedRamp: false, zoomPunch: false, lightLeak: true, filmGrain: true,
    rgbSplit: false, glitchFlash: false, vignette: true, cinematicLook: true,
    hd: true, intro: true, outro: true, textOverlays: 'elegant',
  },
  {
    id: 'vintage-film',
    name: 'Vintage Film',
    category: 'cinematic',
    description: 'Look 70s con grano fuerte, slow pan, transición zoom-blur',
    slots: alternating(5, 3.0, 'zoom-blur', 0.7),
    format: 'story', fps: 24, kenBurnsZoom: 1.10,
    effectsLevel: 'cinematic', colorGrade: 'vintage-film',
    speedRamp: false, zoomPunch: false, lightLeak: true, filmGrain: true,
    rgbSplit: false, glitchFlash: false, vignette: true, cinematicLook: true,
    hd: true, intro: true, outro: true, textOverlays: 'elegant',
  },

  // ── PREMIUM ───────────────────────────────────────────────────────────────
  {
    id: 'premium-reveal',
    name: 'Premium Reveal',
    category: 'premium',
    description: 'Escalado: 1s, 1.5s, 2s, 4s (reveal final). Gold grade.',
    slots: [
      { duration: 1.2, motion: 'zoom-in',  transition: 'cut', transitionDuration: 0 },
      { duration: 1.8, motion: 'zoom-out', transition: 'fade', transitionDuration: 0.3 },
      { duration: 2.5, motion: 'zoom-in',  transition: 'fade', transitionDuration: 0.4 },
      { duration: 4.5, motion: 'zoom-out', transition: 'fade', transitionDuration: 0.6 },
    ],
    format: 'story', fps: 30, kenBurnsZoom: 1.20,
    effectsLevel: 'cinematic', colorGrade: 'premium-gold',
    speedRamp: false, zoomPunch: true, lightLeak: true, filmGrain: true,
    rgbSplit: false, glitchFlash: false, vignette: true, cinematicLook: true,
    hd: true, intro: true, outro: true, textOverlays: 'elegant',
  },
  {
    id: 'luxury-listing',
    name: 'Luxury Listing',
    category: 'premium',
    description: '4 planos largos, slow zoom in continuo',
    slots: alternating(4, 4.0, 'fade', 0.8),
    format: 'story', fps: 30, kenBurnsZoom: 1.12,
    effectsLevel: 'cinematic', colorGrade: 'premium-gold',
    speedRamp: false, zoomPunch: false, lightLeak: true, filmGrain: true,
    rgbSplit: false, glitchFlash: false, vignette: true, cinematicLook: true,
    hd: true, intro: true, outro: true, textOverlays: 'elegant',
  },

  // ── SOCIAL ────────────────────────────────────────────────────────────────
  {
    id: 'open-house',
    name: 'Open House',
    category: 'social',
    description: 'Para promocionar visita. Energético + text bold.',
    slots: alternating(7, 1.6, 'cut', 0),
    format: 'story', fps: 30, kenBurnsZoom: 1.22,
    effectsLevel: 'viral', colorGrade: 'warm-sunset',
    speedRamp: true, zoomPunch: true, lightLeak: true, filmGrain: false,
    rgbSplit: false, glitchFlash: true, vignette: true, cinematicLook: false,
    hd: true, intro: false, outro: true, textOverlays: 'bold',
  },
  {
    id: 'modern-listing',
    name: 'Modern Listing',
    category: 'social',
    description: '6 slots medios, RGB split en cuts, look frío',
    slots: alternating(6, 2.0, 'fade', 0.35),
    format: 'story', fps: 30, kenBurnsZoom: 1.18,
    effectsLevel: 'viral', colorGrade: 'cold-blue',
    speedRamp: false, zoomPunch: true, lightLeak: false, filmGrain: false,
    rgbSplit: true, glitchFlash: false, vignette: true, cinematicLook: true,
    hd: true, intro: true, outro: true, textOverlays: 'minimal',
  },

  // ── CLASSIC ───────────────────────────────────────────────────────────────
  {
    id: 'classic-tour',
    name: 'Classic Tour',
    category: 'classic',
    description: '6 slots, motion suave, sin efectos exagerados',
    slots: alternating(6, 2.5, 'fade', 0.5),
    format: 'story', fps: 30, kenBurnsZoom: 1.12,
    effectsLevel: 'subtle', colorGrade: 'none',
    speedRamp: false, zoomPunch: false, lightLeak: false, filmGrain: false,
    rgbSplit: false, glitchFlash: false, vignette: true, cinematicLook: true,
    hd: true, intro: true, outro: true, textOverlays: 'minimal',
  },
];

/**
 * Apply a viral template to a list of media items.
 * - If items count matches slots: 1:1 mapping
 * - If items < slots: items repeat to fill slots
 * - If items > slots: extra items inherit the last slot's settings
 * Returns new array of MediaItem with `duration` and `motion` set per slot.
 */
export function applyTemplateToItems(template: ViralTemplate, items: MediaItem[]): MediaItem[] {
  if (items.length === 0) return [];
  return items.map((item, i) => {
    const slot = template.slots[i] ?? template.slots[template.slots.length - 1];
    return { ...item, duration: slot.duration, motion: slot.motion } as MediaItem;
  });
}

/** Returns the transition INTO the i-th clip according to template (or fade by default). */
export function getTemplateTransition(template: ViralTemplate, i: number): { transition: Transition; duration: number } {
  const slot = template.slots[i] ?? template.slots[template.slots.length - 1];
  return { transition: slot.transition, duration: slot.transitionDuration };
}

export function templatesByCategory() {
  const out: Record<string, ViralTemplate[]> = {};
  for (const t of VIRAL_TEMPLATES) {
    (out[t.category] ||= []).push(t);
  }
  return out;
}
