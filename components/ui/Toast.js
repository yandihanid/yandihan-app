'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

/**
 * Notifikasi non-blokir, pengganti sepuluh pemakaian alert() di lima file.
 *
 * alert() punya tiga masalah nyata di aplikasi ini, bukan sekadar tampilan:
 *   1. memblokir seluruh tab, jadi transaksi berikutnya tidak bisa dimulai
 *      sampai kasir menekan OK -- di jam sibuk itu terasa;
 *   2. teksnya tidak bisa diformat, jadi nominal dan nama produk berdesakan;
 *   3. browser boleh menekan alert() secara permanen setelah pengguna
 *      mencentang "jangan tampilkan lagi", dan setelah itu setiap kegagalan
 *      simpan jadi hening -- pengguna mengira datanya tersimpan.
 *
 * aria-live ada di container yang selalu terpasang (bukan di toast-nya):
 * pembaca layar hanya mengumumkan perubahan pada wilayah live yang sudah ada
 * di DOM sejak awal. Menambahkan elemen ber-aria-live bersamaan dengan isinya
 * sering tidak terdengar sama sekali.
 */
const ToastContext = createContext(null)

const DEFAULT_MS = 4000

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())
  const seq = useRef(0)

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (message, { variant = 'success', duration = DEFAULT_MS } = {}) => {
      seq.current += 1
      const id = seq.current
      setToasts((prev) => [...prev, { id, message, variant }])
      // Error tidak menghilang sendiri: pesan yang paling perlu dibaca adalah
      // pesan yang paling sering terlewat kalau hanya tampil empat detik.
      if (duration > 0 && variant !== 'error') {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration)
        )
      }
      return id
    },
    [dismiss]
  )

  const value = useMemo(
    () => ({
      show,
      dismiss,
      success: (message, opts) => show(message, { ...opts, variant: 'success' }),
      error: (message, opts) => show(message, { ...opts, variant: 'error' }),
      info: (message, opts) => show(message, { ...opts, variant: 'info' }),
      warning: (message, opts) => show(message, { ...opts, variant: 'warning' }),
    }),
    [show, dismiss]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast alert-${toast.variant}`}>
            <span className="toast-text">{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => dismiss(toast.id)}
              aria-label="Tutup notifikasi"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/**
 * Mengembalikan API toast. Kalau dipanggil di luar ToastProvider, pesannya
 * jatuh ke console alih-alih melempar: satu komponen yang lupa dibungkus tidak
 * boleh membuat seluruh halaman blank.
 */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (ctx) return ctx
  const fallback = (message) => {
    console.warn('useToast dipakai di luar ToastProvider:', message)
  }
  return {
    show: fallback,
    dismiss: () => {},
    success: fallback,
    error: fallback,
    info: fallback,
    warning: fallback,
  }
}
