import React from 'react';
import { usePlacaStore, getEffectiveLayer } from '@/lib/store';
import { amenString, abbreviatePrice } from '@/lib/format';
import { CUSTOM_SLOTS } from '@/lib/metaAd';
import type { PhotoState, LayerConfig, LayerId } from '@/types';
import {
  Home,
  MapPin,
  Bed,
  Bath,
  Maximize,
  Ruler,
  MessageCircle,
  ShieldCheck,
  Globe,
  Facebook,
  Instagram,
} from 'lucide-react';

// ── Aviso Meta Ads (t19) — editor estilo Canva. Cada bloque es una capa editable
// (mover/redimensionar/editar). Auto-rellena con PlacaData + marca; el usuario reordena.

const NAVY = '#071526';
const DARK = '#111827';
const GRAY = '#6B7280';
const HAIR = '#E5E7EB';
const HEAD = "'Outfit', sans-serif";
const BODY = "'Inter', sans-serif";

const WEBSITE = 'www.zambonipropiedades.com';
const MATRICULA = 'Mat. Reg. 3686';
const BRAND_NAME = 'ZAMBONI';
const BRAND_SUB = 'PROPIEDADES';
const FOLLOW = 'Seguinos en';
const CTA_1 = 'PEDÍ LA FICHA COMPLETA';
const CTA_2 = 'POR WHATSAPP';

// Caja de foto (cover-fit con pos/zoom/filtro). Solo dibuja; la selección la maneja el bloque.
const PhotoBox: React.FC<{ photo?: PhotoState; boost?: boolean; style: React.CSSProperties }> = ({ photo, boost, style }) => {
  if (!photo) {
    return (
      <div style={{ ...style, background: HAIR, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, letterSpacing: 3 }}>
        SUBÍ UNA FOTO
      </div>
    );
  }
  const f = photo.filter;
  const b = boost ? Math.min(140, f.b * 1.04) : f.b;
  const c = boost ? f.c * 1.03 : f.c;
  const s = boost ? f.s * 1.03 : f.s;
  return (
    <div
      style={{
        ...style,
        backgroundImage: `url("${photo.url}")`,
        backgroundSize: photo.zoom === 1 ? 'cover' : `${photo.zoom * 100}%`,
        backgroundPosition: `${photo.pos.x}% ${photo.pos.y}%`,
        backgroundRepeat: 'no-repeat',
        filter: `brightness(${b}%) contrast(${c}%) saturate(${s}%)`,
      }}
    />
  );
};

const Feature: React.FC<{ Icon: React.ElementType; value: string; label: string }> = ({ Icon, value, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <Icon size={34} color={NAVY} strokeWidth={1.7} />
    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
      <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: DARK }}>{value}</span>
      <span style={{ fontFamily: BODY, fontWeight: 500, fontSize: 22, color: GRAY }}>{label}</span>
    </div>
  </div>
);

const VSep: React.FC = () => <div style={{ width: 1, height: 56, background: HAIR }} />;

export const MetaAdRenderer: React.FC<{ interactive?: boolean }> = ({ interactive = true }) => {
  const data = usePlacaStore((s) => s.data);
  const photos = usePlacaStore((s) => s.photos);
  const theme = usePlacaStore((s) => s.theme);
  const agent = usePlacaStore((s) => s.agent);
  const abbreviate = usePlacaStore((s) => s.abbreviatePrice);
  const selected = usePlacaStore((s) => s.selectedLayer);
  const select = usePlacaStore((s) => s.selectLayer);
  const setActive = usePlacaStore((s) => s.setActivePhoto);
  const galleryCells = usePlacaStore((s) => s.galleryCells);
  const customElements = usePlacaStore((s) => s.customElements);
  const layerOverrides = usePlacaStore((s) => s.layerOverrides); // re-render al mover/redimensionar

  const RED = theme.brand || '#EF2B2A';

  // ── Datos ──
  const status = `EN ${(data.op || 'Venta').toUpperCase()}`;
  const neighborhood = (data.barrio || '').toUpperCase();
  const city = data.city || 'Mar del Plata';
  const hParts = (data.addr || '').includes('\n')
    ? (data.addr || '').split('\n')
    : [data.addr || '', data.barrio ? `en ${data.barrio}` : ''];
  const hl1 = hParts[0] || '';
  const hl2 = hParts[1] || '';
  // Tamaño del título: respeta el override del usuario; si no, se achica solo según el largo.
  const hMax = Math.max(hl1.length, hl2.length);
  const headSize = layerOverrides['maHead']?.size ?? (hMax <= 16 ? 62 : hMax <= 22 ? 52 : hMax <= 30 ? 42 : 36);
  const subtitle = (data.amenText && data.amenText.trim()) || (data.desc && data.desc.trim()) || amenString(data) || '';
  const hasPrice = !!(data.price && data.price.trim());
  const priceNum = abbreviate ? abbreviatePrice(data.price) : data.price;
  const tagline = (data.microTagline || '').trim();
  const features = [
    { Icon: Bed, value: data.amb, label: 'ambientes' },
    { Icon: Bath, value: data.baths, label: 'baños' },
    { Icon: Maximize, value: data.m2 ? `${data.m2} m²` : '', label: 'cubiertos' },
    { Icon: Ruler, value: data.lote ? `${data.lote} m²` : '', label: 'lote' },
  ].filter((f) => f.value && String(f.value).trim());
  const benefitTitle = (data.benefitTitle || '').trim();
  const benefitSub = (data.benefitSubtitle || '').trim();
  const waLink = agent?.phone ? `https://wa.me/${agent.phone.replace(/\D/g, '')}` : null;
  const logoUrl = theme.logoUrl;

  const photoIdxFor = (id: string): number | null => {
    if (id === 'maPhoto1') return galleryCells['maPhoto1'] ?? 0;
    if (id === 'maPhoto2') return galleryCells['maPhoto2'] ?? 1;
    if (/^maC\d$/.test(id) && customElements[id]?.type === 'photo') return galleryCells[id] ?? customElements[id]?.photoIdx ?? 0;
    return null;
  };

  // Helper: cada bloque posicionado por su capa (mover/redimensionar via moveable).
  const block = (
    id: string,
    render: (L: LayerConfig) => React.ReactNode,
    opts?: { auto?: boolean; extraStyle?: React.CSSProperties },
  ) => {
    const L = getEffectiveLayer(id as LayerId);
    if (!L || L.visible === false) return null;
    const isSel = interactive && selected === id;
    return (
      <div
        key={id}
        data-layer={interactive ? id : undefined}
        onClick={
          interactive
            ? (e) => {
                e.stopPropagation();
                select(id as any);
                const p = photoIdxFor(id);
                if (p != null && photos[p]) setActive(p);
              }
            : undefined
        }
        style={{
          position: 'absolute',
          left: `${L.x}%`,
          top: `${L.y}%`,
          width: opts?.auto ? 'auto' : `${L.w}%`,
          height: opts?.auto ? 'auto' : L.h ? `${L.h}%` : undefined,
          zIndex: L.z,
          opacity: L.opacity,
          transform: L.rotation ? `rotate(${L.rotation}deg)` : undefined,
          outline: isSel ? '2px dashed #de1f1a' : undefined,
          outlineOffset: 2,
          cursor: interactive ? 'move' : 'default',
          ...opts?.extraStyle,
        }}
      >
        {render(L)}
      </div>
    );
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fff', fontFamily: BODY, overflow: 'hidden' }}>
      {/* Foto principal */}
      {block('maPhoto1', (L) => (
        <PhotoBox photo={photos[photoIdxFor('maPhoto1')!]} boost style={{ position: 'absolute', inset: 0, borderRadius: L.radius }} />
      ), { extraStyle: { overflow: 'hidden' } })}

      {/* Foto secundaria */}
      {block('maPhoto2', (L) => (
        <PhotoBox photo={photos[photoIdxFor('maPhoto2')!]} style={{ position: 'absolute', inset: 0 }} />
      ), { extraStyle: { borderRadius: 26, border: '5px solid #fff', boxShadow: '0 14px 34px rgba(0,0,0,0.16)', overflow: 'hidden' } })}

      {/* Badge estado */}
      {block('maStatus', () => (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: RED, color: '#fff', borderRadius: 16, padding: '14px 26px', boxShadow: '0 6px 18px rgba(0,0,0,0.18)' }}>
          <Home size={30} color="#fff" strokeWidth={2.2} />
          <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 34, letterSpacing: 1 }}>{status}</span>
        </div>
      ), { auto: true })}

      {/* Badge ubicación */}
      {block('maLoc', () => (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, background: NAVY, color: '#fff', borderRadius: 16, padding: '12px 26px', boxShadow: '0 6px 18px rgba(0,0,0,0.22)' }}>
          <MapPin size={32} color="#fff" strokeWidth={2.2} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 30, letterSpacing: 0.5 }}>{neighborhood}</span>
            <span style={{ fontFamily: BODY, fontWeight: 400, fontSize: 24, opacity: 0.9 }}>{city}</span>
          </div>
        </div>
      ), { auto: true })}

      {/* Título bicolor */}
      {block('maHead', (L) => (
        <div style={{ fontFamily: `'${L.font || 'Outfit'}', sans-serif`, fontWeight: L.weight ?? 800, fontSize: headSize, lineHeight: L.lineHeight ?? 1.04 }}>
          <div style={{ color: L.color ?? DARK }}>{hl1}</div>
          {hl2 && <div style={{ color: RED }}>{hl2}</div>}
        </div>
      ))}

      {/* Subtítulo */}
      {subtitle &&
        block('maSub', (L) => (
          <div style={{ fontFamily: `'${L.font || 'Inter'}', sans-serif`, fontWeight: L.weight ?? 500, fontSize: L.size ?? 28, color: L.color ?? GRAY, lineHeight: L.lineHeight ?? 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {subtitle}
          </div>
        ))}

      {/* Precio (con separador rojo arriba) */}
      {hasPrice &&
        block('maPrice', (L) => (
          <div>
            <div style={{ width: 72, height: 6, background: RED, borderRadius: 3, marginBottom: 14 }} />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontFamily: HEAD, fontWeight: 600, fontSize: Math.round((L.size ?? 96) * 0.36), color: NAVY }}>{data.currency}</span>
              <span style={{ fontFamily: `'${L.font || 'Outfit'}', sans-serif`, fontWeight: L.weight ?? 800, fontSize: L.size ?? 96, color: L.color ?? RED, lineHeight: 0.9 }}>{priceNum}</span>
            </div>
          </div>
        ), { auto: true })}

      {/* Tagline */}
      {tagline &&
        block('maTag', (L) => (
          <div style={{ fontFamily: `'${L.font || 'Inter'}', sans-serif`, fontWeight: L.weight ?? 600, fontSize: L.size ?? 22, color: L.color ?? GRAY, letterSpacing: L.letterSpacing ?? 3, textTransform: 'uppercase' }}>
            {tagline}
          </div>
        ), { auto: true })}

      {/* Features */}
      {features.length > 0 &&
        block('maFeats', () => (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
            {features.map((f, i) => (
              <React.Fragment key={f.label}>
                {i > 0 && <VSep />}
                <Feature Icon={f.Icon} value={String(f.value)} label={f.label} />
              </React.Fragment>
            ))}
          </div>
        ))}

      {/* CTA WhatsApp */}
      {block('maCta', () => {
        const inner = (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, background: RED, color: '#fff', borderRadius: 14, padding: '16px 24px' }}>
            <MessageCircle size={36} color="#fff" strokeWidth={2.2} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
              <span style={{ fontFamily: BODY, fontWeight: 800, fontSize: 22 }}>{CTA_1}</span>
              <span style={{ fontFamily: BODY, fontWeight: 700, fontSize: 20, opacity: 0.95 }}>{CTA_2}</span>
            </div>
          </div>
        );
        return waLink && !interactive ? <a href={waLink} style={{ textDecoration: 'none' }}>{inner}</a> : inner;
      }, { auto: true })}

      {/* Beneficio */}
      {benefitTitle &&
        block('maBenefit', () => (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <ShieldCheck size={40} color={RED} strokeWidth={2} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 24, color: DARK }}>{benefitTitle}</span>
              {benefitSub && <span style={{ fontFamily: BODY, fontWeight: 500, fontSize: 19, color: GRAY }}>{benefitSub}</span>}
            </div>
          </div>
        ), { auto: true })}

      {/* Marca */}
      {block('maBrand', () => (
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          {logoUrl ? (
            <img src={logoUrl} alt="" style={{ height: 52, objectFit: 'contain' }} />
          ) : (
            <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 52, color: RED }}>Z</span>
          )}
          <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 22, color: DARK, letterSpacing: 1 }}>{BRAND_NAME}</span>
          <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 13, color: GRAY, letterSpacing: 3 }}>{BRAND_SUB}</span>
        </div>
      ), { auto: true })}

      {/* Footer navy */}
      {block('maFooter', () => (
        <div style={{ width: '100%', height: '100%', background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 44px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Globe size={22} color="#fff" strokeWidth={2} />
            <span style={{ fontFamily: BODY, fontWeight: 500, fontSize: 21 }}>{WEBSITE}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontFamily: BODY, fontWeight: 400, fontSize: 20, opacity: 0.85 }}>{FOLLOW}</span>
            <Facebook size={24} color="#fff" strokeWidth={2} />
            <Instagram size={24} color="#fff" strokeWidth={2} />
          </div>
          <span style={{ fontFamily: BODY, fontWeight: 500, fontSize: 20 }}>{MATRICULA}</span>
        </div>
      ))}

      {/* Elementos custom agregados por el usuario */}
      {CUSTOM_SLOTS.filter((id) => customElements[id]).map((id) => {
        const ce = customElements[id]!;
        if (ce.type === 'photo') {
          return block(id, () => (
            <PhotoBox photo={photos[photoIdxFor(id)!]} style={{ position: 'absolute', inset: 0 }} />
          ), { extraStyle: { borderRadius: getEffectiveLayer(id as LayerId)?.radius ?? 20, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.14)' } });
        }
        return block(id, (L) => (
          <div style={{ fontFamily: `'${ce.font || L.font || 'Outfit'}', sans-serif`, fontWeight: L.weight ?? 700, fontSize: ce.size ?? L.size ?? 44, color: ce.color ?? L.color ?? DARK, textAlign: (L.align as any) ?? 'left', lineHeight: 1.1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {ce.text || ' '}
          </div>
        ));
      })}
    </div>
  );
};
