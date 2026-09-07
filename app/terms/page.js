import Link from 'next/link'
import SiteHeader from '@/components/landing/SiteHeader'
import SiteFooter from '@/components/landing/SiteFooter'
import { PRO_PRICE_IDR } from '@/lib/plan'
import { formatRupiah } from '@/lib/format'
import { SITE_NAME, SUPPORT_EMAIL, supportMailto } from '@/lib/site'

/**
 * Syarat & Ketentuan.
 *
 * Dua alasan halaman ini ada, dan keduanya bukan formalitas:
 *   1. Penyedia pembayaran di Indonesia (termasuk Midtrans) meminta tautan
 *      Syarat & Ketentuan dan Kebijakan Privasi yang bisa diakses publik saat
 *      verifikasi merchant. Tanpa keduanya, akun produksi tidak lolos review.
 *   2. Footer sudah menautkannya sejak landing page ditulis ulang, jadi tanpa
 *      file ini tautannya 404.
 *
 * Aturan yang saya pakai saat menulisnya: setiap kalimat yang menyebut perilaku
 * aplikasi harus cocok dengan kode yang menegakkannya. Yang tidak bisa saya
 * pastikan (badan hukum, domisili penyelesaian sengketa) TIDAK saya karang --
 * lihat komentar HTML di bawah, tempatnya sudah disiapkan.
 */
export const metadata = {
  title: 'Syarat & Ketentuan',
  description: `Syarat dan ketentuan penggunaan ${SITE_NAME}: akun, link kasir, paket berlangganan, pembayaran, dan batasan layanan.`,
  alternates: { canonical: '/terms' },
  // Halaman hukum tidak perlu muncul sebagai kartu preview di media sosial,
  // tapi tetap boleh diindeks -- calon pengguna dan reviewer merchant
  // memang perlu menemukannya.
  openGraph: {
    type: 'article',
    locale: 'id_ID',
    url: '/terms',
    siteName: SITE_NAME,
    title: `Syarat & Ketentuan | ${SITE_NAME}`,
    description: `Ketentuan penggunaan layanan ${SITE_NAME}.`,
  },
}

const LAST_UPDATED = '5 September 2026'

export default function TermsPage() {
  const mailto = supportMailto('Pertanyaan Syarat & Ketentuan')

  return (
    <>
      <SiteHeader />

      {/*
        Badan hukum penyelenggara dan domisili penyelesaian sengketa belum
        ditentukan. Isi dua tempat berikut sebelum halaman ini dipakai untuk
        verifikasi merchant:
          - nama badan hukum / pemilik usaha di bagian "Tentang layanan ini"
          - yurisdiksi di bagian "Hukum yang berlaku"
      */}
      <main className="lp-prose">
        <h1>Syarat &amp; Ketentuan</h1>
        <p className="lp-prose-updated">Terakhir diperbarui: {LAST_UPDATED}</p>

        <div className="lp-prose-summary">
          <p>
            Ringkasnya: {SITE_NAME} adalah aplikasi kasir dan laporan penjualan. Anda
            memakainya untuk usaha Anda sendiri, Anda yang bertanggung jawab atas data
            yang Anda masukkan dan atas siapa saja yang Anda beri link kasir. Paket
            gratis boleh dipakai selamanya. Paket PRO dibayar per bulan dan tidak
            memperpanjang sendiri tanpa Anda bayar lagi.
          </p>
        </div>

        <h2>1. Tentang layanan ini</h2>
        <p>
          {SITE_NAME} adalah layanan berbasis web untuk mencatat penjualan, mengelola
          stok produk, dan melihat laporan penjualan usaha kecil. Dengan membuat akun
          atau memakai layanan ini, Anda setuju dengan ketentuan di halaman ini. Kalau
          Anda tidak setuju, jangan memakai layanan ini.
        </p>
        <p>
          Layanan ini ditujukan untuk pemakaian usaha. Anda menyatakan bahwa Anda cukup
          umur dan berwenang mengikatkan diri pada ketentuan ini, atas nama diri sendiri
          atau atas nama usaha yang Anda wakili.
        </p>

        <h2>2. Akun Anda</h2>
        <p>
          Satu akun dibuat dengan email dan kata sandi. Anda bertanggung jawab menjaga
          kerahasiaan kata sandi dan atas semua aktivitas yang terjadi lewat akun Anda.
          Beri tahu kami lewat alamat kontak di bawah kalau Anda menduga akun Anda
          dipakai orang lain.
        </p>
        <p>
          Data yang Anda masukkan ke dalam layanan ini tetap milik Anda. Kami tidak
          mengklaim kepemilikan atas nama produk, harga, catatan transaksi, atau data
          pelanggan Anda.
        </p>

        <h2>3. Link kasir</h2>
        <p>
          Kasir tidak punya akun sendiri. Anda membuat kasir di dashboard, lalu
          membagikan satu tautan rahasia kepadanya. Siapa pun yang memegang tautan itu
          bisa mencatat penjualan atas nama toko Anda tanpa perlu masuk. Karena itu:
        </p>
        <ul>
          <li>Bagikan tautan kasir hanya kepada orang yang Anda percaya.</li>
          <li>
            Tautan terikat ke perangkat pertama yang membukanya. Perangkat lain yang
            memakai tautan yang sama akan ditolak, jadi tautan yang tersalin ke tempat
            lain tidak otomatis bisa dipakai.
          </li>
          <li>
            Kalau sebuah tautan bocor atau perangkat kasir hilang, hapus kasir itu dari
            dashboard. Tautan lamanya langsung mati.
          </li>
        </ul>
        <p>
          Transaksi yang tercatat lewat tautan kasir dianggap sebagai transaksi toko
          Anda. Kami tidak bisa membedakan kasir yang sah dari orang yang mendapat
          tautannya dari kasir Anda.
        </p>

        <h2>4. Paket dan pembayaran</h2>
        <p>
          Paket GRATIS bisa dipakai selamanya, tanpa batas jumlah transaksi, dengan satu
          slot kasir. Paket PRO berbiaya {formatRupiah(PRO_PRICE_IDR)} per 30 hari dan
          menambah kasir tanpa batas, program loyalitas pelanggan, serta laporan
          lanjutan. Rincian per paket ada di <Link href="/pricing">halaman harga</Link>.
        </p>
        <ul>
          <li>
            <strong>Tidak ada penagihan otomatis.</strong> Masa aktif PRO tidak
            diperpanjang sendiri. Setiap perpanjangan adalah pembayaran baru yang Anda
            lakukan sendiri dari dashboard, jadi tidak ada tagihan yang muncul tanpa Anda
            tekan tombolnya.
          </li>
          <li>
            Perpanjangan sebelum masa aktif habis <strong>menambah</strong> 30 hari di
            atas sisa hari yang belum terpakai, bukan menggantinya.
          </li>
          <li>
            Pembayaran diproses oleh Midtrans. Data kartu, rekening, atau dompet digital
            Anda tidak pernah melewati server kami.
          </li>
          <li>
            Saat masa aktif PRO berakhir, akun Anda kembali ke paket GRATIS. Data Anda
            tidak dihapus, dan tautan kasir yang sudah ada tetap berfungsi; yang berhenti
            adalah diskon loyalitas dan kemampuan menambah kasir baru.
          </li>
        </ul>
        <p>
          Pembayaran yang sudah dikonfirmasi pada dasarnya tidak dapat dikembalikan,
          karena masa aktifnya langsung berjalan. Kalau terjadi penagihan ganda atau
          kesalahan teknis dari sisi kami, hubungi kami dan kami perbaiki.
        </p>

        <h2>5. Yang tidak boleh dilakukan</h2>
        <p>Saat memakai layanan ini, Anda tidak boleh:</p>
        <ul>
          <li>memakainya untuk memperjualbelikan barang atau jasa yang melanggar hukum;</li>
          <li>
            mencoba mengakses data toko lain, akun lain, atau bagian sistem yang bukan
            hak Anda;
          </li>
          <li>
            mengirim permintaan otomatis dalam jumlah tidak wajar. Layanan ini punya
            batas laju permintaan, dan permintaan yang melewati batas akan ditolak
            sementara;
          </li>
          <li>
            mengunggah berkas yang bukan bukti pembayaran, atau berkas yang berisi
            program berbahaya;
          </li>
          <li>menjual kembali atau menyewakan akses layanan ini kepada pihak lain.</li>
        </ul>

        <h2>6. Ketersediaan layanan</h2>
        <p>
          Kami berusaha menjaga layanan ini tetap berjalan, tetapi layanan disediakan
          apa adanya, tanpa jaminan bahwa ia akan selalu tersedia, bebas gangguan, atau
          bebas kesalahan. Layanan ini bergantung pada penyedia pihak ketiga (basis data,
          hosting, penyedia pembayaran) yang bisa mengalami gangguan di luar kendali
          kami.
        </p>
        <p>
          Halaman kasir menyimpan transaksi di perangkat ketika internet terputus dan
          mengirimkannya kembali saat sambungan pulih. Fitur ini membantu, tetapi bukan
          jaminan: perangkat yang datanya dibersihkan atau aplikasinya ditutup sebelum
          antrean terkirim bisa kehilangan transaksi yang belum tersimpan di server.
          Untuk transaksi bernilai besar, pastikan struknya sudah muncul.
        </p>
        <p>
          Kami tidak bertanggung jawab atas kerugian tidak langsung, kehilangan
          keuntungan, atau kehilangan data yang timbul dari pemakaian layanan ini,
          sejauh diizinkan oleh hukum yang berlaku. Anda tetap bertanggung jawab
          menyimpan catatan usaha Anda sendiri sesuai kewajiban pembukuan dan pajak yang
          berlaku bagi usaha Anda.
        </p>

        <h2>7. Penghentian</h2>
        <p>
          Anda bisa berhenti memakai layanan ini kapan saja. Kalau Anda ingin akun dan
          seluruh data toko dihapus, kirim permintaan dari alamat email akun Anda ke
          alamat kontak di bawah.
        </p>
        <p>
          Kami dapat menangguhkan atau menghentikan akun yang dipakai melanggar bagian 5,
          atau yang membahayakan keamanan pengguna lain. Kecuali dalam keadaan yang
          mendesak, kami akan memberi tahu Anda lebih dahulu lewat email akun Anda.
        </p>

        <h2>8. Perubahan ketentuan</h2>
        <p>
          Ketentuan ini bisa berubah seiring layanan berkembang. Tanggal perubahan
          terakhir selalu tertulis di bagian atas halaman ini. Perubahan yang berdampak
          besar bagi pengguna berbayar akan kami beri tahukan lewat email sebelum
          berlaku. Meneruskan pemakaian setelah perubahan berlaku berarti Anda menerima
          ketentuan yang baru.
        </p>

        <h2>9. Hukum yang berlaku</h2>
        <p>
          Ketentuan ini tunduk pada hukum Republik Indonesia. Kalau ada perselisihan,
          kami mengutamakan penyelesaian secara musyawarah lebih dahulu; hubungi kami
          sebelum menempuh jalur lain.
        </p>

        <h2>10. Kebijakan privasi</h2>
        <p>
          Cara kami memperlakukan data Anda dan data pelanggan Anda dijelaskan terpisah
          di <Link href="/privacy">Kebijakan Privasi</Link>, yang merupakan bagian dari
          ketentuan ini.
        </p>

        <h2>11. Menghubungi kami</h2>
        {mailto ? (
          <p>
            Pertanyaan tentang ketentuan ini bisa dikirim ke{' '}
            <a href={mailto}>{SUPPORT_EMAIL}</a>.
          </p>
        ) : (
          <p>
            Pertanyaan tentang ketentuan ini bisa dikirim lewat kanal kontak yang tertera
            di halaman utama.
          </p>
        )}
      </main>

      <SiteFooter />
    </>
  )
}
