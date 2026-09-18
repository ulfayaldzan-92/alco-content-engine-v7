# SHARED_DATA_CONTRACT.md

# Shared Data Contract

## Tujuan

Menetapkan kontrak data minimum antara `Alco Creative System` sebagai sumber strategi dan `Alco Content Engine` sebagai penerjemah strategi menjadi rencana serta output konten.

Dokumen ini penting agar integrasi tidak berkembang liar dan setiap generator AI bekerja dari konteks strategi yang sama.

## 1. Integration Position

- `Alco Creative System` adalah source of strategy.
- `Alco Content Engine` adalah source of content planning and content draft execution.
- Pada MVP, integrasi resmi dilakukan melalui `JSON import`.
- Alternatif input MVP adalah `paste blueprint` untuk kasus manual.

## 2. Import Modes

### Primary Mode

- `JSON blueprint import`

### Secondary Mode

- `paste blueprint`

### Future Mode

- direct sync / API sync

Future mode tidak menjadi bagian scope implementasi MVP.

## 3. Data Selection Principle

- Tidak semua field dari `Creative System` harus dibawa ke `Content Engine`.
- Hanya field yang relevan untuk perencanaan dan produksi konten yang boleh menjadi bagian kontrak minimum.
- Bila field opsional tidak tersedia, sistem tetap dapat berjalan dengan fallback yang wajar.
- Bila field wajib tidak tersedia, sistem harus menandai blueprint sebagai `incomplete`.

## 4. Required Fields

Field berikut dianggap minimum untuk membentuk `Shared Content Context`.

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

## 5. Optional Fields

Field berikut sangat berguna, tetapi tidak wajib untuk lolos intake MVP.

```json
{
  "content_strategy": {
    "content_pillars": ["string"],
    "campaign_theme": "string",
    "channel_notes": ["string"]
  },
  "offer_details": {
    "price_context": "string",
    "urgency_notes": ["string"],
    "objection_notes": ["string"]
  },
  "brand_rules": {
    "must_say": ["string"],
    "must_avoid": ["string"],
    "visual_direction": ["string"]
  }
}
```

## 6. Shared Content Context

Setelah import berhasil, sistem harus mengubah blueprint menjadi bentuk kerja internal yang stabil.

```json
{
  "project_id": "string",
  "project_name": "string",
  "source": {
    "origin": "creative_system_json",
    "source_version": "string"
  },
  "brand_context": {
    "brand_name": "string",
    "category": "string",
    "brand_summary": "string",
    "brand_voice": "string"
  },
  "audience_context": {
    "primary_audience": "string",
    "pain_points": ["string"],
    "desires": ["string"],
    "objections": ["string"]
  },
  "strategy_context": {
    "positioning": "string",
    "usp": ["string"],
    "main_offer": "string",
    "offer_benefits": ["string"],
    "core_message": "string",
    "copy_direction": ["string"],
    "content_pillars": ["string"]
  },
  "system_flags": {
    "is_complete_for_planning": true,
    "missing_required_fields": []
  }
}
```

Semua generator kalender, brief, caption, dan prompt visual wajib memakai `Shared Content Context` ini sebagai sumber tunggal.

## 7. Validation Rules

- `project_id` wajib ada.
- `brand_name` wajib ada.
- `primary_audience` wajib ada.
- Minimal satu `audience_problem` wajib ada.
- `core_positioning` atau minimal satu `usp` wajib ada.
- `main_offer` wajib ada.
- `core_message` wajib ada.

Jika validasi gagal:

- sistem tidak boleh langsung generate kalender penuh
- sistem harus menampilkan field yang kurang
- user boleh melengkapi manual sebelum lanjut

## 8. Mapping Principles from Creative System

- `niche`, `category`, atau tema usaha dipetakan ke `brand_identity.category`
- `audience`, `pain point`, `desire`, `objection` dipetakan ke `target_audience`
- `positioning`, `usp`, `offer`, dan `angle` dipetakan ke `strategy_context`
- `brand voice` dan `copy direction` dipetakan ke `messaging`
- `content strategy` hanya diambil bila tersedia dan relevan

## 9. Ownership and Update Rules

- Import awal tidak boleh menghilangkan edit manual user yang sudah terjadi pada output konten.
- Jika blueprint sumber berubah, sistem harus menandai output terkait sebagai `OUTDATED`, bukan menimpa otomatis.
- User memutuskan apakah ingin memperbarui kalender penuh, item tertentu, atau tetap memakai output lama.

## 10. MVP Boundaries

Kontrak ini untuk mendukung:

- intake strategi
- pembentukan context internal
- content planning
- daily brief generation
- caption generation
- visual prompt generation
- quality checking

Kontrak ini belum mencakup:

- analytics performa
- live publishing state
- kolaborasi multi-user
- approval state lintas tim
