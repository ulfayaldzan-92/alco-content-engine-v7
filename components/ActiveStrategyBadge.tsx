'use client';

import React from 'react';
import { SharedContentContext } from '@/lib/content-contract';
import { Sparkles, Target, Layers, FileCode2, Edit3, CheckCircle2, AlertCircle } from 'lucide-react';

interface ActiveStrategyBadgeProps {
  context: SharedContentContext | null;
  onOpenIntakeModal: () => void;
}

export function ActiveStrategyBadge({ context, onOpenIntakeModal }: ActiveStrategyBadgeProps) {
  if (!context) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs mb-6 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="font-bold text-foreground text-sm">Belum Ada Strategy Blueprint</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Impor JSON dari ALCO Creative System agar kalender dikomposisikan secara Strategy-First.
            </p>
          </div>
        </div>
        <button
          onClick={onOpenIntakeModal}
          className="px-4 py-2 bg-primary hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs shrink-0 flex items-center gap-2"
        >
          <Sparkles size={14} />
          Impor Blueprint
        </button>
      </div>
    );
  }

  const { brand_context, audience_context, strategy_context, system_flags } = context;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 md:p-6 mb-6 shadow-xs relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            {context.source.origin === 'campaign_pack_converted' ? (
              <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 text-xs font-semibold flex items-center gap-1.5">
                <FileCode2 size={12} className="text-cyan-600 dark:text-cyan-400" /> Campaign Pack Import
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 text-xs font-semibold flex items-center gap-1.5">
                <FileCode2 size={12} className="text-cyan-600 dark:text-cyan-400" /> ALCO Strategy Blueprint
              </span>
            )}
            <span className="text-sm font-black text-foreground tracking-tight">
              {brand_context.brand_name}
            </span>
            {system_flags.is_complete_for_planning ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-md">
                <CheckCircle2 size={12} /> Strategy Complete
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 font-semibold bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-md">
                Partial Strategy
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-foreground pt-0.5">
            <div className="flex items-center gap-2 truncate bg-muted/60 px-3 py-1.5 rounded-lg border border-border">
              <Target size={13} className="text-primary shrink-0" />
              <span className="text-muted-foreground font-medium">Audience:</span>
              <span className="font-semibold text-foreground truncate">{audience_context.primary_audience}</span>
            </div>
            <div className="flex items-center gap-2 truncate bg-muted/60 px-3 py-1.5 rounded-lg border border-border">
              <Layers size={13} className="text-primary shrink-0" />
              <span className="text-muted-foreground font-medium">Offer:</span>
              <span className="font-semibold text-foreground truncate">{strategy_context.main_offer}</span>
            </div>
            <div className="flex items-center gap-2 truncate bg-muted/60 px-3 py-1.5 rounded-lg border border-border">
              <Sparkles size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-muted-foreground font-medium">Message:</span>
              <span className="font-semibold text-foreground truncate">{strategy_context.core_message}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
          <button
            onClick={onOpenIntakeModal}
            className="px-3.5 py-2 bg-card hover:bg-muted text-foreground font-semibold text-xs rounded-xl border border-border transition shadow-2xs flex items-center gap-1.5"
          >
            <Edit3 size={13} className="text-primary" />
            Ubah Blueprint Strategy
          </button>
        </div>
      </div>
    </div>
  );
}
