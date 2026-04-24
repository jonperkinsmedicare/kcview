import type { Aircraft } from '../types'

const KC_BBOX = {
  lamin: 38.6,
  lamax: 39.3,
  lomin: -95.0,
  lomax: -94.1,
}

// Token cache — valid 30 minutes, re-fetched automatically
let cachedToken: { token: string; expiresAt: number } | null = null

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }

  console.log('[OpenSky] Fetching new OAuth2 token...')

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: import.meta.env.VITE_OPENSKY_CLIENT_ID ?? '',
    client_secret: import.meta.env.VITE_OPENSKY_CLIENT_SECRET ?? '',
  })

  const res = await fetch(
    '/opensky-auth/auth/realms/opensky-network/protocol/openid-connect/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    }
  )

  if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`)

  const data = await res.json()
  cachedToken = {
    token: data.access_token,
    // Refresh 30 seconds before expiry
    expiresAt: Date.now() + (data.expires_in - 30) * 1000,
  }

  console.log('[OpenSky] Token acquired, valid for', data.expires_in, 'seconds')
  return cachedToken.token
}

export async function fetchAircraft(): Promise<Aircraft[]> {
  const token = await getToken()

  const params = new URLSearchParams({
    lamin: KC_BBOX.lamin.toString(),
    lamax: KC_BBOX.lamax.toString(),
    lomin: KC_BBOX.lomin.toString(),
    lomax: KC_BBOX.lomax.toString(),
  })

  const res = await fetch(`/proxy/opensky/api/states/all?${params}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (res.status === 429) {
    const retry = res.headers.get('X-Rate-Limit-Retry-After-Seconds') ?? '60'
    console.warn(`[OpenSky] Rate limited — retry in ${retry}s`)
    throw new Error(`Rate limited: retry in ${retry}s`)
  }

  if (!res.ok) throw new Error(`OpenSky error: ${res.status}`)

  const data = await res.json()
  if (!data.states) return []

  return data.states
    .filter((s: unknown[]) => s[5] !== null && s[6] !== null)
    .map((s: unknown[]): Aircraft => ({
      icao24:      String(s[0]),
      callsign:    String(s[1] ?? '').trim(),
      longitude:   Number(s[5]),
      latitude:    Number(s[6]),
      altitude:    Number(s[7] ?? s[13] ?? 0),
      velocity:    Number(s[9] ?? 0),
      heading:     Number(s[10] ?? 0),
      onGround:    Boolean(s[8]),
      lastContact: Number(s[4] ?? 0),
    }))
}

export function startAircraftPolling(
  onData: (aircraft: Aircraft[]) => void,
  intervalMs = 30_000
): () => void {
  let active = true

  const poll = async () => {
    if (!active) return
    try {
      const aircraft = await fetchAircraft()
      if (active) onData(aircraft)
    } catch (err) {
      console.warn('[OpenSky] fetch failed:', err)
    }
    if (active) setTimeout(poll, intervalMs)
  }

  poll()
  return () => { active = false }
}