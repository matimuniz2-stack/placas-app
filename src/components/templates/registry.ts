import type { TemplateDef } from '@/types';
import { ALL_TEMPLATES_DATA } from './data';

export const ALL_TEMPLATES: TemplateDef[] = ALL_TEMPLATES_DATA;

export function getTemplate(id: string): TemplateDef {
  return ALL_TEMPLATES.find((t) => t.id === id) || ALL_TEMPLATES[0];
}

export function templatesByCategory(): Record<string, TemplateDef[]> {
  const out: Record<string, TemplateDef[]> = {};
  for (const t of ALL_TEMPLATES) {
    if (!out[t.category]) out[t.category] = [];
    out[t.category].push(t);
  }
  return out;
}
