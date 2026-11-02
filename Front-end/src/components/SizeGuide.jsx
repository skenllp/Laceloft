import { useRef } from 'react'
import { whatsappChatLink } from '../lib/whatsapp'

// Standard adult conversions. Brands vary by up to half a size, so this is
// labelled as approximate and points people to WhatsApp when unsure.
const ROWS = [
  [4, '37', '4.5', '6', '22.9'],
  [5, '38', '5.5', '7', '23.7'],
  [6, '39', '6.5', '8', '24.6'],
  [7, '40.5', '7.5', '9', '25.4'],
  [8, '42', '8.5', '10', '26.2'],
  [9, '43', '9.5', '11', '27.1'],
  [10, '44.5', '10.5', '12', '27.9'],
  [11, '45.5', '11.5', '13', '28.8'],
  [12, '47', '12.5', '—', '29.6'],
]

/** "Size guide" link that opens a conversion chart in a native modal dialog
    (Escape and the backdrop close it; focus is handled by the browser). */
export default function SizeGuide({ sizes = [], productName = '' }) {
  const ref = useRef(null)
  const offered = new Set(sizes.map(Number))

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="text-[12px] font-medium text-espresso underline decoration-espresso/30 underline-offset-4 hover:decoration-espresso"
      >
        Size guide
      </button>
      <dialog
        ref={ref}
        onClick={(e) => { if (e.target === ref.current) ref.current.close() }}
        className="w-[min(560px,calc(100vw-2rem))] rounded-4xl bg-ivory p-0 text-espresso shadow-soft backdrop:bg-espresso/40 backdrop:backdrop-blur-sm"
        aria-labelledby="size-guide-title"
      >
        <div className="p-6 sm:p-8">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="label-eyebrow mb-2">Fit help</p>
              <h2 id="size-guide-title" className="font-display text-3xl leading-none">Size guide.</h2>
            </div>
            <button type="button" aria-label="Close size guide" onClick={() => ref.current?.close()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hairline text-lg hover:border-espresso">×</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-hairline text-[11px] uppercase tracking-[0.14em] text-muted">
                  <th className="py-2 pr-3 font-semibold">UK</th>
                  <th className="py-2 pr-3 font-semibold">EU</th>
                  <th className="py-2 pr-3 font-semibold">US Men</th>
                  <th className="py-2 pr-3 font-semibold">US Women</th>
                  <th className="py-2 font-semibold">Foot (cm)</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([uk, eu, usm, usw, cm]) => (
                  <tr key={uk} className={`border-b border-hairline/60 ${offered.has(uk) ? 'font-semibold text-espresso' : 'text-muted'}`}>
                    <td className="py-2.5 pr-3">{uk}</td>
                    <td className="py-2.5 pr-3">{eu}</td>
                    <td className="py-2.5 pr-3">{usm}</td>
                    <td className="py-2.5 pr-3">{usw}</td>
                    <td className="py-2.5">{cm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-5 text-[12px] leading-relaxed text-muted">
            Sizes in bold are offered for this pair. Conversions are approximate — fit can vary by half a size between styles.
            To measure, stand on paper, mark heel and longest toe, and compare the length in cm.
          </p>
          <a
            href={whatsappChatLink(`Hi Laceloft, could you help me with sizing${productName ? ` for the ${productName}` : ''}?`)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline mt-6 w-full no-underline"
          >
            Ask about fit on WhatsApp
          </a>
        </div>
      </dialog>
    </>
  )
}
