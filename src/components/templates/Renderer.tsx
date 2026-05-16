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
import { amenString, extrasString, priceString } from '@/lib/format';
import type { LayerId } from '@/types';

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
  const photos = usePlacaStore((s) => s.photos);

  const format = formatOverride || storeFormat;
  const templateId = overrideTemplateId || storeTemplateId;
  const overrides = noOverrides ? {} : storeOverrides;

  const tpl = getTemplate(templateId);
  const variant = VARIANTS.find((v) => v.id === variantId) || VARIANTS[0];

  const size = FORMAT_SIZES[format];

  // Apply variant overrides at template level
  const bgColor = variant.id !== 'default' ? variant.bgColor ?? tpl.bgColor : tpl.bgColor;

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
        return `${data.addr}${data.barrio && tpl.id !== 't14' ? '\n' + data.barrio : ''}`;
      case 'barrio':
        return data.barrio;
      case 'price':
        // Hide entirely if no price entered (avoid orphan "USD")
        if (!data.price || !data.price.trim()) return '';
        return priceString(data, { abbreviate });
      case 'amen':
        return amenString(data);
      case 'op': {
        if (!data.op) return '';
        const opTxt = tpl.id === 't04' ? '' : tpl.id === 't10' ? `EN ${data.op.toUpperCase()}` : data.op.toUpperCase();
        return opTxt;
      }
      case 'desc':
        return data.desc || '';
      case 'extras':
        return extrasString(data);
      case 'tag':
        return tpl.id === 't02' ? 'Propiedad destacada nº' : tpl.id === 't09' ? `PROPIEDAD · 01 · ${data.op.toUpperCase()}` : tpl.id === 't15' ? 'EN ' + data.op.toUpperCase() : data.barrio;
      case 'lbl':
        return tpl.id === 't06' ? `— en ${data.op.toLowerCase()}` : tpl.id === 't08' ? `En ${data.op.toLowerCase()}` : tpl.id === 't10' ? `EN ${data.op.toUpperCase()}` : data.op;
      case 'num':
        return tpl.id === 't14' ? 'P-0' + tpl.id.replace('t', '') : tpl.id === 't15' ? '01' : '01';
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
      {/* Photo: si el template tiene un layer photo en defaultLayers, lo render como capa de FOTO; si NO lo tiene, la foto cubre el placa entero como fondo */}
      {!tpl.defaultLayers.photo && photos.length > 0 && (
        <Photo fullbleed defaults={{ id: 'photo', x: 0, y: 0, w: 100, h: 100, visible: true } as any} />
      )}
      {tpl.defaultLayers.photo && (
        <Photo defaults={tpl.defaultLayers.photo as any} />
      )}

      {/* Overlay opcional */}
      {tpl.overlay && (
        <div style={{ position: 'absolute', inset: 0, background: tpl.overlay, zIndex: 1, pointerEvents: 'none' }} />
      )}

      {/* Render each layer in defaultLayers (excluding photo + special ones) */}
      {(Object.keys(tpl.defaultLayers) as LayerId[]).map((lid) => {
        if (lid === 'photo' || lid === 'logo' || lid === 'badge' || lid === 'qr' || lid === 'agent') return null;
        const baseDefaults = tpl.defaultLayers[lid]!;
        const defaults = applyVariant(baseDefaults, lid);
        const ov = overrides[lid];
        const visible = ov?.visible ?? defaults.visible;
        if (visible === false) return null;

        if (DATA_LAYERS.includes(lid)) {
          const content = getContent(lid);
          // Hide the layer entirely if there's no content (avoid orphan "USD", "COCHERA", etc.)
          if (!content && (lid === 'desc' || lid === 'extras' || lid === 'price' || lid === 'op' || lid === 'addr' || lid === 'amen')) return null;
          return (
            <TextLayer key={lid} id={lid} defaults={defaults} interactive={interactive}>
              {content}
            </TextLayer>
          );
        }

        // Decorative layers (line, dot) - no content
        return <TextLayer key={lid} id={lid} defaults={defaults} interactive={interactive}>{null}</TextLayer>;
      })}

      {/* Logo */}
      {tpl.defaultLayers.logo && <Logo defaults={tpl.defaultLayers.logo as any} interactive={interactive} />}

      {/* Badges (stickers) */}
      <Badges />

      {/* QR */}
      <QRLayer />

      {/* Agent watermark */}
      <AgentLayer />
    </div>
  );
};
