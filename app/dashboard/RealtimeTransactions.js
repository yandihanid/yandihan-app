'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { formatRupiah, formatDateTimeWib } from '@/lib/format'

/**
 * `created_at` dari payload Realtime tidak selalu ISO penuh: kadang pemisahnya
 * spasi, kadang tanpa penanda zona sama sekali. Tanpa penanda zona, `Date`
 * memperlakukannya sebagai waktu LOKAL browser — salah, karena kolomnya
 * `timestamptz` yang selalu UTC. Karena itu dinormalkan dulu ke epoch ms, bukan
 * dibandingkan sebagai string.
 */
function toMs(value) {
  if (!value) return NaN
  let s = String(value).trim().replace(' ', 'T')
  if (!/(?:[Zz]|[+-]\d{2}:?\d{2})$/.test(s)) s += 'Z'
  return Date.parse(s)
}

const TIME_TABS = [
  ['TODAY', 'Hari Ini'],
  ['THIS_MONTH', 'Bulan Ini'],
  ['ALL_TIME', 'Semua Waktu'],
]

const METHOD_TABS = [
  ['ALL', 'Semua'],
  ['CASH', 'Tunai'],
  ['QRIS/TF', 'QRIS/TF'],
]

/** Satu gaya pill, dulu ditulis ulang enam kali dengan isi yang sama. */
function pillStyle(active) {
  return {
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '500',
    backgroundColor: active ? 'white' : 'transparent',
    color: active ? 'var(--text-main)' : 'var(--text-muted)',
    boxShadow: active ? 'var(--shadow-sm)' : 'none',
  }
}

/**
 * Daftar transaksi + total, diperbarui lewat Supabase Realtime.
 *
 * `rangeStart`/`rangeEnd` datang dari server (lib/time.js, zona WIB) dan
 * setengah-terbuka. Sebelumnya komponen ini menghitung sendiri batas "hari ini"
 * dari `new Date()` di BROWSER, sementara halaman servernya menghitung batas
 * yang sama dari jam mesin server (UTC di Vercel). Akibatnya transaksi jam
 * 23:30 WIB bisa muncul di satu sisi dan hilang di sisi lain (temuan C5).
 * Sekarang keduanya memakai satu batas yang sama.
 *
 * State daftar direset oleh `key` di komponen induk saat filter berubah, bukan
 * oleh useEffect yang menulis state.
 */
export default function RealtimeTransactions({
  initialTransactions,
  storeId,
  filter,
  timeFilter,
  rangeStart,
  rangeEnd,
}) {
  const [transactions, setTransactions] = useState(initialTransactions || [])
  const supabase = createClient()

  useEffect(() => {
    const startMs = rangeStart ? Date.parse(rangeStart) : null
    const endMs = rangeEnd ? Date.parse(rangeEnd) : null

    const channel = supabase
      .channel(`realtime:transactions:${storeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions', filter: `store_id=eq.${storeId}` },
        async (payload) => {
          const newTx = payload.new
          if (!newTx) return

          // Filter metode & rentang waktu diterapkan lagi di sini karena
          // Realtime hanya bisa memfilter store_id.
          if (filter !== 'ALL' && newTx.payment_method !== filter) return

          const txMs = toMs(newTx.created_at)
          if (Number.isFinite(txMs)) {
            if (startMs !== null && txMs < startMs) return
            if (endMs !== null && txMs >= endMs) return
          }

          let cashier = null
          if (newTx.cashier_id) {
            const { data } = await supabase
              .from('cashiers')
              .select('name')
              .eq('id', newTx.cashier_id)
              .maybeSingle()
            cashier = data ?? null
          }

          // Baris yang sama bisa datang dua kali (mis. setelah reconnect).
          setTransactions((prev) =>
            prev.some((tx) => tx.id === newTx.id) ? prev : [{ ...newTx, cashiers: cashier }, ...prev]
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [storeId, filter, rangeStart, rangeEnd, supabase])

  const totalIncome = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)

  return (
    <>
      <div className="card animate-fade-in" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
        <p style={{ opacity: 0.8, display: 'flex', alignItems: 'center' }}>
          Total Pemasukan {filter !== 'ALL' ? `(${filter})` : ''}
          <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '12px', marginLeft: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span aria-hidden="true" style={{ width: '6px', height: '6px', backgroundColor: '#86efac', borderRadius: '50%', animation: 'pulse 2s infinite' }}></span> Live
          </span>
        </p>
        <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0 0 0' }}>{formatRupiah(totalIncome)}</h3>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>Riwayat Transaksi</h3>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Toggle Waktu */}
            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '0.25rem' }}>
              {TIME_TABS.map(([value, label]) => (
                <Link
                  key={value}
                  href={`/dashboard?filter=${encodeURIComponent(filter)}&time=${value}`}
                  aria-current={timeFilter === value ? 'page' : undefined}
                  style={pillStyle(timeFilter === value)}
                >
                  {label}
                </Link>
              ))}
            </div>

            {/* Toggle Filter Metode */}
            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '0.25rem' }}>
              {METHOD_TABS.map(([value, label]) => (
                <Link
                  key={value}
                  href={`/dashboard?filter=${encodeURIComponent(value)}&time=${timeFilter}`}
                  aria-current={filter === value ? 'page' : undefined}
                  style={pillStyle(filter === value)}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Kasir</th>
                <th>Produk</th>
                <th>Metode</th>
                <th>Nominal</th>
                <th>Bukti</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Belum ada transaksi.</td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="animate-fade-in">
                    {/* Dulu toLocaleString('id-ID') tanpa timeZone: jam yang
                        tampil ikut zona mesin yang merendernya. */}
                    <td>{formatDateTimeWib(toMs(tx.created_at))}</td>
                    <td>{tx.cashiers?.name || 'Tidak diketahui'}</td>
                    <td>
                      <div>{tx.product_name}</div>
                      {tx.customer_name && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          👤 {tx.customer_name}
                          {tx.customer_phone ? ` (${tx.customer_phone})` : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '99px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: tx.payment_method === 'CASH' ? '#d1fae5' : '#dbeafe',
                          color: tx.payment_method === 'CASH' ? '#065f46' : '#1e40af',
                        }}
                      >
                        {tx.payment_method}
                      </span>
                    </td>
                    <td style={{ fontWeight: '500' }}>
                      <div>{formatRupiah(tx.amount)}</div>
                      {tx.discount_percent > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '700', marginTop: '0.15rem' }}>
                          🏷️ {tx.discount_percent}% OFF
                        </div>
                      )}
                    </td>
                    <td>
                      {tx.receipt_url ? (
                        <a href={tx.receipt_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--primary-color)' }}>Lihat</a>
                      ) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
