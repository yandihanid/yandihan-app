# Yandihan Kasir

Yandihan Kasir adalah POS multi-tenant untuk warung dan UMKM Indonesia. Pemilik mengelola toko, produk, stok, kasir, pelanggan, langganan, dan laporan dari dashboard. Kasir mencatat transaksi melalui tautan web bertoken atau bot Telegram tanpa akun Supabase.

## Fitur utama

- Transaksi CASH dan QRIS/Transfer dengan pengurangan stok atomik.
- Antrean offline PWA, sinkronisasi idempoten, dan bukti transfer.
- Struk publik thermal dengan rincian item, diskon, uang diterima, dan kembalian.
- Realtime dashboard, waiting list, serta loyalitas pelanggan untuk PRO aktif.
- Laporan dasar untuk FREE dan laporan produk/kasir/metode/tren untuk PRO.
- Pembelian PRO Rp78.000 untuk 30 hari melalui Midtrans Snap. Tidak ada recurring otomatis.
- FREE tetap mendapat transaksi tanpa batas dan satu slot kasir total (web atau Telegram).

## Arsitektur singkat

- Next.js 16 App Router + React 19 untuk UI, Server Actions, dan Route Handlers.
- Supabase Auth, PostgreSQL, RLS, Realtime, dan Storage.
- `submit_transaction()` menjadi sumber kebenaran harga, stok, diskon, status, dan idempotensi untuk web maupun Telegram.
- Kasir web memakai token di path `/c/<token>` dan device binding; dashboard pemilik memakai sesi Supabase.
- Midtrans webhook memverifikasi signature dan memakai order DB yang replay-safe.
- Laporan diagregasi di PostgreSQL agar tidak terpotong batas baris PostgREST.

## Prasyarat

- Node.js 22 dan npm.
- Project Supabase.
- Akun Midtrans bila fitur upgrade digunakan.
- Bot Telegram bila kanal kasir Telegram digunakan.

## Setup lokal

```bash
npm ci
copy .env.example .env.local
npm run dev
```

Pada macOS/Linux gunakan `cp .env.example .env.local`. Buka `http://localhost:3000`.

Validasi sebelum deploy:

```bash
npm run lint
npm run test:run
npm run build
```

## Environment

| Variabel | Klasifikasi | Kegunaan |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Publik | URL project Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publik | Anon key browser; keamanan data tetap bergantung pada RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Rahasia/server | Jalur kasir, webhook, upload, dan RPC server; melewati RLS. |
| `MIDTRANS_SERVER_KEY` | Rahasia/server | Basic auth API Snap/status dan verifikasi webhook. |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | Publik | Atribut client key Snap.js di browser. |
| `MIDTRANS_IS_PRODUCTION` | Server | `true` memakai API dan Snap produksi; nilai lain memakai sandbox. |
| `TELEGRAM_BOT_TOKEN` | Rahasia/server | Token bot dari BotFather. |
| `TELEGRAM_WEBHOOK_SECRET` | Rahasia/server | Secret acak 32+ karakter untuk autentikasi update Telegram. |
| `NEXT_PUBLIC_SITE_URL` | Publik | Origin canonical dan basis tautan struk, mis. `https://kasir.example.com`. |

Jangan commit `.env.local`. Jangan pernah memakai service-role key, Midtrans server key, atau secret Telegram dengan prefix `NEXT_PUBLIC_`.

## Database Supabase

Jalankan migrasi secara manual melalui **Supabase SQL Editor** dalam urutan berikut:

1. `supabase/migrations/0001_baseline_schema.sql`
2. `supabase/migrations/0002_rls_policies.sql`
3. `supabase/migrations/0003_transaction_rpc.sql`
4. `supabase/migrations/0004_subscription_orders.sql`
5. `supabase/migrations/0005_rate_limits.sql`
6. `supabase/migrations/0006_report_rpcs.sql`

`add_loyalty_customers.sql` adalah migrasi lama; perubahan loyalitasnya sudah dicakup secara idempoten oleh baseline dan kebijakan/RPC saat ini. Untuk project baru, gunakan urutan bernomor di atas.

Migrasi `0006` menambah RPC laporan. Seluruh fungsi memakai rentang setengah-terbuka `[from, to)`, grup tanggal WIB, pemeriksaan pemilik toko melalui `auth.uid()`, dan execute grant hanya untuk `authenticated`.

## Storage bukti pembayaran

Buat bucket Supabase Storage bernama `receipts`. Implementasi saat ini menyimpan URL publik melalui `getPublicUrl()`, sehingga bucket harus **public** agar struk/dashboard dapat membuka bukti.

Upload dan penghapusan dilakukan hanya di server menggunakan service-role. Jangan buat policy upload anonim. Batasi tipe/ukuran bucket bila tersedia; aplikasi sendiri membatasi bukti web maksimal 6 MB. Gunakan nama path per toko dan atur lifecycle/retensi sesuai kebijakan usaha karena bukti dapat memuat data sensitif.

## Telegram

1. Buat bot lewat BotFather dan isi `TELEGRAM_BOT_TOKEN`.
2. Buat `TELEGRAM_WEBHOOK_SECRET` acak, panjang minimal 32 karakter.
3. Setelah deploy HTTPS, daftarkan webhook:

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://<domain>/api/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Endpoint fail-closed: webhook ditolak bila secret kosong atau header Telegram tidak cocok. Kasir menghubungkan bot dengan `/start KODE_TOKO`, lalu mengirim baris kuantitas + nama produk. Foto dengan caption transaksi diproses sebagai QRIS/Transfer.

## Midtrans

- Sandbox: `MIDTRANS_IS_PRODUCTION=false`, gunakan server/client key sandbox.
- Produksi: `MIDTRANS_IS_PRODUCTION=true`, gunakan server/client key produksi.
- Atur **Payment Notification URL** ke `https://<domain>/api/payment/webhook`.
- URL Snap browser dan endpoint server otomatis mengikuti mode yang sama.
- Upgrade menambah 30 hari dari tanggal yang lebih akhir antara sekarang dan akhir langganan aktif. Pembayaran tidak dibuat recurring otomatis.

Uji sandbox terlebih dahulu: success, pending, close, expire/cancel, verifikasi manual, dan replay webhook. Jangan mengubah tier langsung dari payload webhook; aplikasi mengambil toko dari `subscription_orders` dan memverifikasi signature serta nominal.

## PWA dan offline

Service worker hanya menyimpan aset statis same-origin (`/_next/static`, manifest, ikon), dengan batas umur dan jumlah entri. API, auth, dashboard, struk, resource lintas origin, dan URL kasir bertoken tidak disimpan permanen.

Halaman `/c/<token>` memakai network-first dan fallback offline deterministik. Metadata kasir tersimpan lokal setelah perangkat pernah online. Antrean transaksi maksimal 25 entri per token; blob bukti disimpan di Cache API khusus `yandihan-receipts` lalu dihapus setelah sinkronisasi berhasil.

## Deploy

1. Set seluruh environment pada platform hosting; gunakan nilai sandbox untuk staging.
2. Jalankan migrasi bernomor sebelum merilis kode yang memanggil RPC baru.
3. Jalankan `npm ci`, lint, test, dan build. Workflow `.github/workflows/ci.yml` melakukan langkah tersebut pada push/PR.
4. Deploy ke runtime Node yang mendukung Next.js 16 (CI memakai Node 22).
5. Konfigurasikan SMTP Supabase Auth, allowed redirect URL, Site URL, Midtrans notification URL, dan Telegram webhook.
6. Pastikan HTTPS aktif; token kasir berada pada path URL dan tidak boleh dikirim melalui referer/log pihak ketiga.

Repository juga memuat konfigurasi Capacitor dan APK statis. Build/deploy web adalah sumber utama; pembaruan wrapper Android harus disinkronkan dan diuji terpisah sebelum APK diganti.

## Checklist smoke dan keamanan

Gunakan dua akun pemilik dengan dua toko berbeda:

- Pastikan akun A tidak bisa membaca/mengubah toko, produk, transaksi, pelanggan, kasir, order, atau laporan akun B.
- Buat kasir web dan Telegram; pada FREE pastikan total slot tetap satu, pada PRO boleh lebih dari satu.
- Rotasi token kasir dan pastikan tautan lama tidak berlaku; uji device binding.
- Buat transaksi multi-item CASH dan QRIS/TF, cek stok, subtotal, diskon loyalitas, total, uang/kembalian, struk, dan bukti.
- Retry transaksi dengan `client_tx_id` sama dan pastikan tidak tercatat dua kali.
- Uji data laporan di atas 1.000 transaksi, batas 00:00 WIB, filter pembayaran, FREE, PRO aktif, dan PRO kedaluwarsa.
- Offline-kan perangkat kasir, antrekan transaksi + bukti, kembali online, lalu periksa sinkronisasi dan Cache Storage tidak menyimpan URL token/API/struk.
- Uji Midtrans sandbox dan webhook replay; uji webhook Telegram dengan secret salah dan benar.
- Verifikasi signup, login, reset password, dan SMTP menggunakan domain deployment.

## Troubleshooting

- **“Fungsi transaksi belum terpasang”**: jalankan migrasi `0003`.
- **“Migrasi laporan belum terpasang”**: jalankan migrasi `0006`, lalu reload schema cache Supabase bila perlu.
- **Snap tidak muncul**: cocokkan client/server key dengan `MIDTRANS_IS_PRODUCTION`, periksa CSP dan console browser.
- **Webhook Midtrans 401**: server key/mode tidak cocok atau signature berubah.
- **Telegram selalu 401**: daftarkan ulang webhook dengan nilai `secret_token` yang sama dengan env.
- **Upload bukti gagal**: pastikan bucket `receipts` ada, public, dan service-role key benar.
- **Kasir offline tidak punya data**: perangkat harus berhasil membuka link kasir secara online setidaknya sekali.
- **Perubahan env publik tidak terlihat**: build dan deploy ulang; variabel `NEXT_PUBLIC_*` dibundel saat build.

Tidak ada secret produksi yang dibutuhkan untuk compile. Nilai placeholder publik dapat dipakai di CI, tetapi fitur eksternal hanya dapat diuji dengan kredensial sandbox yang valid.
