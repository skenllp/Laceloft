import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPasswordRequest } from '../lib/auth'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await forgotPasswordRequest({ email })
      // Always show the same success state regardless of whether the email
      // is registered — the backend responds identically either way, so
      // the frontend shouldn't hint at the difference either.
      setSent(true)
    } catch (err) {
      setError(err.message || 'Could not send reset email.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="pt-32 px-6 pb-24 max-w-sm mx-auto text-center">
        <div className="label-eyebrow mb-2">Check your email</div>
        <h1 className="font-display text-4xl mb-4">Reset link sent</h1>
        <p className="text-steel-dim text-sm mb-8">
          If an account exists for {email}, we've sent a link to reset your password. It's valid for a
          limited time.
        </p>
        <Link to="/login" className="btn-primary no-underline">Back to log in</Link>
      </div>
    )
  }

  return (
    <div className="pt-32 px-6 pb-24 max-w-sm mx-auto">
      <div className="label-eyebrow mb-2">Forgot password</div>
      <h1 className="font-display text-4xl mb-2">Reset your password</h1>
      <p className="text-steel-dim text-sm mb-8">
        Enter the email on your account and we'll send you a link to set a new password.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs text-steel-dim block mb-1.5">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" />
        </div>
        {error && <p className="text-red-400 text-xs border border-red-400 px-3 py-2">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full mt-2 disabled:opacity-60">
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="text-xs text-steel-dim mt-6 text-center">
        <Link to="/login" className="text-blue no-underline">Back to log in</Link>
      </p>
    </div>
  )
}
