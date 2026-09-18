'use client';

import React from 'react';
import { Sparkles, Loader2, Check } from 'lucide-react';

interface CalecoAIRecommendationProps {
  recommendation?: string | Record<string, string>;
  onApply: (field: string, text: string) => void;
  onApplyAll?: (data: Record<string, string>) => void;
  isLoading: boolean;
}

export const CalecoAIRecommendation: React.FC<CalecoAIRecommendationProps> = ({
  recommendation,
  onApply,
  onApplyAll,
  isLoading,
}) => {
  if (!recommendation && !isLoading) return null;

  const isObject = typeof recommendation === 'object' && recommendation !== null;
  const isError = isObject
    ? !!(recommendation as Record<string, string>).error
    : typeof recommendation === 'string' && recommendation.includes('⚠️');
  const errorMessage =
    isObject && (recommendation as Record<string, string>).error
      ? (recommendation as Record<string, string>).error
      : typeof recommendation === 'string' && recommendation.includes('⚠️')
      ? recommendation
      : null;

  return (
    <div
      className={`relative p-4 ${
        isError ? 'bg-rose-50 border-rose-200' : 'bg-[#fffdf8] border-[#e7e0d4]'
      } border rounded-2xl text-xs ${
        isError ? 'text-rose-700' : 'text-stone-700'
      } leading-relaxed group mt-3 shadow-sm`}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className={`flex items-center gap-1.5 ${
            isError ? 'text-rose-600' : 'text-primary'
          } font-semibold text-xs`}
        >
          <Sparkles size={13} />
          {isError ? 'AI System Alert' : 'Rekomendasi AI Caleco'}
        </div>
        {isObject && !isLoading && onApplyAll && !isError && (
          <button
            onClick={() => onApplyAll(recommendation as Record<string, string>)}
            className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg transition-all text-xs font-semibold"
            title="Terapkan Semua Rekomendasi"
          >
            <Check size={12} />
            Terapkan Semua
          </button>
        )}
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-stone-500 py-1">
          <Loader2 size={13} className="animate-spin text-primary" />
          <span>Caleco AI sedang menyusun rekomendasi...</span>
        </div>
      ) : isError ? (
        <div className="space-y-2">
          <p className="text-rose-600 font-medium">{String(errorMessage)}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {isObject ? (
            Object.entries(recommendation as Record<string, string>).map(([field, text]) => (
              <div key={field} className="space-y-1 border-l-2 border-primary/40 pl-3 py-1 bg-[#f6f3ee]/50 rounded-r-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-stone-600">
                    {field.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <button
                    onClick={() => onApply(field, text)}
                    className="p-1 hover:bg-primary/15 text-primary rounded-md transition-all"
                    title={`Terapkan ke ${field}`}
                  >
                    <Check size={12} />
                  </button>
                </div>
                <p className="text-stone-800 text-xs leading-relaxed">
                  {typeof text === 'object' ? JSON.stringify(text) : String(text)}
                </p>
              </div>
            ))
          ) : (
            <div className="flex items-start justify-between gap-3">
              <p className="text-stone-800 flex-grow text-xs leading-relaxed">
                {typeof recommendation === 'object'
                  ? JSON.stringify(recommendation)
                  : String(recommendation)}
              </p>
              <button
                onClick={() => onApply('default', recommendation as string)}
                className="p-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg transition-all shrink-0"
                title="Terapkan Rekomendasi"
              >
                <Check size={13} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
