'use client';
import React from 'react';
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-rose-400">Terjadi Kendala pada Aplikasi</h2>
        <p className="text-xs text-zinc-400 font-mono break-words bg-zinc-950 p-3 rounded-xl border border-zinc-800">
          {error?.message || 'Terjadi kesalahan sistem yang tidak terduga.'}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition shadow-md"
        >
          Muat Ulang Komponen
        </button>
      </div>
    </div>
  );
}
