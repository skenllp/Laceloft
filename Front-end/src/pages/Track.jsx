import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { trackOrder } from '../lib/api'

export default function Track() {
  const [orderId, setOrderId] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const order = await trackOrder(orderId.trim(), phone.trim())
    setBusy(false)
    if (!order) {
      setError("We couldn't find an order with that ID and phone number. Double-check both and try again.")
      return
    }
    localStorage.setItem('eleven_order_id', order.order_id)
    localStorage.setItem('eleven_order_phone', phone.trim())
    navigate(`/confirmation/${order.order_id}`)
  }

  return (
    <div className="pt-32 px-6 pb-24 max-w-sm mx-auto">
      <div className="label-eyebrow mb-2">Where's my pair?</div>
      <h1 className="font-display text-4xl mb-2">Track your order</h1>
      <p className="text-steel-dim text-sm mb-8">Enter your order ID and the phone number used at checkout.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs text-steel-dim block mb-1.5">Order ID</label>
          <input required value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="ELV-12345" className="input-field" />
        </div>
        <div>
          <label className="text-xs text-steel-dim block mb-1.5">Phone number</label>
          <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" />
        </div>
        {error && <p className="text-red-400 text-xs border border-red-400 px-3 py-2">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full mt-2 disabled:opacity-60">
          {busy ? 'Looking up…' : 'Track order'}
        </button>
      </form>
      <p className="text-xs text-steel-dim mt-6 text-center">
        Have an account? <Link to="/account" className="text-blue no-underline">View all your orders</Link>
      </p>
    </div>
  )
}
