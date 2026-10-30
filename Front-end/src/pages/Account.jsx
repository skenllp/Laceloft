import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMyOrders } from '../lib/auth'
import { fmtPrice } from '../lib/api'

export default function Account() {
  const { user, ready, logout } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)

  useEffect(() => {
    if (user) getMyOrders().then((o) => { setOrders(o); setLoadingOrders(false) })
  }, [user])

  if (!ready) return <div className="pt-40 text-center text-steel-dim">Loading…</div>
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="pt-28 px-6 md:px-12 pb-24 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl mb-1">Hi, {user.name}</h1>
          <p className="text-steel-dim text-sm">{user.email} · {user.phone}</p>
        </div>
        <button
          onClick={() => { logout(); navigate('/') }}
          className="btn-outline"
        >
          Log out
        </button>
      </div>

      <h3 className="font-display text-2xl mb-5">Order history</h3>
      {loadingOrders ? (
        <p className="text-steel-dim text-sm">Loading orders…</p>
      ) : orders.length === 0 ? (
        <div className="border border-line p-8 text-center">
          <p className="text-steel-dim text-sm mb-4">You haven't placed any orders yet.</p>
          <Link to="/shop" className="btn-primary no-underline">Start shopping</Link>
        </div>
      ) : (
        <div className="divide-y divide-line border-t border-b border-line">
          {orders.map((o) => (
            <div key={o.order_id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <div className="font-mono text-sm">{o.order_id}</div>
                <div className="text-xs text-steel-dim">
                  {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {o.items?.length || 0} item(s)
                </div>
              </div>
              <span className="text-[11px] uppercase tracking-wide px-2.5 py-1 border border-line text-steel-dim">{o.status}</span>
              <span className="font-mono text-sm">{fmtPrice(o.total)}</span>
              <Link to={`/confirmation/${o.order_id}`} className="text-xs text-blue no-underline">View →</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
