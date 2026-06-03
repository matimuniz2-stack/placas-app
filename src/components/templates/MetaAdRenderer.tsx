import React from 'react';
import { usePlacaStore, getEffectiveLayer } from '@/lib/store';
import { amenString, abbreviatePrice } from '@/lib/format';
import type { PhotoState } from '@/types';
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

// ── Aviso publicitario para Meta Ads (t19). Render dedicado, layout FIJO 4:5 (1080×1350).
// Se auto-rellena con PlacaData + marca Zamboni. Coordenadas absolutas en px sobre 1080×1350.

const NAVY = '#071526';
const DARK = '#111827';
const GRAY = '#6B7280';
const HAIR = '#E5E7EB';
const HEAD = "'Outfit', sans-serif";
const BODY = "'Inter', sans-serif";

// Datos institucionales (constantes de Zamboni; a futuro podrían vivir en el BrandKit)
const WEBSITE = 'www.zambonipropiedades.com';
const MATRICULA = 'Mat. Reg. 3686';
const BRAND_NAME = 'ZAMBONI';
const BRAND_SUB = 'PROPIEDADES';
const FOLLOW = 'Seguinos en';
const CTA_1 = 'PEDÍ LA FICHA COMPLETA';
const CTA_2 = 'POR WHATSAPP';

const PHOTO_H = 730; // foto principal ocupa ~54%

// Caja de foto: cover-fit con pos/zoom/filtro propio (espeja primitives/Photo.tsx)
const PhotoBox: React.FC<{ photo?: PhotoState; boost?: boolean; style: React.CSSProperties; dataLayer?: string; selected?: boolean; onSelect?: () => void }> = ({ photo, boost, style, dataLayer, selected, onSelect }) => {
  const selOutline: React.CSSProperties = selected ? { outline: '2px dashed #de1f1a', outlineOffset: 2 } : {};
  const cursorStyle: React.CSSProperties = onSelect ? { cursor: 'pointer' } : {};
  if (!photo) {
    return (
      <div
        data-layer={dataLayer}
        onClick={onSelect}
        style={{
          ...style,
          ...selOutline,
          ...cursorStyle,
          background: HAIR,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9CA3AF',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 24,
          letterSpacing: 3,
        }}
      >
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
      data-layer={dataLayer}
      onClick={onSelect}
      style={{
        ...style,
        ...selOutline,
        ...cursorStyle,
        backgroundImage: `url("${photo.url}")`,
        backgroundSize: photo.zoom === 1 ? 'cover' : `${photo.zoom * 100}%`,
        backgroundPosition: `${photo.pos.x}% ${photo.pos.y}%`,
        backgroundRepeat: 'no-repeat',
        filter: `brightness(${b}%) contrast(${c}%) saturate(${s}%)`,
      }}
    />
  );
};

// Item de la fila de features: ícono + valor + etiqueta
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
  usePlacaStore((s) => s.layerOverrides); // re-render al mover/redimensionar bloques

  const RED = theme.brand || '#EF2B2A';

  // ── Derivaciones de datos ──
  const status = `EN ${(data.op || 'Venta').toUpperCase()}`;
  const neighborhood = (data.barrio || '').toUpperCase();
  const city = data.city || 'Mar del Plata';

  // Headline en 2 líneas: respeta '\n' explícito; si no, línea 1 = addr, línea 2 = "en {barrio}".
  const hParts = (data.addr || '').includes('\n')
    ? (data.addr || '').split('\n')
    : [data.addr || '', data.barrio ? `en ${data.barrio}` : ''];
  const hl1 = hParts[0] || '';
  const hl2 = hParts[1] || '';
  const hMax = Math.max(hl1.length, hl2.length);
  const headSize = hMax <= 16 ? 64 : hMax <= 22 ? 54 : hMax <= 30 ? 44 : 38;

  const subtitle = (data.amenText && data.amenText.trim()) || (data.desc && data.desc.trim()) || amenString(data) || '';

  const hasPrice = !!(data.price && data.price.trim());
  const priceNum = abbreviate ? abbreviatePrice(data.price) : data.price;
  const priceSize = !priceNum ? 96 : priceNum.length <= 8 ? 100 : priceNum.length <= 11 ? 80 : 64;

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

  const PAD = 54; // padding lateral ~5%

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fff', fontFamily: BODY, overflow: 'hidden' }}>
      {/* Foto principal (editable: mover/redimensionar) */}
      {(() => {
        const L = getEffectiveLayer('maPhoto1')!;
        return (
          <PhotoBox
            photo={photos[0]}
            boost
            dataLayer={interactive ? 'maPhoto1' : undefined}
            selected={selected === 'maPhoto1'}
            onSelect={interactive ? () => { select('maPhoto1'); if (photos[0]) setActive(0); } : undefined}
            style={{ position: 'absolute', left: `${L.x}%`, top: `${L.y}%`, width: `${L.w}%`, height: `${L.h}%`, zIndex: L.z ?? 0 }}
          />
        );
      })()}

      {/* Badge estado (rojo, arriba izq) */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: RED,
          color: '#fff',
          borderRadius: 16,
          padding: '14px 26px',
          boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
          zIndex: 10,
        }}
      >
        <Home size={30} color="#fff" strokeWidth={2.2} />
        <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 34, letterSpacing: 1 }}>{status}</span>
      </div>

      {/* Badge ubicación (navy, arriba der) */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: NAVY,
          color: '#fff',
          borderRadius: 16,
          padding: '12px 26px',
          boxShadow: '0 6px 18px rgba(0,0,0,0.22)',
          zIndex: 10,
        }}
      >
        <MapPin size={32} color="#fff" strokeWidth={2.2} />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 30, letterSpacing: 0.5 }}>{neighborhood}</span>
          <span style={{ fontFamily: BODY, fontWeight: 400, fontSize: 24, opacity: 0.9 }}>{city}</span>
        </div>
      </div>

      {/* Segunda foto destacada (editable: mover/redimensionar) */}
      {(() => {
        const L = getEffectiveLayer('maPhoto2')!;
        return (
          <PhotoBox
            photo={photos[1]}
            dataLayer={interactive ? 'maPhoto2' : undefined}
            selected={selected === 'maPhoto2'}
            onSelect={interactive ? () => { select('maPhoto2'); if (photos[1]) setActive(1); } : undefined}
            style={{
              position: 'absolute',
              left: `${L.x}%`,
              top: `${L.y}%`,
              width: `${L.w}%`,
              height: `${L.h}%`,
              borderRadius: L.radius ?? 26,
              border: '5px solid #fff',
              boxShadow: '0 14px 34px rgba(0,0,0,0.16)',
              overflow: 'hidden',
              zIndex: L.z ?? 6,
            }}
          />
        );
      })()}

      {/* ── Columna de texto comercial (izq) ── */}
      {/* Headline bicolor */}
      <div style={{ position: 'absolute', left: PAD, top: 748, width: 540 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: headSize, color: DARK, lineHeight: 1.04 }}>{hl1}</div>
        {hl2 && <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: headSize, color: RED, lineHeight: 1.04 }}>{hl2}</div>}
      </div>

      {/* Subtítulo */}
      {subtitle && (
        <div
          style={{
            position: 'absolute',
            left: PAD,
            top: 892,
            width: 540,
            fontFamily: BODY,
            fontWeight: 500,
            fontSize: 28,
            color: GRAY,
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {subtitle}
        </div>
      )}

      {/* Separador rojo */}
      <div style={{ position: 'absolute', left: PAD, top: 930, width: 72, height: 6, background: RED, borderRadius: 3 }} />

      {/* Precio */}
      {hasPrice && (
        <div style={{ position: 'absolute', left: PAD, top: 952, display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 36, color: NAVY }}>{data.currency}</span>
          <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: priceSize, color: RED, lineHeight: 0.9 }}>{priceNum}</span>
        </div>
      )}

      {/* Micro tagline */}
      {tagline && (
        <div
          style={{
            position: 'absolute',
            left: PAD,
            top: 1056,
            fontFamily: BODY,
            fontWeight: 600,
            fontSize: 22,
            color: GRAY,
            letterSpacing: 3,
            textTransform: 'uppercase',
          }}
        >
          {tagline}
        </div>
      )}

      {/* ── Fila de features ── */}
      {features.length > 0 && (
        <div
          style={{
            position: 'absolute',
            left: PAD,
            right: PAD,
            top: 1088,
            height: 70,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {features.map((f, i) => (
            <React.Fragment key={f.label}>
              {i > 0 && <VSep />}
              <Feature Icon={f.Icon} value={String(f.value)} label={f.label} />
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ── Fila CTA + beneficio + marca ── */}
      <div
        style={{
          position: 'absolute',
          left: PAD,
          right: PAD,
          top: 1166,
          height: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
        }}
      >
        {/* CTA WhatsApp */}
        {(() => {
          const inner = (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: RED,
                color: '#fff',
                borderRadius: 14,
                padding: '16px 24px',
              }}
            >
              <MessageCircle size={36} color="#fff" strokeWidth={2.2} />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
                <span style={{ fontFamily: BODY, fontWeight: 800, fontSize: 22 }}>{CTA_1}</span>
                <span style={{ fontFamily: BODY, fontWeight: 700, fontSize: 20, opacity: 0.95 }}>{CTA_2}</span>
              </div>
            </div>
          );
          return waLink ? (
            <a href={waLink} style={{ textDecoration: 'none' }}>
              {inner}
            </a>
          ) : (
            inner
          );
        })()}

        {/* Beneficio institucional */}
        {benefitTitle && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ShieldCheck size={40} color={RED} strokeWidth={2} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 24, color: DARK }}>{benefitTitle}</span>
              {benefitSub && <span style={{ fontFamily: BODY, fontWeight: 500, fontSize: 19, color: GRAY }}>{benefitSub}</span>}
            </div>
          </div>
        )}

        {/* Marca */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          {logoUrl ? (
            <img src={logoUrl} alt="" style={{ height: 52, objectFit: 'contain' }} />
          ) : (
            <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 52, color: RED }}>Z</span>
          )}
          <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 22, color: DARK, letterSpacing: 1 }}>{BRAND_NAME}</span>
          <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 13, color: GRAY, letterSpacing: 3 }}>{BRAND_SUB}</span>
        </div>
      </div>

      {/* ── Footer navy ── */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: 1080,
          height: 70,
          background: NAVY,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 44px',
          zIndex: 8,
        }}
      >
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
    </div>
  );
};
