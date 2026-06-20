'use client'

export default function PrintButton() {
  return (
    <button 
      className="btn btn-primary no-print" 
      style={{ marginTop: '2rem', padding: '0.75rem 2rem', borderRadius: '99px' }}
      onClick={() => window.print()}
    >
      Cetak Struk (Print)
    </button>
  )
}
