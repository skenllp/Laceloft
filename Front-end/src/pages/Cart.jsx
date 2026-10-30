import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useShop } from '../context/ShopContext'
import { fmtPrice, validateCoupon } from '../lib/api'

export default function Cart() {
  const { cart, changeQty, removeFromCart, cartSubtotal, discountPct, couponCode, applyDiscount, clearDiscount, cartTotal } = useShop()
  const navigate = useNavigate()
  const [couponInput, setCouponInput] = useState('')
  const [couponError, setCouponError] = useState('')
  const [checking, setChecking] = useState(false)

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase()
    if (!code) return
    setChecking(true)
    setCouponError('')
    const result = await validateCoupon(code, cartSubtotal)
    setChecking(false)
    if (result.valid) {
      applyDiscount(result.discount_percent, result.code || code)
    } else {
      setCouponError(result.detail || 'Invalid or expired code.')
    }
  }

  if (cart.length === 0) {
    return (
      <div className="pt-40 px-6 text-center pb-24">
        <h1 className="font-display text-4xl mb-4">Your cart is empty</h1>
        <p className="text-steel-dim text-sm mb-8">Looks like you haven't added anything yet.</p>
        <Link to="/shop" className="btn-primary no-underline">Continue shopping</Link>
      </div>
    )
  }

  return (
    <div className="pt-28 px-6 md:px-12 pb-24">
      <h1 className="font-display text-5xl mb-10">Your cart</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12">
        <div className="divide-y divide-line">
          {cart.map((item) => (
            <div key={item.sku + item.size} className="flex gap-5 py-6">
              <div className="w-24 h-24 bg-charcoal shrink-0 overflow-hidden">
                {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1">
                <h4 className="font-display text-xl mb-1">{item.name}</h4>
                <p className="text-xs text-steel-dim mb-3">{item.size} · {item.color}</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-line">
                    <button onClick={() => changeQty(item.sku, item.size, -1)} className="w-8 h-8">−</button>
                    <span className="w-8 text-center font-mono text-sm">{item.qty}</span>
                    <button onClick={() => changeQty(item.sku, item.size, 1)} className="w-8 h-8">+</button>
                  </div>
                  <button onClick={() => removeFromCart(item.sku, item.size)} className="text-xs text-steel-dim hover:text-red-400 uppercase tracking-wide">
                    Remove
                  </button>
                </div>
              </div>
              <div className="font-mono text-sm">{fmtPrice(item.price * item.qty)}</div>
            </div>
          ))}
        </div>

        <div className="border border-line p-6 h-fit">
          <h3 className="font-display text-2xl mb-6">Order summary</h3>
          <div className="flex justify-between text-sm mb-3">
            <span className="text-steel-dim">Subtotal</span>
            <span className="font-mono">{fmtPrice(cartSubtotal)}</span>
          </div>
          {discountPct > 0 && (
            <div className="flex justify-between text-sm mb-3 text-gold">
              <span>{couponCode ? `${couponCode} applied` : 'Discount'} ({discountPct}%)</span>
              <span className="font-mono">−{fmtPrice(cartSubtotal * (discountPct / 100))}</span>
            </div>
          )}

          {discountPct > 0 ? (
            <div className="flex items-center justify-between mb-6 text-xs bg-charcoal px-3 py-2.5 border border-line">
              <span className="font-mono text-gold">{couponCode} applied — {discountPct}% off</span>
              <button onClick={clearDiscount} aria-label="Remove coupon" className="text-steel-dim hover:text-chalk">×</button>
            </div>
          ) : (
            <div className="mb-6">
              <div className="flex gap-2">
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Discount code"
                  className="input-field flex-1"
                />
                <button onClick={handleApplyCoupon} disabled={checking} className="btn-outline px-5">
                  {checking ? '…' : 'Apply'}
                </button>
              </div>
              {couponError && <p className="text-red-400 text-xs mt-2">{couponError}</p>}
            </div>
          )}

          <div className="flex justify-between text-base font-semibold pt-4 border-t border-line mb-6">
            <span>Total</span>
            <span className="font-mono">{fmtPrice(cartTotal)}</span>
          </div>
          <button onClick={() => navigate('/checkout')} className="btn-primary w-full">Checkout</button>
          <Link to="/shop" className="block text-center text-xs text-steel-dim no-underline mt-4 hover:text-chalk">Continue shopping</Link>
        </div>
      </div>
    </div>
  )
}
