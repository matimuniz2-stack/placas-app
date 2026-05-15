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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200">
            <h2 className="text-sm font-bold tracking-[2px] uppercase">{title}</h2>
            <button onClick={onClose} className="btn btn-ghost btn-icon"><X className="w-4 h-4" /></button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
