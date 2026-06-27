export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]" style={{ width: '100%', height: '100%' }}>
      <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }}></div>
      <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>Memuat...</p>
    </div>
  )
}
