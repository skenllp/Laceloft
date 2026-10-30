import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { resetPasswordRequest } from '../lib/auth'

export default function ResetPassword() {
  const { uid, token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords don\u2019t match.')
      return
    }
    setBusy(true)
    try {
      await resetPasswordRequest({ uid, token, newPassword: password })
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      // A bad/expired link surfaces here as whatever message the backend
      // sent (e.g. "invalid or has expired") — shown as-is since it's
      // already written to be safe to display.
      setError(err.message || 'Could not reset password. The link may have expired.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="pt-32 px-6 pb-24 max-w-sm mx-auto text-center">
        <div className="label-eyebrow mb-2">Success</div>
        <h1 className="font-display text-4xl mb-4">Password reset</h1>
        <p className="text-steel-dim text-sm mb-8">Taking you to the log in page…</p>
        <Link to="/login" className="btn-primary no-underline">Log in now</Link>
      </div>
    )
  }

  return (
    <div className="pt-32 px-6 pb-24 max-w-sm mx-auto">
      <div className="label-eyebrow mb-2">Reset password</div>
      <h1 className="font-display text-4xl mb-2">Choose a new password</h1>
      <p className="text-steel-dim text-sm mb-8">Make it something you'll remember.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs text-steel-dim block mb-1.5">New password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="text-xs text-steel-dim block mb-1.5">Confirm password</label>
          <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input-field" />
        </div>
        {error && <p className="text-red-400 text-xs border border-red-400 px-3 py-2">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full mt-2 disabled:opacity-60">
          {busy ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
      <p className="text-xs text-steel-dim mt-6 text-center">
        <Link to="/forgot-password" className="text-blue no-underline">Request a new link</Link>
      </p>
    </div>
  )
}
