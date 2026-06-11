// Drag & drop de fotos estilo Canva: arrastrás una miniatura del panel FOTOS y la
// soltás sobre cualquier celda/slot de foto de la placa para asignarla.

const PHOTO_MIME = 'application/x-placa-photo';

export function setDragPhoto(e: React.DragEvent, idx: number) {
  e.dataTransfer.setData(PHOTO_MIME, String(idx));
  e.dataTransfer.effectAllowed = 'copy';
}

// Durante dragover solo están disponibles los types (no el valor).
export function isPhotoDrag(e: React.DragEvent): boolean {
  return Array.from(e.dataTransfer.types || []).includes(PHOTO_MIME);
}

export function getDragPhoto(e: React.DragEvent): number | null {
  const v = e.dataTransfer.getData(PHOTO_MIME);
  if (v === '') return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
