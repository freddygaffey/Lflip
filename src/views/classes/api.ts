// Central HTTP helper. One place to handle the base URL, auth, and cookies so
// every call site doesn't repeat it.
//
// Auth strategy is per-platform (the backend's require_auth accepts either):
//   - Web:    rely on the httpOnly `auth_token` cookie. The token is never put
//             into JS, so an XSS payload can't read or steal it. `webFetchExtra`
//             tells the browser fetch to send/receive that cookie cross-origin.
//   - Native: send the JWT as a Bearer header, read from Preferences. iOS
//             WKWebView blocks cross-site cookies, so mobile uses the token.
//
// This file is not written by AI save where documented.

import { CapacitorHttp, Capacitor, type HttpResponse } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const API_URL = import.meta.env.VITE_API_URL

type Body = unknown

// Build request headers. On native we attach the Bearer token; on web we attach
// nothing extra and let the cookie ride automatically.
async function authHeaders(extra: Record<string, string> = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra }
  if (Capacitor.isNativePlatform()) {
    const { value: token } = await Preferences.get({ key: 'auth_token' })
    if (token) headers.Authorization = `Bearer ${token}`
  }
  return headers
}

// CapacitorHttp sometimes hands back `data` as a raw string; normalise to parsed
// JSON so call sites don't each repeat the `typeof data === 'string' ? ...` dance.
function parse(res: HttpResponse) {
  const data = typeof res.data === 'string' && res.data ? safeJson(res.data) : res.data
  return { status: res.status, data }
}

function safeJson(s: string) {
  try { return JSON.parse(s) } catch { return s }
}

async function request(method: string, path: string, body?: Body, extraHeaders?: Record<string, string>) {
  const res = await CapacitorHttp.request({
    method,
    // relative paths get the main API base; an absolute URL (e.g. the AI server)
    // is used as-is so the same auth/cookie logic still applies
    url: path.startsWith('http') ? path : `${API_URL}${path}`,
    headers: await authHeaders(extraHeaders),
    data: body,
    // web only: make fetch send + store the httpOnly auth cookie cross-origin
    webFetchExtra: { credentials: 'include' },
  })
  return parse(res)
}

// Verb helpers. Pass a path like '/api/cars' — the base URL is added for you.
export const api = {
  get:    (path: string, headers?: Record<string, string>)              => request('GET', path, undefined, headers),
  post:   (path: string, body?: Body, headers?: Record<string, string>) => request('POST', path, body, headers),
  patch:  (path: string, body?: Body, headers?: Record<string, string>) => request('PATCH', path, body, headers),
  delete: (path: string, body?: Body, headers?: Record<string, string>) => request('DELETE', path, body, headers),
}

// Login is special: on native we must persist the returned token for later
// Bearer use; on web we ignore it (the browser already stored the httpOnly
// cookie from the response). Call this instead of api.post for the login route.
export async function login(email: string, password: string) {
  const res = await request('POST', '/api/login', { email, password })
  if (res.status === 200 && Capacitor.isNativePlatform() && res.data?.token) {
    await Preferences.set({ key: 'auth_token', value: res.data.token })
  }
  return res
}
