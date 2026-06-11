import React, { useEffect, useRef } from 'react';
import type { LayerConfig, LayerId } from '@/types';
import { usePlacaStore } from '@/lib/store';

interface Props {
  id: LayerId;
  defaults: LayerConfig;
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  editable?: boolean; // permite editar el texto con doble click
  commitText?: (t: string) => void; // dónde guardar el texto editado (default: textOverrides)
}

export const TextLayer: React.FC<Props> = ({ id, defaults, children, className, interactive = true, editable, commitText }) => {
  const override = usePlacaStore((s) => s.layerOverrides[id]) || {};
  const selected = usePlacaStore((s) => s.selectedLayer === id);
  const select = usePlacaStore((s) => s.selectLayer);
  const editing = usePlacaStore((s) => s.editingLayer === id);
  const setEditingLayer = usePlacaStore((s) => s.setEditingLayer);
  const setTextOverride = usePlacaStore((s) => s.setTextOverride);
  const layer = { ...defaults, ...override };
  const ref = useRef<HTMLDivElement>(null);

  // Al entrar en edición: foco + seleccionar todo el texto.
  useEffect(() => {
    if (editing && ref.current) {
      const el = ref.current;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editing]);

  if (!layer.visible && layer.visible !== undefined) return null;

  const showOutline = interactive && (selected || editing);

  const commit = () => {
    const text = ref.current?.innerText ?? '';
    if (commitText) commitText(text);
    else setTextOverride(id, text);
    setEditingLayer(null);
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${layer.x}%`,
    top: `${layer.y}%`,
    width: layer.w ? `${layer.w}%` : 'auto',
    height: layer.h ? `${layer.h}%` : 'auto',
    fontFamily: layer.font ? `'${layer.font}'` : undefined,
    fontSize: layer.size ? `${layer.size}px` : undefined,
    fontWeight: layer.weight,
    color: layer.color,
    textAlign: layer.align as any,
    letterSpacing: layer.letterSpacing != null ? `${layer.letterSpacing}px` : undefined,
    lineHeight: layer.lineHeight,
    fontStyle: layer.italic ? 'italic' : undefined,
    textTransform: layer.uppercase ? 'uppercase' : undefined,
    transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
    opacity: layer.opacity,
    background: layer.bg,
    border: layer.border,
    borderTop: layer.borderTop,
    borderRadius: layer.radius ? `${layer.radius}px` : undefined,
    padding: layer.padding ? `${layer.padding}px` : undefined,
    zIndex: editing ? 200 : (layer.z ?? 5),
    outline: editing ? '2px solid #de1f1a' : showOutline ? '2px dashed #de1f1a' : undefined,
    outlineOffset: showOutline ? 4 : undefined,
    cursor: editing ? 'text' : interactive ? 'pointer' : 'default',
    pointerEvents: interactive ? 'auto' : 'none',
    whiteSpace: 'pre-wrap',
    // El texto siempre envuelve y crece dentro de la caja; nunca se recorta ni se
    // desborda en una línea infinita (palabras/URLs largas se parten).
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    overflow: 'visible',
  };

  return (
    <div
      ref={ref}
      data-layer={id}
      className={className}
      style={style}
      contentEditable={editing}
      suppressContentEditableWarning
      onClick={interactive && !editing ? (e) => { e.stopPropagation(); select(id); } : (e) => e.stopPropagation()}
      onDoubleClick={interactive && editable && !editing ? (e) => { e.stopPropagation(); select(id); setEditingLayer(id); } : undefined}
      onMouseDown={editing ? (e) => e.stopPropagation() : undefined}
      onPaste={editing ? (e) => {
        // Pegar SIEMPRE como texto plano (sin formato de la página de origen).
        e.preventDefault();
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
      } : undefined}
      onBlur={editing ? commit : undefined}
      onKeyDown={
        editing
          ? (e) => {
              e.stopPropagation();
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setEditingLayer(null); // cancelar sin guardar
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
};
