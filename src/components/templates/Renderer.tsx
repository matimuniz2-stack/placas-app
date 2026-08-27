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
import { amenString, extrasString, priceString, cocheraCount, cocheraLabel, attrItems } from '@/lib/format';
import { isMetaTemplate, CUSTOM_SLOTS } from '@/lib/metaAd';
import { getEffectiveLayer } from '@/lib/store';
import { isPhotoDrag, getDragPhoto } from '@/lib/dragPhoto';
import type { Format, LayerId, PlacaData } from '@/types';
import { Bed, Bath, Maximize, Car, MapPin, Landmark, Receipt, Sparkles, HardHat, CalendarClock, Percent } from 'lucide-react';

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
const ICON_AMEN = new Set(['t16', 't23', 't24', 't25']);
const AMEN_ACCENT = '#b08c3f'; // dorado/bronce editorial
// Familia Nano (t25/t26): layout centrado estilo "Nano Banana 2" — íconos oscuros con
// separador "/", pin de línea oscuro y pie de marca Z + wordmark.
const NANO = new Set(['t25', 't26']);
const NANO_INK = '#232434';
// Templates que muestran la ubicación con pin rojo dibujado (no emoji).
const PIN_BARRIO = new Set(['t16', 't17', 't18', 't23', 't24', 't25']);

// Línea de detalles con dibujitos (ambientes, m², baños, cochera) y separadores
// verticales finos entre ítems (estilo aviso editorial). Los íconos escalan con el
// font-size de la capa (1em) y van en dorado; el texto hereda el color de la capa.
const ATTR_ICONS: Record<string, React.ElementType> = {
  amb: Bed,
  m2: Maximize,
  baths: Bath,
  cochera: Car,
  aptoCredito: Landmark,
  expensas: Receipt,
  antiguedad: Sparkles,
  enPozo: HardHat,
  entrega: CalendarClock,
  financiacion: Percent,
};

function amenIcons(d: PlacaData, nano?: boolean, skip?: Set<string>): React.ReactNode {
  const items = attrItems(d)
    .filter((a) => !skip?.has(a.key))
    .map((a) => ({ Icon: ATTR_ICONS[a.key] || Maximize, label: a.label }));
  if (!items.length) return '';
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: nano ? 'center' : undefined, gap: '0.65em', width: '100%' }}>
      {items.map(({ Icon, label }, i) => (
        <React.Fragment key={i}>
          {i > 0 &&
            (nano ? (
              <span style={{ color: 'rgba(35,36,52,0.35)', fontWeight: 400, flexShrink: 0 }}>/</span>
            ) : (
              <span style={{ width: 1, height: '1.15em', background: 'rgba(43,26,20,0.18)', flexShrink: 0 }} />
            ))}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3em', whiteSpace: 'nowrap' }}>
            <Icon style={{ width: '1em', height: '1em', color: nano ? NANO_INK : AMEN_ACCENT, flexShrink: 0 }} strokeWidth={nano ? 2 : 1.9} />
            {label}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

// Ubicación con pin dibujado. Editorial crema: pin rojo relleno + "Barrio, Ciudad".
// Nano: pin de línea oscuro + "Barrio · Ciudad", centrado.
function pinLine(primary: string, city: string, nano?: boolean): React.ReactNode {
  const text = [primary, city].filter(Boolean).join(nano ? ' · ' : ', ');
  if (!text) return '';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45em' }}>
      {nano ? (
        <MapPin style={{ width: '1em', height: '1em', color: NANO_INK, flexShrink: 0 }} strokeWidth={2.1} fill="none" stroke={NANO_INK} />
      ) : (
        <MapPin style={{ width: '1em', height: '1em', color: '#d9221f', flexShrink: 0 }} strokeWidth={2.2} fill="#d9221f" stroke="#f4ebdd" />
      )}
      {text}
    </span>
  );
}

// Destacados del Nano: pills con borde fino, centradas, en mayúsculas chicas.
function featPills(list: string[]): React.ReactNode {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5em', width: '100%' }}>
      {list.map((t, i) => (
        <span
          key={i}
          style={{
            // Borde y radio en em: la burbuja escala entera cuando se agranda la capa.
            border: '0.09em solid rgba(35,36,52,0.25)',
            borderRadius: '3em',
            padding: '0.5em 0.95em',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontSize: '0.76em',
            color: NANO_INK,
            whiteSpace: 'nowrap',
          }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

// Box "ENTREGA ESTIMADA · JULIO 2028" del Nano (borde rojo suave, fecha en rojo).
function entregaBox(entrega: string): React.ReactNode {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.55em',
          border: '0.08em solid rgba(217,34,31,0.45)',
          borderRadius: '3em',
          padding: '0.55em 1.1em',
          whiteSpace: 'nowrap',
        }}
      >
        <CalendarClock style={{ width: '1em', height: '1em', color: NANO_INK, flexShrink: 0 }} strokeWidth={2.1} />
        <span style={{ fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', fontSize: '0.78em', color: NANO_INK }}>Entrega estimada</span>
        <span style={{ fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.82em', color: '#d9221f' }}>{entrega}</span>
      </span>
    </div>
  );
}

// Re-apilado vertical del t25 cuando hay destacados y/o entrega: se compacta el
// bloque de texto para que entre todo sin pisarse (el drag manual manda). Estima
// cuántas filas ocupan las pills y, si sobra lugar, centra el bloque bajando todo.
function t25Stack(featList: string[], ent: boolean, amenOn: boolean): Partial<Record<string, { y: number }>> {
  const feat = featList.length > 0;
  if (!feat && !ent) return {};
  // Ancho estimado por pill (font 34 → 0.76em): ~14.2px por carácter + padding/gap.
  const rows = feat
    ? Math.max(1, Math.ceil(featList.reduce((a, t) => a + t.length * 14.2 + 66, 0) / 972))
    : 0;
  const out: Record<string, { y: number }> = { addr: { y: 57.9 }, price: { y: 66.4 } };
  let y = 72.6;
  if (amenOn) { out.amen = { y }; y += 3.6; }
  if (feat) { out.extras = { y }; y += rows * 3.8 + 1.2; }
  if (ent) { out.desc = { y }; y += 5.2; }
  // El pin de ubicación lleva aire propio antes y después (no pegado al pie).
  out.barrio = { y: y + 0.6 };
  out.logo = { y: y + 4.2 };
  out.tag = { y: y + 4.9 };
  out.lbl = { y: y + 8.2 };
  // Si el pie quedó por encima del lugar del diseño base, bajamos todo a medias
  // (queda centrado entre la foto y el borde inferior).
  const shift = Math.max(0, (95.9 - (y + 8.2)) / 2);
  if (shift) for (const k of Object.keys(out)) out[k] = { y: out[k].y + shift };
  return out;
}

// Burbujas del t25: los DATOS de la prop (amb, m², baños, cochera…) + los destacados
// escritos a mano, todos como pills. Es el formato default de la familia Nano
// (la línea de íconos quedó apagada por defecto). "amb" se expande a "ambientes".
function t25Bubbles(d: PlacaData): string[] {
  const skip = new Set<string>(['enPozo']); // la pill roja ya dice EN POZO
  if (d.entrega && d.entrega.trim()) skip.add('entrega'); // va en su propio box
  const attrs = attrItems(d)
    .filter((a) => !skip.has(a.key))
    .map((a) => a.label.replace(/^1 amb$/, 'Monoambiente').replace(/^(\d+) amb$/, '$1 ambientes'));
  const feats = (d.destacados || []).map((s) => s.trim()).filter(Boolean);
  return [...attrs, ...feats];
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
  square: { w: 1080, h: 1080 },
};

// Layer IDs that go through TextLayer with content from data
const DATA_LAYERS: LayerId[] = ['addr', 'barrio', 'price', 'amen', 'op', 'desc', 'extras', 'tag', 'lbl', 'num'];

interface Props {
  forCapture?: boolean;
  overrideTemplateId?: string;
  formatOverride?: Format;
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
        // Si hay un título-diferencial (modo "Armar con IA"), ese es el título grande;
        // si no, va la dirección como antes.
        if (data.titulo && data.titulo.trim()) return data.titulo;
        if (!data.addr && !data.barrio) return '';
        return data.addr;
      case 'barrio':
        if (PIN_BARRIO.has(tpl.id)) {
          // Cuando el título es el diferencial, abajo (pin) va la DIRECCIÓN + ciudad;
          // si no, va el barrio + ciudad (modo manual clásico).
          const useAddr = !!(data.titulo && data.titulo.trim());
          const primary = useAddr ? data.addr : data.barrio;
          const cityBase = tpl.id === 't16' || tpl.id === 't23' || tpl.id === 't24' || tpl.id === 't25' ? data.city || '' : '';
          // Con título-gancho, el pie lleva la ubicación completa: dirección · barrio · ciudad.
          const sep = NANO.has(tpl.id) ? ' · ' : ', ';
          const city = useAddr ? [data.barrio, cityBase].filter(Boolean).join(sep) : cityBase;
          return pinLine(primary, city, NANO.has(tpl.id));
        }
        return data.barrio ? '📍 ' + data.barrio : '';
      case 'price':
        // Sin precio: en t16 la placa invita a consultar (no queda incompleta);
        // en el resto se oculta (evita "USD" huérfano).
        if (!data.price || !data.price.trim()) {
          if (tpl.id === 't16' || tpl.id === 't25')
            return (
              <span style={{ fontSize: '0.42em', letterSpacing: 5, color: tpl.id === 't25' ? '#8a8580' : '#9c7a35', fontFamily: "'Inter'", fontWeight: 600 }}>
                CONSULTAR PRECIO
              </span>
            );
          return '';
        }
        return priceString(data, { abbreviate });
      case 'amen':
        // Si el usuario escribió una línea custom, respetarla tal cual; si no, en la
        // familia crema (t16) mostrar la línea con dibujitos.
        if (data.amenText && data.amenText.trim()) return data.amenText;
        if (ICON_AMEN.has(tpl.id)) {
          // Si la pill ya dice "EN POZO" o el box de entrega está visible, no
          // repetimos esos datos en la línea de íconos.
          const skip = new Set<string>();
          if (data.enPozo && (tpl.id === 't16' || tpl.id === 't18' || tpl.id === 't25')) skip.add('enPozo');
          if (tpl.id === 't25' && data.entrega && data.entrega.trim()) skip.add('entrega');
          return amenIcons(data, NANO.has(tpl.id), skip.size ? skip : undefined);
        }
        return amenString(data);
      case 'op': {
        if (tpl.id === 't26') return 'POR DENTRO';
        if (data.enPozo && (tpl.id === 't16' || tpl.id === 't18' || tpl.id === 't25')) return 'EN POZO';
        if (!data.op) return '';
        const opTxt = tpl.id === 't17' ? data.op.toUpperCase() : (tpl.id === 't16' || tpl.id === 't18' || tpl.id === 't25') ? `EN ${data.op.toUpperCase()}` : data.op.toUpperCase();
        return opTxt;
      }
      case 'desc':
        // t25: el slot desc es el box "ENTREGA ESTIMADA · fecha".
        if (tpl.id === 't25') return data.entrega && data.entrega.trim() ? entregaBox(data.entrega.trim()) : '';
        return data.desc || '';
      case 'extras': {
        // t25: el slot extras son las burbujas (datos de la prop + destacados).
        if (tpl.id === 't25') {
          const list = t25Bubbles(data);
          return list.length ? featPills(list) : '';
        }
        return extrasString(data);
      }
      case 'tag':
        // Familia Nano: el tag es el wordmark del pie de marca (junto al logo Z).
        if (NANO.has(tpl.id)) return 'ZAMBONI';
        return data.barrio;
      case 'lbl':
        if (tpl.id === 't25') return 'zambonipropiedades.com.ar';
        if (tpl.id === 't26') return 'Más fotos en zambonipropiedades.com.ar';
        return (tpl.id === 't17' || tpl.id === 't18') ? 'Más imágenes de la propiedad' : tpl.id === 't16' ? kickerText(data) : data.op;
      case 'num':
        return '01';
      default:
        return '';
    }
  };

  // Effective bg
  const effectiveBg = bgColor || '#fff';

  // t25: insumos del re-apilado (burbujas de datos+destacados / box de entrega)
  const t25FeatList = tpl.id === 't25' ? t25Bubbles(data) : [];
  const t25HasEnt = tpl.id === 't25' && !!(data.entrega && data.entrega.trim());
  // La línea de íconos quedó apagada por defecto en t25; solo cuenta si el usuario la prendió.
  const t25AmenOn = tpl.id === 't25' && !noOverrides && (storeOverrides.amen?.visible ?? false);

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

      {/* Tarjeta crema flotante (t21): sobre la foto full-bleed, detrás del texto */}
      {tpl.floatingCard && (
        <div
          style={{
            position: 'absolute',
            left: '4%',
            right: '4%',
            top: '62%',
            bottom: '3%',
            background: bgOverride || tpl.bgColor || '#f4ebdd',
            borderRadius: 30,
            boxShadow: '0 14px 44px rgba(0,0,0,0.32)',
            pointerEvents: 'none',
          }}
        />
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
        if ((tpl.id === 't16' || tpl.id === 't23' || tpl.id === 't24' || NANO.has(tpl.id)) && lid === 'addr' && overrides.addr?.size == null) {
          const txt = (noOverrides ? undefined : textOverrides.addr) ?? (data.titulo?.trim() || data.addr) ?? '';
          const len = Math.max(0, ...txt.split('\n').map((l) => l.length));
          if (tpl.id === 't23') {
            defaults = { ...defaults, size: len <= 12 ? 92 : len <= 20 ? 78 : len <= 30 ? 66 : 56 };
          } else if (tpl.id === 't24') {
            defaults = { ...defaults, size: len <= 12 ? 92 : len <= 20 ? 78 : len <= 30 ? 66 : 56 };
          } else if (tpl.id === 't25') {
            // Centrado a 88% de ancho: entra más texto por línea que en los editoriales.
            // En modo compacto (con destacados/entrega) el título va un paso más chico.
            const compact = t25FeatList.length > 0 || t25HasEnt;
            defaults = compact
              ? { ...defaults, size: len <= 14 ? 92 : len <= 22 ? 82 : len <= 34 ? 74 : len <= 44 ? 64 : 54 }
              : { ...defaults, size: len <= 14 ? 100 : len <= 22 ? 90 : len <= 34 ? 82 : len <= 44 ? 70 : 60 };
          } else if (tpl.id === 't26') {
            defaults = { ...defaults, size: len <= 16 ? 84 : len <= 26 ? 74 : len <= 38 ? 66 : 56 };
          } else {
            defaults = { ...defaults, size: len <= 13 ? 104 : len <= 18 ? 84 : len <= 24 ? 72 : 60 };
          }
        }
        // t25: con destacados/entrega presentes se re-apilan las posiciones (drag manda).
        if (tpl.id === 't25') {
          const pos = t25Stack(t25FeatList, t25HasEnt, t25AmenOn)[lid];
          if (pos && overrides[lid]?.y == null) defaults = { ...defaults, ...pos };
        }
        // t25: la línea de íconos se achica sola para entrar en UNA línea (con
        // sufijos tipo "totales" / "+ toilette" / "descubierta" se hace larga).
        if (tpl.id === 't25' && lid === 'amen' && overrides.amen?.size == null && !(data.amenText && data.amenText.trim())) {
          const skip = new Set<string>();
          if (data.enPozo) skip.add('enPozo');
          if (data.entrega && data.entrega.trim()) skip.add('entrega');
          const items = attrItems(data).filter((a) => !skip.has(a.key));
          if (items.length) {
            const chars = items.reduce((a, i) => a + i.label.length, 0);
            // Ancho estimado en em: ~0.56 por carácter + ícono, "/" y gaps por ítem.
            const est = 0.56 * chars + 2.3 * items.length;
            const fit = Math.floor(972 / est);
            defaults = { ...defaults, size: Math.max(21, Math.min(36, fit)) };
          }
        }
        const ov = overrides[lid];
        const visible = ov?.visible ?? defaults.visible;
        if (visible === false) return null;

        if (DATA_LAYERS.includes(lid)) {
          // t25: destacados (extras) y entrega (desc) son SIEMPRE burbujas/box
          // armados desde el panel de datos; un override de texto (p. ej. de un
          // doble click viejo) los rompía a líneas planas, así que se ignora.
          const bubbleSlot = tpl.id === 't25' && (lid === 'extras' || lid === 'desc');
          // El texto editado in-canvas (doble click) tiene prioridad sobre el auto.
          const tOv = noOverrides || bubbleSlot ? undefined : textOverrides[lid];
          const content = tOv !== undefined ? tOv : getContent(lid);
          // Ocultar la capa si no hay contenido (evita "USD", "COCHERA" huérfanos).
          // Si hay override de texto (aunque sea ""), no la ocultamos: el usuario lo eligió.
          if (tOv === undefined && !content && (lid === 'desc' || lid === 'extras' || lid === 'price' || lid === 'op' || lid === 'addr' || lid === 'amen')) return null;
          // La línea de detalles con íconos no se edita in-canvas (se ajusta desde los
          // campos amb/m²/baños/cochera). Si hay texto custom, sí es editable.
          const iconAmen = lid === 'amen' && ICON_AMEN.has(tpl.id) && !(data.amenText && data.amenText.trim());
          // Ídem ubicación con pin dibujado: se edita desde el campo Barrio.
          const iconBarrio = lid === 'barrio' && PIN_BARRIO.has(tpl.id) && tOv === undefined;
          // Ídem destacados/entrega del t25: se editan desde el panel de datos.
          const iconFeat = bubbleSlot;
          return (
            <TextLayer key={lid} id={lid} defaults={defaults} interactive={interactive} editable={!iconAmen && !iconBarrio && !iconFeat}>
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

      {/* Logo (en t25 sigue el re-apilado de destacados/entrega, salvo drag manual) */}
      {tpl.defaultLayers.logo && (
        <Logo
          defaults={
            (tpl.id === 't25' && overrides.logo?.y == null
              ? { ...tpl.defaultLayers.logo, ...t25Stack(t25FeatList, t25HasEnt, t25AmenOn).logo }
              : tpl.defaultLayers.logo) as any
          }
          interactive={interactive}
        />
      )}

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
      onDragOver={interactive ? (e) => { if (isPhotoDrag(e)) e.preventDefault(); } : undefined}
      onDrop={interactive ? (e) => {
        const idx = getDragPhoto(e);
        if (idx == null) return;
        e.preventDefault();
        e.stopPropagation();
        usePlacaStore.getState().setGalleryCell(id, idx);
        setActive(idx);
        select(id as LayerId);
      } : undefined}
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
