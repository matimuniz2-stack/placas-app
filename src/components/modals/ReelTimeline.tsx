import React from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Image as ImageIcon, Video, Trash2, GripVertical, Plus, Clock, Scissors } from 'lucide-react';
import type { MediaItem, MotionStyle } from '@/lib/reel';

interface Props {
  items: MediaItem[];
  posters: Record<string, string>; // id → thumbnail data url
  videoMeta: Record<string, { duration: number; w: number; h: number }>;
  globalDuration: number;
  disabled?: boolean;
  onReorder: (next: MediaItem[]) => void;
  onUpdate: (id: string, patch: Partial<MediaItem>) => void;
  onRemove: (id: string) => void;
  onAddPhotos: (files: FileList) => void;
  onAddVideos: (files: FileList) => void;
}

export const ReelTimeline: React.FC<Props> = ({
  items,
  posters,
  videoMeta,
  globalDuration,
  disabled,
  onReorder,
  onUpdate,
  onRemove,
  onAddPhotos,
  onAddVideos,
}) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="label !mb-0">Timeline ({items.length})</label>
        <div className="flex gap-1.5">
          <label className={`btn btn-ghost h-7 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <Plus className="w-3 h-3" /><ImageIcon className="w-3 h-3" />
            <span className="text-[10.5px]">Foto</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={disabled}
              onChange={(e) => e.target.files && onAddPhotos(e.target.files)}
            />
          </label>
          <label className={`btn btn-ghost h-7 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <Plus className="w-3 h-3" /><Video className="w-3 h-3" />
            <span className="text-[10.5px]">Video</span>
            <input
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              disabled={disabled}
              onChange={(e) => e.target.files && onAddVideos(e.target.files)}
            />
          </label>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-2 overflow-x-auto pb-2 px-0.5">
            {items.map((item) => (
              <SortableCard
                key={item.id}
                item={item}
                poster={item.type === 'video' ? posters[item.id] : item.url}
                meta={item.type === 'video' ? videoMeta[item.id] : undefined}
                globalDuration={globalDuration}
                disabled={disabled}
                onUpdate={onUpdate}
                onRemove={onRemove}
              />
            ))}
            {items.length === 0 && (
              <div className="w-full text-center py-6 text-[11px] text-neutral-400 border-2 border-dashed border-neutral-200 rounded">
                Subí fotos o videos con los botones de arriba.
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

const MOTIONS: { id: MotionStyle; label: string }[] = [
  { id: 'zoom-in', label: 'Zoom in' },
  { id: 'zoom-out', label: 'Zoom out' },
  { id: 'pan-right', label: 'Pan →' },
  { id: 'pan-left', label: 'Pan ←' },
  { id: 'pan-up', label: 'Pan ↑' },
  { id: 'pan-down', label: 'Pan ↓' },
  { id: 'orbit-cw', label: 'Orbit ↻' },
  { id: 'orbit-ccw', label: 'Orbit ↺' },
  { id: 'static', label: 'Estático' },
];

const SortableCard: React.FC<{
  item: MediaItem;
  poster: string | undefined;
  meta?: { duration: number; w: number; h: number };
  globalDuration: number;
  disabled?: boolean;
  onUpdate: (id: string, patch: Partial<MediaItem>) => void;
  onRemove: (id: string) => void;
}> = ({ item, poster, meta, globalDuration, disabled, onUpdate, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isVideo = item.type === 'video';
  const videoDur = meta?.duration ?? (isVideo ? (item as any).videoDuration : 0) ?? 0;
  const trimStart = isVideo ? ((item as any).trimStart ?? 0) : 0;
  const trimEnd = isVideo ? ((item as any).trimEnd ?? videoDur) : 0;
  const itemDuration = item.duration ?? (isVideo ? Math.min(trimEnd - trimStart, globalDuration) : globalDuration);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex-shrink-0 w-[150px] bg-white border border-neutral-200 rounded p-1.5 space-y-1.5"
    >
      {/* Header: drag + type + remove */}
      <div className="flex items-center gap-1">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-700"
          disabled={disabled}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <span className="flex-1 flex items-center gap-1 text-[10px] text-neutral-500">
          {isVideo ? <Video className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
          <span className="font-mono">{isVideo ? 'VIDEO' : 'FOTO'}</span>
        </span>
        <button onClick={() => onRemove(item.id)} className="text-neutral-400 hover:text-brand" disabled={disabled}>
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Poster */}
      <div className="relative aspect-[9/16] bg-neutral-100 rounded overflow-hidden">
        {poster ? (
          <img src={poster} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-300 text-xs">…</div>
        )}
        {isVideo && videoDur > 0 && (
          <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[8.5px] px-1 py-0.5 rounded font-mono">
            {Math.round(trimEnd - trimStart)}s
          </div>
        )}
      </div>

      {/* Duration in reel */}
      <div>
        <div className="flex justify-between text-[9px] text-neutral-500 mb-0.5">
          <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />Duración</span>
          <span className="font-mono text-brand">{itemDuration.toFixed(1)}s</span>
        </div>
        <input
          type="range"
          min={1}
          max={isVideo ? Math.max(1.5, Math.min(8, trimEnd - trimStart)) : 6}
          step={0.25}
          value={itemDuration}
          disabled={disabled}
          onChange={(e) => onUpdate(item.id, { duration: parseFloat(e.target.value) } as any)}
          className="w-full accent-brand h-1"
        />
      </div>

      {/* Video trim */}
      {isVideo && videoDur > 0 && (
        <div>
          <div className="flex justify-between text-[9px] text-neutral-500 mb-0.5">
            <span className="flex items-center gap-1"><Scissors className="w-2.5 h-2.5" />Trim</span>
            <span className="font-mono">{trimStart.toFixed(1)}—{trimEnd.toFixed(1)}</span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <input
              type="range"
              min={0}
              max={Math.max(0, trimEnd - 0.5)}
              step={0.1}
              value={trimStart}
              disabled={disabled}
              onChange={(e) =>
                onUpdate(item.id, { trimStart: parseFloat(e.target.value) } as any)
              }
              className="accent-brand h-1"
            />
            <input
              type="range"
              min={Math.min(videoDur, trimStart + 0.5)}
              max={videoDur}
              step={0.1}
              value={trimEnd}
              disabled={disabled}
              onChange={(e) =>
                onUpdate(item.id, { trimEnd: parseFloat(e.target.value) } as any)
              }
              className="accent-brand h-1"
            />
          </div>
        </div>
      )}

      {/* Motion select */}
      <select
        value={item.motion || 'auto'}
        disabled={disabled}
        onChange={(e) =>
          onUpdate(item.id, { motion: e.target.value === 'auto' ? undefined : (e.target.value as MotionStyle) })
        }
        className="w-full h-6 text-[10px] bg-neutral-50 border border-neutral-200 rounded px-1"
      >
        <option value="auto">Motion auto</option>
        {MOTIONS.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
    </div>
  );
};
