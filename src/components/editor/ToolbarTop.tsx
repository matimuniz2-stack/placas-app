import React, { useState } from 'react';
import {
  Undo2,
  Redo2,
  Download,
  Image as ImageIcon,
  Smartphone,
  Square,
  PanelLeft,
  PanelRight,
  Share2,
  Save,
  FolderOpen,
  MessageSquare,
  Grid3x3,
  Keyboard,
  Github,
} from 'lucide-react';
import { usePlacaStore, useTemporalStore } from '@/lib/store';
import { downloadDataUrl, captureToDataUrl, buildFilename, exportCarouselZip, downloadBlob } from '@/lib/export';
import { getShareUrl } from '@/lib/share';
import { CaptionModal } from '@/components/modals/CaptionModal';
import { DraftsModal } from '@/components/modals/DraftsModal';
import { ShortcutsModal } from '@/components/modals/ShortcutsModal';
import { ShareModal } from '@/components/modals/ShareModal';

interface Props {
  placaRef: React.RefObject<HTMLDivElement>;
}

const FORMAT_SIZES = {
  story: { w: 1080, h: 1920 },
  post: { w: 1080, h: 1350 },
};

export const ToolbarTop: React.FC<Props> = ({ placaRef }) => {
  const format = usePlacaStore((s) => s.format);
  const setFormat = usePlacaStore((s) => s.setFormat);
  const toggleSidebarLeft = usePlacaStore((s) => s.toggleSidebarLeft);
  const toggleSidebarRight = usePlacaStore((s) => s.toggleSidebarRight);
  const showGrid = usePlacaStore((s) => s.showGrid);
  const toggleGrid = usePlacaStore((s) => s.toggleGrid);
  const sidebarLeftOpen = usePlacaStore((s) => s.sidebarLeftOpen);
  const sidebarRightOpen = usePlacaStore((s) => s.sidebarRightOpen);
  const data = usePlacaStore((s) => s.data);
  const templateId = usePlacaStore((s) => s.templateId);
  const photos = usePlacaStore((s) => s.photos);

  const pastStates = useTemporalStore<any[]>((s) => s.pastStates);
  const futureStates = useTemporalStore<any[]>((s) => s.futureStates);
  const undo = () => useTemporalStore.getState().undo();
  const redo = () => useTemporalStore.getState().redo();

  const [exporting, setExporting] = useState(false);
  const [captionOpen, setCaptionOpen] = useState(false);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const sizeNow = FORMAT_SIZES[format];

  const doExport = async (kind: 'png' | 'jpg' | 'both' | 'carousel', resolution: 1 | 2 | 3 = 1) => {
    if (!placaRef.current) return;
    setExporting(true);
    try {
      if (kind === 'png' || kind === 'jpg') {
        const dataUrl = await captureToDataUrl(placaRef.current, sizeNow.w, sizeNow.h, kind, resolution);
        downloadDataUrl(dataUrl, buildFilename(data.barrio, templateId, sizeNow.w, sizeNow.h, kind));
      } else if (kind === 'both') {
        // story + post
        const orig = format;
        for (const f of ['story', 'post'] as const) {
          setFormat(f);
          await new Promise((r) => setTimeout(r, 200));
          const size = FORMAT_SIZES[f];
          const dataUrl = await captureToDataUrl(placaRef.current!, size.w, size.h, 'png', resolution);
          downloadDataUrl(dataUrl, buildFilename(data.barrio, templateId, size.w, size.h, 'png'));
          await new Promise((r) => setTimeout(r, 200));
        }
        setFormat(orig);
      } else if (kind === 'carousel') {
        if (photos.length < 2) {
          alert('Subí 2 o más fotos para el carrusel');
          return;
        }
        const store = usePlacaStore.getState();
        const origIdx = store.activePhotoIdx;
        const blob = await exportCarouselZip({
          count: photos.length,
          zipName: `zamboni_${(data.barrio || 'placas').toLowerCase().replace(/\s+/g, '_')}_${templateId}_${format}`,
          onProgress: () => {},
          generateSlide: async (i) => {
            usePlacaStore.setState({ activePhotoIdx: i });
            await new Promise((r) => setTimeout(r, 150));
            return await captureToDataUrl(placaRef.current!, sizeNow.w, sizeNow.h, 'png', resolution);
          },
        });
        usePlacaStore.setState({ activePhotoIdx: origIdx });
        downloadBlob(blob, `zamboni_carrusel_${templateId}_${format}.zip`);
      }
    } catch (e: any) {
      alert('Error exportando: ' + (e.message || e));
    } finally {
      setExporting(false);
    }
  };

  const doShare = () => {
    const url = getShareUrl({
      data,
      templateId,
      layerOverrides: usePlacaStore.getState().layerOverrides,
      theme: usePlacaStore.getState().theme,
      badges: usePlacaStore.getState().badges,
    });
    setShareUrl(url);
    setShareOpen(true);
  };

  const past = pastStates?.length || 0;
  const future = futureStates?.length || 0;

  return (
    <>
      <header className="h-12 bg-white border-b border-neutral-200 flex items-center px-2 gap-1 flex-shrink-0">
        {/* Left: logo + sidebar toggle */}
        <button onClick={toggleSidebarLeft} className={`btn btn-ghost btn-icon ${!sidebarLeftOpen ? 'text-brand' : ''}`} title="Toggle datos">
          <PanelLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 px-2">
          <div className="w-6 h-6 bg-brand rounded-sm flex items-center justify-center text-white font-bold text-xs" style={{ fontFamily: 'Bebas Neue' }}>Z</div>
          <span className="font-bold text-[12.5px] tracking-[3px] uppercase">Zamboni</span>
          <span className="text-[10px] text-neutral-400 tracking-[2px] uppercase">Placas IG</span>
        </div>

        <div className="w-px h-6 bg-neutral-200 mx-2" />

        {/* Format toggle */}
        <div className="bg-neutral-100 rounded p-0.5 flex gap-0.5">
          <button
            onClick={() => setFormat('story')}
            className={`px-2.5 h-7 text-xs rounded font-semibold transition flex items-center gap-1.5 ${format === 'story' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}
          >
            <Smartphone className="w-3 h-3" /> Story
          </button>
          <button
            onClick={() => setFormat('post')}
            className={`px-2.5 h-7 text-xs rounded font-semibold transition flex items-center gap-1.5 ${format === 'post' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}
          >
            <Square className="w-3 h-3" /> Post
          </button>
        </div>

        <div className="w-px h-6 bg-neutral-200 mx-2" />

        {/* Undo/Redo */}
        <button onClick={() => undo()} disabled={past === 0} className="btn btn-ghost btn-icon" title="Deshacer (⌘Z)"><Undo2 className="w-4 h-4" /></button>
        <button onClick={() => redo()} disabled={future === 0} className="btn btn-ghost btn-icon" title="Rehacer (⌘⇧Z)"><Redo2 className="w-4 h-4" /></button>

        <button onClick={toggleGrid} className={`btn btn-ghost btn-icon ${showGrid ? 'text-brand bg-brand/10' : ''}`} title="Grid"><Grid3x3 className="w-4 h-4" /></button>

        {/* Center spacer */}
        <div className="flex-1" />

        {/* Right actions */}
        <button onClick={() => setDraftsOpen(true)} className="btn btn-ghost" title="Borradores"><FolderOpen className="w-3.5 h-3.5" /><span className="text-xs">Drafts</span></button>
        <button onClick={() => setCaptionOpen(true)} className="btn btn-ghost" title="Caption IG"><MessageSquare className="w-3.5 h-3.5" /><span className="text-xs">Caption</span></button>
        <button onClick={doShare} className="btn btn-ghost" title="Compartir"><Share2 className="w-3.5 h-3.5" /><span className="text-xs">Compartir</span></button>
        <button onClick={() => setShortcutsOpen(true)} className="btn btn-ghost btn-icon" title="Atajos"><Keyboard className="w-4 h-4" /></button>

        <div className="w-px h-6 bg-neutral-200 mx-1" />

        <ExportMenu onExport={doExport} disabled={exporting} />

        <button onClick={toggleSidebarRight} className={`btn btn-ghost btn-icon ${!sidebarRightOpen ? 'text-brand' : ''}`} title="Toggle inspector">
          <PanelRight className="w-4 h-4" />
        </button>
      </header>

      <CaptionModal open={captionOpen} onClose={() => setCaptionOpen(false)} />
      <DraftsModal open={draftsOpen} onClose={() => setDraftsOpen(false)} />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} url={shareUrl} />
    </>
  );
};

const ExportMenu: React.FC<{ onExport: (k: 'png' | 'jpg' | 'both' | 'carousel', r?: 1 | 2 | 3) => void; disabled: boolean }> = ({ onExport, disabled }) => {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  React.useEffect(() => {
    if (!open) return;
    const h = () => close();
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, [open]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setOpen(!open)} disabled={disabled} className="btn btn-primary">
        <Download className="w-3.5 h-3.5" />
        <span className="text-xs">{disabled ? 'Generando…' : 'Exportar'}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-56 bg-white border border-neutral-200 rounded-md shadow-lg py-1.5 z-50 animate-slide-up">
          <MenuItem label="PNG · 1080" sub="actual" onClick={() => { onExport('png', 1); close(); }} />
          <MenuItem label="PNG · 2160 (2x)" sub="HD" onClick={() => { onExport('png', 2); close(); }} />
          <MenuItem label="PNG · 3240 (3x)" sub="impresión" onClick={() => { onExport('png', 3); close(); }} />
          <div className="divider my-1" />
          <MenuItem label="JPG" sub="más liviano" onClick={() => { onExport('jpg', 2); close(); }} />
          <div className="divider my-1" />
          <MenuItem label="Story + Post" sub="dos archivos" onClick={() => { onExport('both', 1); close(); }} />
          <MenuItem label="Carrusel ZIP" sub="todas las fotos" onClick={() => { onExport('carousel', 1); close(); }} />
        </div>
      )}
    </div>
  );
};

const MenuItem: React.FC<{ label: string; sub?: string; onClick: () => void }> = ({ label, sub, onClick }) => (
  <button onClick={onClick} className="w-full text-left px-3 py-1.5 hover:bg-neutral-50 transition flex items-baseline justify-between gap-2">
    <span className="text-xs font-medium text-neutral-900">{label}</span>
    {sub && <span className="text-[10px] text-neutral-400">{sub}</span>}
  </button>
);
