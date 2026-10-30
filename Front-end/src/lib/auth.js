/* ===== Laceloft — customer accounts =====
   Talks to /api/auth/register/, /api/auth/login/, /api/auth/me/ and
   /api/my-orders/. Stores the auth token in localStorage so the customer
   stays logged in across page loads and tabs. */

import { API_BASE } from './config'

const TOKEN_KEY = 'eleven_auth_token'
const USER_KEY = 'eleven_auth_user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
}

export function authHeader() {
  const token = getToken()
  return token ? { Authorization: 'Token ' + token } : {}
}

function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function firstError(data) {
  if (!data) return null
  if (typeof data.detail === 'string') return data.detail
  for (const key of Object.keys(data)) {
    const val = data[key]
    if (Array.isArray(val) && val.length) return val[0]
    if (typeof val === 'string') return val
  }
  return null
}

export async function registerRequest({ name, email, phone, password }) {
  const res = await fetch(API_BASE + '/auth/register/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, phone, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(firstError(data) || 'Could not create account.')
  saveSession(data.token, { name: data.name, email: data.email, phone: data.phone })
  return data
}

export async function loginRequest({ email, password }) {
  const res = await fetch(API_BASE + '/auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(firstError(data) || 'Incorrect email or password.')
  saveSession(data.token, { name: data.name, email: data.email, phone: data.phone })
  return data
}

export async function forgotPasswordRequest({ email }) {
  const res = await fetch(API_BASE + '/auth/forgot-password/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(firstError(data) || 'Could not send reset email.')
  return data
}

export async function resetPasswordRequest({ uid, token, newPassword }) {
  const res = await fetch(API_BASE + '/auth/reset-password/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, token, new_password: newPassword }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(firstError(data) || 'Could not reset password.')
  return data
}

export async function refreshSession() {
  const token = getToken()
  if (!token) return null
  try {
    const res = await fetch(API_BASE + '/auth/me/', { headers: { Authorization: 'Token ' + token } })
    if (!res.ok) { clearSession(); return null }
    const data = await res.json()
    localStorage.setItem(USER_KEY, JSON.stringify(data))
    return data
  } catch {
    return getUser()
  }
}

export async function getMyOrders() {
  const token = getToken()
  if (!token) return []
  const res = await fetch(API_BASE + '/my-orders/', { headers: { Authorization: 'Token ' + token } })
  if (!res.ok) return []
  return await res.json()
}
