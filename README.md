# Venture Dashboard v2.0 — Class App
## Lab. Kewirausahaan II

Versi ini mengubah dashboard pribadi menjadi aplikasi kelas multi-user untuk **25 mahasiswa + 1 dosen**.

## Yang sudah berfungsi

### Demo Mode (langsung bisa dipakai tanpa database)
- Simulasi 25 mahasiswa dengan venture berbeda.
- Tampilan Mahasiswa dan Tampilan Dosen.
- Role switch Mahasiswa ↔ Dosen.
- Student Dashboard dengan modul:
  - Health Check
  - Baseline KPI
  - Problem Tree
  - Experiment Card
  - Customer Evidence
  - Weekly Sprint 16 minggu
  - Financial Snapshot
  - Venture Portfolio
- Autosave Demo Mode ke browser.
- Lecturer Class Dashboard:
  - jumlah mahasiswa
  - mahasiswa yang update dalam 7 hari terakhir
  - average health score
  - experiment running / decision
  - total class revenue
  - daftar seluruh mahasiswa
  - Student Detail View
  - weekly progress Week 1–16
  - class analytics
  - needs-attention alerts

### Cloud Mode (Supabase)
Kode sudah disiapkan untuk:
- Email/password authentication.
- Registrasi mahasiswa.
- Role `student` dan `lecturer`.
- Satu venture per mahasiswa.
- Penyimpanan seluruh modul ke Supabase.
- Dosen dapat membaca seluruh venture.
- Mahasiswa hanya dapat membaca/mengubah venture miliknya.
- Row Level Security (RLS).

---

# 1. Preview sekarang

Buka `index.html` menggunakan browser dengan koneksi internet.

Klik:
- **Demo Mahasiswa** untuk mencoba pengisian mahasiswa.
- **Demo Dosen** untuk melihat 25 venture sekaligus.

Demo Mode tidak memerlukan Supabase.

---

# 2. Membuat Supabase untuk kelas nyata

1. Buat project baru di Supabase.
2. Buka **SQL Editor**.
3. Copy seluruh isi `supabase-schema.sql`.
4. Jalankan SQL tersebut.
5. Buka **Project Settings → API**.
6. Ambil:
   - Project URL
   - anon / public key
7. Buka `config.js` dan isi:

```js
window.APP_CONFIG = {
  supabaseUrl: 'https://PROJECT.supabase.co',
  supabaseAnonKey: 'ANON_KEY',
  className: 'Lab. Kewirausahaan II'
};
```

> `anon key` memang dipakai di frontend Supabase. Keamanan data ditentukan oleh RLS di `supabase-schema.sql`. Jangan pernah menaruh `service_role` key di dashboard.

---

# 3. Membuat akun mahasiswa

Mahasiswa dapat memilih **Daftar Mahasiswa** pada halaman awal lalu mengisi:
- Nama lengkap
- NIM
- Kelas
- Email
- Password

Setelah login pertama, mahasiswa akan diminta membuat:
- Nama venture
- Kategori
- Deskripsi venture

Role pendaftaran selalu dibuat sebagai `student`.

---

# 4. Membuat akun dosen

Buat akun dosen melalui Supabase Auth atau halaman daftar.

Setelah akun dibuat, jalankan SQL berikut di SQL Editor:

```sql
update public.profiles
set role = 'lecturer'
where id = (
  select id from auth.users
  where email = 'EMAIL_DOSEN'
);
```

Setelah login ulang, dosen otomatis masuk ke **Class Dashboard**.

---

# 5. Hak akses

### Mahasiswa
Dapat:
- melihat profil dan venture sendiri
- mengisi seluruh modul sendiri
- mengubah data sendiri

Tidak dapat:
- membaca venture mahasiswa lain
- melihat financial mahasiswa lain
- membuka Class Dashboard

### Dosen
Dapat:
- melihat seluruh mahasiswa
- membuka detail setiap venture
- melihat health, evidence, sprint, financial, experiment, dan portfolio
- melihat class analytics

RLS tetap berlaku walaupun seseorang mencoba mengakses API secara langsung.

---

# 6. Struktur database

```text
auth.users
   │
   └── profiles
          │ 1:1
          └── ventures
                 │
                 ├── module_data
                 │      ├── health
                 │      ├── kpi
                 │      ├── problem
                 │      ├── experiment
                 │      ├── evidence
                 │      ├── sprint
                 │      ├── financial
                 │      └── portfolio
                 │
                 ├── weekly_submissions
                 └── lecturer_feedback
```

`module_data.payload` menggunakan JSONB agar struktur toolkit dapat berkembang tanpa perlu mengubah tabel setiap kali ada revisi kolom.

---

# 7. Deployment

Folder ini merupakan static web app sehingga dapat dideploy ke:
- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages

Untuk Vercel, upload folder/project dan jadikan root berisi `index.html`.

---

# Roadmap v2.x

Fondasi database untuk fitur berikut sudah disiapkan, tetapi UI finalnya belum seluruhnya diaktifkan pada v2.0:
- Submit Week → Draft / Submitted / Reviewed
- Lecturer feedback per minggu / modul
- komentar dosen di Student Detail
- export report PDF per mahasiswa
- class report PDF
- deadline reminder
- audit trail / history perubahan
- data visualization lanjutan

---

**Venture Dashboard — Lab. Kewirausahaan II**  
Crafted by **Konekta — Connecting Solutions**
