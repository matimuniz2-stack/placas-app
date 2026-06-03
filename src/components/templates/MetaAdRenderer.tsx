import React, { useEffect, useRef } from 'react';
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

// Texto editable in-canvas (doble click). Mientras NO se edita, muestra `children`
// (que puede ser bicolor/clamp, etc.). Al editar, se reemplaza por un contentEditable
// que confirma con Enter (Shift+Enter = salto de línea) o al perder foco; Esc cancela.
// Por defecto guarda en textOverrides[id]; los elementos custom pasan `commitText`.
const MetaText: React.FC<{
  id: string;
  interactive: boolean;
  editText: string;
  style: React.CSSProperties;
  commitText?: (t: string) => void;
  children: React.ReactNode;
}> = ({ id, interactive, editText, style, commitText, children }) => {
  const editing = usePlacaStore((s) => s.editingLayer === id);
  const setEditingLayer = usePlacaStore((s) => s.setEditingLayer);
  const setTextOverride = usePlacaStore((s) => s.setTextOverride);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && ref.current) {
      const el = ref.current;
      el.focus();
      const r = document.createRange();
      r.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(r);
    }
  }, [editing]);

  if (!interactive || !editing) return <>{children}</>;

  const commit = () => {
    const t = ref.current?.innerText ?? '';
    if (commitText) commitText(t);
    else setTextOverride(id as any, t);
    setEditingLayer(null);
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          commit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setEditingLayer(null);
        }
      }}
      style={{ ...style, outline: '2px solid #de1f1a', outlineOffset: 2, cursor: 'text', whiteSpace: 'pre-wrap' }}
    >
      {editText}
    </div>
  );
};

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
  const textOverrides = usePlacaStore((s) => s.textOverrides); // texto editado in-canvas
  const editingLayer = usePlacaStore((s) => s.editingLayer);
  const patchCustomElement = usePlacaStore((s) => s.patchCustomElement);

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
  // Título: si el usuario lo editó in-canvas (textOverride), manda ese texto. La 1ª línea
  // va en oscuro y las siguientes en rojo (igual que el auto hl1/hl2).
  const headOverride = textOverrides['maHead'];
  const headLines = (headOverride != null ? headOverride.split('\n') : [hl1, hl2].filter(Boolean)).filter((l, i) => i === 0 || l !== '');
  const headEdit = headOverride != null ? headOverride : [hl1, hl2].filter(Boolean).join('\n');
  // Tamaño del título: respeta el override del usuario; si no, se achica solo según el largo.
  const hMax = Math.max(0, ...headLines.map((l) => l.length));
  const headSize = layerOverrides['maHead']?.size ?? (hMax <= 16 ? 62 : hMax <= 22 ? 52 : hMax <= 30 ? 42 : 36);
  // Subtítulo (debajo del título): editable in-canvas → textOverride manda.
  const subOverride = textOverrides['maSub'];
  const subtitle = subOverride != null ? subOverride : ((data.amenText && data.amenText.trim()) || (data.desc && data.desc.trim()) || amenString(data) || '');
  const hasPrice = !!(data.price && data.price.trim());
  const priceNum = abbreviate ? abbreviatePrice(data.price) : data.price;
  const tagOverride = textOverrides['maTag'];
  const tagline = tagOverride != null ? tagOverride : (data.microTagline || '').trim();
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
    const isSel = interactive && selected === id && editingLayer !== id;
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

      {/* Título bicolor (editable: doble click) */}
      {block('maHead', (L) => {
        const s: React.CSSProperties = { fontFamily: `'${L.font || 'Outfit'}', sans-serif`, fontWeight: L.weight ?? 800, fontSize: headSize, lineHeight: L.lineHeight ?? 1.04 };
        return (
          <MetaText id="maHead" interactive={interactive} editText={headEdit} style={s}>
            <div style={s}>
              <div style={{ color: L.color ?? DARK }}>{headLines[0]}</div>
              {headLines.slice(1).map((ln, i) => (
                <div key={i} style={{ color: RED }}>{ln}</div>
              ))}
            </div>
          </MetaText>
        );
      })}

      {/* Subtítulo (editable: doble click) */}
      {(subtitle || subOverride != null) &&
        block('maSub', (L) => {
          const s: React.CSSProperties = { fontFamily: `'${L.font || 'Inter'}', sans-serif`, fontWeight: L.weight ?? 500, fontSize: L.size ?? 28, color: L.color ?? GRAY, lineHeight: L.lineHeight ?? 1.3 };
          return (
            <MetaText id="maSub" interactive={interactive} editText={subtitle} style={s}>
              <div style={{ ...s, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {subtitle}
              </div>
            </MetaText>
          );
        })}

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

      {/* Tagline (editable: doble click) */}
      {(tagline || tagOverride != null) &&
        block('maTag', (L) => {
          const s: React.CSSProperties = { fontFamily: `'${L.font || 'Inter'}', sans-serif`, fontWeight: L.weight ?? 600, fontSize: L.size ?? 22, color: L.color ?? GRAY, letterSpacing: L.letterSpacing ?? 3, textTransform: 'uppercase' };
          return (
            <MetaText id="maTag" interactive={interactive} editText={tagline} style={s}>
              <div style={s}>{tagline}</div>
            </MetaText>
          );
        }, { auto: true })}

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

      {/* Marca — escala con el ancho del layer (16% = tamaño base). Redimensionable
          con los handles o el campo W del inspector. */}
      {block('maBrand', (L) => {
        const k = (L.w || 16) / 16;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 * k, width: '100%' }}>
            {logoUrl ? (
              <img src={logoUrl} alt="" style={{ height: 52 * k, maxWidth: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 52 * k, color: RED }}>Z</span>
            )}
            <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 22 * k, color: DARK, letterSpacing: 1 * k }}>{BRAND_NAME}</span>
            <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 13 * k, color: GRAY, letterSpacing: 3 * k }}>{BRAND_SUB}</span>
          </div>
        );
      })}

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
        return block(id, (L) => {
          const s: React.CSSProperties = { fontFamily: `'${ce.font || L.font || 'Outfit'}', sans-serif`, fontWeight: L.weight ?? 700, fontSize: ce.size ?? L.size ?? 44, color: ce.color ?? L.color ?? DARK, textAlign: (L.align as any) ?? 'left', lineHeight: 1.1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' };
          return (
            <MetaText id={id} interactive={interactive} editText={ce.text || ''} commitText={(t) => patchCustomElement(id, { text: t })} style={s}>
              <div style={s}>{ce.text || ' '}</div>
            </MetaText>
          );
        });
      })}
    </div>
  );
};
