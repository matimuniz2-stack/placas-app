import React from 'react';
import { Modal } from './Modal';

interface Props { open: boolean; onClose: () => void }

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: '⌘ / Ctrl + Z', action: 'Deshacer' },
  { keys: '⌘ / Ctrl + ⇧ + Z', action: 'Rehacer' },
  { keys: 'S', action: 'Story' },
  { keys: 'P', action: 'Post' },
  { keys: '1 – 9', action: 'Cambiar template' },
  { keys: '↑ ↓ ← →', action: 'Mover layer 1px' },
  { keys: '⇧ + arrows', action: 'Mover layer 10px' },
  { keys: 'Esc', action: 'Deseleccionar' },
  { keys: 'Delete', action: 'Eliminar layer (badges/QR)' },
  { keys: 'G', action: 'Toggle grid' },
  { keys: 'L', action: 'Toggle sidebar izq' },
  { keys: 'R', action: 'Toggle sidebar der' },
  { keys: '?', action: 'Mostrar atajos' },
];

export const ShortcutsModal: React.FC<Props> = ({ open, onClose }) => (
  <Modal open={open} onClose={onClose} title="Atajos de teclado" width={420}>
    <div className="p-5">
      <div className="space-y-1.5">
        {SHORTCUTS.map((s) => (
          <div key={s.keys} className="flex items-center justify-between py-1.5 px-2 hover:bg-neutral-50 rounded">
            <span className="text-sm text-neutral-700">{s.action}</span>
            <kbd className="font-mono text-[11px] bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 text-neutral-700">{s.keys}</kbd>
          </div>
        ))}
      </div>
    </div>
  </Modal>
);
