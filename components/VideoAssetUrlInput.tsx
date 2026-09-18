'use client';

import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, AlertTriangle, CheckCircle2, XCircle, ExternalLink, HelpCircle } from 'lucide-react';

export interface VideoAssetUrlInputProps {
  id?: string;
  label: string;
  badgeText?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  aspectRatio?: '9:16' | '16:9' | '1:1' | 'auto';
  helperText?: string;
  isCharacterUrl?: boolean;
}

export function validatePublicImageUrl(url?: string): { isValid: boolean; error?: string } {
  if (!url || !url.trim()) {
    return { isValid: true };
  }

  const trimmed = url.trim().toLowerCase();

  if (trimmed.startsWith('blob:')) {
    return {
      isValid: false,
      error: 'URL diawali blob: (lokal browser). Wajib gunakan URL publik https:// agar dapat diakses JSON2Video.',
    };
  }

  if (trimmed.startsWith('data:')) {
    return {
      isValid: false,
      error: 'Format data: (Base64) tidak didukung oleh API render video. Gunakan URL publik https://.',
    };
  }

  if (
    trimmed.startsWith('file:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../')
  ) {
    return {
      isValid: false,
      error: 'Path file lokal tidak didukung. Wajib gunakan URL publik https:// yang dapat diakses publik dari internet.',
    };
  }

  if (!trimmed.startsWith('https://')) {
    return {
      isValid: false,
      error: 'URL wajib diawali https:// publik (bukan http:// tidak terenkripsi atau link lokal).',
    };
  }

  return { isValid: true };
}

export const VideoAssetUrlInput: React.FC<VideoAssetUrlInputProps> = ({
  id,
  label,
  badgeText,
  value,
  onChange,
  placeholder = 'https://example.com/image.jpg',
  aspectRatio = '9:16',
  helperText,
  isCharacterUrl = false,
}) => {
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  const trimmedValue = (value || '').trim();
  const validation = validatePublicImageUrl(trimmedValue);

  useEffect(() => {
    setImageLoadError(false);
    setImageLoaded(false);
  }, [trimmedValue]);

  const hasValue = Boolean(trimmedValue);
  const isSchemeValid = validation.isValid;

  return (
    <div id={id} className="space-y-2.5 bg-[#f6f3ee]/60 p-4 rounded-xl border border-[#e7e0d4]">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-[#1f2933] block">
          {label}
        </label>
        {badgeText && (
          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 dark:text-cyan-300">
            {badgeText}
          </span>
        )}
      </div>

      <div className="relative">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-xs text-[#1f2933] placeholder-[#627d98]/50 focus:outline-none transition-all ${
            !isSchemeValid || (hasValue && imageLoadError)
              ? 'border-rose-400 focus:border-rose-500 text-rose-900 bg-rose-50/20'
              : hasValue && imageLoaded
              ? 'border-emerald-400 focus:border-emerald-500 text-[#1f2933]'
              : 'border-[#e7e0d4] focus:border-primary'
          }`}
        />
        {hasValue && (
          <div className="absolute right-3 top-3 flex items-center gap-1">
            {!isSchemeValid || imageLoadError ? (
              <XCircle size={15} className="text-rose-500" />
            ) : imageLoaded ? (
              <CheckCircle2 size={15} className="text-emerald-600" />
            ) : null}
          </div>
        )}
      </div>

      {/* Helper and Requirement Note */}
      {helperText && (
        <p className="text-xs text-[#627d98] leading-normal">
          {helperText}
        </p>
      )}

      {/* URL Validation Scheme Error */}
      {!isSchemeValid && (
        <div className="flex items-start gap-1.5 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
          <XCircle size={14} className="shrink-0 mt-0.5 text-rose-600" />
          <span>{validation.error}</span>
        </div>
      )}

      {/* Image Preview & Load Status */}
      {hasValue && isSchemeValid && (
        <div className="pt-1.5">
          <div className="flex items-start gap-3 p-3 bg-[#fffdf8] border border-[#e7e0d4] rounded-xl shadow-xs">
            {/* Small Thumbnail Preview */}
            <div
              className={`relative overflow-hidden rounded-lg bg-[#f6f3ee] border shrink-0 flex items-center justify-center ${
                aspectRatio === '9:16'
                  ? 'w-14 h-24'
                  : aspectRatio === '16:9'
                  ? 'w-24 h-14'
                  : 'w-16 h-16'
              } ${
                imageLoadError
                  ? 'border-rose-200 bg-rose-50'
                  : imageLoaded
                  ? 'border-emerald-200'
                  : 'border-[#e7e0d4]'
              }`}
            >
              {/* Image element with onLoad and onError */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={trimmedValue}
                alt="Preview Asset"
                className={`w-full h-full object-cover transition-opacity duration-200 ${
                  imageLoaded && !imageLoadError ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => {
                  setImageLoaded(true);
                  setImageLoadError(false);
                }}
                onError={() => {
                  setImageLoadError(true);
                  setImageLoaded(false);
                }}
              />

              {/* Placeholder/Loading State */}
              {!imageLoaded && !imageLoadError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center bg-[#f6f3ee] text-[#627d98]">
                  <ImageIcon size={14} className="animate-pulse" />
                  <span className="text-[9px] mt-1">Memuat...</span>
                </div>
              )}

              {/* Load Failure Placeholder */}
              {imageLoadError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center bg-rose-50 text-rose-600">
                  <XCircle size={16} />
                  <span className="text-[8px] mt-0.5 font-bold uppercase">Gagal</span>
                </div>
              )}
            </div>

            {/* Preview Status & Action */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#627d98]">
                  Preview Aset
                </span>
                <a
                  href={trimmedValue}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  Buka Link <ExternalLink size={10} />
                </a>
              </div>

              {imageLoadError ? (
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-rose-600">
                    URL gambar tidak bisa diakses publik oleh JSON2Video.
                  </p>
                  <p className="text-xs text-[#627d98] leading-tight">
                    Pastikan URL adalah link langsung file gambar (jpg/png) yang bisa dibuka tanpa login & mengizinkan akses publik.
                  </p>
                </div>
              ) : imageLoaded ? (
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-600" /> URL Publik Terverifikasi
                  </p>
                  <p className="text-xs text-[#627d98] truncate font-mono">
                    {trimmedValue}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[#627d98] italic">
                  Sedang memverifikasi keterjangkauan URL gambar...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prompt guidance if character URL is empty */}
      {!hasValue && isCharacterUrl && (
        <div className="flex items-start gap-1.5 p-2.5 bg-[#f6f3ee] border border-[#e7e0d4] rounded-lg text-[#627d98] text-xs">
          <HelpCircle size={14} className="shrink-0 mt-0.5 text-primary" />
          <span>
            Wajib berupa URL publik HTTPS (contoh dari Cloudinary, Supabase Storage, atau Imgur). Format <code className="text-[#1f2933] font-semibold">blob:</code> atau <code className="text-[#1f2933] font-semibold">data:</code> akan ditolak.
          </span>
        </div>
      )}
    </div>
  );
};
