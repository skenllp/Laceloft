import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { trackOrder, fmtPrice } from '../lib/api'

const STATUS_STEPS = [
  { key: 'placed', label: 'Order placed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'out_for_delivery', label: 'Out for delivery' },
  { key: 'delivered', label: 'Delivered' },
]

export default function Confirmation() {
  const { orderId: routeOrderId } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const orderId = routeOrderId || localStorage.getItem('eleven_order_id')
    const phone = localStorage.getItem('eleven_order_phone')

    async function load() {
      let fetched = null
      if (orderId && phone) {
        try { fetched = await trackOrder(orderId, phone) } catch { /* fall back below */ }
      }
      if (fetched) {
        setOrder(fetched)
      } else {
        const snapshot = JSON.parse(localStorage.getItem('eleven_order_snapshot') || 'null')
        setOrder({
          order_id: orderId || 'ELV-' + Math.floor(10000 + Math.random() * 90000),
          subtotal: Number(localStorage.getItem('eleven_order_subtotal') || 0),
          discount: Number(localStorage.getItem('eleven_order_discount') || 0),
          total: Number(localStorage.getItem('eleven_order_total_raw') || 0),
          coupon_code: localStorage.getItem('eleven_order_coupon') || '',
          items: snapshot || [],
          status: 'placed',
          payment_method: 'razorpay',
          created_at: new Date().toISOString(),
        })
      }
      setLoading(false)
    }
    load()
  }, [routeOrderId])

  if (loading) return <div className="pt-40 text-center text-steel-dim">Loading order…</div>
  if (!order) return <div className="pt-40 text-center text-steel-dim">Order not found.</div>

  const createdAt = new Date(order.created_at)
  const statusIdx = STATUS_STEPS.findIndex((s) => s.key === order.status)
  const etaStart = new Date(createdAt); etaStart.setDate(etaStart.getDate() + 3)
  const etaEnd = new Date(createdAt); etaEnd.setDate(etaEnd.getDate() + 6)
  const fmtShort = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

  return (
    <div className="pt-32 px-6 md:px-12 pb-24 max-w-3xl mx-auto text-center">
      <div className="w-16 h-16 rounded-full bg-blue/15 text-blue flex items-center justify-center mx-auto mb-6">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
      </div>
      <h1 className="font-display text-4xl md:text-5xl mb-3">Order confirmed</h1>
      <p className="text-steel-dim text-sm mb-10">Thank you — your order is on its way to being packed.</p>

      <div className="flex justify-center gap-10 mb-12 text-left">
        <div>
          <div className="text-xs text-steel-dim uppercase tracking-wide mb-1">Order ID</div>
          <div className="font-mono">{order.order_id}</div>
        </div>
        <div>
          <div className="text-xs text-steel-dim uppercase tracking-wide mb-1">Placed on</div>
          <div className="font-mono">{createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        </div>
        <div>
          <div className="text-xs text-steel-dim uppercase tracking-wide mb-1">
            {order.status === 'delivered' ? 'Delivered on' : order.status === 'cancelled' ? 'Status' : 'Estimated delivery'}
          </div>
          <div className="font-mono">
            {order.status === 'cancelled' ? 'Cancelled' : order.status === 'delivered' ? createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : `${fmtShort(etaStart)}–${fmtShort(etaEnd)}`}
          </div>
        </div>
      </div>

      {order.status !== 'cancelled' && (
        <div className="flex justify-between mb-14 relative">
          <div className="absolute top-3 left-0 right-0 h-px bg-line" />
          {STATUS_STEPS.map((s, i) => (
            <div key={s.key} className="relative z-10 flex flex-col items-center flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] mb-2 ${i <= statusIdx ? 'bg-blue text-chalk' : 'bg-charcoal text-steel-dim border border-line'}`}>
                {i <= statusIdx ? '✓' : ''}
              </div>
              <span className={`text-[11px] uppercase tracking-wide ${i <= statusIdx ? 'text-chalk' : 'text-steel-dim'}`}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="border border-line p-6 text-left mb-8">
        <h3 className="font-display text-2xl mb-5">Order summary</h3>
        <div className="divide-y divide-line mb-6">
          {(order.items || []).map((it, i) => (
            <div key={i} className="flex justify-between py-3 text-sm">
              <span>{it.name} · {it.size} · Qty {it.qty}</span>
              <span className="font-mono">{fmtPrice(it.price * it.qty)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-steel-dim">Subtotal</span>
          <span className="font-mono">{fmtPrice(order.subtotal)}</span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between text-sm mb-2 text-gold">
            <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ''}</span>
            <span className="font-mono">−{fmtPrice(order.discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-semibold pt-3 border-t border-line">
          <span>Total</span>
          <span className="font-mono">{fmtPrice(order.total)}</span>
        </div>
      </div>

      <div className="flex gap-4 justify-center">
        <Link to="/shop" className="btn-outline no-underline">Continue shopping</Link>
        <Link to="/track" className="btn-primary no-underline">Track this order</Link>
      </div>
    </div>
  )
}
