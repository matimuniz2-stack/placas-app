import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: number;
}

export const Modal: React.FC<Props> = ({ open, onClose, title, children, width = 540 }) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-2xl my-auto flex flex-col max-h-[92vh]"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 flex-shrink-0">
            <h2 className="text-sm font-bold tracking-[2px] uppercase">{title}</h2>
            <button onClick={onClose} className="btn btn-ghost btn-icon"><X className="w-4 h-4" /></button>
          </div>
        )}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
          onWheel={(e) => {
            // Make sure wheel events scroll the modal content (not the backdrop)
            e.stopPropagation();
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
