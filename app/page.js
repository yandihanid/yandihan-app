import Link from 'next/link'
import { ArrowRight, BarChart3, Smartphone, Zap, ShieldCheck, CheckCircle2 } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen" style={{ overflowX: 'hidden' }}>
      
      {/* Navbar */}
      <header style={{ backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid rgba(226, 232, 240, 0.8)' }}>
        <div className="container flex justify-between items-center" style={{ padding: '1rem 1.5rem' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary-color)', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--primary-color) 0%, #337AFF 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>Y</div>
            Yandihan.
          </div>
          <div className="flex gap-6 items-center">
            <Link href="#fitur" style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.95rem' }} className="hidden sm:inline">Fitur</Link>
            <Link href="#harga" style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.95rem' }} className="hidden sm:inline">Harga</Link>
            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)' }} className="hidden sm:block"></div>
            <Link href="/login" style={{ color: 'var(--text-main)', fontWeight: '700', fontSize: '0.95rem' }}>Masuk</Link>
            <Link href="/signup" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.95rem' }}>Daftar Gratis</Link>
          </div>
        </div>
      </header>

      <main className="flex-col" style={{ flex: 1 }}>
        
        {/* Hero Section */}
        <section className="hero-section bg-gradient-primary">
          <div className="container flex flex-col items-center animate-fade-in" style={{ position: 'relative', zIndex: 10 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--card-bg)', padding: '0.35rem 1rem', borderRadius: '99px', fontSize: '0.875rem', fontWeight: '700', marginBottom: '2rem', color: 'var(--primary-color)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success-color)' }}></span>
              SaaS Kasir & Laporan UMKM #1
            </div>
            
            <h1 style={{ fontSize: 'clamp(2.75rem, 6vw, 4.5rem)', fontWeight: '800', lineHeight: 1.15, marginBottom: '1.5rem', maxWidth: '850px', letterSpacing: '-1.5px', color: 'var(--text-main)' }}>
              Tinggalkan Catatan Manual, Beralih ke Laporan <span style={{ color: 'transparent', backgroundImage: 'linear-gradient(90deg, var(--primary-color), #00C6FF)', WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>Realtime.</span>
            </h1>
            
            <p style={{ fontSize: 'clamp(1.1rem, 2vw, 1.25rem)', color: 'var(--text-muted)', maxWidth: '650px', marginBottom: '3rem', lineHeight: 1.7, fontWeight: '500' }}>
              Solusi catat penjualan super instan via Link Web atau WhatsApp/Telegram. Pantau omset harian dan bulanan langsung dari HP Anda tanpa ribet.
            </p>
            
            <div className="flex gap-4" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link href="/signup" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.125rem' }}>
                Mulai Gratis Sekarang <ArrowRight size={20} />
              </Link>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div style={{ position: 'absolute', top: '20%', left: '10%', width: '300px', height: '300px', backgroundColor: 'rgba(0, 82, 255, 0.05)', borderRadius: '50%', filter: 'blur(60px)', zIndex: 0 }}></div>
          <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px', backgroundColor: 'rgba(0, 198, 255, 0.05)', borderRadius: '50%', filter: 'blur(80px)', zIndex: 0 }}></div>
        </section>

        {/* Feature Dashboard Preview (Floating Glass) */}
        <section style={{ marginTop: '-4rem', padding: '0 1rem', position: 'relative', zIndex: 20, paddingBottom: '4rem' }}>
          <div className="container flex justify-center">
            <div className="glass-card floating" style={{ width: '100%', maxWidth: '900px', padding: '0.75rem', borderRadius: '24px' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}>
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem', backgroundColor: '#FAFAF9' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#eab308' }}></div>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#22c55e' }}></div>
                </div>
                <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'linear-gradient(180deg, #ffffff 0%, #FAFAF9 100%)' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Pemasukan (Bulan Ini)</h3>
                  <p style={{ fontSize: '3.5rem', fontWeight: '800', color: 'var(--text-main)', margin: '0.5rem 0', letterSpacing: '-1px' }}>Rp 24.500.000</p>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#dcfce7', color: '#16a34a', padding: '0.5rem 1rem', borderRadius: '99px', fontWeight: '700', fontSize: '0.9rem', marginTop: '1rem' }}>
                    <TrendingUpIcon /> Naik 15% dari bulan lalu
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="fitur" style={{ padding: '6rem 1rem', backgroundColor: 'var(--card-bg)' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '1rem', letterSpacing: '-1px' }}>Kenapa Memilih Yandihan?</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem', maxWidth: '600px', margin: '0 auto' }}>Didesain khusus untuk mempermudah operasional UMKM tanpa bikin pusing kasir dan pemilik.</p>
            </div>
            
            <div className="feature-grid">
              <div className="card">
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'var(--secondary-color)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <Smartphone size={28} />
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '700', marginBottom: '0.75rem', letterSpacing: '-0.5px' }}>Tanpa Download Aplikasi</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>Kasir Anda hanya butuh satu link web atau nomor Telegram. Bisa lapor penjualan dari HP apapun dalam hitungan detik.</p>
              </div>
              
              <div className="card">
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <BarChart3 size={28} />
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '700', marginBottom: '0.75rem', letterSpacing: '-0.5px' }}>Laporan Analitik Cerdas</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>Pantau rincian omset per bulan dan per hari. Dilengkapi filter spesifik untuk pembayaran Cash vs QRIS/Transfer.</p>
              </div>
              
              <div className="card">
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <Zap size={28} />
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '700', marginBottom: '0.75rem', letterSpacing: '-0.5px' }}>Pembaruan Realtime</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>Setiap kali kasir menginput data penjualan, dashboard Anda akan langsung terupdate otomatis tanpa perlu refresh layar.</p>
              </div>

              <div className="card">
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <ShieldCheck size={28} />
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '700', marginBottom: '0.75rem', letterSpacing: '-0.5px' }}>Struk Digital Siap Cetak</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>Setiap transaksi akan menghasilkan link Struk Digital (format thermal 80mm) yang rapi dan bisa langsung diprint bluetooth.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="harga" style={{ padding: '8rem 1rem', backgroundColor: 'var(--bg-color)' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '1rem', letterSpacing: '-1px' }}>Harga Transparan, Tanpa Kejutan</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem', maxWidth: '600px', margin: '0 auto' }}>Pilih paket yang sesuai dengan ukuran bisnis Anda. Mulai dari gratis, upgrade kapan saja.</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', maxWidth: '900px', margin: '0 auto' }}>
              
              {/* Free Plan */}
              <div className="card" style={{ padding: '3rem 2rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '2rem' }}>
                  <span style={{ backgroundColor: 'var(--border-color)', color: 'var(--text-main)', padding: '0.25rem 1rem', borderRadius: '99px', fontSize: '0.875rem', fontWeight: '700' }}>GRATIS</span>
                  <h3 style={{ fontSize: '2rem', fontWeight: '800', marginTop: '1rem' }}>Rp 0 <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>/ selamanya</span></h3>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Cocok untuk UMKM pemula yang baru merintis bisnis.</p>
                </div>
                
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2.5rem 0', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: 'var(--text-main)', fontWeight: '500' }}>
                    <CheckCircle2 size={20} color="var(--success-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    Maks 30 transaksi per hari
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: 'var(--text-main)', fontWeight: '500' }}>
                    <CheckCircle2 size={20} color="var(--success-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    1 Web Kasir & 1 Akun Telegram Bot
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: 'var(--text-main)', fontWeight: '500' }}>
                    <CheckCircle2 size={20} color="var(--success-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    Laporan Omset Standar
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: 'var(--text-main)', fontWeight: '500' }}>
                    <CheckCircle2 size={20} color="var(--success-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    Manajemen Gudang Produk
                  </li>
                </ul>
                
                <Link href="/signup" className="btn btn-secondary" style={{ width: '100%', padding: '1rem' }}>Mulai Gratis</Link>
              </div>

              {/* Pro Plan */}
              <div className="card" style={{ padding: '3rem 2rem', display: 'flex', flexDirection: 'column', border: '2px solid var(--primary-color)', position: 'relative', transform: 'scale(1.05)', boxShadow: 'var(--shadow-lg)', zIndex: 10 }}>
                <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--primary-color)', color: 'white', padding: '0.25rem 1.5rem', borderRadius: '99px', fontSize: '0.875rem', fontWeight: '700', letterSpacing: '1px' }}>PALING POPULER</div>
                
                <div style={{ marginBottom: '2rem' }}>
                  <span style={{ backgroundColor: 'var(--secondary-color)', color: 'var(--primary-color)', padding: '0.25rem 1rem', borderRadius: '99px', fontSize: '0.875rem', fontWeight: '700' }}>PRO</span>
                  <h3 style={{ fontSize: '2rem', fontWeight: '800', marginTop: '1rem' }}>Rp 189.000 <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>/ bln</span></h3>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Untuk bisnis yang sedang berkembang dengan cabang/kasir banyak.</p>
                </div>
                
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2.5rem 0', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: 'var(--text-main)', fontWeight: '500' }}>
                    <CheckCircle2 size={20} color="var(--primary-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontWeight: '700' }}>Transaksi Tanpa Batas</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: 'var(--text-main)', fontWeight: '500' }}>
                    <CheckCircle2 size={20} color="var(--primary-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontWeight: '700' }}>Unlimited</span> Web Kasir & Telegram
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: 'var(--text-main)', fontWeight: '500' }}>
                    <CheckCircle2 size={20} color="var(--primary-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    Fitur Device Binding (Anti-Copas Link)
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: 'var(--text-main)', fontWeight: '500' }}>
                    <CheckCircle2 size={20} color="var(--primary-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    Analitik Lanjutan & Prioritas Support
                  </li>
                </ul>
                
                <Link href="/login" className="btn btn-primary" style={{ width: '100%', padding: '1rem' }}>Berlangganan PRO</Link>
              </div>
              
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ padding: '4rem 1rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
        <div className="container" style={{ margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '1rem', letterSpacing: '-0.5px' }}>
            Yandihan.
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', maxWidth: '400px', lineHeight: 1.6 }}>
            Memberdayakan UMKM Indonesia dengan teknologi pencatatan keuangan yang modern, cepat, dan aman.
          </p>
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/guide" style={{ color: 'var(--text-main)', fontWeight: '600' }}>Panduan</Link>
            <Link href="/login" style={{ color: 'var(--text-main)', fontWeight: '600' }}>Login Owner</Link>
            <a href="mailto:support@yandihan.my.id" style={{ color: 'var(--text-main)', fontWeight: '600' }}>Hubungi Kami</a>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '500' }}>&copy; {new Date().getFullYear()} Yandihan SaaS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

function TrendingUpIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
      <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
  )
}
