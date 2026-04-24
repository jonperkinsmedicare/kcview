/**
 * KCView — Cloudflare Worker API Proxy
 * Handles CORS for: KC Scout cameras, CelesTrak TLE, KCATA GTFS-RT, MoDOT data
 *
 * Deploy with: wrangler deploy
 * Routes: /api/*
 */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // CORS headers for all responses
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors })
    }

    try {
      // --------------------------------------------------------
      // GET /api/tle?group=visual
      // CelesTrak TLE data (no CORS headers on their server)
      // --------------------------------------------------------
      if (path === '/api/tle') {
        const group = url.searchParams.get('group') ?? 'visual'
        const tleUrl = `https://celestrak.org/SOCRATES/query.php?GROUP=${group}&FORMAT=tle`

        const cached = await env.KV?.get(`tle:${group}`)
        if (cached) {
          return new Response(cached, {
            headers: { ...cors, 'Content-Type': 'text/plain', 'X-Cache': 'HIT' }
          })
        }

        const res = await fetch(tleUrl, {
          headers: { 'User-Agent': 'KCView/1.0' }
        })
        const text = await res.text()

        // Cache for 1 hour (TLE data changes slowly)
        await env.KV?.put(`tle:${group}`, text, { expirationTtl: 3600 })

        return new Response(text, {
          headers: { ...cors, 'Content-Type': 'text/plain', 'X-Cache': 'MISS' }
        })
      }

      // --------------------------------------------------------
      // GET /api/cameras
      // Returns KC Scout camera catalog as JSON
      // --------------------------------------------------------
      if (path === '/api/cameras') {
        const cached = await env.KV?.get('cameras:catalog', 'json')
        if (cached) {
          return new Response(JSON.stringify(cached), {
            headers: { ...cors, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
          })
        }

        // KC Scout camera list XML endpoint
        const res = await fetch('https://www.kcscout.net/XML/Cameras.xml', {
          headers: { 'User-Agent': 'KCView/1.0' }
        })
        const xml = await res.text()
        const cameras = parseKCScoutCamerasXML(xml)

        await env.KV?.put('cameras:catalog', JSON.stringify(cameras), { expirationTtl: 3600 })

        return new Response(JSON.stringify(cameras), {
          headers: { ...cors, 'Content-Type': 'application/json' }
        })
      }

      // --------------------------------------------------------
      // GET /api/snapshot?id=XX&agency=kcscout
      // Proxies and caches JPEG snapshots (30s TTL)
      // --------------------------------------------------------
      if (path === '/api/snapshot') {
        const id = url.searchParams.get('id')
        const agency = url.searchParams.get('agency') ?? 'kcscout'
        if (!id) return new Response('Missing id', { status: 400 })

        // Build upstream URL based on agency
        let upstreamUrl: string
        if (agency === 'kcscout') {
          upstreamUrl = `https://www.kcscout.net/cameras/snapshot/${id}.jpg`
        } else if (agency === 'modot') {
          upstreamUrl = `https://traveler.modot.org/cameras/${id}.jpg`
        } else {
          upstreamUrl = `https://www.kandrive.org/cameras/${id}.jpg`
        }

        const res = await fetch(upstreamUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 KCView/1.0',
            'Referer': agency === 'kcscout' ? 'https://www.kcscout.net/' : 'https://traveler.modot.org/',
          }
        })

        if (!res.ok) {
          return new Response('Snapshot unavailable', {
            status: 502,
            headers: cors,
          })
        }

        const imgBuffer = await res.arrayBuffer()
        return new Response(imgBuffer, {
          headers: {
            ...cors,
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=30', // match camera refresh rate
          }
        })
      }

      // --------------------------------------------------------
      // GET /api/weather
      // NOAA NWS current conditions at Arrowhead
      // --------------------------------------------------------
      if (path === '/api/weather') {
        const cached = await env.KV?.get('weather:arrowhead', 'json')
        if (cached) {
          return new Response(JSON.stringify(cached), {
            headers: { ...cors, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
          })
        }

        // NWS requires User-Agent
        const pointRes = await fetch('https://api.weather.gov/points/38.8195,-94.4839', {
          headers: { 'User-Agent': 'KCView/1.0 (kcview@example.com)' }
        })
        const point = await pointRes.json()
        const hourlyUrl = point.properties.forecastHourly

        const fcRes = await fetch(hourlyUrl, {
          headers: { 'User-Agent': 'KCView/1.0 (kcview@example.com)' }
        })
        const fc = await fcRes.json()
        const current = fc.properties.periods[0]

        const weather = {
          temperature: current.temperature,
          windSpeed: parseInt(current.windSpeed),
          precipProbability: (current.probabilityOfPrecipitation?.value ?? 0) / 100,
          shortForecast: current.shortForecast,
          severeAlertActive: false,
        }

        await env.KV?.put('weather:arrowhead', JSON.stringify(weather), { expirationTtl: 300 })

        return new Response(JSON.stringify(weather), {
          headers: { ...cors, 'Content-Type': 'application/json' }
        })
      }

      return new Response('Not found', { status: 404, headers: cors })

    } catch (err) {
      console.error('[KCView Worker]', err)
      return new Response('Proxy error', { status: 502, headers: cors })
    }
  }
}

// ---------------------------------------------------------------
// KC Scout XML parser
// ---------------------------------------------------------------
function parseKCScoutCamerasXML(xml: string): object[] {
  // Minimal XML parser without a DOM (Workers have no DOMParser by default)
  // Extract Camera elements: <Camera id="..." name="..." lat="..." lon="..."/>
  const cameras: object[] = []
  const regex = /<Camera\s([^>]+)\/>/gi
  let match

  while ((match = regex.exec(xml)) !== null) {
    const attrs = match[1]
    const get = (attr: string) => {
      const m = new RegExp(`${attr}="([^"]*)"`, 'i').exec(attrs)
      return m ? m[1] : ''
    }

    const id = get('id') || get('CameraID')
    const name = get('name') || get('Description')
    const lat = parseFloat(get('lat') || get('Latitude') || '0')
    const lon = parseFloat(get('lon') || get('Longitude') || '0')

    if (id && lat && lon) {
      cameras.push({
        id,
        name,
        longitude: lon,
        latitude: lat,
        snapshotUrl: `/api/snapshot?id=${id}&agency=kcscout`,
        agency: 'kcscout',
      })
    }
  }

  return cameras
}

interface Env {
  KV?: KVNamespace
}
