# Venture Dashboard v2.0 — Class App (Lab. Kewirausahaan II)

Panduan kerja untuk AI agent saat mengembangkan / merawat repo ini.

## Bahasa
- Balas & tulis komentar dalam Bahasa Indonesia yang benar dan natural.
- Kalimat pendek. Tanpa campur bahasa asing yang tidak perlu.

## Identitas proyek
- Aplikasi web statis (HTML/CSS/JS) untuk kelas kewirausahaan: 25 mahasiswa + 1 dosen.
- Distance: mahasiswa mengisi modul; dosen melihat seluruh venture + class analytics.
- Persiapan Cloud Mode sudah ada (Supabase + RLS). Demo Mode jalan tanpa database.

## Aturan kerja wajib
1. Baca dulu README.md dan file terkait sebelum mengubah apa pun.
2. JANGAN pernah menaruh kunci `service_role` Supabase di frontend. (`anon` key saja.)
3. RLS tetap dijaga: mahasiswa hanya bisa baca/tulis venture miliknya.
4. `module_data.payload` memakai JSONB — jangan ubah struktur tabel tanpa kebutuhan nyata.
5. Sebelum menyatakan selesai, VERIFIKASI: coba jalankan / uji kode, jangan cuma menulis.
6. Jangan menimpa isi `./assets/*.png` sembarangan (logo & icon kelas).

## Git
- Branch utama: `main`. Push langsung ke `main` hanya untuk perubahan kecil.
- Untuk perubahan besar, buat branch, kerja di sana, lalu gabungkan.
- Tulis pesan commit singkat & deskriptif dalam Bahasa Indonesia, misal:
  `feat: tambah filter kelas di Class Dashboard`
- Setelah selesai: `git add`, `git commit`, `git push`.
- Kredensial sudah via `credential.helper store` (token GitHub disimpan aman), tidak perlu ketik token manual.

## Struktur penting
- `index.html` — halaman muka.
- `app.js` — logika utama.
- `toolkit-v3.js` — toolkit modul.
- `styles.css` — gaya.
- `config.js` — konfigurasi Supabase (URL + anon key).
- `supabase-schema.sql` — skema database + RLS.

## Mulai pekerjaan
1. `git pull` dulu supaya up-to-date.
2. Kerjakan perubahan.
3. Cek `git status` dan jalankan ulang aplikasi.
4. Commit + push.