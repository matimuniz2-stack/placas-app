import React, { useEffect, useRef } from 'react';
import { usePlacaStore, getEffectiveLayer } from '@/lib/store';
import { amenString, abbreviatePrice, cocheraCount, cocheraLabel } from '@/lib/format';
import { CUSTOM_SLOTS } from '@/lib/metaAd';
import type { PhotoState, LayerConfig, LayerId } from '@/types';
import {
  Home,
  MapPin,
  Sofa,
  Bath,
  Car,
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

// Ícono "m²" (cuadrito redondeado con el texto m² adentro), lineal como los de lucide.
const M2Icon: React.FC<{ size?: number; color?: string; strokeWidth?: number }> = ({ size = 34, color = '#111827', strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="3.5" stroke={color} strokeWidth={strokeWidth} />
    <text x="12" y="15.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="9" fontWeight="700" fill={color}>m²</text>
  </svg>
);

// Spec con ícono. `vertical` = ícono arriba, número y label centrados debajo (estilo aviso).
const Feature: React.FC<{ Icon: React.ElementType; value: string; label: string; color?: string; vertical?: boolean }> = ({ Icon, value, label, color = NAVY, vertical }) =>
  vertical ? (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
      <Icon size={42} color={color} strokeWidth={1.8} />
      <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 42, color: DARK, lineHeight: 1 }}>{value}</span>
      <span style={{ fontFamily: BODY, fontWeight: 500, fontSize: 22, color: GRAY }}>{label}</span>
    </div>
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Icon size={34} color={color} strokeWidth={1.7} />
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
  const templateId = usePlacaStore((s) => s.templateId);

  const t20 = templateId === 't20'; // Aviso Pro
  const t21 = templateId === 't21'; // Aviso Premium
  const t22 = templateId === 't22'; // Story Ads (vertical)
  const aviso = t20 || t21 || t22; // familia "aviso": título rojo+barrio, precio en bloque, íconos rojos
  const RED = theme.brand || (aviso ? '#E5342B' : '#EF2B2A');

  // ── Datos ──
  const status = `EN ${(data.op || 'Venta').toUpperCase()}`;
  const neighborhood = (data.barrio || '').toUpperCase();
  const city = data.city || 'Mar del Plata';
  const hParts = (data.addr || '').includes('\n')
    ? (data.addr || '').split('\n')
    : [data.addr || '', data.barrio ? `en ${data.barrio}` : ''];
  const hl1 = hParts[0] || '';
  const hl2 = hParts[1] || '';
  // Título: si el usuario lo editó in-canvas (textOverride), manda ese texto.
  // t19: 1ª línea oscura, resto rojo (del addr). t20: 1ª línea roja chica
  // ("DEPARTAMENTO EN"), resto negro grande (el barrio, partido en palabras).
  const headOverride = textOverrides['maHead'];
  let headLines: string[];
  let headEdit: string;
  if (aviso) {
    if (headOverride != null) {
      headLines = headOverride.split('\n');
      headEdit = headOverride;
    } else {
      const l0 = `${(data.tipoPropiedad || 'Propiedad').trim()} en`.toUpperCase();
      const barrioWords = (data.barrio || '').toUpperCase().split(/\s+/).filter(Boolean);
      headLines = [l0, ...barrioWords];
      headEdit = headLines.join('\n');
    }
  } else {
    headLines = (headOverride != null ? headOverride.split('\n') : [hl1, hl2].filter(Boolean)).filter((l, i) => i === 0 || l !== '');
    headEdit = headOverride != null ? headOverride : [hl1, hl2].filter(Boolean).join('\n');
  }
  // Tamaño del título: respeta el override del usuario; si no, se achica solo según el largo.
  const hMax = Math.max(0, ...headLines.map((l) => l.length));
  const headSize = layerOverrides['maHead']?.size ?? (hMax <= 16 ? 62 : hMax <= 22 ? 52 : hMax <= 30 ? 42 : 36);
  // t20: el "grande" se calcula sobre las líneas del barrio (sin contar la 1ª roja).
  const t20BigMax = Math.max(0, ...headLines.slice(1).map((l) => l.length));
  const t20Big = layerOverrides['maHead']?.size ?? (t20BigMax <= 6 ? 92 : t20BigMax <= 9 ? 76 : t20BigMax <= 12 ? 62 : 50);
  // Subtítulo (debajo del título): editable in-canvas → textOverride manda.
  const subOverride = textOverrides['maSub'];
  const subtitle = subOverride != null ? subOverride : ((data.amenText && data.amenText.trim()) || (data.desc && data.desc.trim()) || amenString(data) || '');
  const hasPrice = !!(data.price && data.price.trim());
  const priceNum = abbreviate ? abbreviatePrice(data.price) : data.price;
  const tagOverride = textOverrides['maTag'];
  const tagline = tagOverride != null ? tagOverride : (data.microTagline || '').trim();
  const cc = cocheraCount(data);
  const features = [
    { Icon: Sofa, value: data.amb, label: data.amb === '1' ? 'ambiente' : 'ambientes' },
    { Icon: Bath, value: data.baths, label: data.baths === '1' ? 'baño' : 'baños' },
    { Icon: Car, value: cc > 0 ? String(cc) : '', label: cocheraLabel(cc) },
    { Icon: M2Icon, value: data.m2 || '', label: 'm² cubiertos' },
    { Icon: Ruler, value: data.lote || '', label: 'm² lote' },
  ].filter((f) => f.value && String(f.value).trim());
  // En los templates "aviso", si hay 4+ specs se dividen en 2 tandas (bloques movibles
  // por separado): tanda 1 = primera mitad, tanda 2 = resto.
  const splitFeats = aviso && features.length >= 4;
  const featsHalf = Math.ceil(features.length / 2);
  const feats1 = splitFeats ? features.slice(0, featsHalf) : features;
  const feats2 = splitFeats ? features.slice(featsHalf) : [];
  const benefitTitle = (data.benefitTitle || '').trim();
  const benefitSub = (data.benefitSubtitle || '').trim();
  const waLink = agent?.phone ? `https://wa.me/${agent.phone.replace(/\D/g, '')}` : null;
  const logoUrl = theme.logoUrl;

  const photoIdxFor = (id: string): number | null => {
    if (id === 'maPhoto1') return galleryCells['maPhoto1'] ?? 0;
    if (id === 'maPhoto2') return galleryCells['maPhoto2'] ?? 1;
    if (id === 'maPhoto3') return galleryCells['maPhoto3'] ?? 2;
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
      ), { extraStyle: t22 ? { overflow: 'hidden', borderRadius: 28, boxShadow: '0 18px 50px rgba(0,0,0,0.16)' } : { overflow: 'hidden' } })}

      {/* Foto secundaria 1 */}
      {block('maPhoto2', (L) => (
        <PhotoBox photo={photos[photoIdxFor('maPhoto2')!]} style={{ position: 'absolute', inset: 0, borderRadius: L.radius }} />
      ), { extraStyle: aviso
        ? { borderRadius: 18, boxShadow: '0 8px 22px rgba(0,0,0,0.1)', overflow: 'hidden' }
        : { borderRadius: 26, border: '5px solid #fff', boxShadow: '0 14px 34px rgba(0,0,0,0.16)', overflow: 'hidden' } })}

      {/* Foto secundaria 2 (Aviso Pro) */}
      {block('maPhoto3', (L) => (
        <PhotoBox photo={photos[photoIdxFor('maPhoto3')!]} style={{ position: 'absolute', inset: 0, borderRadius: L.radius }} />
      ), { extraStyle: { borderRadius: 18, boxShadow: '0 8px 22px rgba(0,0,0,0.1)', overflow: 'hidden' } })}

      {/* Badge estado */}
      {block('maStatus', () => (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: RED, color: '#fff', borderRadius: 16, padding: '14px 26px', boxShadow: '0 6px 18px rgba(0,0,0,0.18)' }}>
          <Home size={30} color="#fff" strokeWidth={2.2} />
          <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 34, letterSpacing: 1 }}>{status}</span>
        </div>
      ), { auto: true })}

      {/* Badge ubicación */}
      {block('maLoc', () => (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, background: '#000', color: '#fff', borderRadius: 16, padding: '12px 26px', boxShadow: '0 6px 18px rgba(0,0,0,0.22)' }}>
          <MapPin size={32} color="#fff" strokeWidth={2.2} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 30, letterSpacing: 0.5 }}>{neighborhood}</span>
            <span style={{ fontFamily: BODY, fontWeight: 400, fontSize: 24, opacity: 0.9 }}>{city}</span>
          </div>
        </div>
      ), { auto: true })}

      {/* Título (editable: doble click). t20: 1ª línea roja chica + barrio negro grande + barra roja. */}
      {block('maHead', (L) => {
        const fam = `'${L.font || 'Outfit'}', sans-serif`;
        if (aviso) {
          const small = Math.max(20, Math.round(t20Big * 0.3));
          const s: React.CSSProperties = { fontFamily: fam };
          return (
            <MetaText id="maHead" interactive={interactive} editText={headEdit} style={{ ...s, fontSize: t20Big, fontWeight: 800 }}>
              <div style={s}>
                <div style={{ color: RED, fontSize: small, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>{headLines[0]}</div>
                {headLines.slice(1).map((ln, i) => (
                  <div key={i} style={{ color: L.color ?? DARK, fontSize: t20Big, fontWeight: 800, lineHeight: 0.98 }}>{ln}</div>
                ))}
                <div style={{ width: 100, height: 6, background: RED, borderRadius: 3, marginTop: 16 }} />
              </div>
            </MetaText>
          );
        }
        const s: React.CSSProperties = { fontFamily: fam, fontWeight: L.weight ?? 800, fontSize: headSize, lineHeight: L.lineHeight ?? 1.04 };
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
              <div style={{ ...s, display: '-webkit-box', WebkitLineClamp: aviso ? 3 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {subtitle}
              </div>
            </MetaText>
          );
        })}

      {/* Precio. t19: texto rojo con barra. t20: bloque rojo sólido con texto blanco. */}
      {hasPrice &&
        block('maPrice', (L) => {
          if (aviso) {
            const big = L.size ?? 92;
            return (
              <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 12, background: RED, borderRadius: 16, padding: '14px 30px', boxShadow: '0 8px 22px rgba(0,0,0,0.14)' }}>
                <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: Math.round(big * 0.36), color: '#fff' }}>{data.currency}</span>
                <span style={{ fontFamily: `'${L.font || 'Outfit'}', sans-serif`, fontWeight: L.weight ?? 800, fontSize: big, color: '#fff', lineHeight: 0.9 }}>{priceNum}</span>
              </div>
            );
          }
          return (
            <div>
              <div style={{ width: 72, height: 6, background: RED, borderRadius: 3, marginBottom: 14 }} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontFamily: HEAD, fontWeight: 600, fontSize: Math.round((L.size ?? 96) * 0.36), color: NAVY }}>{data.currency}</span>
                <span style={{ fontFamily: `'${L.font || 'Outfit'}', sans-serif`, fontWeight: L.weight ?? 800, fontSize: L.size ?? 96, color: L.color ?? RED, lineHeight: 0.9 }}>{priceNum}</span>
              </div>
            </div>
          );
        }, { auto: true })}

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

      {/* Features. En "aviso" con 4+ specs se parten en 2 tandas (bloques separados). */}
      {feats1.length > 0 &&
        block('maFeats', () => (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'space-around', gap: 8 }}>
            {feats1.map((f, i) => (
              <React.Fragment key={f.label}>
                {i > 0 && <VSep />}
                <Feature Icon={f.Icon} value={String(f.value)} label={f.label} color={aviso ? RED : NAVY} vertical={aviso} />
              </React.Fragment>
            ))}
          </div>
        ))}
      {feats2.length > 0 &&
        block('maFeats2', () => (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'space-around', gap: 8 }}>
            {feats2.map((f, i) => (
              <React.Fragment key={f.label}>
                {i > 0 && <VSep />}
                <Feature Icon={f.Icon} value={String(f.value)} label={f.label} color={aviso ? RED : NAVY} vertical={aviso} />
              </React.Fragment>
            ))}
          </div>
        ))}

      {/* CTA WhatsApp. t20: pill rojo dentro de tarjeta blanca con borde. */}
      {block('maCta', () => {
        const pill = (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, background: RED, color: '#fff', borderRadius: 14, padding: '16px 24px' }}>
            <MessageCircle size={36} color="#fff" strokeWidth={2.2} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
              <span style={{ fontFamily: BODY, fontWeight: 800, fontSize: 22 }}>{CTA_1}</span>
              <span style={{ fontFamily: BODY, fontWeight: 700, fontSize: 20, opacity: 0.95 }}>{CTA_2}</span>
            </div>
          </div>
        );
        const inner = t20
          ? <div style={{ display: 'inline-flex', alignItems: 'center', background: '#fff', border: '2px solid #E5E7EB', borderRadius: 20, padding: 16 }}>{pill}</div>
          : pill;
        return waLink && !interactive ? <a href={waLink} style={{ textDecoration: 'none' }}>{inner}</a> : inner;
      }, { auto: true })}

      {/* Beneficio / Apto crédito (aviso). t21: con línea divisoria a la izquierda. */}
      {((aviso && data.aptoCredito) || (!aviso && benefitTitle)) &&
        block('maBenefit', () => {
          const title = aviso ? 'APTO CRÉDITO' : benefitTitle;
          const sub = aviso ? 'CONSULTANOS' : benefitSub;
          return (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 18 }}>
              {t21 && <div style={{ width: 1, height: 56, background: HAIR }} />}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                <ShieldCheck size={40} color={RED} strokeWidth={2} />
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                  <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 24, color: DARK }}>{title}</span>
                  {sub && <span style={{ fontFamily: BODY, fontWeight: 500, fontSize: 19, color: GRAY }}>{sub}</span>}
                </div>
              </div>
            </div>
          );
        }, { auto: true })}

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

      {/* Footer. t19: negro. t20: blanco con línea divisoria superior. */}
      {block('maFooter', () => {
        const fg = t20 ? '#374151' : '#fff';
        return (
          <div style={{ width: '100%', height: '100%', background: t20 ? '#fff' : '#000', color: fg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 44px', borderTop: t20 ? '1px solid #E5E7EB' : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Globe size={22} color={fg} strokeWidth={2} />
              <span style={{ fontFamily: BODY, fontWeight: 500, fontSize: 21 }}>{WEBSITE}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontFamily: BODY, fontWeight: 400, fontSize: 20, opacity: 0.85 }}>{FOLLOW}</span>
              <Facebook size={24} color={fg} strokeWidth={2} />
              <Instagram size={24} color={fg} strokeWidth={2} />
            </div>
          </div>
        );
      })}

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
