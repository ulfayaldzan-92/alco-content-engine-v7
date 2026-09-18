# Creative System To Content Engine Mapping

## Tujuan

Dokumen ini menjelaskan bagaimana JSON output dari `Alco Creative System` dipetakan ke kontrak data `Alco Content Engine`.

Kasus referensi saat ini:

- file `alco_creative_system_meta_ads_campaign_pack (1).json`

Kesimpulan utama:

- file ini adalah `campaign pack` turunan
- file ini bukan `master strategy blueprint`
- karena itu, `Alco Content Engine` tidak boleh berharap field-field strategy muncul dengan nama yang sama seperti kontrak final

## Rekomendasi Arsitektur

### Jangka Pendek

- `Alco Content Engine` harus bisa menerima JSON `campaign pack` seperti ini
- app kedua melakukan mapping internal ke `Shared Content Context`

### Jangka Menengah

- `Alco Creative System` menambahkan output resmi baru bernama `content_engine_blueprint.json`
- output baru ini menjadi sumber strategi resmi untuk `Alco Content Engine`

### Jangka Panjang

- `Creative System` dapat mengeluarkan dua jenis output:
  - `strategy blueprint`
  - `campaign pack`
- `Content Engine` memakai `strategy blueprint` sebagai input utama
- `campaign pack` tetap dipakai sebagai referensi kreatif tambahan

## Pemetaan Dari JSON Saat Ini

### 1. Project Identity

#### Source candidates

- `campaignName`
- `campaign_name`

#### Target mapping

```json
{
  "project_name": "Meta Ads - Alco Creative System",
  "project_id": "derived_or_generated_id"
}
```

#### Notes

- `project_id` belum tersedia eksplisit
- untuk sementara dapat di-generate oleh `Content Engine`

### 2. Brand Identity

#### Source candidates

- `campaignName`
- `campaign_name`
- isi naratif dari `image_ads[].final_prompt`
- isi `creative_strategy.value_proposition`

#### Target mapping

```json
{
  "brand_identity": {
    "brand_name": "Alco Creative System",
    "brand_summary": "Solusi software dan sistem untuk membantu penjual produk digital menyiapkan campaign Meta Ads dengan lebih cepat dan lebih terstruktur.",
    "category": "Software / Mini Web Tool"
  }
}
```

#### Notes

- `brand_name` perlu diturunkan dari nama campaign dan narasi produk
- `category` paling masuk akal diambil dari `targeting.interests[0]`
- `brand_summary` harus diringkas dari narasi produk, belum ada field eksplisit

### 3. Target Audience

#### Source candidates

- `targeting.ageMin`
- `targeting.ageMax`
- `targeting.interests`
- `assumptions`
- `image_ads[].final_prompt`
- `video_ads[].persona`
- `creative_strategy.emotional_trigger`

#### Target mapping

```json
{
  "target_audience": {
    "primary_audience": "Digital marketer pemula dan penjual produk digital di Indonesia usia 21-45 tahun",
    "audience_problem": [
      "Kesulitan menulis copy iklan Meta Ads",
      "Takut boncos karena modal iklan terbatas",
      "Tidak punya struktur campaign yang jelas"
    ],
    "audience_desire": [
      "Bisa menyiapkan campaign Meta Ads lebih cepat",
      "Mendapat hasil penjualan dengan struktur iklan yang lebih rapi",
      "Mengurangi risiko salah langkah dalam campaign"
    ],
    "objections": [
      "Apakah solusi ini mudah dipakai oleh pemula?",
      "Apakah hasilnya cocok untuk niche bisnis saya?"
    ]
  }
}
```

#### Notes

- `primary_audience` tidak ada sebagai field langsung, harus diringkas
- `audience_problem` tersebar di hook, prompt aset, dan emotional trigger
- `audience_desire` bisa diambil dari manfaat dan asumsi

### 4. Positioning

#### Source candidates

- `creative_strategy.value_proposition`
- `creative_strategy.primary_angle`
- `creative_strategy.visual_hook`
- `copy_assets.headlines`

#### Target mapping

```json
{
  "positioning": {
    "core_positioning": "Sistem praktis untuk membantu penjual produk digital menyiapkan campaign Meta Ads lebih cepat tanpa pendekatan tebak-tebakan.",
    "usp": [
      "Menyiapkan campaign Meta Ads dalam waktu singkat",
      "Membantu menyusun copy dan creative assets siap pakai",
      "Mengurangi rasa bingung dan takut boncos saat mulai beriklan"
    ]
  }
}
```

#### Notes

- `core_positioning` belum tersedia langsung
- `value_proposition` adalah kandidat terbaik untuk field ini
- `usp` harus diringkas dari manfaat dan narasi produk

### 5. Offer

#### Source candidates

- `image_ads[].final_prompt`
- `image_ads[].cta`
- `copy_assets.ctas`
- `budget_recommendation`

#### Target mapping

```json
{
  "offer": {
    "main_offer": "Akses Alco Creative System",
    "offer_type": "Digital Product / Software Access",
    "offer_benefits": [
      "Campaign Meta Ads lebih cepat siap tayang",
      "Copywriting lebih terstruktur",
      "Mengurangi kebingungan saat menyiapkan iklan"
    ]
  }
}
```

#### Notes

- `main_offer` ada secara implisit
- `offer_type` harus diturunkan dari narasi
- `offer_benefits` perlu diringkas

### 6. Messaging

#### Source candidates

- `copy_assets.hooks`
- `copy_assets.headlines`
- `creative_strategy.emotional_trigger`
- `creative_strategy.primary_angle`
- `video_ads[].hook_script`

#### Target mapping

```json
{
  "messaging": {
    "core_message": "Jangan habiskan modal iklan dengan pendekatan tebak-tebakan; gunakan sistem yang membantu menyiapkan campaign lebih cepat dan lebih terarah.",
    "brand_voice": "Direct, practical, urgent, and conversion-oriented",
    "copy_direction": [
      "Gunakan hook rasa sakit dan frustrasi nyata",
      "Tonjolkan solusi praktis dan instan",
      "Akhiri dengan CTA tegas dan berorientasi aksi"
    ]
  }
}
```

#### Notes

- `core_message` belum ada sebagai field eksplisit
- `brand_voice` harus diturunkan dari pola copy
- `copy_direction` bisa dibentuk dari pola hook dan CTA

### 7. Content Strategy

#### Source candidates

- `carousel_ads`
- `video_ads`
- `image_ads`
- `placement_recommendation.recommended_placements`

#### Target mapping

```json
{
  "content_strategy": {
    "content_pillars": [
      "Problem awareness dan pain point iklan",
      "Solusi praktis dan demo sistem",
      "Offer dan CTA conversion"
    ],
    "campaign_theme": "Mengubah proses membuat iklan dari bingung menjadi cepat dan terstruktur",
    "channel_notes": [
      "Instagram Feed",
      "Instagram Stories & Reels",
      "Facebook Feed",
      "Facebook Stories & Reels"
    ]
  }
}
```

## Bagian Yang Tidak Perlu Masuk Sebagai Required Fields

Field berikut berguna, tetapi tidak perlu menjadi required di `Content Engine` intake:

- `dailyBudget`
- `budget_recommendation`
- `schedule_recommendation`
- `tracking_checklist`
- `policy_flags`
- `implementation_checklist`
- `placement_recommendation`

Field-field ini lebih cocok sebagai:

- referensi campaign execution
- opsional context tambahan
- atau lampiran campaign pack

## Rekomendasi Perubahan

### Ubah Di Alco Content Engine

- tambahkan mode intake `campaign pack`
- buat mapper internal dari field campuran ke `Shared Content Context`
- tampilkan banner bahwa data ini hasil konversi dari `campaign pack`, bukan `blueprint` murni

### Ubah Di Alco Creative System

- tambahkan output resmi baru: `content_engine_blueprint.json`
- output ini harus langsung mengikuti schema `Shared Data Contract`
- jangan ganti `campaign pack`, tetapi tambahkan output baru

## Keputusan Rekomendasi

- ubah `Alco Content Engine` dulu untuk toleran terhadap output saat ini
- lalu tambahkan export baru di `Alco Creative System` sebagai jalur resmi integrasi
