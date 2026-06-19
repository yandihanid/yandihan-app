import Link from 'next/link'
import { ArrowRight, MessageCircle, BarChart3, Smartphone } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-color)' }}>
      {/* Navbar */}
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid var(--border-color)', padding: '1rem 0' }}>
        <div className="container flex justify-between items-center">
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
            Yandihan
          </div>
          <div className="flex gap-4 items-center">
            <Link href="/guide" style={{ color: 'var(--text-muted)', fontWeight: '500', marginRight: '1rem' }}>Panduan</Link>
            <Link href="/login" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', border: 'none', backgroundColor: 'transparent' }}>Masuk</Link>
            <Link href="/signup" className="btn btn-primary" style={{ padding: '0.5rem 1.5rem' }}>Daftar Gratis</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ flex: 1 }}>
        <section style={{ padding: '6rem 0', textAlign: 'center' }}>
          <div className="container animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '1.5rem', lineHeight: '1.2' }}>
              Kelola Laporan Keuangan UMKM, <br/><span style={{ color: 'var(--primary-color)' }}>Cukup via Telegram</span>
            </h1>
            <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '2.5rem', maxWidth: '700px', margin: '0 auto 2.5rem' }}>
              Tinggalkan cara lama kirim screenshot bukti transfer via WhatsApp. Dengan Yandihan, kasir cukup lapor ke Bot Telegram dan semua data terekap otomatis di Dashboard Anda secara real-time.
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <Link href="/signup" className="btn btn-primary" style={{ fontSize: '1.125rem', padding: '0.875rem 2rem' }}>
                Mulai Gratis Sekarang <ArrowRight size={20} style={{ marginLeft: '8px' }} />
              </Link>
              <Link href="#fitur" className="btn btn-secondary" style={{ fontSize: '1.125rem', padding: '0.875rem 2rem' }}>
                Pelajari Lebih Lanjut
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="fitur" style={{ padding: '5rem 0', backgroundColor: 'white' }}>
          <div className="container" style={{ margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <h2 style={{ fontSize: '2.25rem', fontWeight: '700', color: 'var(--text-main)' }}>Mengapa Memilih Yandihan?</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '1.1rem' }}>Solusi pintar, hemat, dan praktis untuk operasional toko Anda.</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              
              <div className="card" style={{ textAlign: 'center', padding: '2.5rem', transition: 'transform 0.2s', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
                <div style={{ backgroundColor: '#eff6ff', width: '72px', height: '72px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--primary-color)' }}>
                  <MessageCircle size={36} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Tanpa Perlu Instal Aplikasi</h3>
                <p style={{ color: 'var(--text-muted)' }}>Kasir Anda hanya perlu menggunakan Telegram yang sudah terbiasa mereka pakai. Cukup ketik nominal dan produk.</p>
              </div>

              <div className="card" style={{ textAlign: 'center', padding: '2.5rem', transition: 'transform 0.2s', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
                <div style={{ backgroundColor: '#eff6ff', width: '72px', height: '72px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--primary-color)' }}>
                  <Smartphone size={36} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Deteksi Pembayaran Cerdas</h3>
                <p style={{ color: 'var(--text-muted)' }}>Kirim teks biasa akan dicatat sebagai uang Tunai. Kirim dengan foto bukti otomatis dicatat sebagai QRIS/Transfer Bank.</p>
              </div>

              <div className="card" style={{ textAlign: 'center', padding: '2.5rem', transition: 'transform 0.2s', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
                <div style={{ backgroundColor: '#eff6ff', width: '72px', height: '72px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--primary-color)' }}>
                  <BarChart3 size={36} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Dashboard Real-Time untuk Bos</h3>
                <p style={{ color: 'var(--text-muted)' }}>Anda sebagai pemilik bisa memantau pemasukan dan melihat foto bukti struk dari mana saja dan kapan saja secara langsung.</p>
              </div>

            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ padding: '2.5rem 0', textAlign: 'center', borderTop: '1px solid var(--border-color)', backgroundColor: 'white', color: 'var(--text-muted)' }}>
        <div className="container" style={{ margin: '0 auto' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)', marginBottom: '1rem' }}>
            Yandihan
          </div>
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
            <Link href="/guide" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Panduan Penggunaan</Link>
            <Link href="/login" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Login Bos</Link>
          </div>
          <p>&copy; {new Date().getFullYear()} Yandihan - SaaS UMKM Indonesia.</p>
        </div>
      </footer>
    </div>
  )
}
