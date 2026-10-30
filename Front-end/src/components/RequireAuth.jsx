import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Wrap a <Route element={...}> with this to require login — used for
// /cart and /wishlist. Waits for `ready` so it doesn't redirect someone
// who's actually logged in but whose session just hasn't loaded yet.
export default function RequireAuth({ children }) {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) return null

  if (!user) {
    // Send them to login, and remember where they were headed so Login.jsx
    // can bounce them back here after a successful sign-in.
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return children
}
