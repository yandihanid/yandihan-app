'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Akordeon FAQ. Island kecil supaya halaman yang memuatnya tetap Server
 * Component -- itu prasyarat `export const metadata`.
 *
 * Versi sebelumnya adalah `<div onClick>`: tidak bisa dicapai dengan Tab, tidak
 * merespons Enter/Space, dan pembaca layar tidak pernah diberi tahu bahwa ada
 * isi yang bisa dibuka. Sekarang pemicunya `<button>` sungguhan, jadi keyboard
 * dan fokusnya datang dari browser tanpa perlu handler tambahan; `aria-expanded`
 * mengumumkan keadaan, dan `aria-controls` menghubungkan tombol ke jawabannya.
 *
 * `items` datang dari server sebagai data biasa, jadi teks FAQ tetap ikut ke
 * HTML awal dan terbaca mesin pencari walau panelnya tertutup secara visual.
 */
export default function FaqAccordion({ items = [] }) {
  // Satu indeks, bukan Set: hanya satu jawaban terbuka pada satu waktu, sama
  // seperti perilaku sebelumnya. Klik pada yang sedang terbuka menutupnya.
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <div className="lp-faq">
      {items.map((item, index) => {
        const open = openIndex === index
        const panelId = `lp-faq-panel-${index}`
        const buttonId = `lp-faq-button-${index}`

        return (
          <div key={item.q} className="lp-faq-item">
            <h3 style={{ margin: 0 }}>
              <button
                type="button"
                id={buttonId}
                className="lp-faq-q"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : index)}
              >
                <span>{item.q}</span>
                <ChevronDown size={20} className="lp-faq-chevron" aria-hidden="true" />
              </button>
            </h3>

            {/* Panel tetap di DOM saat tertutup supaya aria-controls tidak
                menggantung dan isinya tetap ada di HTML awal. `hidden`
                menyembunyikannya; globals.css menegakkan `[hidden]` dengan
                !important karena aturan itu berasal dari UA stylesheet dan
                class author apa pun yang menulis `display` akan mengalahkannya. */}
            <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open}>
              <p className="lp-faq-a">{item.a}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
