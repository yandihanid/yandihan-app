import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Smartphone, Download, Wifi, WifiOff, Send } from 'lucide-react';

export const metadata = {
  title: 'Panduan Penggunaan - Yandihan',
  description: 'Panduan lengkap cara menggunakan aplikasi Yandihan untuk pemilik usaha dan kasir.',
};

export default function GuidePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color, #F4F7FC)' }}>
      {/* ── Header Bar ── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: '#FFFFFF',
          borderBottom: '1px solid var(--border-color, #E2E8F0)',
          padding: '0.875rem clamp(1rem, 4vw, 2.5rem)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <span
          style={{
            fontSize: 'clamp(1.05rem, 2.5vw, 1.3rem)',
            fontWeight: 700,
            color: 'var(--primary-color, #2563EB)',
            letterSpacing: '-0.01em',
          }}
        >
          Yandihan Guidebook
        </span>

        <Link
          href="/"
          className="btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.88rem',
            fontWeight: 600,
            color: 'var(--primary-color, #2563EB)',
            textDecoration: 'none',
            padding: '0.45rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--primary-color, #2563EB)',
            background: 'transparent',
            transition: 'background 0.2s, color 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          <ArrowLeft size={16} />
          Kembali
        </Link>
      </header>

      {/* ── Main Content ── */}
      <main
        className="container"
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: 'clamp(1.25rem, 4vw, 2.5rem) clamp(1rem, 4vw, 2rem)',
        }}
      >
        <div
          className="card animate-fade-in"
          style={{
            padding: 'clamp(1.5rem, 4vw, 3rem)',
            borderRadius: '16px',
            background: '#FFFFFF',
          }}
        >
          {/* ── Page Title ── */}
          <h1
            style={{
              fontSize: 'clamp(1.45rem, 3.5vw, 2rem)',
              fontWeight: 800,
              color: 'var(--text-main, #1E293B)',
              marginBottom: '0.35rem',
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
            }}
          >
            Panduan Penggunaan Yandihan
          </h1>
          <p
            style={{
              color: 'var(--text-muted, #64748B)',
              fontSize: '0.95rem',
              marginBottom: '2.25rem',
              lineHeight: 1.6,
            }}
          >
            Ikuti langkah-langkah berikut agar Anda dapat menggunakan Yandihan dengan maksimal.
          </p>

          {/* ═══════════════════════════════════════════
              Section 1 — Untuk Bos / Pemilik Usaha
          ═══════════════════════════════════════════ */}
          <SectionHeading number="1" title="Untuk Bos / Pemilik Usaha" />

          <ul style={{ listStyle: 'none', padding: 0, margin: '1.25rem 0 0 0', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <ChecklistItem
              title="Buat Akun dan Profil Toko"
              description="Daftarkan akun baru melalui halaman utama, lalu lengkapi profil toko Anda termasuk nama toko, alamat, dan logo."
            />
            <ChecklistItem
              title="Cara Menambahkan Kasir (Metode Web) — Sangat Disarankan"
              description="Buka menu pengaturan toko, klik 'Tambah Kasir', lalu bagikan link khusus kasir kepada karyawan Anda. Kasir cukup membuka link tersebut di browser HP untuk mulai melapor."
            />
            <ChecklistItem
              title="Cara Melihat Laporan"
              description="Akses menu 'Laporan' di dashboard Anda untuk melihat ringkasan penjualan harian, mingguan, dan bulanan secara real-time."
            />
          </ul>

          {/* ── Divider ── */}
          <hr
            style={{
              border: 'none',
              borderTop: '1px solid var(--border-color, #E2E8F0)',
              margin: '2.25rem 0',
            }}
          />

          {/* ═══════════════════════════════════════════
              Section 2 — Untuk Kasir
          ═══════════════════════════════════════════ */}
          <SectionHeading number="2" title="Untuk Kasir (Cara Lapor via Web / APK Android)" />

          {/* APK Download Card */}
          <div
            style={{
              background: '#EFF6FF',
              borderRadius: '12px',
              padding: 'clamp(1rem, 3vw, 1.5rem)',
              margin: '1.25rem 0 1.75rem 0',
              border: '1px solid #DBEAFE',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: '#DBEAFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Smartphone size={22} style={{ color: 'var(--primary-color, #2563EB)' }} />
              </div>

              <p
                style={{
                  flex: 1,
                  margin: 0,
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  color: 'var(--text-main, #1E293B)',
                  lineHeight: 1.45,
                  minWidth: '160px',
                }}
              >
                Download Aplikasi Kasir Android untuk transaksi offline
              </p>

              <a
                href="/yandihan-kasir.apk"
                download
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  padding: '0.5rem 1.15rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <Download size={15} />
                Download APK
              </a>
            </div>
            <p
              style={{
                margin: '0.7rem 0 0 0',
                fontSize: '0.78rem',
                color: 'var(--text-muted, #64748B)',
              }}
            >
              Khusus Android • ~4MB • Gratis
            </p>
          </div>

          {/* Numbered Steps */}
          <ol
            style={{
              paddingLeft: '1.25rem',
              margin: '0 0 0 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              color: 'var(--text-main, #1E293B)',
              fontSize: '0.93rem',
              lineHeight: 1.7,
            }}
          >
            <li>
              Buka aplikasi <strong>Yandihan Kasir</strong> yang telah diinstal, atau buka link web{' '}
              <code style={codeStyle}>yandihan.my.id/c/...</code> di browser HP.
            </li>
            <li>
              Jika menggunakan aplikasi APK, masukkan <strong>link kasir Anda</strong> pada kolom
              yang disediakan (hanya dilakukan sekali di awal).
            </li>
            <li>Masukkan nominal uang penjualan (hanya angka).</li>
            <li>Masukkan nama produk yang terjual.</li>
            <li>
              Pilih metode pembayaran (<strong>CASH</strong> atau{' '}
              <strong>QRIS/Transfer</strong>).
            </li>
            <li>
              Jika pelanggan bayar via QRIS/Transfer, <strong>wajib upload foto bukti bayar</strong>.
            </li>
            <li>
              Klik tombol <strong>Kirim Laporan</strong>.
            </li>
            <li>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    background: '#FEF3C7',
                    color: '#92400E',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.55rem',
                    borderRadius: '6px',
                    whiteSpace: 'nowrap',
                    marginTop: '0.15rem',
                    letterSpacing: '0.02em',
                  }}
                >
                  <Wifi size={13} />
                  <WifiOff size={13} />
                  FITUR OFFLINE
                </span>
                <span>
                  Jika koneksi terputus, transaksi tetap tersimpan secara lokal. Begitu terhubung ke
                  internet, transaksi otomatis tersinkronisasi.
                </span>
              </div>
            </li>
          </ol>

          {/* ── Divider ── */}
          <hr
            style={{
              border: 'none',
              borderTop: '1px solid var(--border-color, #E2E8F0)',
              margin: '2.25rem 0',
            }}
          />

          {/* ═══════════════════════════════════════════
              Section 3 — Telegram Bot
          ═══════════════════════════════════════════ */}
          <SectionHeading number="3" title="Alternatif Lain: Lapor via Telegram Bot" />

          <div
            style={{
              background: '#F0FDF4',
              borderRadius: '12px',
              padding: 'clamp(1rem, 3vw, 1.5rem)',
              margin: '1.25rem 0 0 0',
              border: '1px solid #BBF7D0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
              <Send size={18} style={{ color: 'var(--success-color, #16A34A)' }} />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main, #1E293B)' }}>
                Telegram Bot
              </span>
            </div>
            <ol
              style={{
                paddingLeft: '1.25rem',
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                color: 'var(--text-main, #1E293B)',
                fontSize: '0.92rem',
                lineHeight: 1.65,
              }}
            >
              <li>
                Buka Telegram, cari bot{' '}
                <strong>@YandihanBot</strong> (atau gunakan link yang diberikan oleh pemilik toko).
              </li>
              <li>
                Ketik <code style={codeStyle}>/start</code> untuk memulai dan ikuti instruksi
                pendaftaran.
              </li>
              <li>
                Untuk melapor, kirim pesan dengan format:
                <div
                  style={{
                    background: '#DCFCE7',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    marginTop: '0.5rem',
                    fontFamily: 'monospace',
                    fontSize: '0.84rem',
                    color: '#166534',
                    lineHeight: 1.6,
                    overflowX: 'auto',
                  }}
                >
                  /lapor [nominal] [nama produk] [metode: cash/qris]
                </div>
              </li>
              <li>
                Bot akan mengkonfirmasi laporan Anda. Jika menggunakan QRIS/Transfer, bot akan
                meminta foto bukti bayar.
              </li>
            </ol>
          </div>
        </div>

        {/* Footer note */}
        <p
          style={{
            textAlign: 'center',
            color: 'var(--text-muted, #64748B)',
            fontSize: '0.82rem',
            marginTop: '2rem',
            paddingBottom: '1rem',
          }}
        >
          © {new Date().getFullYear()} Yandihan — Semua hak dilindungi.
        </p>
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Sub-components (server-safe, no 'use client')
   ───────────────────────────────────────────── */

function SectionHeading({ number, title }) {
  return (
    <h2
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        fontSize: 'clamp(1.05rem, 2.5vw, 1.25rem)',
        fontWeight: 700,
        color: 'var(--text-main, #1E293B)',
        margin: 0,
        lineHeight: 1.35,
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'var(--primary-color, #2563EB)',
          color: '#FFFFFF',
          fontSize: '0.85rem',
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {number}
      </span>
      {title}
    </h2>
  );
}

function ChecklistItem({ title, description }) {
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
      }}
    >
      <CheckCircle2
        size={20}
        style={{
          color: 'var(--success-color, #16A34A)',
          flexShrink: 0,
          marginTop: '0.15rem',
        }}
      />
      <div>
        <strong style={{ color: 'var(--text-main, #1E293B)', fontSize: '0.95rem' }}>
          {title}
        </strong>
        <p
          style={{
            margin: '0.25rem 0 0 0',
            color: 'var(--text-muted, #64748B)',
            fontSize: '0.88rem',
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      </div>
    </li>
  );
}

/* ── Shared inline token ── */
const codeStyle = {
  background: '#F1F5F9',
  padding: '0.15rem 0.45rem',
  borderRadius: '5px',
  fontSize: '0.85em',
  fontFamily: 'monospace',
  color: 'var(--primary-color, #2563EB)',
};
