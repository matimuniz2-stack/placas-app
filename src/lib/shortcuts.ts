import { useEffect } from 'react';
import { usePlacaStore, useTemporalStore } from './store';
import { ALL_TEMPLATES } from '@/components/templates/registry';

export function useGlobalShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // If any modal is open, defer to the modal's own keyboard handlers.
      // This prevents Esc / arrows / shortcuts from clashing with modal UX.
      if (document.querySelector('.fixed.inset-0.z-50')) return;

      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable;
      const meta = e.metaKey || e.ctrlKey;

      // Undo/redo
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        const t = useTemporalStore.getState();
        if (e.shiftKey) t.redo();
        else t.undo();
        return;
      }

      if (isInput) return;

      const s = usePlacaStore.getState();
      const sel = s.selectedLayer;

      // Copiar / pegar / duplicar capas (todos los templates). Cmd/Ctrl + C / V / D.
      if (meta) {
        const k = e.key.toLowerCase();
        if (k === 'd') { if (sel) { e.preventDefault(); s.duplicateLayer(sel); } return; }
        if (k === 'c') { if (sel) { e.preventDefault(); s.copyLayer(sel); } return; }
        if (k === 'v') { if (s.metaClipboard) { e.preventDefault(); s.pasteLayer(); } return; }
      }

      // Esc
      if (e.key === 'Escape') {
        s.selectLayer(null);
        return;
      }

      // Format
      if (e.key === 's' || e.key === 'S') { s.setFormat('story'); return; }
      if (e.key === 'p' || e.key === 'P') { s.setFormat('post'); return; }

      // Grid / sidebars
      if (e.key === 'g' || e.key === 'G') { s.toggleGrid(); return; }
      if (e.key === 'l' || e.key === 'L') { s.toggleSidebarLeft(); return; }
      if (e.key === 'r' || e.key === 'R') { s.toggleSidebarRight(); return; }

      // Template 1-9
      if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1;
        if (ALL_TEMPLATES[idx]) s.setTemplate(ALL_TEMPLATES[idx].id);
        return;
      }

      // Arrow keys to move layer
      if (sel && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 1 : 0.2;
        const layer = (s.layerOverrides[sel]) || {};
        const tpl = ALL_TEMPLATES.find((t) => t.id === s.templateId)!;
        const base = tpl.defaultLayers[sel];
        const x = layer.x ?? base?.x ?? 0;
        const y = layer.y ?? base?.y ?? 0;
        if (e.key === 'ArrowUp') s.patchLayer(sel, { y: y - step });
        if (e.key === 'ArrowDown') s.patchLayer(sel, { y: y + step });
        if (e.key === 'ArrowLeft') s.patchLayer(sel, { x: x - step });
        if (e.key === 'ArrowRight') s.patchLayer(sel, { x: x + step });
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
