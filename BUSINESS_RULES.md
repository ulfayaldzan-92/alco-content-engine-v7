# BUSINESS_RULES.md

# Business Rules

## 1. Product Relationship Rule

- Alco Content Engine adalah kelanjutan dari Alco Creative System.
- Creative System berperan sebagai sumber strategi.
- Content Engine berperan sebagai penerjemah strategi ke eksekusi konten.

## 2. Input Rule

- Sistem hanya mengambil data strategi yang relevan untuk perencanaan konten.
- Tidak semua data dari Creative System wajib diimpor.
- Bila data penting belum tersedia, sistem harus menandai input sebagai belum lengkap.

## 3. Planning Horizon Rule

- User dapat memilih horizon 7 hari, 14 hari, atau 30 hari.
- Semua horizon harus tetap menjaga logika funnel, bukan sekadar membagi jumlah hari.

## 4. Funnel Rule

Definisi funnel default untuk sistem:

- TOFU: konten awareness, edukasi, problem awareness, relatability, dan daya jangkau awal
- MOFU: konten trust-building, authority, objection handling, proof, dan pematangan minat
- BOFU: konten offer-focused, decision support, CTA yang lebih tegas, conversion trigger, dan closing support

Aturan:

- Setiap item konten wajib memiliki salah satu label funnel.
- Sistem wajib menjelaskan mengapa item tertentu termasuk TOFU, MOFU, atau BOFU.
- Distribusi funnel harus logis terhadap horizon konten dan konteks strategi.

## 5. Channel Rule

- Channel MVP adalah Instagram dan Facebook.
- Sistem hanya menghasilkan output yang relevan untuk dua channel tersebut.

## 6. Ownership Rule

- User adalah pemilik akhir seluruh output.
- Output AI boleh diedit manual oleh user.
- Edit manual user tidak boleh ditimpa otomatis oleh AI.

## 7. Regeneration Rule

- Regenerate hanya dilakukan atas permintaan user.
- Regenerate dapat dilakukan per item, per hari, atau per bagian output.
- Regenerate tidak boleh mengganti hasil manual user tanpa konfirmasi eksplisit.

## 8. Quality Rule

- Setiap output harus diperiksa terhadap strategi awal.
- Sistem harus menghindari konten yang terlalu generik, terlalu repetitif, atau tidak punya tujuan funnel yang jelas.
- Sistem harus menjaga agar CTA, angle, dan tone tetap konsisten dengan blueprint strategi.

## 9. MVP Exclusion Rule

Fitur berikut tidak masuk MVP:

- auto-posting
- team collaboration
- marketplace
- approval workflow
- omnichannel publishing
