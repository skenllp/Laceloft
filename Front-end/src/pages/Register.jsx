import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useShop } from '../context/ShopContext'

export default function Register() {
  const { register } = useAuth()
  const { mergeGuestCartIntoServer } = useShop()
  const navigate = useNavigate()
  const location = useLocation()
  const [fields, setFields] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k, v) => setFields((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await register(fields)
      await mergeGuestCartIntoServer()
      navigate(location.state?.from || '/account')
    } catch (err) {
      setError(err.message || 'Could not create account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pt-32 px-6 pb-24 max-w-sm mx-auto">
      <div className="label-eyebrow mb-2">Join Laceloft</div>
      <h1 className="font-display text-4xl mb-2">Create your account</h1>
      <p className="text-steel-dim text-sm mb-8">Faster checkout, order tracking, and wishlist across devices.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs text-steel-dim block mb-1.5">Full name</label>
          <input required value={fields.name} onChange={(e) => set('name', e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="text-xs text-steel-dim block mb-1.5">Email</label>
          <input type="email" required value={fields.email} onChange={(e) => set('email', e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="text-xs text-steel-dim block mb-1.5">Phone</label>
          <input required value={fields.phone} onChange={(e) => set('phone', e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="text-xs text-steel-dim block mb-1.5">Password</label>
          <input type="password" required minLength={6} value={fields.password} onChange={(e) => set('password', e.target.value)} className="input-field" />
        </div>
        {error && <p className="text-red-400 text-xs border border-red-400 px-3 py-2">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full mt-2 disabled:opacity-60">
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="text-xs text-steel-dim mt-6 text-center">
        Already have an account? <Link to="/login" state={location.state} className="text-blue no-underline">Log in</Link>
      </p>
    </div>
  )
}
