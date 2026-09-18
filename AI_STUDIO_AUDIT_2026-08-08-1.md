# AI Studio Audit 2026-08-08

## Tujuan

Audit awal source app hasil Google AI Studio terhadap dokumentasi resmi `Alco Content Engine`.

## Ringkasan

Source saat ini sudah bisa disebut benih app, tetapi masih lebih dekat ke:

- generator kalender konten berbasis parameter manual

dan belum cukup dekat ke:

- aplikasi tahap kedua setelah `Alco Creative System`
- strategy-driven content engine
- sistem yang memakai blueprint strategi sebagai sumber utama

## Temuan Utama

### 1. Input produk belum mengikuti kontrak data

App saat ini masih berpusat pada field manual seperti:

- `coreTopic`
- `gender`
- `ageRange`
- `ratio`
- `selectedFormula`
- `selectedVoices`

Masalah:

- belum ada intake resmi `strategy blueprint`
- belum ada `Shared Content Context`
- belum ada validasi field wajib dari hasil `Creative System`

### 2. Generator kalender masih terlalu generik

Route `generate-calendar` sebelumnya membentuk prompt yang kuat di copywriting, tetapi belum cukup kuat di:

- alignment terhadap positioning
- alignment terhadap offer
- alasan funnel
- objective per item
- hubungan terhadap strategi awal

### 3. Kontrak output masih campuran antara spreadsheet lama dan content engine baru

Schema output masih memakai field lama seperti:

- `jenis`
- `tujuan`
- `referensi`
- `keterangan`

Ini masih bisa dipakai, tetapi perlu secara bertahap diposisikan sebagai representasi UI dari konsep yang lebih formal:

- `funnel_stage`
- `daily_objective`
- `source_dependency`
- `strategic_reason`

### 4. UI masih menyiratkan app mandiri, bukan aplikasi tahap kedua

Halaman utama belum menunjukkan:

- import JSON dari `Creative System`
- status blueprint lengkap / tidak lengkap
- penanda bahwa kalender lahir dari strategi yang sudah ada

### 5. Regenerate item belum cukup menjaga aturan bisnis

Regenerasi sudah ada, tetapi semula belum tegas:

- field mana yang harus dipertahankan
- bagaimana menjaga alasan funnel
- bagaimana menjaga objective harian

## Perbaikan Lokal yang Sudah Dilakukan

### Source app

- menambahkan `lib/content-contract.ts`
- memperkaya kontrak request `generate-calendar`
- menambahkan dukungan `planningHorizon`
- menambahkan dukungan `channels`
- menambahkan dukungan `strategyBlueprint`
- memperkuat prompt generator agar strategy-first, funnel-aware, dan sales-oriented
- memperketat schema output agar `tujuan` dan `keterangan` wajib
- memperkuat aturan regenerate item agar tidak sembarang mengubah date, funnel, dan format

## Prioritas Lanjutan

### Prioritas 1

- buat layar `strategy intake`
- terima JSON blueprint atau paste blueprint
- validasi required fields

### Prioritas 2

- bentuk `Shared Content Context`
- jadikan context itu sumber tunggal semua generator

### Prioritas 3

- ubah UI kalender agar jelas menampilkan:
  - funnel stage
  - objective
  - strategic reason
  - CTA strength

### Prioritas 4

- tambahkan generator detail harian yang lebih formal:
  - brief
  - caption
  - image prompt
  - carousel prompt
  - video prompt

## File yang Layak Dijadikan Referensi Upload ke Google AI Studio

- `Documentation-v1.0.0/01_Product/PRODUCT_SPECIFICATION.md`
- `Documentation-v1.0.0/01_Product/BUSINESS_RULES.md`
- `Documentation-v1.0.0/02_AI/AI_WORKFLOW.md`
- `Documentation-v1.0.0/03_System/SHARED_DATA_CONTRACT.md`
- `.tmp_ai_studio_app/app/api/gemini/generate-calendar/route.ts`
- `.tmp_ai_studio_app/app/api/gemini/regenerate-item/route.ts`
- `.tmp_ai_studio_app/lib/content-contract.ts`
