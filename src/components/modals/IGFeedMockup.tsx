import React, { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { usePlacaStore } from '@/lib/store';
import { PlacaRenderer } from '@/components/templates/Renderer';
import { ALL_TEMPLATES } from '@/components/templates/registry';
import { captureToDataUrl, downloadDataUrl } from '@/lib/export';
import { slugify } from '@/lib/format';
import { Grid3x3, Tag, User, Home, Search, Heart, MessageCircle, Bookmark, Film, Download, Loader2 } from 'lucide-react';

// Stable dummy posts (random-feeling but deterministic so they don't reshuffle)
const DUMMY_POSTS = [
  { id: 'd1', barrio: 'Palermo',    addr: 'Honduras 5500',    price: '189.000',  amb: '2', m2: '52',  tplIdx: 1 },
  { id: 'd2', barrio: 'Recoleta',   addr: 'Av. Pueyrredón',   price: '320.000',  amb: '3', m2: '88',  tplIdx: 6 },
  { id: 'd3', barrio: 'Núñez',      addr: 'Cabildo 4800',     price: '145.000',  amb: '2', m2: '48',  tplIdx: 7 },
  { id: 'd4', barrio: 'Caballito',  addr: 'Rivadavia 5400',   price: '98.000',   amb: '1', m2: '38',  tplIdx: 0 },
  { id: 'd5', barrio: 'Las Cañitas', addr: 'Báez 250',         price: '210.000',  amb: '2', m2: '55',  tplIdx: 4 },
  { id: 'd6', barrio: 'Belgrano',   addr: 'Sucre 1800',       price: '275.000',  amb: '3', m2: '78',  tplIdx: 8 },
  { id: 'd7', barrio: 'Colegiales', addr: 'Conde 950',        price: '165.000',  amb: '2', m2: '50',  tplIdx: 2 },
  { id: 'd8', barrio: 'Villa Crespo', addr: 'Corrientes 5200', price: '120.000', amb: '1', m2: '42',  tplIdx: 5 },
];

interface Props { open: boolean; onClose: () => void; placaRef: React.RefObject<HTMLDivElement> }

export const IGFeedMockup: React.FC<Props> = ({ open, onClose, placaRef }) => {
  const data = usePlacaStore((s) => s.data);
  const theme = usePlacaStore((s) => s.theme);
  const photos = usePlacaStore((s) => s.photos);
  const templateId = usePlacaStore((s) => s.templateId);
  const [placaThumb, setPlacaThumb] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const mockupRef = useRef<HTMLDivElement>(null);

  // Capture the real placa as a thumbnail (post format, low resolution) so it
  // appears at the top of the grid without recursively rendering it.
  useEffect(() => {
    if (!open || !placaRef.current) return;
    let cancelled = false;
    (async () => {
      setGenerating(true);
      try {
        // Briefly switch to post format for capture (3:4 thumbnail aspect)
        const originalFormat = usePlacaStore.getState().format;
        usePlacaStore.setState({ format: 'post' });
        await new Promise((r) => setTimeout(r, 250));
        if (document.fonts?.ready) {
          try { await document.fonts.ready; } catch {}
        }
        const dataUrl = await captureToDataUrl(placaRef.current!, 1080, 1350, 'jpg', 1);
        if (!cancelled) setPlacaThumb(dataUrl);
        usePlacaStore.setState({ format: originalFormat });
      } catch (e) {
        console.warn('placa thumb capture failed', e);
      } finally {
        if (!cancelled) setGenerating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, templateId, data, theme, photos]);

  const handleExport = async () => {
    if (!mockupRef.current) return;
    setExporting(true);
    try {
      const { toPng } = await import('html-to-image');
      await new Promise((r) => setTimeout(r, 100));
      const dataUrl = await toPng(mockupRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#ffffff',
        filter: (el) => el.tagName !== 'LINK' || !/fonts\.googleapis\.com|fonts\.gstatic\.com/.test((el as HTMLLinkElement).href || ''),
      });
      downloadDataUrl(dataUrl, `zamboni_feed_mockup_${slugify(data.barrio || 'placa')}.png`);
    } catch (e: any) {
      alert('Error exportando mockup: ' + (e.message || e));
    } finally {
      setExporting(false);
    }
  };

  if (!open) return null;

  const handle = 'zamboni.inmobiliaria';

  return (
    <Modal open={open} onClose={onClose} title="Mockup feed Instagram" width={500}>
      <div className="p-4 space-y-3">
        <p className="text-[11px] text-neutral-500">
          Vista previa de cómo se verá tu placa en el feed real de IG. Click descargar para guardar la imagen y mandarsela al cliente.
        </p>

        {/* Mockup */}
        <div ref={mockupRef} className="bg-white border border-neutral-200 rounded overflow-hidden mx-auto" style={{ width: 420 }}>
          {/* Profile header */}
          <div className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full p-[2px]" style={{ background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>
                <div className="w-full h-full rounded-full bg-white p-[2px]">
                  <div
                    className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
                    style={{ background: theme.brand }}
                  >
                    <img src={theme.logoUrl} alt="" className="w-full h-full object-contain p-1" />
                  </div>
                </div>
              </div>
              <div className="flex-1 flex gap-4 text-center text-xs">
                <div><div className="font-bold text-sm">247</div><div className="text-neutral-500">posts</div></div>
                <div><div className="font-bold text-sm">3.4K</div><div className="text-neutral-500">seguidores</div></div>
                <div><div className="font-bold text-sm">182</div><div className="text-neutral-500">seguidos</div></div>
              </div>
            </div>
            <div className="mt-2">
              <div className="text-sm font-semibold">{handle}</div>
              <div className="text-[11px] text-neutral-700 mt-1 leading-snug">
                🏠 Inmobiliaria Zamboni · Buenos Aires<br/>
                Propiedades en Belgrano, Palermo, Núñez y más.<br/>
                📩 Consultas por DM
              </div>
            </div>
            <div className="flex gap-1.5 mt-3">
              <button className="flex-1 h-7 rounded bg-[#0095f6] text-white text-xs font-semibold">Seguir</button>
              <button className="flex-1 h-7 rounded bg-neutral-200 text-xs font-semibold">Mensaje</button>
              <button className="h-7 px-2 rounded bg-neutral-200 text-xs">▾</button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-t border-neutral-200 text-xs text-neutral-500">
            <div className="flex-1 py-2 flex items-center justify-center gap-1 border-t-2 border-black text-black">
              <Grid3x3 className="w-3.5 h-3.5" /><span className="font-semibold">PUBLICACIONES</span>
            </div>
            <div className="flex-1 py-2 flex items-center justify-center gap-1">
              <Film className="w-3.5 h-3.5" /><span>REELS</span>
            </div>
            <div className="flex-1 py-2 flex items-center justify-center gap-1">
              <Tag className="w-3.5 h-3.5" /><span>ETIQ.</span>
            </div>
          </div>

          {/* Grid 3x3 */}
          <div className="grid grid-cols-3 gap-[2px] bg-neutral-200">
            {/* Top-center is the placa actual */}
            <DummyTile post={DUMMY_POSTS[0]} />
            <PlacaTile thumb={placaThumb} generating={generating} highlighted />
            <DummyTile post={DUMMY_POSTS[1]} />
            <DummyTile post={DUMMY_POSTS[2]} />
            <DummyTile post={DUMMY_POSTS[3]} />
            <DummyTile post={DUMMY_POSTS[4]} />
            <DummyTile post={DUMMY_POSTS[5]} />
            <DummyTile post={DUMMY_POSTS[6]} />
            <DummyTile post={DUMMY_POSTS[7]} />
          </div>

          {/* Bottom nav */}
          <div className="flex justify-between items-center px-6 py-3 border-t border-neutral-200">
            <Home className="w-5 h-5" />
            <Search className="w-5 h-5" />
            <div className="w-5 h-5 border-2 border-black rounded-md flex items-center justify-center text-xs font-bold">+</div>
            <Film className="w-5 h-5" />
            <div className="w-5 h-5 rounded-full" style={{ background: theme.brand }} />
          </div>
        </div>

        <button className="btn btn-primary w-full justify-center" disabled={!placaThumb || exporting} onClick={handleExport}>
          {exporting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exportando…</> : <><Download className="w-3.5 h-3.5" /> Descargar mockup PNG</>}
        </button>
      </div>
    </Modal>
  );
};

const PlacaTile: React.FC<{ thumb: string | null; generating: boolean; highlighted?: boolean }> = ({ thumb, generating, highlighted }) => (
  <div
    className="aspect-square bg-neutral-100 relative overflow-hidden"
    style={highlighted ? { boxShadow: '0 0 0 2px #de1f1a' } : undefined}
  >
    {thumb ? (
      <img src={thumb} alt="" className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-[9px] text-neutral-400">
        {generating ? 'Capturando…' : 'Tu placa'}
      </div>
    )}
    {highlighted && (
      <div className="absolute top-1 right-1 bg-brand text-white text-[8px] px-1 py-0.5 rounded font-bold tracking-wider">TU PLACA</div>
    )}
  </div>
);

// Visual dummy tile — uses PlacaRenderer with the dummy data + a specific template,
// shrunk to thumbnail size via CSS scale. Static (no clicks, no overrides).
const DummyTile: React.FC<{ post: typeof DUMMY_POSTS[0] }> = ({ post }) => {
  const tpl = ALL_TEMPLATES[post.tplIdx % ALL_TEMPLATES.length];
  // Use a sub-store-less render via a CSS-only placeholder so we don't recurse the global store
  return (
    <div
      className="aspect-square bg-neutral-100 relative overflow-hidden flex flex-col justify-end p-1.5"
      style={{
        background: tpl.bgColor || '#1a1a1a',
        color: tpl.textColor || '#fff',
      }}
    >
      <div style={{ fontFamily: `'${tpl.defaultLayers.addr?.font || 'Inter'}'`, fontSize: 7, opacity: 0.7, letterSpacing: 1, textTransform: 'uppercase' }}>
        {post.barrio}
      </div>
      <div style={{
        fontFamily: `'${tpl.defaultLayers.addr?.font || 'Inter'}'`,
        fontSize: 10,
        fontWeight: tpl.defaultLayers.addr?.weight || 600,
        lineHeight: 1.05,
        marginTop: 2,
        textTransform: 'none',
      }}>
        {post.addr.split(' ').slice(-2).join(' ')}
      </div>
      <div style={{
        fontFamily: `'${tpl.defaultLayers.price?.font || tpl.defaultLayers.addr?.font || 'Inter'}'`,
        fontSize: 11,
        fontWeight: tpl.defaultLayers.price?.weight || 700,
        marginTop: 3,
      }}>
        USD {post.price.split('.')[0]}K
      </div>
    </div>
  );
};
