import React from 'react';
import { usePlacaStore } from '@/lib/store';
import { getTemplate } from './registry';
import { VARIANTS, type VariantDef } from '@/lib/variants';
import { TextLayer } from './primitives/TextLayer';
import { Photo } from './primitives/Photo';
import { Logo } from './primitives/Logo';
import { Badges } from './primitives/Badge';
import { QRLayer } from './primitives/QRLayer';
import { AgentLayer } from './primitives/AgentLayer';
import { MapLayer } from './primitives/MapLayer';
import { GalleryGrid } from './primitives/GalleryGrid';
import { MetaAdRenderer } from './MetaAdRenderer';
import { amenString, extrasString, priceString, cocheraCount, cocheraLabel } from '@/lib/format';
import { isMetaTemplate, CUSTOM_SLOTS } from '@/lib/metaAd';
import { getEffectiveLayer } from '@/lib/store';
import type { LayerId, PlacaData } from '@/types';
import { Bed, Bath, Maximize, Car, MapPin } from 'lucide-react';

// El overlay de t16 (fundido de la foto al panel crema) tiene el color de fondo
// horneado en el gradiente: si el usuario cambia el fondo, lo regeneramos con su color.
function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}
function fadeOverlay(bg: string): string | undefined {
  const rgb = hexToRgb(bg);
  if (!rgb) return undefined;
  const c = (a: number) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  // Mismos stops que el overlay default de t16 (data.ts) — mantener en sync.
  return `linear-gradient(180deg, ${c(0)} 0%, ${c(0)} 44%, ${c(0.15)} 47.5%, ${c(0.4)} 50.5%, ${c(0.68)} 53%, ${c(0.9)} 55%, ${bg} 56%, ${bg} 100%)`;
}

// Templates (familia editorial crema) que muestran la línea de detalles con íconos.
const ICON_AMEN = new Set(['t16']);
const AMEN_ACCENT = '#b08c3f'; // dorado/bronce editorial
// Templates que muestran la ubicación con pin rojo dibujado (no emoji).
const PIN_BARRIO = new Set(['t16', 't17', 't18']);

// Línea de detalles con dibujitos (ambientes, m², baños, cochera) y separadores
// verticales finos entre ítems (estilo aviso editorial). Los íconos escalan con el
// font-size de la capa (1em) y van en dorado; el texto hereda el color de la capa.
function amenIcons(d: PlacaData): React.ReactNode {
  const items: { Icon: React.ElementType; label: string }[] = [];
  if (d.amb) items.push({ Icon: Bed, label: `${d.amb} amb` });
  if (d.m2) items.push({ Icon: Maximize, label: `${d.m2} m²` });
  if (d.baths) items.push({ Icon: Bath, label: `${d.baths} ${d.baths === '1' ? 'baño' : 'baños'}` });
  const cc = cocheraCount(d);
  if (cc > 0) items.push({ Icon: Car, label: `${cc} ${cocheraLabel(cc)}` });
  if (!items.length) return '';
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65em', width: '100%' }}>
      {items.map(({ Icon, label }, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ width: 1, height: '1.15em', background: 'rgba(43,26,20,0.18)', flexShrink: 0 }} />}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3em', whiteSpace: 'nowrap' }}>
            <Icon style={{ width: '1em', height: '1em', color: AMEN_ACCENT, flexShrink: 0 }} strokeWidth={1.9} />
            {label}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

// Ubicación con pin rojo dibujado: "Barrio, Ciudad" (la ciudad solo si está cargada).
function pinBarrio(d: PlacaData, withCity: boolean): React.ReactNode {
  if (!d.barrio && !(withCity && d.city)) return '';
  const text = [d.barrio, withCity ? d.city : ''].filter(Boolean).join(', ');
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45em' }}>
      <MapPin style={{ width: '1em', height: '1em', color: '#d9221f', flexShrink: 0 }} strokeWidth={2.2} fill="#d9221f" stroke="#f4ebdd" />
      {text}
    </span>
  );
}

// Kicker del t16: "DEPTO EN VENTA" (abrevia "Departamento" como el reference).
function kickerText(d: PlacaData): string {
  let tipo = (d.tipoPropiedad || 'Depto').trim();
  if (/^departamento/i.test(tipo)) tipo = 'Depto';
  return `${tipo} en ${d.op || 'Venta'}`;
}

const FORMAT_SIZES = {
  story: { w: 1080, h: 1920 },
  post: { w: 1080, h: 1350 },
};

// Layer IDs that go through TextLayer with content from data
const DATA_LAYERS: LayerId[] = ['addr', 'barrio', 'price', 'amen', 'op', 'desc', 'extras', 'tag', 'lbl', 'num'];

interface Props {
  forCapture?: boolean;
  overrideTemplateId?: string;
  formatOverride?: 'story' | 'post';
  noOverrides?: boolean; // skip layer overrides (for thumbnails)
  interactive?: boolean; // false → no selection outline, no clicks (for thumbs/exports)
}

export const PlacaRenderer: React.FC<Props> = ({ forCapture, overrideTemplateId, formatOverride, noOverrides, interactive = true }) => {
  const storeFormat = usePlacaStore((s) => s.format);
  const data = usePlacaStore((s) => s.data);
  const storeTemplateId = usePlacaStore((s) => s.templateId);
  const variantId = usePlacaStore((s) => s.variantId);
  const theme = usePlacaStore((s) => s.theme);
  const abbreviate = usePlacaStore((s) => s.abbreviatePrice);
  const storeOverrides = usePlacaStore((s) => s.layerOverrides);
  const textOverrides = usePlacaStore((s) => s.textOverrides);
  const photos = usePlacaStore((s) => s.photos);
  const storeBgOverride = usePlacaStore((s) => s.bgOverride);
  const customElements = usePlacaStore((s) => s.customElements);
  const galleryCells = usePlacaStore((s) => s.galleryCells);
  const patchCustomElement = usePlacaStore((s) => s.patchCustomElement);

  const format = formatOverride || storeFormat;
  const templateId = overrideTemplateId || storeTemplateId;
  const overrides = noOverrides ? {} : storeOverrides;

  const tpl = getTemplate(templateId);
  const variant = VARIANTS.find((v) => v.id === variantId) || VARIANTS[0];

  const size = FORMAT_SIZES[format];

  // Apply variant overrides at template level. El color elegido por el usuario manda.
  const bgOverride = noOverrides ? null : storeBgOverride;
  const bgColor = bgOverride || (variant.id !== 'default' ? variant.bgColor ?? tpl.bgColor : tpl.bgColor);

  // Variant accent color: most templates use a contrasting accent for the price/separator.
  // When the variant has its own brand color, use it; fallback to the placa's accent default.
  const variantApplied = variant.id !== 'default';

  const applyVariant = (layer: any, layerId: LayerId) => {
    if (!variantApplied) return layer;
    const isAccent = layerId === 'price' || layerId === 'op' || layerId === 'lbl' || layerId === 'tag' || layerId === 'dot';
    const isLine = layerId === 'line';
    const newColor = variant.textColor || layer.color;
    return {
      ...layer,
      color: isAccent && variant.brand ? variant.brand : newColor,
      font: variant.fontPrimary && (layerId === 'addr' || layerId === 'price' || layerId === 'num') ? variant.fontPrimary : layer.font,
      bg: isLine && variant.brand ? variant.brand : layer.bg,
      borderTop: layer.borderTop && variant.brand ? layer.borderTop.replace(/#[0-9a-fA-F]{3,8}/, variant.brand) : layer.borderTop,
    };
  };

  // Layer content resolver
  const getContent = (id: LayerId): React.ReactNode => {
    switch (id) {
      case 'addr':
        if (!data.addr && !data.barrio) return '';
        return data.addr;
      case 'barrio':
        if (PIN_BARRIO.has(tpl.id)) return pinBarrio(data, tpl.id === 't16');
        return data.barrio ? '📍 ' + data.barrio : '';
      case 'price':
        // Hide entirely if no price entered (avoid orphan "USD")
        if (!data.price || !data.price.trim()) return '';
        return priceString(data, { abbreviate });
      case 'amen':
        // Si el usuario escribió una línea custom, respetarla tal cual; si no, en la
        // familia crema (t16) mostrar la línea con dibujitos.
        if (data.amenText && data.amenText.trim()) return data.amenText;
        if (ICON_AMEN.has(tpl.id)) return amenIcons(data);
        return amenString(data);
      case 'op': {
        if (!data.op) return '';
        const opTxt = tpl.id === 't17' ? 'GALERÍA' : (tpl.id === 't16' || tpl.id === 't18') ? `EN ${data.op.toUpperCase()}` : data.op.toUpperCase();
        return opTxt;
      }
      case 'desc':
        return data.desc || '';
      case 'extras':
        return extrasString(data);
      case 'tag':
        return data.barrio;
      case 'lbl':
        return (tpl.id === 't17' || tpl.id === 't18') ? 'Más imágenes de la propiedad' : tpl.id === 't16' ? kickerText(data) : data.op;
      case 'num':
        return '01';
      default:
        return '';
    }
  };

  // Effective bg
  const effectiveBg = bgColor || '#fff';

  return (
    <div
      data-placa-root
      className={forCapture ? 'exporting' : ''}
      style={{
        position: 'relative',
        width: size.w,
        height: size.h,
        background: effectiveBg,
        color: variant.textColor ?? tpl.textColor ?? '#fff',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {isMetaTemplate(templateId) ? (
        <MetaAdRenderer interactive={interactive} />
      ) : (
        <>
      {/* Galería: grilla editorial de varias fotos */}
      {tpl.gallery && <GalleryGrid interactive={interactive} />}

      {/* Photo: si el template tiene un layer photo en defaultLayers, lo render como capa de FOTO; si NO lo tiene, la foto cubre el placa entero como fondo */}
      {!tpl.gallery && !tpl.defaultLayers.photo && photos.length > 0 && (
        <Photo fullbleed defaults={{ id: 'photo', x: 0, y: 0, w: 100, h: 100, visible: true } as any} />
      )}
      {!tpl.gallery && tpl.defaultLayers.photo && (
        <Photo defaults={tpl.defaultLayers.photo as any} />
      )}

      {/* Overlay opcional (re-coloreado si el usuario cambió el fondo) */}
      {tpl.overlay && (
        <div style={{ position: 'absolute', inset: 0, background: (bgOverride && fadeOverlay(bgOverride)) || tpl.overlay, zIndex: 1, pointerEvents: 'none' }} />
      )}

      {/* Render each layer in defaultLayers (excluding photo + special ones) */}
      {(Object.keys(tpl.defaultLayers) as LayerId[]).map((lid) => {
        if (lid === 'photo' || lid === 'logo' || lid === 'badge' || lid === 'qr' || lid === 'agent' || lid === 'map') return null;
        if (/^g\d$/.test(lid)) return null; // celdas de galería → las dibuja GalleryGrid
        const baseDefaults = tpl.defaultLayers[lid]!;
        let defaults = applyVariant(baseDefaults, lid);
        // t16: el título se achica solo según el largo para no pisar el divisor
        // (el override manual de tamaño manda).
        if (tpl.id === 't16' && lid === 'addr' && overrides.addr?.size == null) {
          const txt = (noOverrides ? undefined : textOverrides.addr) ?? data.addr ?? '';
          const len = Math.max(0, ...txt.split('\n').map((l) => l.length));
          defaults = { ...defaults, size: len <= 13 ? 104 : len <= 18 ? 84 : len <= 24 ? 72 : 60 };
        }
        const ov = overrides[lid];
        const visible = ov?.visible ?? defaults.visible;
        if (visible === false) return null;

        if (DATA_LAYERS.includes(lid)) {
          // El texto editado in-canvas (doble click) tiene prioridad sobre el auto.
          const tOv = noOverrides ? undefined : textOverrides[lid];
          const content = tOv !== undefined ? tOv : getContent(lid);
          // Ocultar la capa si no hay contenido (evita "USD", "COCHERA" huérfanos).
          // Si hay override de texto (aunque sea ""), no la ocultamos: el usuario lo eligió.
          if (tOv === undefined && !content && (lid === 'desc' || lid === 'extras' || lid === 'price' || lid === 'op' || lid === 'addr' || lid === 'amen')) return null;
          // La línea de detalles con íconos no se edita in-canvas (se ajusta desde los
          // campos amb/m²/baños/cochera). Si hay texto custom, sí es editable.
          const iconAmen = lid === 'amen' && ICON_AMEN.has(tpl.id) && !(data.amenText && data.amenText.trim());
          // Ídem ubicación con pin dibujado: se edita desde el campo Barrio.
          const iconBarrio = lid === 'barrio' && PIN_BARRIO.has(tpl.id) && tOv === undefined;
          return (
            <TextLayer key={lid} id={lid} defaults={defaults} interactive={interactive} editable={!iconAmen && !iconBarrio}>
              {content}
            </TextLayer>
          );
        }

        // Decorative layers (line, dot) - no content
        return <TextLayer key={lid} id={lid} defaults={defaults} interactive={interactive}>{null}</TextLayer>;
      })}

      {/* Elementos custom agregados por el usuario (+ Texto / + Foto) */}
      {!noOverrides && CUSTOM_SLOTS.filter((id) => customElements[id]).map((id) => {
        const ce = customElements[id]!;
        const L = getEffectiveLayer(id as LayerId);
        if (!L || L.visible === false) return null;
        if (ce.type === 'photo') {
          const pIdx = galleryCells[id] ?? ce.photoIdx ?? 0;
          return (
            <CustomPhotoLayer key={id} id={id} layer={L} photo={photos[pIdx]} interactive={interactive} />
          );
        }
        const merged = { ...L, font: ce.font || L.font, size: ce.size ?? L.size, color: ce.color ?? L.color, align: ce.align ?? L.align };
        return (
          <TextLayer
            key={id}
            id={id as LayerId}
            defaults={merged}
            interactive={interactive}
            editable
            commitText={(t) => patchCustomElement(id, { text: t })}
          >
            {ce.text || ' '}
          </TextLayer>
        );
      })}

      {/* Logo */}
      {tpl.defaultLayers.logo && <Logo defaults={tpl.defaultLayers.logo as any} interactive={interactive} />}

      {/* Badges (stickers) */}
      <Badges />

      {/* QR */}
      <QRLayer />

      {/* Map of barrio */}
      <MapLayer interactive={interactive} />

      {/* Agent watermark */}
      <AgentLayer />
        </>
      )}
    </div>
  );
};

// Foto libre agregada por el usuario en los templates editoriales (cover-fit con
// el encuadre/zoom/filtros de la foto, como las celdas de galería).
const CustomPhotoLayer: React.FC<{
  id: string;
  layer: import('@/types').LayerConfig;
  photo?: import('@/types').PhotoState;
  interactive: boolean;
}> = ({ id, layer, photo, interactive }) => {
  const selected = usePlacaStore((s) => s.selectedLayer === id);
  const select = usePlacaStore((s) => s.selectLayer);
  const setActive = usePlacaStore((s) => s.setActivePhoto);
  const galleryCells = usePlacaStore((s) => s.galleryCells);
  const customElements = usePlacaStore((s) => s.customElements);
  const pIdx = galleryCells[id] ?? customElements[id]?.photoIdx ?? 0;
  const bgStyle: React.CSSProperties = photo
    ? {
        backgroundImage: `url("${photo.url}")`,
        backgroundSize: photo.zoom === 1 ? 'cover' : `${photo.zoom * 100}%`,
        backgroundPosition: `${photo.pos.x}% ${photo.pos.y}%`,
        backgroundRepeat: 'no-repeat',
        filter: `brightness(${photo.filter.b}%) contrast(${photo.filter.c}%) saturate(${photo.filter.s}%)`,
      }
    : { background: 'rgba(43,26,20,0.08)' };
  return (
    <div
      data-layer={interactive ? id : undefined}
      onClick={interactive ? (e) => { e.stopPropagation(); select(id as LayerId); if (photo) setActive(pIdx); } : undefined}
      style={{
        position: 'absolute',
        left: `${layer.x}%`,
        top: `${layer.y}%`,
        width: `${layer.w}%`,
        height: `${layer.h}%`,
        transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
        borderRadius: layer.radius ?? 20,
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(43,26,20,0.12)',
        zIndex: layer.z ?? 7,
        opacity: layer.opacity,
        outline: interactive && selected ? '2px dashed #de1f1a' : undefined,
        outlineOffset: 2,
        cursor: interactive ? 'pointer' : 'default',
        pointerEvents: interactive ? 'auto' : 'none',
        ...bgStyle,
      }}
    >
      {!photo && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78b61', fontSize: 20, fontFamily: 'Inter', letterSpacing: 2 }}>
          FOTO
        </div>
      )}
    </div>
  );
};
