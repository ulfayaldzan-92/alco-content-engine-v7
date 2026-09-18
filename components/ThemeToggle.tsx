'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, ChevronDown, Check } from 'lucide-react';
import { useTheme, ThemeMode } from '@/lib/theme-provider';

interface ThemeToggleProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export default function ThemeToggle({
  className = '',
  variant = 'compact',
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options: { mode: ThemeMode; label: string; icon: React.ElementType }[] = [
    { mode: 'system', label: 'System', icon: Laptop },
    { mode: 'light', label: 'Light', icon: Sun },
    { mode: 'dark', label: 'Dark', icon: Moon },
  ];

  const currentIcon =
    theme === 'system'
      ? Laptop
      : theme === 'dark'
      ? Moon
      : Sun;
  const CurrentIconComponent = currentIcon;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-secondary/80 hover:bg-muted text-foreground text-xs font-semibold transition-all shadow-2xs cursor-pointer"
        title={`Tema: ${theme.toUpperCase()} (${resolvedTheme})`}
        aria-label="Ubah Tema Tampilan"
        aria-expanded={isOpen}
      >
        <CurrentIconComponent size={14} className="text-primary dark:text-cyan-400 shrink-0" />
        <span className="capitalize text-[11px] font-bold">
          {variant === 'full' ? `Theme: ${theme}` : theme}
        </span>
        <ChevronDown size={12} className={`text-muted-foreground transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-36 rounded-xl border border-border bg-card p-1 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Pilih Tema
          </div>
          <div className="space-y-0.5">
            {options.map(({ mode, label, icon: Icon }) => {
              const isSelected = theme === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setTheme(mode);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary/10 text-primary dark:bg-teal-500/15 dark:text-teal-300 font-bold'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={13} className={isSelected ? 'text-primary dark:text-teal-400' : 'text-muted-foreground'} />
                    <span>{label}</span>
                  </div>
                  {isSelected && <Check size={12} className="text-primary dark:text-teal-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
