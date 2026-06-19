'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function ReportAccordion({ month, total, dailyData }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '1rem', overflow: 'hidden' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isOpen ? '#f8fafc' : 'white', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div>
          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0, color: 'var(--text-main)' }}>{month}</h4>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>{dailyData.length} hari aktif</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--success-color)' }}>
            Rp {total.toLocaleString('id-ID')}
          </span>
          {isOpen ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
        </div>
      </button>

      {isOpen && (
        <div style={{ padding: '1rem', backgroundColor: 'white', borderTop: '1px solid var(--border-color)' }} className="animate-fade-in">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {dailyData.map((day, idx) => (
                <tr key={idx} style={{ borderBottom: idx === dailyData.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 0', color: 'var(--text-main)', fontWeight: '500' }}>{day.date}</td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: '600', color: 'var(--text-main)' }}>Rp {day.total.toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
