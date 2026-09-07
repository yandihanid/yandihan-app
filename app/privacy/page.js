import Link from 'next/link'
import SiteHeader from '@/components/landing/SiteHeader'
import SiteFooter from '@/components/landing/SiteFooter'
import { SITE_NAME, SUPPORT_EMAIL, supportMailto } from '@/lib/site'

/**
 * Kebijakan Privasi.
 *
 * Setiap kategori data di bawah ini saya ambil dari kolom tabel yang benar-benar
 * ada di supabase/migrations/, bukan dari template kebijakan privasi umum.
 * Beberapa hal yang biasanya tidak ditulis orang tapi saya tulis di sini karena
 * memang begitu keadaannya:
 *
 *   * Berkas bukti pembayaran diunggah ke bucket Storage publik dan URL-nya
 *     dibagikan lewat getPublicUrl() (app/c/[token]/actions.js:112). Siapa pun
 *     yang punya URL-nya bisa membukanya tanpa login. Itu harus disebut.
 *   * Alamat IP memang disimpan sementara, sebagai bagian dari kunci kuota
 *     permintaan di tabel rate_limits, dan dihapus otomatis setelah satu jam
 *     (supabase/migrations/0005_rate_limits.sql:63).
 *   * Tidak ada satu pun pelacak pihak ketiga di aplikasi ini. Saya
 *     memverifikasinya dengan mencari gtag, Google Tag Manager, Vercel
 *     Analytics, PostHog, Mixpanel, Sentry, dan Hotjar di seluruh repo: nol
 *     hasil. Fontnya pun sudah di-host sendiri lewat next/font sejak Tahap 1,
 *     jadi browser pengguna tidak lagi memanggil fonts.googleapis.com.
 */
export const metadata = {
  title: 'Kebijakan Privasi',
  description: `Bagaimana ${SITE_NAME} mengumpulkan, memakai, dan menyimpan data akun, data transaksi, dan data pelanggan toko Anda.`,
  alternates: { canonical: '/privacy' },
  openGraph: {
    type: 'article',
    locale: 'id_ID',
    url: '/privacy',
    siteName: SITE_NAME,
    title: `Kebijakan Privasi | ${SITE_NAME}`,
    description: `Cara ${SITE_NAME} memperlakukan data Anda dan data pelanggan Anda.`,
  },
}

const LAST_UPDATED = '5 September 2026'

export default function PrivacyPage() {
  const mailto = supportMailto('Pertanyaan Kebijakan Privasi')

  return (
    <>
      <SiteHeader />

      <main className="lp-prose">
        <h1>Kebijakan Privasi</h1>
        <p className="lp-prose-updated">Terakhir diperbarui: {LAST_UPDATED}</p>

        <div className="lp-prose-summary">
          <p>
            Ringkasnya: kami menyimpan data yang dibutuhkan agar kasir dan laporan Anda
            berfungsi, dan tidak lebih. Kami tidak menjual data Anda, tidak memakainya
            untuk iklan, dan tidak memasang pelacak pihak ketiga apa pun di aplikasi ini.
          </p>
        </div>

        <h2>1. Data yang kami simpan</h2>
        <p>
          <strong>Data akun Anda sebagai pemilik toko.</strong> Alamat email dan kata
          sandi. Kata sandi disimpan dalam bentuk yang sudah di-hash oleh penyedia
          autentikasi kami; kami tidak pernah melihat kata sandi asli Anda.
        </p>
        <p>
          <strong>Data toko.</strong> Nama toko, dan alamat serta nomor telepon kalau
          Anda mengisinya untuk dicetak di struk. Juga kode unik toko yang dipakai bot
          Telegram untuk menghubungkan kasir ke toko Anda.
        </p>
        <p>
          <strong>Data operasional.</strong> Produk (nama, harga, stok), kasir (nama,
          tautan rahasianya, penanda perangkat yang terikat padanya, dan ID chat Telegram
          kalau kasir itu memakai bot), serta transaksi (waktu, produk dan jumlahnya,
          nominal, metode pembayaran, uang yang diterima dan kembaliannya, diskon, dan
          status).
        </p>
        <p>
          <strong>Data pelanggan toko Anda.</strong> Kalau Anda menyalakan program
          loyalitas, kami menyimpan nama dan nomor telepon pelanggan yang Anda masukkan
          beserta jumlah kunjungan dan total belanjanya, karena itulah dasar
          perhitungan diskonnya. Kalau fitur ini tidak Anda pakai, data ini tidak
          terbentuk.
        </p>
        <p>
          <strong>Bukti pembayaran.</strong> Foto atau tangkapan layar yang diunggah
          kasir untuk pembayaran non-tunai.
        </p>
        <p>
          <strong>Data teknis.</strong> Alamat IP pemanggil disimpan sementara sebagai
          bagian dari penghitung kuota permintaan, untuk menahan penyalahgunaan. Catatan
          ini terhapus otomatis satu jam setelah dibuat dan tidak dipakai untuk apa pun
          selain itu. Kami tidak membuat profil perilaku pengguna.
        </p>

        <h2>2. Anda pemilik data pelanggan Anda</h2>
        <p>
          Nama, nomor telepon, dan riwayat belanja pembeli dimasukkan oleh Anda atau
          kasir Anda, bukan oleh kami. Dalam hubungan itu Anda-lah yang menentukan data
          apa yang dikumpulkan dan untuk apa; kami hanya menyimpan dan mengolahnya untuk
          menjalankan layanan ini bagi Anda.
        </p>
        <p>
          Konsekuensinya: kewajiban memberi tahu pembeli dan meminta persetujuan mereka
          ada pada Anda. Praktik yang baik, dan sekaligus paling aman bagi Anda: minta
          nomor telepon hanya kalau pembeli memang ingin ikut program loyalitas, dan
          jangan memasukkan data yang tidak Anda butuhkan.
        </p>

        <h2>3. Untuk apa data itu dipakai</h2>
        <ul>
          <li>menjalankan fungsi kasir: menghitung total, mengurangi stok, membuat struk;</li>
          <li>menyusun laporan penjualan yang Anda lihat di dashboard;</li>
          <li>
            menghitung diskon loyalitas berdasarkan jumlah kunjungan, kalau fitur itu Anda
            nyalakan;
          </li>
          <li>memproses pembayaran langganan dan mencatat masa aktifnya;</li>
          <li>
            menjaga keamanan layanan: membatasi kuota permintaan, mengikat tautan kasir ke
            satu perangkat, dan menyelidiki penyalahgunaan;
          </li>
          <li>
            mengirim email yang berkaitan dengan akun Anda, seperti verifikasi email dan
            pemulihan kata sandi.
          </li>
        </ul>

        <h2>4. Yang tidak kami lakukan</h2>
        <ul>
          <li>Kami tidak menjual atau menyewakan data Anda kepada siapa pun.</li>
          <li>Kami tidak memakai data Anda untuk menargetkan iklan.</li>
          <li>
            Kami tidak memasang Google Analytics, piksel media sosial, atau pelacak pihak
            ketiga lain di aplikasi ini.
          </li>
          <li>
            Kami tidak memuat font dari server pihak ketiga. Fontnya disajikan dari domain
            kami sendiri, jadi membuka halaman ini tidak mengirimkan jejak kunjungan Anda
            ke penyedia font.
          </li>
        </ul>

        <h2>5. Siapa lagi yang ikut mengolah data ini</h2>
        <p>
          Kami memakai penyedia layanan berikut, dan hanya sebatas yang dibutuhkan untuk
          menjalankan aplikasi:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> -- basis data, autentikasi, dan penyimpanan berkas.
            Di sinilah hampir semua data yang disebut di bagian 1 berada.
          </li>
          <li>
            <strong>Penyedia hosting aplikasi</strong> -- menjalankan situs dan
            menyimpan log server teknis dalam waktu terbatas.
          </li>
          <li>
            <strong>Midtrans</strong> -- memproses pembayaran langganan. Saat Anda
            membayar, alamat email akun Anda dan rincian pesanan dikirim ke Midtrans agar
            pembayaran bisa dicocokkan dan buktinya bisa dikirimkan kepada Anda. Data
            kartu atau rekening Anda dimasukkan di halaman Midtrans dan tidak pernah
            melewati server kami.
          </li>
          <li>
            <strong>Telegram</strong> -- hanya kalau kasir Anda memakai bot Telegram.
            Dalam hal itu pesan laporan dan ID chat kasir melewati Telegram sesuai
            kebijakan privasi mereka.
          </li>
        </ul>

        <h2>6. Bukti pembayaran bisa dibuka oleh pemegang tautannya</h2>
        <p>
          Ini perlu Anda ketahui dengan jelas: berkas bukti pembayaran disimpan di
          penyimpanan berkas yang dapat diakses lewat tautan langsung, tanpa perlu masuk
          ke akun. Tautannya panjang dan tidak bisa ditebak, dan tidak diindeks mesin
          pencari, tetapi siapa pun yang mendapatkan tautan itu bisa membuka gambarnya.
        </p>
        <p>
          Karena itu, jangan mengunggah dokumen yang berisi data pribadi yang tidak perlu
          -- misalnya tangkapan layar mutasi rekening lengkap atau foto kartu identitas.
          Untuk mencatat pembayaran non-tunai, bukti transfer atau tangkapan layar QRIS
          yang menunjukkan nominal sudah cukup.
        </p>
        <p>
          Hal yang sama berlaku untuk halaman struk. Struk bisa dibuka siapa pun yang
          memegang tautannya supaya bisa Anda kirimkan ke pembeli tanpa mereka perlu
          membuat akun, dan halaman itu memang berisi nama pembeli serta produk yang
          dibeli. Struk juga tidak diindeks mesin pencari.
        </p>

        <h2>7. Cookie</h2>
        <p>
          Kami memakai cookie hanya untuk menjaga sesi masuk Anda. Tidak ada cookie
          iklan dan tidak ada cookie analitik, jadi tidak ada banner persetujuan cookie
          yang perlu Anda klik. Menghapus cookie situs ini akan mengeluarkan Anda dari
          akun, tidak lebih.
        </p>
        <p>
          Halaman kasir juga menyimpan beberapa data di perangkat kasir: penanda
          perangkat untuk pengikatan tautan, dan antrean transaksi yang belum terkirim
          saat internet mati. Data itu berada di perangkat itu sendiri dan terhapus
          ketika data situs dibersihkan dari peramban.
        </p>

        <h2>8. Berapa lama data disimpan</h2>
        <ul>
          <li>
            Data toko, produk, transaksi, dan pelanggan disimpan selama akun Anda aktif,
            karena itulah isi pembukuan yang Anda pakai.
          </li>
          <li>Catatan kuota permintaan yang memuat alamat IP terhapus otomatis setelah satu jam.</li>
          <li>
            Catatan pesanan langganan disimpan sebagai bukti pembayaran dan untuk mencegah
            satu pembayaran dipakai dua kali.
          </li>
          <li>
            Kalau Anda meminta akun dihapus, data toko Anda kami hapus. Catatan pembayaran
            bisa kami simpan lebih lama sejauh diwajibkan untuk keperluan pembukuan dan
            pajak.
          </li>
        </ul>

        <h2>9. Keamanan</h2>
        <p>
          Sambungan ke aplikasi ini terenkripsi. Data setiap toko dipisahkan di tingkat
          basis data, sehingga akun satu toko tidak bisa membaca data toko lain. Tautan
          kasir dibuat dari nilai acak dan terikat ke satu perangkat setelah dipakai
          pertama kali. Meski begitu, tidak ada sistem yang sepenuhnya bebas risiko;
          pakai kata sandi yang tidak Anda pakai di layanan lain, dan jaga tautan kasir
          Anda seperti Anda menjaga kunci kasir.
        </p>

        <h2>10. Hak Anda</h2>
        <p>
          Anda bisa meminta salinan data Anda, memperbaiki data yang salah, atau meminta
          seluruh data toko Anda dihapus. Sebagian besar data bisa Anda ubah sendiri
          langsung dari dashboard. Untuk permintaan salinan atau penghapusan, kirim email
          dari alamat email akun Anda ke alamat kontak di bawah; kami memakai kesamaan
          alamat pengirim untuk memastikan permintaan itu benar dari pemilik akun.
        </p>

        <h2>11. Anak-anak</h2>
        <p>
          Layanan ini ditujukan untuk pemilik usaha, bukan untuk anak-anak, dan kami tidak
          mengumpulkan data anak-anak dengan sengaja.
        </p>

        <h2>12. Perubahan kebijakan ini</h2>
        <p>
          Kebijakan ini bisa berubah kalau cara kerja aplikasi berubah. Tanggal perubahan
          terakhir selalu tertulis di bagian atas halaman ini, dan perubahan yang
          berdampak besar akan kami beri tahukan lewat email akun Anda.
        </p>

        <h2>13. Menghubungi kami</h2>
        {mailto ? (
          <p>
            Pertanyaan atau permintaan soal data Anda bisa dikirim ke{' '}
            <a href={mailto}>{SUPPORT_EMAIL}</a>. Ketentuan pemakaian layanan ada di{' '}
            <Link href="/terms">Syarat &amp; Ketentuan</Link>.
          </p>
        ) : (
          <p>
            Pertanyaan soal data Anda bisa dikirim lewat kanal kontak di halaman utama.
            Ketentuan pemakaian layanan ada di{' '}
            <Link href="/terms">Syarat &amp; Ketentuan</Link>.
          </p>
        )}
      </main>

      <SiteFooter />
    </>
  )
}
