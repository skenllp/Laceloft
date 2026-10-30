import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useShop } from '../context/ShopContext'
import { useAuth } from '../context/AuthContext'
import { submitOrder, verifyPayment, fmtPrice } from '../lib/api'

const FIELD_DEFS = [
  ['name', 'Full name'], ['phone', 'Phone number'], ['email', 'Email (optional)'],
  ['addressLine1', 'Address line 1'], ['addressLine2', 'Address line 2 (optional)'],
  ['city', 'City'], ['state', 'State'], ['pincode', 'Pincode'],
]

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function Checkout() {
  const { cart, cartSubtotal, discountPct, couponCode, cartTotal, clearCart } = useShop()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [fields, setFields] = useState({
    name: '', phone: '', email: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '',
  })
  const [errors, setErrors] = useState({})
  const [paymentMethod, setPaymentMethod] = useState('razorpay')
  const [placing, setPlacing] = useState(false)
  const [orderError, setOrderError] = useState('')

  useEffect(() => {
    if (user) {
      setFields((f) => ({
        ...f,
        name: f.name || user.name || '',
        email: f.email || user.email || '',
        phone: f.phone || user.phone || '',
      }))
    }
  }, [user])

  const setField = (key, val) => setFields((f) => ({ ...f, [key]: val }))

  if (cart.length === 0) {
    return (
      <div className="pt-40 px-6 text-center pb-24">
        <h1 className="font-display text-4xl mb-4">Your cart is empty</h1>
        <Link to="/shop" className="btn-primary no-underline">Start shopping</Link>
      </div>
    )
  }

  const validate = () => {
    const checks = {
      name: fields.name.trim().length > 0,
      phone: /^\d{10}$/.test(fields.phone.trim()),
      email: fields.email.trim().length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()),
      addressLine1: fields.addressLine1.trim().length > 0,
      city: fields.city.trim().length > 0,
      state: fields.state.trim().length > 0,
      pincode: /^\d{6}$/.test(fields.pincode.trim()),
    }
    setErrors(checks)
    return Object.values(checks).every(Boolean)
  }

  const finishOrder = (order) => {
    localStorage.setItem('eleven_order_id', order.order_id)
    localStorage.setItem('eleven_order_phone', fields.phone)
    localStorage.setItem('eleven_order_snapshot', JSON.stringify(cart))
    localStorage.setItem('eleven_order_subtotal', cartSubtotal)
    localStorage.setItem('eleven_order_discount', cartSubtotal - cartTotal)
    localStorage.setItem('eleven_order_total_raw', cartTotal)
    localStorage.setItem('eleven_order_coupon', couponCode || '')
    clearCart()
    navigate(`/confirmation/${order.order_id}`)
  }

  const openRazorpay = async (order) => {
    const ok = await loadRazorpayScript()
    if (!ok || !order.razorpay || !window.Razorpay) {
      setOrderError('Payment could not be started. Please refresh and try again.')
      setPlacing(false)
      return
    }
    const rzp = new window.Razorpay({
      key: order.razorpay.key_id,
      amount: order.razorpay.amount,
      currency: order.razorpay.currency,
      order_id: order.razorpay.razorpay_order_id,
      name: 'Laceloft',
      description: 'Order ' + order.order_id,
      prefill: { name: fields.name, email: fields.email, contact: fields.phone },
      theme: { color: '#2F6FED' },
      handler: async (response) => {
        try {
          await verifyPayment({
            order_id: order.order_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          })
        } catch {
          setOrderError(`Payment went through but we could not confirm it automatically. Please contact us with your order ID: ${order.order_id}`)
          setPlacing(false)
          return
        }
        finishOrder(order)
      },
      modal: {
        ondismiss: () => {
          setOrderError('Payment was not completed. You can try again whenever you\'re ready.')
          setPlacing(false)
        },
      },
    })
    rzp.on('payment.failed', (response) => {
      setOrderError('Payment failed: ' + ((response?.error?.description) || 'please try again.'))
      setPlacing(false)
    })
    rzp.open()
  }

  const placeOrder = async () => {
    if (!validate()) {
      setOrderError('Please fix the highlighted fields above.')
      return
    }
    setOrderError('')
    setPlacing(true)

    const discount = cartSubtotal - cartTotal
    let order
    try {
      order = await submitOrder({
        customer_name: fields.name, customer_phone: fields.phone, customer_email: fields.email,
        address_line1: fields.addressLine1, address_line2: fields.addressLine2,
        city: fields.city, state: fields.state, pincode: fields.pincode,
        subtotal: Math.round(cartSubtotal), discount: Math.round(discount), total: Math.round(cartTotal),
        coupon_code: couponCode || '', payment_method: paymentMethod,
        items: cart.map((i) => ({ sku: i.sku, name: i.name, size: i.size, price: i.price, qty: i.qty })),
      })
    } catch (err) {
      const stockMsg = err?.body?.items
      setOrderError(stockMsg || 'Sorry, we could not place your order. Please check your details and try again.')
      setPlacing(false)
      return
    }

    if (paymentMethod === 'cod') {
      finishOrder(order)
    } else {
      await openRazorpay(order)
    }
  }

  return (
    <div className="pt-28 px-6 md:px-12 pb-24">
      <h1 className="font-display text-5xl mb-10">Checkout</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12">
        <div>
          <h3 className="font-display text-2xl mb-5">Delivery details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {FIELD_DEFS.map(([key, label]) => (
              <div key={key} className={['addressLine1', 'addressLine2'].includes(key) ? 'sm:col-span-2' : ''}>
                <label className="text-xs text-steel-dim block mb-1.5">{label}</label>
                <input
                  value={fields[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  className={`input-field ${errors[key] === false ? 'border-red-400' : ''}`}
                />
                {errors[key] === false && <p className="text-red-400 text-xs mt-1">This field looks incorrect.</p>}
              </div>
            ))}
          </div>

          <h3 className="font-display text-2xl mb-5">Payment method</h3>
          <div className="flex flex-col gap-3 mb-8">
            <label className={`flex items-center gap-3 border px-4 py-3 cursor-pointer ${paymentMethod === 'razorpay' ? 'border-chalk' : 'border-line'}`}>
              <input type="radio" name="paymentMethod" value="razorpay" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} />
              <span className="text-sm">Pay online (UPI / Card / Netbanking)</span>
            </label>
            <label className={`flex items-center gap-3 border px-4 py-3 cursor-pointer ${paymentMethod === 'cod' ? 'border-chalk' : 'border-line'}`}>
              <input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
              <span className="text-sm">Cash on delivery</span>
            </label>
          </div>

          {orderError && <p className="text-red-400 text-sm mb-4 border border-red-400 px-4 py-3">{orderError}</p>}

          <button onClick={placeOrder} disabled={placing} className="btn-primary w-full disabled:opacity-60">
            {placing ? 'Placing order…' : paymentMethod === 'cod' ? 'Place order' : 'Proceed to payment'}
          </button>
        </div>

        <div className="border border-line p-6 h-fit">
          <h3 className="font-display text-2xl mb-6">Order summary</h3>
          <div className="divide-y divide-line mb-6">
            {cart.map((it) => (
              <div key={it.sku + it.size} className="flex gap-3 py-3">
                <div className="w-14 h-14 bg-charcoal shrink-0 overflow-hidden">
                  {it.image && <img src={it.image} alt={it.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1">
                  <h5 className="text-sm">{it.name}</h5>
                  <span className="text-xs text-steel-dim">{it.size} · Qty {it.qty}</span>
                </div>
                <span className="font-mono text-sm">{fmtPrice(it.price * it.qty)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm mb-3">
            <span className="text-steel-dim">Subtotal</span>
            <span className="font-mono">{fmtPrice(cartSubtotal)}</span>
          </div>
          {discountPct > 0 && (
            <div className="flex justify-between text-sm mb-3 text-gold">
              <span>Discount {couponCode ? `(${couponCode})` : ''}</span>
              <span className="font-mono">−{fmtPrice(cartSubtotal - cartTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold pt-4 border-t border-line">
            <span>Total</span>
            <span className="font-mono">{fmtPrice(cartTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
