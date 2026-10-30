import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useShop } from '../context/ShopContext'

export default function Login() {
  const { login } = useAuth()
  const { mergeGuestCartIntoServer } = useShop()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login({ email, password })
      await mergeGuestCartIntoServer()
      navigate(location.state?.from || '/account')
    } catch (err) {
      setError(err.message || 'Could not log in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pt-32 px-6 pb-24 max-w-sm mx-auto">
      <div className="label-eyebrow mb-2">Welcome back</div>
      <h1 className="font-display text-4xl mb-2">Log in</h1>
      <p className="text-steel-dim text-sm mb-8">Access your order history and check out faster next time.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs text-steel-dim block mb-1.5">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-steel-dim">Password</label>
            <Link to="/forgot-password" className="text-xs text-blue no-underline">Forgot password?</Link>
          </div>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" />
        </div>
        {error && <p className="text-red-400 text-xs border border-red-400 px-3 py-2">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full mt-2 disabled:opacity-60">
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="text-xs text-steel-dim mt-6 text-center">
        New to Laceloft? <Link to="/register" state={location.state} className="text-blue no-underline">Create an account</Link>
      </p>
    </div>
  )
}
