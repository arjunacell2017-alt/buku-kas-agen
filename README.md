# Agen Kas Pintar

Buatkan aplikasi web dashboard pembukuan sederhana untuk Agen BRILink.

TUJUAN:
Aplikasi digunakan untuk mencatat transaksi harian Agen BRILink, memantau kas, saldo rekening, fee, biaya operasional, laba bersih, dan melakukan rekonsiliasi sederhana.

PRINSIP UTAMA:

Sangat ringan dan cepat dibuka di browser.

Tampilan sederhana, bersih, profesional.

Jangan menggunakan animasi berat.

Jangan menggunakan background video atau gambar besar.

Gunakan chart seminimal mungkin.

Utamakan performa dan kemudahan input.

Responsive untuk desktop, tablet, dan HP.

Gunakan Bahasa Indonesia.

Gunakan format Rupiah Indonesia: Rp1.000.000.

Gunakan tanggal format DD/MM/YYYY.

Gunakan komponen UI sederhana.

Hindari library yang tidak diperlukan.

STRUKTUR MENU:

DASHBOARD

TRANSAKSI

KAS

REKENING

BIAYA OPERASIONAL

LAPORAN

====================================

DASHBOARD
====================================

Tampilkan filter:

Periode: Hari Ini / Minggu Ini / Bulan Ini

Tanggal mulai

Tanggal akhir

Tampilkan KPI utama:

Total Transaksi

Total Nilai Transaksi

Total Fee

Total Biaya

Laba Bersih

Saldo Kas

Saldo Rekening

Total Dana

Selisih Rekonsiliasi

Rumus:
Laba Bersih = Total Fee - Total Biaya

Total Dana = Saldo Kas + Saldo Rekening

Selisih Rekonsiliasi = Saldo aktual - Saldo pembukuan

Gunakan kartu KPI sederhana tanpa animasi berat.

Di bawah KPI tampilkan:

A. Ringkasan transaksi berdasarkan jenis:

Tarik Tunai

Setor Tunai

Transfer

Pembayaran

Pulsa

Token PLN

BRIVA

Top Up

Lainnya

Tampilkan dalam tabel sederhana:
Jenis | Jumlah Transaksi | Total Nominal | Total Fee

B. Transaksi terbaru:
Tanggal | Jam | Jenis | Nominal | Fee | Keterangan

Tampilkan maksimal 10 transaksi terbaru.

C. Status Rekonsiliasi:

Kas: BALANCE / SELISIH

Rekening: BALANCE / SELISIH

Gunakan indikator sederhana:
BALANCE = hijau
SELISIH = merah

====================================
2. TRANSAKSI

Buat halaman untuk input dan mengelola transaksi.

Form transaksi:

Tanggal

Jam

Nomor transaksi

Jenis transaksi

Nominal

Fee

Biaya transaksi

Metode pembayaran

Keterangan

Jenis transaksi menggunakan dropdown:

Tarik Tunai

Setor Tunai

Transfer

Pembayaran

Pulsa

Token PLN

BRIVA

Top Up

Lainnya

Metode:

Tunai

Rekening

Lainnya

Fitur:

Tambah transaksi

Edit transaksi

Hapus transaksi

Cari transaksi

Filter berdasarkan tanggal

Filter berdasarkan jenis transaksi

Urutkan berdasarkan tanggal terbaru

Tampilkan tabel transaksi dengan pagination agar browser tetap ringan.

====================================
3. KAS

Buat pencatatan kas sederhana.

Field:

Tanggal

Jenis: Kas Masuk / Kas Keluar

Kategori

Nominal

Keterangan

Tampilkan:

Saldo awal

Total kas masuk

Total kas keluar

Saldo kas akhir

Rumus:
Saldo Akhir = Saldo Awal + Kas Masuk - Kas Keluar

Tambahkan tombol:

Tambah Kas Masuk

Tambah Kas Keluar

====================================
4. REKENING

Buat pencatatan saldo rekening Agen.

Field:

Tanggal

Nama rekening

Jenis transaksi

Nominal

Debit

Kredit

Keterangan

Tampilkan:

Saldo rekening

Total debit

Total kredit

Buat fitur rekonsiliasi:
Saldo menurut pembukuan
Saldo aktual rekening
Selisih

Status:
BALANCE jika selisih = Rp0
SELISIH jika tidak sama dengan Rp0

====================================
5. BIAYA OPERASIONAL

Buat halaman untuk mencatat biaya.

Kategori:

Internet

Listrik

Transportasi

ATK

Administrasi

Sewa

Peralatan

Lainnya

Field:

Tanggal

Kategori

Nominal

Keterangan

Tampilkan:

Total biaya bulan berjalan

Total biaya berdasarkan kategori

Daftar biaya terbaru

====================================
6. LAPORAN

Buat laporan sederhana dengan filter periode.

Laporan yang tersedia:

A. Laporan Transaksi

Jumlah transaksi

Total nominal

Total fee

B. Laporan Laba Rugi Sederhana

Pendapatan:
Total Fee

Beban:
Total Biaya Operasional

Laba Bersih:
Total Fee - Total Biaya

C. Laporan Arus Kas

Saldo Awal

Kas Masuk

Kas Keluar
= Saldo Akhir

D. Rekonsiliasi

Kas:
Saldo Pembukuan
Saldo Aktual
Selisih

Rekening:
Saldo Pembukuan
Saldo Aktual
Selisih

====================================
DATABASE

Gunakan database sederhana dengan struktur:

TABLE transactions:

id

transaction_date

transaction_time

transaction_number

transaction_type

amount

fee

transaction_cost

payment_method

description

created_at

TABLE cash_transactions:

id

transaction_date

type

category

amount

description

created_at

TABLE bank_transactions:

id

transaction_date

account_name

transaction_type

debit

credit

description

created_at

TABLE expenses:

id

expense_date

category

amount

description

created_at

TABLE account_settings:

id

business_name

opening_cash_balance

opening_bank_balance

====================================
PERHITUNGAN OTOMATIS

Dashboard harus menghitung otomatis:

Total Transaksi
= COUNT(transactions)

Total Nilai Transaksi
= SUM(amount)

Total Fee
= SUM(fee)

Total Biaya
= SUM(expenses)

Laba Bersih
= Total Fee - Total Biaya

Saldo Kas
= Saldo Awal + Total Kas Masuk - Total Kas Keluar

Saldo Rekening
= Saldo Awal Rekening + Total Kredit - Total Debit

Total Dana
= Saldo Kas + Saldo Rekening

Selisih Rekonsiliasi
= Saldo Aktual - Saldo Pembukuan

Semua angka di dashboard harus berubah otomatis setelah data ditambahkan, diedit, atau dihapus.

====================================
DESAIN UI

Gunakan desain minimalis seperti aplikasi administrasi keuangan.

Layout:

Sidebar sederhana di desktop.

Bottom navigation atau menu compact di mobile.

Header sederhana.

Dashboard menggunakan card KPI.

Tabel sederhana.

Form input mudah digunakan.

Gunakan modal untuk input data jika lebih ringan.

Jangan gunakan:

Animasi kompleks

Video

Background image

3D

Gradient berlebihan

Chart berat

Efek visual yang tidak diperlukan

Jika menggunakan chart, maksimal:
1 chart transaksi harian sederhana
1 chart komposisi transaksi berdasarkan jenis.

Pastikan chart hanya mengambil data agregat, bukan seluruh data transaksi.

====================================
PERFORMA

Prioritaskan kecepatan loading.

Lazy load halaman yang tidak sedang dibuka.

Gunakan pagination.

Jangan mengambil seluruh data transaksi sekaligus.

Gunakan query agregasi untuk dashboard.

Hindari polling/realtime yang tidak diperlukan.

Refresh data hanya ketika diperlukan.

Optimalkan database query.

Gunakan index pada kolom tanggal dan transaction_type.

Jangan menggunakan library besar jika tidak diperlukan.

Dashboard harus tetap cepat walaupun transaksi sudah mencapai ribuan atau puluhan ribu data.

====================================
DATA & KEAMANAN

Gunakan autentikasi sederhana.

Setiap user hanya dapat melihat data miliknya sendiri.

Jangan tampilkan data user lain.

Validasi semua input nominal agar:

hanya angka

tidak boleh negatif

format Rupiah hanya untuk tampilan

Pastikan penghapusan transaksi menggunakan konfirmasi.

====================================
HASIL AKHIR

Buat aplikasi yang terasa seperti buku kas digital sederhana untuk Agen BRILink.

Prioritas:

Mudah input transaksi

Dashboard cepat

Saldo mudah dipantau

Fee mudah diketahui

Laba bersih mudah diketahui

Rekonsiliasi kas mudah dilakukan

Laporan mudah dibaca

Jangan membuat sistem terlalu kompleks. Jika ada fitur yang tidak diperlukan untuk tujuan pembukuan sederhana, jangan tambahkan.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://buku-kas-agen.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/825183d0-c804-44f6-9f97-bc5c75337d89).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
