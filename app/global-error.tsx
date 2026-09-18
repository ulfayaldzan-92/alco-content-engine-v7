'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body className="bg-zinc-950 text-zinc-100 antialiased min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4 text-center">
          <h2 className="text-lg font-bold text-rose-400">Terjadi Kesalahan Sistem Global</h2>
          <p className="text-xs text-zinc-400 font-mono break-words bg-zinc-950 p-3 rounded-xl border border-zinc-800">
            {error?.message || 'Aplikasi mengalami kendala yang tidak terduga.'}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition shadow-md cursor-pointer"
          >
            Muat Ulang Aplikasi
          </button>
        </div>
      </body>
    </html>
  );
}
