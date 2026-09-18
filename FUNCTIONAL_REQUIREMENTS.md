# FUNCTIONAL_REQUIREMENTS.md

# Functional Requirements

## Tujuan

Menetapkan kemampuan fungsional minimum `Alco Content Engine` agar implementasi produk, UI, schema, dan AI behavior tetap konsisten.

## 1. Product Context Requirements

- Sistem harus diposisikan sebagai aplikasi tahap kedua setelah `Alco Creative System`.
- Sistem harus menganggap blueprint strategi sebagai input utama, bukan sekadar opsi tambahan.
- Sistem tidak boleh diperlakukan sebagai generator caption generik tanpa konteks strategi.

## 2. Intake Requirements

- Sistem harus menerima input strategi melalui `JSON import`.
- Sistem harus menyediakan alternatif `paste blueprint`.
- Sistem harus memvalidasi kelengkapan field wajib sebelum planning penuh dimulai.
- Sistem harus menampilkan field yang hilang bila blueprint belum lengkap.

## 3. Shared Context Requirements

- Sistem harus membentuk `Shared Content Context` dari hasil import atau paste blueprint.
- Semua generator AI harus memakai context yang sama.
- Sistem tidak boleh meminta ulang data strategi yang sudah tersedia di context.

## 4. Planning Requirements

- Sistem harus memungkinkan user memilih horizon `7 hari`, `14 hari`, atau `30 hari`.
- Sistem harus menghasilkan kalender konten berdasarkan horizon terpilih.
- Sistem harus memberi label `TOFU`, `MOFU`, atau `BOFU` pada setiap item kalender.
- Sistem harus menyertakan alasan strategis singkat untuk label funnel tiap item.
- Sistem harus menjaga distribusi funnel yang logis sesuai horizon dan konteks strategi.

## 5. Content Output Requirements

- Sistem harus dapat menghasilkan `daily content brief` untuk item kalender.
- Sistem harus dapat menghasilkan `caption siap pakai`.
- Sistem harus dapat menghasilkan prompt untuk `image`, `carousel`, dan `video`.
- Sistem harus memberi arahan visual atau design brief yang cukup untuk proses produksi aset.
- Sistem harus menjaga agar output tetap relevan untuk `Instagram` dan `Facebook`.

## 6. Funnel Intelligence Requirements

- Sistem harus menjelaskan tujuan konten harian, bukan hanya topik.
- Sistem harus menjelaskan mengapa konten termasuk TOFU, MOFU, atau BOFU.
- Sistem harus membantu menjaga keseimbangan antara awareness, trust, dan conversion support.
- Sistem harus mencegah kalender yang terlalu repetitif atau tidak memiliki progression funnel yang jelas.

## 7. AI Behavior Requirements

- AI harus berperan sebagai `planner`.
- AI harus berperan sebagai `content strategist`.
- AI harus berperan sebagai `draft generator`.
- AI harus berperan sebagai `quality checker`.
- AI tidak boleh diposisikan hanya sebagai penulis caption.

## 8. Editing and Ownership Requirements

- User harus dapat mengedit hasil AI secara manual.
- Sistem harus menganggap user sebagai pemilik akhir seluruh output.
- AI tidak boleh menimpa edit manual user secara otomatis.
- Regenerate harus bersifat selektif, bukan overwrite total secara default.

## 9. Regeneration Requirements

- User harus dapat meminta regenerate per item kalender.
- User harus dapat meminta regenerate per jenis output, misalnya hanya caption atau hanya prompt visual.
- User harus dapat mempertahankan sebagian hasil lama saat sebagian lain diregenerate.
- Sistem harus menyimpan status hasil sebagai `GENERATED`, `MANUAL_EDITED`, atau `OUTDATED`.

## 10. Quality Check Requirements

- Sistem harus memeriksa keselarasan output dengan positioning dan offer.
- Sistem harus memeriksa kecocokan funnel dari tiap item.
- Sistem harus menilai kecocokan CTA terhadap tujuan konten.
- Sistem harus memberi peringatan bila output terlalu generik, terlalu repetitif, atau lemah secara strategis.

## 11. Channel Requirements

- MVP hanya wajib mendukung `Instagram`.
- MVP hanya wajib mendukung `Facebook`.
- Sistem tidak wajib menyediakan perilaku spesifik untuk channel lain pada tahap awal.

## 12. Non-MVP Exclusions

Sistem tidak wajib menyediakan fitur berikut pada MVP:

- auto-posting
- team collaboration
- marketplace
- approval workflow
- omnichannel publishing

## 13. Success-Oriented Requirements

- Sistem harus membantu user lebih cepat menentukan konten harian.
- Sistem harus menjaga agar konten tetap selaras dengan strategi awal.
- Sistem harus memastikan setiap konten memiliki tujuan harian yang jelas.
- Sistem harus mengurangi kebingungan user tentang apa yang harus diposting berikutnya.
