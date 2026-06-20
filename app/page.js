import Link from 'next/link'
import { ArrowRight, BarChart3, Smartphone, Zap, ShieldCheck } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen" style={{ overflowX: 'hidden' }}>
      
      {/* Navbar */}
      <header style={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid var(--border-color)' }}>
        <div className="container flex justify-between items-center" style={{ padding: '1rem 1rem' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary-color)', letterSpacing: '-0.5px' }}>
            Yandihan.
          </div>
          <div className="flex gap-4 items-center">
            <Link href="/guide" style={{ color: 'var(--text-muted)', fontWeight: '500', marginRight: '0.5rem', fontSize: '0.9rem' }} className="hidden sm:inline">Panduan</Link>
            <Link href="/login" style={{ color: 'var(--text-main)', fontWeight: '600', fontSize: '0.95rem' }}>Masuk</Link>
            <Link href="/signup" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', borderRadius: '99px', fontSize: '0.95rem' }}>Daftar Gratis</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-col" style={{ flex: 1 }}>
        <section className="hero-section bg-gradient-primary">
          <div className="container flex flex-col items-center animate-fade-in" style={{ position: 'relative', zIndex: 10 }}>
            <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.25rem 1rem', borderRadius: '99px', fontSize: '0.875rem', fontWeight: '600', marginBottom: '1.5rem' }}>
              SaaS Kasir & Laporan UMKM #1
            </span>
            <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: '800', lineHeight: 1.1, marginBottom: '1.5rem', maxWidth: '800px', letterSpacing: '-1px' }}>
              Tinggalkan Catatan Manual, <br /> Beralih ke Laporan <span style={{ color: '#bae6fd' }}>Realtime</span>.
            </h1>
            <p style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', opacity: 0.9, maxWidth: '600px', marginBottom: '2.5rem', lineHeight: 1.6 }}>
              Solusi catat penjualan super instan via Link Web atau WhatsApp/Telegram. Pantau omset harian dan bulanan langsung dari HP Anda tanpa ribet.
            </p>
            <div className="flex gap-4" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link href="/signup" className="btn" style={{ backgroundColor: 'white', color: 'var(--primary-color)', borderRadius: '99px', padding: '1rem 2rem', fontSize: '1.125rem', fontWeight: '700', boxShadow: '0 4px 14px 0 rgba(0,0,0,0.2)' }}>
                Mulai Gratis Sekarang <ArrowRight size={20} style={{ marginLeft: '8px' }} />
              </Link>
            </div>
          </div>
          
          {/* Decorative shapes */}
          <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '300px', height: '300px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(40px)' }}></div>
          <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '400px', height: '400px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '50%', filter: 'blur(60px)' }}></div>
        </section>

        {/* Feature Dashboard Preview (Floating) */}
        <section style={{ marginTop: '-4rem', padding: '0 1rem', position: 'relative', zIndex: 20 }}>
          <div className="container flex justify-center">
            <div className="glass-card floating" style={{ width: '100%', maxWidth: '900px', padding: '1rem', border: '8px solid rgba(255,255,255,0.5)' }}>
              <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '1rem', backgroundColor: 'white' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#eab308' }}></div>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#22c55e' }}></div>
                </div>
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Total Pemasukan (Bulan Ini)</h3>
                  <p style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--primary-color)', margin: '1rem 0' }}>Rp 24.500.000</p>
                  <p style={{ color: 'var(--success-color)', fontWeight: '600' }}>↑ Naik 15% dari bulan lalu</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section style={{ padding: '6rem 1rem', backgroundColor: 'var(--bg-color)' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '1rem' }}>Kenapa Memilih Yandihan?</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>Didesain khusus untuk mempermudah operasional UMKM tanpa bikin pusing kasir.</p>
            </div>
            
            <div className="feature-grid">
              <div className="card" style={{ padding: '2rem' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <Smartphone size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>Tanpa Download Aplikasi</h3>
                <p style={{ color: 'var(--text-muted)' }}>Kasir Anda hanya butuh satu link web atau nomor Telegram. Bisa lapor penjualan dari HP apapun dalam hitungan detik.</p>
              </div>
              
              <div className="card" style={{ padding: '2rem' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <BarChart3 size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>Laporan Analitik Cerdas</h3>
                <p style={{ color: 'var(--text-muted)' }}>Pantau rincian omset per bulan dan per hari. Dilengkapi filter spesifik untuk pembayaran Cash vs QRIS/Transfer.</p>
              </div>
              
              <div className="card" style={{ padding: '2rem' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <Zap size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>Pembaruan Realtime</h3>
                <p style={{ color: 'var(--text-muted)' }}>Setiap kali kasir menginput data penjualan, dashboard Anda akan langsung terupdate otomatis tanpa perlu refresh layar.</p>
              </div>

              <div className="card" style={{ padding: '2rem' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <ShieldCheck size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>Struk Digital Siap Cetak</h3>
                <p style={{ color: 'var(--text-muted)' }}>Setiap transaksi akan menghasilkan link Struk Digital (format thermal 80mm) yang rapi dan bisa langsung diprint bluetooth.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ padding: '3rem 1rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'white' }}>
        <div className="container" style={{ margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary-color)', marginBottom: '1rem', letterSpacing: '-0.5px' }}>
            Yandihan.
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '400px' }}>
            Memberdayakan UMKM Indonesia dengan teknologi pencatatan keuangan yang modern, simpel, dan gratis.
          </p>
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
            <Link href="/guide" style={{ color: 'var(--text-main)', fontWeight: '500', textDecoration: 'none' }}>Panduan</Link>
            <Link href="/login" style={{ color: 'var(--text-main)', fontWeight: '500', textDecoration: 'none' }}>Login Bos</Link>
            <a href="mailto:support@yandihan.my.id" style={{ color: 'var(--text-main)', fontWeight: '500', textDecoration: 'none' }}>Hubungi Kami</a>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>&copy; {new Date().getFullYear()} Yandihan SaaS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
