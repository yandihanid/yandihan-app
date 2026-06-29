import Link from 'next/link'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function Guidebook() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-color)' }}>
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid var(--border-color)', padding: '1rem 0' }}>
        <div className="container flex justify-between items-center">
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
            Yandihan Guidebook
          </div>
          <Link href="/" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
            <ArrowLeft size={18} style={{ marginRight: '8px' }} /> Kembali
          </Link>
        </div>
      </header>

      <main className="container" style={{ padding: '3rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
        <div className="card animate-fade-in" style={{ padding: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '2rem', color: 'var(--text-main)' }}>
            Panduan Penggunaan Yandihan
          </h1>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--primary-color)' }}>
              1. Untuk Bos / Pemilik Usaha
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <CheckCircle2 color="var(--success-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Buat Akun dan Profil Toko</strong>
                  <p style={{ color: 'var(--text-muted)' }}>Daftar di menu Sign Up, lalu masuk ke Dashboard. Isi nama toko Anda di menu Pengaturan.</p>
                </div>
              </li>
              <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <CheckCircle2 color="var(--success-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Cara Menambahkan Kasir (Metode Web) - Sangat Disarankan</strong>
                  <p style={{ color: 'var(--text-muted)' }}>Di menu Pengaturan, cari bagian "Tambah Kasir Manual". Ketik nama kasir Anda (misal: "Budi Shift Pagi") dan klik Tambah. Sistem akan membuatkan <strong>Link Web Khusus</strong>. Salin link tersebut dan kirim ke WhatsApp Budi. Budi cukup membuka link itu setiap kali ingin lapor transaksi.</p>
                </div>
              </li>
              <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <CheckCircle2 color="var(--success-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Cara Melihat Laporan</strong>
                  <p style={{ color: 'var(--text-muted)' }}>Buka menu Ringkasan di Dashboard. Anda bisa memfilter pemasukan khusus uang Tunai atau QRIS/Transfer menggunakan tombol filter yang tersedia.</p>
                </div>
              </li>
            </ul>
          </section>

          <hr style={{ border: '0', borderTop: '1px solid var(--border-color)', margin: '3rem 0' }} />

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--primary-color)' }}>
              2. Untuk Kasir (Cara Lapor via Web)
            </h2>
            <div style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <ol style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-main)' }}>
                <li>Buka link web yang dikirimkan oleh Bos Anda (biasanya berawalan <code>yandihan.my.id/c/...</code>).</li>
                <li>Simpan link tersebut di layar utama HP (Add to Home Screen) agar mudah diakses besok-besok.</li>
                <li>Masukkan nominal uang penjualan (hanya angka).</li>
                <li>Masukkan nama produk yang terjual.</li>
                <li>Pilih metode pembayaran (CASH atau QRIS/Transfer).</li>
                <li>Jika pelanggan bayar via QRIS/Transfer, <strong>Anda wajib mengunggah foto bukti bayar</strong> yang dikirim pelanggan.</li>
                <li>Klik tombol <strong>Kirim Laporan</strong>.</li>
              </ol>
            </div>
          </section>

          <hr style={{ border: '0', borderTop: '1px solid var(--border-color)', margin: '3rem 0' }} />

          <section>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--primary-color)' }}>
              3. Alternatif Lain: Lapor via Telegram Bot
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Jika Anda lebih nyaman menggunakan Telegram, Yandihan juga menyediakannya.
            </p>
            <div style={{ backgroundColor: '#f0fdf4', padding: '1.5rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <ol style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', color: '#166534' }}>
                <li>Bos harus memberikan <strong>Kode Unik</strong> tokonya dari menu Pengaturan (misal: <code>KASIR-ABC123</code>).</li>
                <li>Kasir membuka Telegram, cari bot Telegram Anda.</li>
                <li>Kasir mengirim pesan: <code>/start KASIR-ABC123</code> untuk menyambungkan akun.</li>
                <li>
                  Untuk lapor transaksi (Tunai/QRIS/Transfer), gunakan format berikut:
                  <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <li>
                      <strong>Single item:</strong><br />
                      <code>&lt;nominal&gt; &lt;jumlah&gt; &lt;nama_produk&gt;</code><br />
                      Contoh: <code>50000 2 Nasi Goreng</code>
                    </li>
                    <li>
                      <strong>Multi-item:</strong><br />
                      <code>&lt;total_nominal&gt;</code> (baris pertama)<br />
                      <code>&lt;jumlah&gt; &lt;nama_produk_1&gt;</code> (baris berikutnya)<br />
                      <code>&lt;jumlah&gt; &lt;nama_produk_2&gt;</code><br />
                      Contoh:<br />
                      <code>65000</code><br />
                      <code>2 Nasi Goreng</code><br />
                      <code>1 Es Teh</code>
                    </li>
                  </ul>
                  Jika pelanggan bayar via QRIS/Transfer, <strong>kirimkan foto bukti bayar</strong> dan gunakan format di atas sebagai *caption* (keterangan foto).
                </li>
              </ol>
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}
