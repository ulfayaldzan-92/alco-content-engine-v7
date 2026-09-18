'use client';

import React from 'react';
import { format, isSameDay } from 'date-fns';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Layers, Zap } from 'lucide-react';
import { ContentItem } from './types';
import { trackActivity } from '@/lib/activity';
import { getProductionStatus, getProductionStatusBadge } from '@/lib/content-contract';
import { parseStrictFunnelStage } from '@/lib/funnel-rules';

const safeCopyToClipboard = async (text: string) => {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Clipboard write failed:', error);
    return false;
  }
};

export const SortableItem: React.FC<{ item: ContentItem; onClick?: () => void; isGrowth?: boolean }> = ({
  item,
  onClick,
  isGrowth,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: isGrowth ? `${item.no}_growth` : item.no });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
  };

  const funnelStage = parseStrictFunnelStage(item.jenis);
  const isTofu = funnelStage === 'TOFU';
  const isMofu = funnelStage === 'MOFU';
  const prodStatus = getProductionStatus(item);
  const statusBadge = getProductionStatusBadge(prodStatus);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) onClick?.();
      }}
      className={`p-2 mb-1.5 rounded-xl border text-xs transition-all cursor-pointer group relative shadow-2xs ${
        isDragging
          ? 'opacity-60 scale-95 border-primary bg-primary/10 z-[100]'
          : isTofu
          ? 'bg-sky-50/70 dark:bg-sky-950/30 border-sky-200/80 dark:border-sky-800/40 hover:border-sky-400'
          : isMofu
          ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/40 hover:border-amber-400'
          : 'bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/30 hover:border-primary/40'
      }`}
    >
      {/* 1. FUNNEL BADGE & GROWTH BADGE + DRAG GRIP */}
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1 flex-wrap min-w-0">
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              isTofu
                ? 'text-sky-800 bg-sky-100/90 dark:text-sky-300 dark:bg-sky-900/60'
                : isMofu
                ? 'text-amber-800 bg-amber-100/90 dark:text-amber-300 dark:bg-amber-900/60'
                : 'text-primary bg-primary/15 dark:text-cyan-300 dark:bg-cyan-950/60'
            }`}
          >
            {(item.jenis || '').split(' ')[0]}
          </span>
          {isGrowth && (
            <span className="px-1 py-0.5 bg-[#b7791f]/15 text-[#b7791f] dark:text-amber-400 text-[9px] font-semibold rounded border border-[#b7791f]/30">
              Growth
            </span>
          )}
        </div>
        <div className="text-stone-400 dark:text-slate-500 group-hover:text-stone-600 dark:group-hover:text-slate-300 p-0.5 transition-colors shrink-0">
          <GripVertical size={12} />
        </div>
      </div>

      {/* 2. HEADLINE */}
      <div className="font-bold text-[#1f2933] dark:text-slate-100 line-clamp-2 leading-snug mb-1 text-xs">
        {item.headline}
      </div>

      {/* 3. FORMAT / PRIMARY ASSET */}
      <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-slate-400 font-medium">
        <Layers size={11} className="text-stone-400 dark:text-slate-500 shrink-0" />
        <span className="truncate">{item.format}</span>
        {item.primaryAssetType && (
          <>
            <span className="text-stone-300 dark:text-slate-600">•</span>
            <span className="text-primary dark:text-cyan-400 font-bold truncate">{item.primaryAssetType}</span>
          </>
        )}
      </div>

      {/* 4. PRODUCTION STATUS BADGE */}
      <div className="mt-1.5 pt-1.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${statusBadge.bgClass}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotClass}`} />
          <span>{statusBadge.label}</span>
        </span>
      </div>
    </div>
  );
};

export const CalendarDay: React.FC<{
  day: Date;
  items: ContentItem[];
  isCurrentMonth: boolean;
  onClick?: () => void;
  onEdit?: (item: ContentItem) => void;
  onSendToCalcer?: (brief: string) => void;
  loadingColor?: string;
  showStartPrompt?: boolean;
  resumePrompt?: boolean;
  showConfigButton?: boolean;
  todayDate?: Date | null;
  isCompact?: boolean;
}> = ({
  day,
  items,
  isCurrentMonth,
  onClick,
  onEdit,
  onSendToCalcer,
  loadingColor,
  showStartPrompt,
  resumePrompt,
  showConfigButton,
  todayDate,
  isCompact = false,
}) => {
  const { setNodeRef } = useSortable({ id: format(day, 'yyyy-MM-dd') });

  const totalItems = items.length;
  const isToday = todayDate ? isSameDay(day, todayDate) : false;

  const handleSendToCalcer = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allItems = items;
    if (allItems.length === 0) return;

    const briefText = allItems
      .map((item) => {
        let formatInfo = `Format: ${item.format}`;
        if (item.primaryAssetType) {
          formatInfo += `\nPrimary Asset: ${item.primaryAssetType}`;
          if (item.assetTypeReason) formatInfo += `\nAsset Reason: ${item.assetTypeReason}`;
        }
        return `[${item.jenis}] ${item.headline}\n\nBody:\n${item.body}\n\nCaption:\n${item.caption}\n\n${formatInfo}\nVisual: ${item.visual}\nKeterangan: ${item.keterangan}`;
      })
      .join('\n\n---\n\n');

    void (async () => {
      const copied = await safeCopyToClipboard(briefText);
      if (copied) {
        trackActivity('Copy Data', `Copied ${allItems.length} items to clipboard via Calcer`);
      }
      onSendToCalcer?.(briefText);
    })();
  };

  return (
    <div
      ref={setNodeRef}
      onClick={() => {
        if (totalItems > 0) {
          onEdit?.(items[0]);
        } else {
          onClick?.();
        }
      }}
      className={`border-r last:border-r-0 border-b border-[#e7e0d4] dark:border-slate-800 transition-all relative ${
        isCompact ? 'min-h-[48px] md:min-h-[56px] p-1.5 md:p-2' : 'min-h-[90px] md:min-h-[130px] p-2 md:p-2.5'
      } ${
        !isCurrentMonth
          ? 'bg-[#f6f3ee]/40 dark:bg-slate-950/40 text-stone-400 dark:text-slate-600 opacity-60'
          : 'bg-[#fffdf8] dark:bg-slate-900'
      } ${
        isToday
          ? 'ring-2 ring-inset ring-primary/40 dark:ring-cyan-500/50 bg-primary/5 dark:bg-cyan-950/20'
          : ''
      } ${
        onClick || totalItems > 0 ? 'cursor-pointer hover:bg-stone-50/80 dark:hover:bg-slate-800/50' : ''
      } ${
        showStartPrompt || resumePrompt || showConfigButton
          ? 'ring-2 ring-primary/40 dark:ring-cyan-500/50 z-10 bg-primary/5 dark:bg-cyan-950/20'
          : ''
      }`}
      style={loadingColor ? { backgroundColor: loadingColor } : {}}
    >
      <div className={`flex justify-between items-center ${isCompact ? 'mb-0' : 'mb-1.5 md:mb-2'}`}>
        <div className="flex items-center gap-1.5">
          <span
            className={`text-xs md:text-sm font-semibold ${
              isToday
                ? 'text-primary dark:text-cyan-400 font-extrabold'
                : !isCurrentMonth
                ? 'text-stone-400 dark:text-slate-600'
                : 'text-stone-600 dark:text-slate-300'
            }`}
          >
            {format(day, 'd')}
          </span>
          {isToday && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-cyan-400 inline-block" title="Hari Ini" />
          )}
        </div>
        {totalItems > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleSendToCalcer}
              className="p-1 hover:bg-primary/15 text-stone-500 dark:text-slate-400 hover:text-primary dark:hover:text-cyan-300 rounded-md transition-all"
              title="Copy & Send to Calcer"
            >
              <Zap size={12} />
            </button>
            <span className="text-[10px] md:text-xs font-semibold text-stone-500 dark:text-slate-400">
              {totalItems} <span className="hidden sm:inline">Posts</span>
            </span>
          </div>
        )}
      </div>

      {(showStartPrompt || resumePrompt || showConfigButton) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-1">
          <div className="text-stone-500 dark:text-slate-400 text-xs font-medium text-center px-2 truncate">
            {resumePrompt ? (
              <>
                Lanjutkan <span className="text-primary dark:text-cyan-400 font-bold">Strategy</span>
              </>
            ) : showConfigButton ? (
              <>
                Ubah <span className="text-primary dark:text-cyan-400 font-bold">Konfigurasi</span>
              </>
            ) : (
              <>
                Mulai <span className="text-primary dark:text-cyan-400 font-bold">Strategy</span>
              </>
            )}
          </div>
        </div>
      )}

      {!isCompact && (
        <div className="space-y-2">
          {items.length > 0 && (
            <div className="space-y-1">
              <SortableContext items={items.map((i) => i.no)} strategy={verticalListSortingStrategy}>
                {items.map((item) => (
                  <SortableItem key={item.no} item={item} onClick={() => onEdit?.(item)} />
                ))}
              </SortableContext>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

