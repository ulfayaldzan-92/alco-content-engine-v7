'use client';

import React from 'react';
import { ExternalLink, Sparkles, X } from 'lucide-react';

interface PromptNextStepLinkItem {
  label: string;
  url: string;
  primary?: boolean;
}

interface PromptNextStepLinksProps {
  show?: boolean;
  onDismiss?: () => void;
  className?: string;
  title?: string;
  description?: string;
  links?: PromptNextStepLinkItem[];
}

export const PromptNextStepLinks: React.FC<PromptNextStepLinksProps> = ({
  show,
  onDismiss,
  className = '',
  title = 'Langkah berikutnya',
  description = 'Prompt sudah tersalin. Buka salah satu AI berikut, lalu paste prompt.',
  links,
}) => {
  if (!show) return null;

  const defaultLinks: PromptNextStepLinkItem[] = [
    {
      label: 'Buka Google Gemini',
      url: 'https://gemini.google.com/app',
      primary: true,
    },
    {
      label: 'Buka ChatGPT',
      url: 'https://chatgpt.com/',
      primary: false,
    },
  ];

  const activeLinks = links && links.length > 0 ? links : defaultLinks;

  return (
    <div
      className={`p-4 sm:p-5 bg-primary/5 border border-primary/20 rounded-2xl shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 text-stone-800 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-bold text-sm text-primary">
            <Sparkles size={16} className="text-primary shrink-0" />
            <span>{title}</span>
          </div>
          <p className="text-xs text-stone-700 font-medium leading-relaxed">
            {description}
          </p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="px-2.5 py-1 text-[11px] font-semibold text-stone-500 hover:text-stone-800 bg-white/90 hover:bg-white border border-stone-200 rounded-lg transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
            title="Sembunyikan panel langkah berikutnya"
          >
            <X size={12} />
            <span>Sembunyikan</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
        {activeLinks.map((link) => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-4 py-2 font-bold text-xs rounded-xl transition-all shadow-xs active:scale-[0.98] cursor-pointer ${
              link.primary
                ? 'bg-primary hover:bg-blue-700 text-white'
                : 'bg-[#1f2933] hover:bg-stone-900 text-white'
            }`}
          >
            <span>{link.label}</span>
            <ExternalLink size={13} />
          </a>
        ))}
      </div>
    </div>
  );
};

export default PromptNextStepLinks;
