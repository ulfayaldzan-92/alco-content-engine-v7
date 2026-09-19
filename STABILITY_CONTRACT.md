# STABILITY CONTRACT

Dokumen ini memuat standar stabilitas teknis dan integritas konfigurasi aplikasi yang wajib dipatuhi dalam seluruh siklus pengembangan, refactoring, dan deployment.

---

## Aturan & Kontrak Stabilitas Wajib

1. **`app/global-error.tsx` Tidak Boleh Dihapus**
   - File `app/global-error.tsx` merupakan root fallback error boundary wajib untuk Next.js App Router.
   - Harus mendefinisikan elemen root `<html>` dan `<body>` murni (bukan komponen `next/document`).
   - Tidak boleh dihapus atau dipindahkan.

2. **`next.config.ts` Wajib Mempertahankan `allowedDevOrigins`**
   - Konfigurasi `allowedDevOrigins` (termasuk `*.run.app`, `*.googleusercontent.com`, `aistudio.google.com`) wajib dipertahankan untuk menjamin fungsionalitas preview iframe dan cross-origin dev environment.

3. **Batasan Konfigurasi Build Next.js**
   - Dilarang menambahkan atau menggunakan:
     - `distDir`
     - `.next-build`
     - `output: "standalone"`
     - `assetPrefix`
     - `basePath`
   - Output direktori build harus selalu berada pada default Next.js (`.next`).

4. **Integritas Script `package.json`**
   - Script lifecycle wajib dijaga:
     - `build`: `"next build"`
     - `start`: `"next start"`
   - Tidak boleh mengubah atau mengganti target script `build` dan `start` dengan custom runner yang memutus pipeline standar platform.

5. **Ketersediaan Fitur BYO API Key**
   - Fitur **BYO Gemini API Key** (`lib/client-gemini-key.ts` / modal UI) tidak boleh dihapus atau dinonaktifkan.
   - Aplikasi harus selalu mendukung input API key langsung dari pengguna maupun fallback environment server.

6. **Prosedur Verifikasi Wajib**
   - Setelah melakukan perubahan apa pun pada basis kode, wajib menjalankan seluruh pipeline verifikasi:
     - **Typecheck**: `npm run typecheck` (`tsc --noEmit`)
     - **Lint**: `npm run lint` (`eslint .`)
     - **Build**: `npm run build` (`next build`)
