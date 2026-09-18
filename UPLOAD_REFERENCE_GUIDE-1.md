# Upload Reference Guide

Untuk upload berkala ke Google AI Studio, kirim file referensi dalam urutan ini:

## Wajib

1. `Documentation-v1.0.0/01_Product/PRODUCT_SPECIFICATION.md`
2. `Documentation-v1.0.0/01_Product/BUSINESS_RULES.md`
3. `Documentation-v1.0.0/02_AI/AI_WORKFLOW.md`
4. `Documentation-v1.0.0/03_System/SHARED_DATA_CONTRACT.md`
5. `Documentation-v1.0.0/04_Implementation/AI_STUDIO_PROMPT_2026-08-08.md`

## Source code yang sebaiknya ikut diupload

1. `.tmp_ai_studio_app/app/page.tsx`
2. `.tmp_ai_studio_app/CalendarView.tsx`
3. `.tmp_ai_studio_app/app/api/gemini/generate-calendar/route.ts`
4. `.tmp_ai_studio_app/app/api/gemini/regenerate-item/route.ts`
5. `.tmp_ai_studio_app/lib/content-contract.ts`

## Kenapa file ini

- `app/page.tsx`
  Menunjukkan state utama dan flow aplikasi.
- `CalendarView.tsx`
  Menunjukkan UI workflow, edit item, dan struktur data yang masih dominan.
- `generate-calendar/route.ts`
  Menentukan apakah AI membangun output sesuai dokumen atau tidak.
- `regenerate-item/route.ts`
  Menentukan apakah aturan selective regenerate dipatuhi.
- `content-contract.ts`
  Menjadi referensi type dan arah kontrak produk yang lebih benar.
