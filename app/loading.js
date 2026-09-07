import Spinner from '@/components/ui/Spinner'

/** Loading untuk halaman publik (beranda, login, signup). Halaman dashboard
 *  punya loading.js sendiri berbentuk skeleton, karena di sana bentuk kontennya
 *  sudah diketahui dan skeleton tidak menimbulkan lompatan tata letak. */
export default function Loading() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[50vh]"
      style={{ width: '100%', gap: '1rem' }}
    >
      <Spinner label="Memuat halaman" />
      <p style={{ margin: 0, color: 'var(--text-muted)', fontWeight: 500 }}>Memuat…</p>
    </div>
  )
}
