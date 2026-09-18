import React from 'react';
import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h1 className="text-xl font-bold text-zinc-100">404 - Halaman Tidak Ditemukan</h1>
        <p className="text-xs text-zinc-400">
          Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition shadow-md"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
