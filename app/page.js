"use client";

import Link from 'next/link'
import { ArrowRight, BarChart3, Smartphone, Zap, ShieldCheck, CheckCircle2, Download, RefreshCw, Wifi, CloudLightning } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen" style={{ overflowX: 'hidden', backgroundColor: 'var(--bg-color)' }}>
      
      {/* Navbar */}
      <header style={{ 
        backgroundColor: 'rgba(255,255,255,0.9)', 
        backdropFilter: 'blur(8px)', 
        position: 'sticky', 
        top: 0, 
        zIndex: 100, 
        borderBottom: '1px solid var(--border-color)',
        transition: 'all 0.3s ease'
      }}>
        <div className="container flex justify-between items-center" style={{ padding: '0.875rem 1.5rem' }}>
          {/* Logo */}
          <div style={{ 
            fontSize: '1.5rem', 
            fontWeight: '800', 
            color: 'var(--primary-color)', 
            letterSpacing: '-0.5px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem' 
          }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '8px', 
              background: 'linear-gradient(135deg, var(--primary-color) 0%, #3B82F6 100%)', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '1.2rem',
              fontWeight: '900'
            }}>Y</div>
            Yandihan.
          </div>

          {/* Nav links (hidden on mobile) */}
          <div className="flex gap-6 items-center hidden sm:flex">
            <Link href="#fitur" style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.95rem' }}>Fitur</Link>
            <Link href="#apk" style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.95rem' }}>Aplikasi</Link>
            <Link href="#harga" style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.95rem' }}>Harga</Link>
            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)' }} className="hidden sm:block"></div>
            <Link href="/login" style={{ color: 'var(--text-main)', fontWeight: '700', fontSize: '0.95rem' }}>Masuk</Link>
            <Link href="/signup" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.95rem', borderRadius: '8px' }}>Daftar Gratis</Link>
          </div>

          {/* Mobile menu button (optional) */}
          <div className="flex items-center sm:hidden">
            <button onClick={() => {}} className="p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-col" style={{ flex: 1 }}>
        
        {/* Hero Section */}
        <section className="hero-section bg-gradient-primary" style={{ padding: '8rem 1rem 6rem 6rem' }}>
          <div className="container flex flex-col items-center animate-fade-in" style={{ position: 'relative', zIndex: 10 }}>
            {/* Badge */}
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              backgroundColor: 'var(--secondary-color)', 
              padding: '0.35rem 1rem', 
              borderRadius: '99px', 
              fontSize: '0.875rem', 
              fontWeight: '700', 
              marginBottom: '2rem', 
              color: 'var(--primary-color)', 
              border: '1px solid var(--primary-light, #DBEAFE)', 
              boxShadow: 'var(--shadow-sm)' 
            }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success-color)' }}></span>
              SaaS Kasir & Laporan Keuangan UMKM #1
            </div>
            
            {/* Judul utama */}
            <h1 style={{ 
              fontSize: 'clamp(2.8rem, 6vw, 4.5rem)', 
              fontWeight: '800', 
              lineHeight: 1.1, 
              marginBottom: '1.5rem', 
              maxWidth: '860px', 
              letterSpacing: '-1.5px', 
              color: 'var(--text-main)' 
            }}>
              Lepas dari Catatan Manual, Masuk ke Era Laporan <span style={{ 
                color: 'transparent', 
                backgroundImage: 'linear-gradient(90deg, var(--primary-color), #3B82F6)', 
                WebkitBackgroundClip: 'text', 
                backgroundClip: 'text' 
              }}>Realtime.</span>
            </h1>
            
            {/* Sub-heading */}
            <p style={{ 
              fontSize: 'clamp(1.1rem, 2.2vw, 1.3rem)', 
              color: 'var(--text-muted)', 
              maxWidth: '720px', 
              marginBottom: '2.5rem', 
              lineHeight: 1.8, 
              fontWeight: '500' 
            }}>
              Catat penjualan hanya dengan satu link web – tidak perlu install aplikasi. 
              Dapatkan notifikasi omset harian, bulanan, dan analisis cash flow langsung di Telegram atau dashboard web Anda.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex gap-4 flex-wrap justify-center">
              <Link href="/signup" className="btn btn-primary" style={{ padding: '0.95rem 2.5rem', fontSize: '1.1rem', borderRadius: '8px' }}>
                Mulai Gratis Sekarang <ArrowRight size={20} />
              </Link>
              <a href="/yandihan-kasir.apk" download className="btn btn-secondary" style={{ 
                padding: '0.95rem 2.5rem', 
                fontSize: '1.1rem', 
                borderRadius: '8px', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.5rem' 
              }}>
                📲 Unduh APK Kasir
              </a>
            </div>
          </div>
          
          {/* Hiasan lingkaran blur (tetap) */}
          <div style={{ position: 'absolute', top: '18%', left: '8%', width: '280px', height: '280px', backgroundColor: 'rgba(37, 99, 235, 0.04)', borderRadius: '50%', filter: 'blur(70px)', zIndex: 0 }}></div>
          <div style={{ position: 'absolute', bottom: '12%', right: '10%', width: '360px', height: '360px', backgroundColor: 'rgba(59, 130, 246, 0.04)', borderRadius: '50%', filter: 'blur(90px)', zIndex: 0 }}></div>
        </section>

        {/* Feature Dashboard Preview */}
        <section style={{ marginTop: '-3rem', padding: '0 1rem', position: 'relative', zIndex: 20, paddingBottom: '4rem' }}>
          <div className="container flex justify-center">
            <div className="glass-card floating" style={{ width: '100%', maxWidth: '850px', padding: '0.6rem', borderRadius: '20px' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem', backgroundColor: '#F8FAFC' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#eab308' }}></div>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22c55e' }}></div>
                </div>
                <div style={{ padding: '3.5rem 2rem', textAlign: 'center', background: 'linear-gradient(180deg, #ffffff 0%, #F8FAFC 100%)' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Pemasukan (Bulan Ini)</h3>
                  <p style={{ fontSize: 'clamp(2.25rem, 5vw, 3.25rem)', fontWeight: '800', color: 'var(--text-main)', margin: '0.5rem 0', letterSpacing: '-1px' }}>Rp 24.500.000</p>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#dcfce7', color: '#16a34a', padding: '0.4rem 0.875rem', borderRadius: '99px', fontWeight: '700', fontSize: '0.85rem', marginTop: '0.75rem' }}>
                    <TrendingUpIcon /> Naik 15% dari bulan lalu
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section style={{ padding: '6rem 1rem', backgroundColor: 'var(--card-bg)' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <h2 style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '1rem', letterSpacing: '-1px' }}>
                Cara Kerja Yandihan dalam 3 Langkah
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
                Tidak ada instalasi yang rumit. Mulai kasir dan lapor penjualan dalam hitungan menit.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Langkah 1 */}
              <div className="flex flex-col items-center text-center p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                <div style={{ width: '56px', height: '56px', borderRadius: '14px', backgroundColor: 'var(--secondary-color)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <Smartphone size={28} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>Dapatkan Link Kasir</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  Setelah signup, Anda akan menerima URL unik yang bisa dibuka di browser apa saja.
                </p>
              </div>

              {/* Langkah 2 */}
              <div className="flex flex-col items-center text-center p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                <div style={{ width: '56px', height: '56px', borderRadius: '14px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <BarChart3 size={28} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>Catat Penjualan</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  Kasir hanya perlu menambahkan produk, qty, dan pilih pembayaran. Data langsung terkirim ke server.
                </p>
              </div>

              {/* Langkah 3 */}
              <div className="flex flex-col items-center text-center p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                <div style={{ width: '56px', height: '56px', borderRadius: '14px', backgroundColor: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <Zap size={28} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>Lihat Laporan Realtime</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  Dashboard dan Telegram bot akan memperbarui omset, laba, dan stok secara otomatis.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="fitur" style={{ padding: '6rem 1rem', backgroundColor: 'var(--card-bg)' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <h2 style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '1rem', letterSpacing: '-1px' }}>
                Kenapa Memilih Yandihan?
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
                Didesain khusus untuk mempermudah operasional UMKM tanpa bikin pusing kasir dan pemilik.
              </p>
            </div>

            <div className="feature-grid">
              {/* Fitur 1 */}
              <div className="card" style={{ borderRadius: '12px', backgroundColor: 'white', padding: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--secondary-color)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  <Smartphone size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.75rem', letterSpacing: '-0.5px' }}>Tanpa Download Aplikasi</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.65, fontSize: '0.95rem' }}>
                  Kasir Anda hanya butuh satu link web. Bisa langsung lapor penjualan dari HP apa saja dalam hitungan detik.
                </p>
              </div>

              {/* Fitur 2 */}
              <div className="card" style={{ borderRadius: '12px', backgroundColor: 'white', padding: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  <BarChart3 size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.75rem', letterSpacing: '-0.5px' }}>Laporan Analitik Cerdas</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.65, fontSize: '0.95rem' }}>
                  Pantau rincian omset per bulan dan per hari. Dilengkapi filter spesifik untuk pembayaran Cash vs QRIS/Transfer.
                </p>
              </div>

              {/* Fitur 3 */}
              <div className="card" style={{ borderRadius: '12px', backgroundColor: 'white', padding: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  <Zap size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.75rem', letterSpacing: '-0.5px' }}>Pembaruan Realtime</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.65, fontSize: '0.95rem' }}>
                  Setiap kali kasir menginput data penjualan, dashboard Anda akan langsung terupdate otomatis secara real-time.
                </p>
              </div>

              {/* Fitur 4 */}
              <div className="card" style={{ borderRadius: '12px', backgroundColor: 'white', padding: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  <ShieldCheck size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.75rem', letterSpacing: '-0.5px' }}>Struk Digital Siap Cetak</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.65, fontSize: '0.95rem' }}>
                  Setiap transaksi akan menghasilkan link Struk Digital (format thermal 58mm/80mm) yang rapi dan siap cetak.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="harga" style={{ padding: '7rem 1rem', backgroundColor: 'var(--bg-color)' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
              <h2 style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '1rem', letterSpacing: '-1px' }}>
                Harga Transparan, Tanpa Kejutan
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
                Pilih paket yang sesuai dengan ukuran bisnis Anda. Mulai dari gratis, upgrade kapan saja.
              </p>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '2rem', 
              maxWidth: '900px', 
              margin: '0 auto' 
            }}>

              {/* Free Plan */}
              <div className="card" style={{ 
                padding: '2.5rem 2rem', 
                display: 'flex', 
                flexDirection: 'column', 
                borderRadius: '12px', 
                backgroundColor: 'white', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)', 
                border: '1px solid var(--border-color)' 
              }}>
                <div style={{ marginBottom: '1.75rem' }}>
                  <span style={{ 
                    backgroundColor: 'var(--border-color)', 
                    color: 'var(--text-main)', 
                    padding: '0.25rem 0.875rem', 
                    borderRadius: '99px', 
                    fontSize: '0.8rem', 
                    fontWeight: '700' 
                  }}>GRATIS</span>
                  <h3 style={{ fontSize: '1.85rem', fontWeight: '800', marginTop: '0.875rem' }}>Rp 0 <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: '500' }}>/ selamanya</span></h3>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    Cocok untuk UMKM pemula yang baru merintis bisnis.
                  </p>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', display: 'flex', flexDirection: 'column', gap: '0.875rem', flex: 1 }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', color: 'var(--text-main)', fontWeight: '500', fontSize: '0.92rem' }}>
                    <CheckCircle2 size={18} color="var(--success-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>Maks 30 transaksi per hari</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.92rem' }}>
                    <CheckCircle2 size={18} color="var(--success-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>1 Web Kasir & 1 Akun Telegram Bot</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.92rem' }}>
                    <CheckCircle2 size={18} color="var(--success-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>Laporan Omset Standar</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.92rem' }}>
                    <CheckCircle2 size={18} color="var(--success-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>Manajemen Gudang Produk</span>
                  </li>
                </ul>

                <Link href="/signup" className="btn btn-secondary" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none', fontSize: '0.95rem' }}>Mulai Gratis</Link>
              </div>

              {/* Pro Plan */}
              <div className="card" style={{ 
                padding: '2.5rem 2rem', 
                display: 'flex', 
                flexDirection: 'column', 
                borderRadius: '12px', 
                backgroundColor: 'white', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)', 
                border: '2px solid var(--primary-color)', 
                position: 'relative' 
              }}>
                <div style={{ 
                  position: 'absolute', 
                  top: '-12px', 
                  left: '50%', 
                  transform: 'translateX(-50%)', 
                  backgroundColor: 'var(--primary-color)', 
                  color: 'white', 
                  padding: '0.2rem 1.25rem', 
                  borderRadius: '99px', 
                  fontSize: '0.75rem', 
                  fontWeight: '700', 
                  letterSpacing: '1px' 
                }}>PALING POPULER</div>

                <div style={{ marginBottom: '1.75rem' }}>
                  <span style={{ 
                    backgroundColor: 'var(--secondary-color)', 
                    color: 'var(--primary-color)', 
                    padding: '0.25rem 0.875rem', 
                    borderRadius: '99px', 
                    fontSize: '0.8rem', 
                    fontWeight: '700' 
                  }}>PRO</span>
                  <h3 style={{ fontSize: '1.85rem', fontWeight: '800', marginTop: '0.875rem' }}>Rp 189.000 <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: '500' }}>/ bln</span></h3>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    Untuk bisnis yang sedang berkembang dengan cabang/kasir banyak.
                  </p>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', display: 'flex', flexDirection: 'column', gap: '0.875rem', flex: 1 }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', color: 'var(--text-main)', fontWeight: '500', fontSize: '0.92rem' }}>
                    <CheckCircle2 size={18} color="var(--primary-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontWeight: '700' }}>Transaksi Tanpa Batas</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', color: 'var(--text-main)', fontWeight: '500', fontSize: '0.92rem' }}>
                    <CheckCircle2 size={18} color="var(--primary-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontWeight: '700' }}>Unlimited</span> Web Kasir & Telegram
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', color: 'var(--text-main)', fontWeight: '500', fontSize: '0.92rem' }}>
                    <CheckCircle2 size={18} color="var(--primary-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    Fitur Device Binding (Anti-Copas Link)
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', color: 'var(--text-main)', fontWeight: '500', fontSize: '0.92rem' }}>
                    <CheckCircle2 size={18} color="var(--primary-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    Analitik Lanjutan & Prioritas Support
                  </li>
                </ul>

                <Link href="/login" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none', fontSize: '0.95rem' }}>Berlangganan PRO</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ padding: '3.5rem 1rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
        <div className="container" style={{ margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.75rem', letterSpacing: '-0.5px' }}>
            Yandihan.
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '400px', lineHeight: 1.6, fontSize: '0.92rem' }}>
            Memberdayakan UMKM Indonesia dengan teknologi pencatatan keuangan yang modern, cepat, dan aman.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/guide" style={{ color: 'var(--text-main)', fontWeight: '600', fontSize: '0.92rem' }}>Panduan</Link>
            <Link href="/login" style={{ color: 'var(--text-main)', fontWeight: '600', fontSize: '0.92rem' }}>Login Owner</Link>
            <a href="mailto:support@yandihan.my.id" style={{ color: 'var(--text-main)', fontWeight: '600', fontSize: '0.92rem' }}>Hubungi Kami</a>
          </div>
          
          {/* Social Media Icons */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <a href="https://instagram.com/yandihan" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 5.806 1.762 5.806 3.937 0 2.174-1.762 3.936-5.806 3.936-3.204 0-5.806-1.762-5.806-3.936 0-2.175 1.762-3.937 5.806-3.937zm0 1.441a2.886 2.886 0 100 5.772 2.886 2.886 0 000-5.772zM12 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7zm6.432-4.803a4.75 4.75 0 00-6.432 0 4.75 4.75 0 000 6.432 4.75 4.75 0 006.432 0 4.75 4.75 0 000-6.432z"/></svg>
            </a>
            <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.1 3.9C17.9 1.7 15 .5 12 .5 5.8.5.7 5.6.7 11.9c0 2 .5 3.9 1.5 5.6L.6 23.4l6-1.6c1.6.9 3.5 1.3 5.4 1.3 6.3 0 11.5-5.1 11.5-11.5-.1-2.8-1.2-5.7-3.3-7.8zM16.7 12c-1.8 0-3.2-.9-3.8-2.2l1.1-3.1c.3-.4.7-.6 1.2-.6h1.2c.7 0 1.2.5 1.2 1.2 0 .6-.3 1.1-.8 1.5l-2.1 3.4z"/></svg>
            </a>
          </div>
          
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: '500' }}>&copy; {new Date().getFullYear()} Yandihan SaaS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

function TrendingUpIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
      <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
  )
}
