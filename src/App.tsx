import React, { useEffect, useRef } from 'react';
import { ToolbarTop } from './components/editor/ToolbarTop';
import { SidebarLeft } from './components/editor/SidebarLeft';
import { SidebarRight } from './components/editor/SidebarRight';
import { Canvas } from './components/editor/Canvas';
import { useGlobalShortcuts } from './lib/shortcuts';
import { readShareFromUrl } from './lib/share';
import { usePlacaStore } from './lib/store';
import { loadLastState, saveLastState } from './lib/drafts';

const App: React.FC = () => {
  const placaRef = useRef<HTMLDivElement>(null);
  useGlobalShortcuts();

  // Hydrate state from share link or last saved
  useEffect(() => {
    const fromShare = readShareFromUrl();
    if (fromShare) {
      usePlacaStore.setState({
        data: fromShare.data || usePlacaStore.getState().data,
        templateId: fromShare.templateId || 't01',
        layerOverrides: fromShare.layerOverrides || {},
        theme: fromShare.theme || usePlacaStore.getState().theme,
        badges: fromShare.badges || [],
      });
      return;
    }
    loadLastState().then((s) => {
      if (s) {
        usePlacaStore.setState({
          ...s,
          selectedLayer: null,
        });
      }
    });
  }, []);

  // Auto-save state to IndexedDB
  useEffect(() => {
    const unsub = usePlacaStore.subscribe((state) => {
      const { selectedLayer, sidebarLeftOpen, sidebarRightOpen, showGrid, ...persist } = state as any;
      saveLastState(persist);
    });
    return unsub;
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-50 overflow-hidden">
      <ToolbarTop placaRef={placaRef} />
      <div className="flex flex-1 min-h-0">
        <SidebarLeft />
        <main className="flex-1 min-w-0 relative">
          <Canvas ref={placaRef} />
        </main>
        <SidebarRight />
      </div>
    </div>
  );
};

export default App;
