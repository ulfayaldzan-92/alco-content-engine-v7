# Content Engine Intake Prompt For Campaign Pack

Gunakan prompt ini di Google AI Studio untuk memperbaiki `Alco Content Engine` agar bisa menerima JSON dari `Alco Creative System` yang bentuknya masih `campaign pack`, bukan `strategy blueprint` murni.

## Prompt

Anda sedang mengedit aplikasi `ALCO Content Engine`.

Masalah saat ini:
- app mengharapkan `strategy blueprint` dengan schema yang rapi
- tetapi JSON nyata dari `ALCO Creative System` yang diupload user sering berupa `campaign pack` turunan, misalnya Meta Ads campaign pack
- akibatnya banyak field wajib dianggap kosong, padahal datanya sebenarnya ada tetapi tersebar dengan nama field berbeda

Tujuan:
buat intake `ALCO Content Engine` lebih toleran terhadap JSON `campaign pack` dari `ALCO Creative System`, lalu map ke `Shared Content Context`.

## Yang harus Anda lakukan

1. Tambahkan mode parsing `campaign pack`
- saat JSON yang diupload tidak cocok langsung dengan schema blueprint final, jangan langsung anggap kosong
- coba deteksi bentuk `campaign pack` berdasarkan field seperti:
  - `campaignName`
  - `targeting`
  - `creative_strategy`
  - `copy_assets`
  - `image_ads`
  - `carousel_ads`
  - `video_ads`

2. Buat mapper internal dari `campaign pack` ke `Shared Content Context`

Minimal hasil mapping harus bisa mengisi:
- `brand_identity.brand_name`
- `brand_identity.category`
- `target_audience.primary_audience`
- `target_audience.audience_problem`
- `positioning.core_positioning`
- `offer.main_offer`
- `messaging.core_message`

3. Gunakan prinsip mapping berikut

- `brand_name`
  - turunkan dari `campaignName` atau nama produk di narasi kreatif

- `category`
  - ambil dari `targeting.interests[0]` atau tema produk

- `primary_audience`
  - ringkas dari `targeting`, `assumptions`, dan narasi prompt aset

- `audience_problem`
  - ringkas dari hook, emotional trigger, dan script video

- `core_positioning`
  - ambil dari `creative_strategy.value_proposition`

- `main_offer`
  - ambil dari nama produk / akses utama yang dijual

- `core_message`
  - ringkas dari hook utama dan solusi utama

4. Jangan rusak intake blueprint yang sudah ada
- jika JSON memang sudah sesuai blueprint final, tetap gunakan alur lama
- jika JSON terdeteksi sebagai `campaign pack`, baru jalankan mapper baru

5. Tampilkan status yang jujur di UI
- misalnya:
  - `Imported as Campaign Pack`
  - `Mapped into Content Context`
- jangan menipu user seolah ini blueprint murni jika sebenarnya hasil konversi

## Batasan

- jangan rewrite total app
- jangan ubah arsitektur besar
- fokus pada intake, mapping, dan validasi field

## Hasil yang saya inginkan

- user bisa upload JSON `campaign pack` dari `ALCO Creative System`
- app tetap bisa membentuk strategy context yang cukup
- field wajib tidak lagi kosong jika datanya sebenarnya tersedia secara implisit

