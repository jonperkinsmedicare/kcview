// KC Scout + MoDOT + KDOT Traffic Camera Service
// 380+ publicly accessible camera feeds across the KC bi-state metro
// Source: kcscout.net (operated jointly by MoDOT and KDOT)
//
// KC Scout does not publish a formal public API but exposes camera data
// through its traveler information system. Snapshot URLs follow a
// consistent pattern: each camera has a numeric ID and returns a JPEG
// that refreshes every 30 seconds.
//
// URL pattern: https://www.kcscout.net/XML/Cameras.xml
// Returns XML with all camera IDs, names, lat/lon, and snapshot URLs.

import type { TrafficCamera } from '../types'

// In production this call goes through Cloudflare Worker (/api/cameras)
// which fetches, parses, and caches the XML for 30 seconds.
const CAMERAS_ENDPOINT = '/api/cameras'

// Fallback: hardcoded seed list of key cameras near FIFA venues
// (Arrowhead area, I-70 corridors, downtown KC)
// This is used while the API feed is loading or if it fails.
export const SEED_CAMERAS: TrafficCamera[] = [
  {
    id: 'KC001',
    name: 'I-70 at Blue Ridge Cutoff (Arrowhead approach)',
    longitude: -94.5254,
    latitude:  38.8397,
    snapshotUrl: '/proxy/kcscout/cameras/snapshot?id=KC001',
    agency: 'kcscout',
    highway: 'I-70',
    direction: 'EB',
  },
  {
    id: 'KC002',
    name: 'I-435 at E Truman Rd',
    longitude: -94.4638,
    latitude:  39.1052,
    snapshotUrl: '/proxy/kcscout/cameras/snapshot?id=KC002',
    agency: 'kcscout',
    highway: 'I-435',
    direction: 'NB',
  },
  {
    id: 'KC003',
    name: 'I-70 at Downtown loop',
    longitude: -94.5786,
    latitude:  39.1009,
    snapshotUrl: '/proxy/kcscout/cameras/snapshot?id=KC003',
    agency: 'kcscout',
    highway: 'I-70',
    direction: 'WB',
  },
  {
    id: 'KC004',
    name: 'US-71 at Bannister (stadium corridor)',
    longitude: -94.5031,
    latitude:  38.9312,
    snapshotUrl: '/proxy/kcscout/cameras/snapshot?id=KC004',
    agency: 'kcscout',
    highway: 'US-71',
    direction: 'SB',
  },
  {
    id: 'KC005',
    name: 'I-35 at Broadway Bridge',
    longitude: -94.5892,
    latitude:  39.1221,
    snapshotUrl: '/proxy/kcscout/cameras/snapshot?id=KC005',
    agency: 'kcscout',
    highway: 'I-35',
    direction: 'NB',
  },
  {
    id: 'KC006',
    name: 'I-670 at 12th St (Power & Light)',
    longitude: -94.5801,
    latitude:  39.0978,
    snapshotUrl: '/proxy/kcscout/cameras/snapshot?id=KC006',
    agency: 'kcscout',
    highway: 'I-670',
    direction: 'EB',
  },
]

export async function fetchCameras(): Promise<TrafficCamera[]> {
  try {
    const res = await fetch(CAMERAS_ENDPOINT)
    if (!res.ok) throw new Error(`Camera feed error: ${res.status}`)
    return await res.json()
  } catch {
    console.warn('[Cameras] Using seed camera list (API unavailable)')
    return SEED_CAMERAS
  }
}

// Build a proxied snapshot URL for a camera
// The Cloudflare Worker at /api/snapshot?id=X fetches and caches the JPEG
export function getCameraSnapshotUrl(camera: TrafficCamera): string {
  return `/api/snapshot?id=${camera.id}&agency=${camera.agency}&t=${Date.now()}`
}
