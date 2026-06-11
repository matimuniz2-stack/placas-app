import React, { useEffect, useRef } from 'react';
import { ToolbarTop } from './components/editor/ToolbarTop';
import { SidebarLeft } from './components/editor/SidebarLeft';
import { SidebarRight } from './components/editor/SidebarRight';
import { Canvas } from './components/editor/Canvas';
import { useGlobalShortcuts } from './lib/shortcuts';
import { readShareFromUrl } from './lib/share';
import { SlideTabs } from './components/editor/SlideTabs';
import { usePlacaStore, currentSlidesSnapshot, blankSlide } from './lib/store';
import { loadLastState, saveLastState } from './lib/drafts';
import { isMetaTemplate, metaFixedFormat, META_LAYOUT_VERSION } from './lib/metaAd';

const App: React.FC = () => {
  const placaRef = useRef<HTMLDivElement>(null);
  useGlobalShortcuts();

  // Hydrate state from share link or last saved
  useEffect(() => {
    const fromShare = readShareFromUrl();
    if (fromShare) {
      usePlacaStore.setState({
        data: fromShare.data || usePlacaStore.getState().data,
        templateId: fromShare.templateId || 't16',
        layerOverrides: fromShare.layerOverrides || {},
        theme: fromShare.theme || usePlacaStore.getState().theme,
        badges: fromShare.badges || [],
      });
      return;
    }
    loadLastState().then((s) => {
      if (s) {
        const next: any = { ...s, selectedLayer: null };
        // Compat: borradores guardados sin slides → una sola placa con el diseño actual.
        if (!next.slides || !next.slides.length) {
          next.slides = [{
            ...blankSlide(s.templateId || 't16', s.format || 'story'),
            layerOverrides: s.layerOverrides || {},
            textOverrides: s.textOverrides || {},
            galleryCells: s.galleryCells || {},
            customElements: s.customElements || {},
            activePhotoIdx: s.activePhotoIdx ?? 0,
            bgOverride: s.bgOverride ?? null,
            badges: s.badges || [],
          }];
          next.activeSlide = 0;
        }
        // Borrador de un template meta guardado con un layout viejo: descartar overrides
        // de posición/edición y elementos custom para que tome el diseño nuevo (se
        // conservan datos, fotos, tema). Además fijar el formato correcto del template.
        if (isMetaTemplate(s.templateId)) {
          if (s.layoutVersion !== META_LAYOUT_VERSION) {
            next.layerOverrides = {};
            next.textOverrides = {};
            next.customElements = {};
            next.galleryCells = {};
          }
          next.format = metaFixedFormat(s.templateId) ?? next.format;
        }
        usePlacaStore.setState(next);
      }
    });
  }, []);

  // Auto-save state to IndexedDB (only serializable data)
  useEffect(() => {
    let saveTimer: any;
    const unsub = usePlacaStore.subscribe((state) => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const slidesNow = currentSlidesSnapshot();
        const snapshot = {
          format: state.format,
          templateId: state.templateId,
          variantId: state.variantId,
          data: state.data,
          layerOverrides: state.layerOverrides,
          textOverrides: state.textOverrides,
          photos: state.photos,
          activePhotoIdx: state.activePhotoIdx,
          theme: state.theme,
          agent: state.agent,
          badges: state.badges,
          qrUrl: state.qrUrl,
          galleryCells: state.galleryCells,
          customElements: state.customElements,
          bgOverride: state.bgOverride,
          slides: slidesNow.slides,
          activeSlide: slidesNow.activeSlide,
          abbreviatePrice: state.abbreviatePrice,
          snapToGrid: state.snapToGrid,
          layoutVersion: META_LAYOUT_VERSION,
        };
        // Strip non-serializable safely
        saveLastState(JSON.parse(JSON.stringify(snapshot)));
      }, 600);
    });
    return () => { unsub(); clearTimeout(saveTimer); };
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-50 overflow-hidden">
      <ToolbarTop placaRef={placaRef} />
      <div className="flex flex-1 min-h-0">
        <SidebarLeft />
        <main className="flex-1 min-w-0 relative">
          <SlideTabs />
          <Canvas ref={placaRef} />
        </main>
        <SidebarRight placaRef={placaRef} />
      </div>
    </div>
  );
};

export default App;
