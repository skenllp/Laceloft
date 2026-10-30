import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import * as auth from '../lib/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(auth.getUser())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    auth.refreshSession().then((data) => {
      setUser(data)
      setReady(true)
    })
  }, [])

  const login = useCallback(async (creds) => {
    const data = await auth.loginRequest(creds)
    setUser({ name: data.name, email: data.email, phone: data.phone })
    return data
  }, [])

  const register = useCallback(async (fields) => {
    const data = await auth.registerRequest(fields)
    setUser({ name: data.name, email: data.email, phone: data.phone })
    return data
  }, [])

  const logout = useCallback(() => {
    auth.clearSession()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, ready, isLoggedIn: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
