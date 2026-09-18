# AI Studio Prompt 2026-08-08

Gunakan prompt ini saat Anda upload source berikutnya ke Google AI Studio.

## Prompt

Anda sedang mengedit aplikasi `ALCO Content Engine`, yaitu aplikasi tahap kedua setelah `ALCO Creative System`.

Jangan perlakukan app ini sebagai generator caption umum atau kalender konten generik.

## Product Position

- `ALCO Creative System` = sumber strategi awal
- `ALCO Content Engine` = penerjemah strategi menjadi kalender konten, brief harian, caption, dan prompt aset

## Build Direction

Refactor app yang ada agar bergerak ke arah `strategy-first content engine`.

Prioritas implementasi:

1. Tambahkan `strategy intake` screen
   - user bisa `import JSON blueprint`
   - user bisa `paste blueprint`
   - tampilkan status field wajib yang lengkap / kurang

2. Bentuk `Shared Content Context`
   - context ini harus menjadi sumber tunggal untuk semua generator
   - jangan minta ulang data strategi yang sudah tersedia

3. Ubah generator kalender
   - input utama harus bisa memakai blueprint strategi
   - output tiap item wajib punya:
     - funnel stage
     - objective
     - headline
     - body
     - caption
     - format
     - visual prompt
     - strategic reason

4. Pertahankan flow lama sejauh masih berguna
   - jangan rusak fitur edit item
   - jangan rusak regenerate item
   - jangan hapus download/export yang sudah ada

5. Jaga business rules berikut
   - user owns the output
   - AI tidak boleh menimpa edit manual secara otomatis
   - regenerate harus selektif
   - setiap item harus punya tujuan funnel yang jelas
   - output harus relevan untuk Instagram dan Facebook

## Required Data Contract

Minimal blueprint yang harus dipahami app:

```json
{
  "project_id": "string",
  "project_name": "string",
  "brand_identity": {
    "brand_name": "string",
    "brand_summary": "string",
    "category": "string"
  },
  "target_audience": {
    "primary_audience": "string",
    "audience_problem": ["string"],
    "audience_desire": ["string"]
  },
  "positioning": {
    "core_positioning": "string",
    "usp": ["string"]
  },
  "offer": {
    "main_offer": "string",
    "offer_type": "string",
    "offer_benefits": ["string"]
  },
  "messaging": {
    "core_message": "string",
    "brand_voice": "string",
    "copy_direction": ["string"]
  }
}
```

## Code Constraints

- Keep Next.js App Router
- Keep TypeScript
- Prefer adding types and small focused components
- Do not rewrite the whole app from scratch
- Preserve working parts and refactor incrementally

## Deliverables Expected From You

Saat mengedit source, hasilkan:

- strategy intake UI
- shared content context model
- improved calendar generator contract
- stronger item schema
- maintainable local types for content entities

Jika harus memilih, prioritaskan correctness of product direction over cosmetic UI changes.
