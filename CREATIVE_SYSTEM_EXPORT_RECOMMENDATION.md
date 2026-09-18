# Creative System Export Recommendation

## Tujuan

Menentukan output baru yang sebaiknya ditambahkan di `Alco Creative System` agar integrasi ke `Alco Content Engine` menjadi resmi, stabil, dan tidak bergantung pada heuristik mapping.

## Rekomendasi Utama

Tambahkan satu output baru:

- `content_engine_blueprint.json`

Output ini berbeda dari:

- `campaign pack`
- `meta ads pack`
- `creative assets pack`

Output ini harus menjadi:

- `strategy export khusus untuk app kedua`

## Kenapa Perlu Output Baru

Karena `campaign pack` saat ini:

- terlalu spesifik ke eksekusi ads
- bukan object strategy yang bersih
- memaksa `Content Engine` menebak banyak field implisit

Sedangkan `Content Engine` membutuhkan object yang lebih stabil seperti:

- identitas brand
- audience utama
- pain points
- positioning
- offer
- core message
- copy direction
- content pillars

## Struktur Yang Direkomendasikan

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
    "audience_desire": ["string"],
    "objections": ["string"]
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
  },
  "content_strategy": {
    "content_pillars": ["string"],
    "campaign_theme": "string",
    "channel_notes": ["string"]
  }
}
```

## Prinsip Penting

- `Creative System` tetap boleh menghasilkan `campaign pack`
- tetapi `Content Engine` sebaiknya tidak bergantung pada `campaign pack` sebagai sumber utama
- `content_engine_blueprint.json` harus menjadi export resmi lintas app

## Keputusan Praktis

### Sekarang

- perbaiki `Content Engine` agar bisa membaca `campaign pack`

### Setelah itu

- tambahkan export `content_engine_blueprint.json` di `Creative System`

### Hasil Akhir Yang Diinginkan

- app 1 menghasilkan blueprint strategy resmi
- app 2 langsung mengonsumsi blueprint itu tanpa perlu tebakan heuristik
