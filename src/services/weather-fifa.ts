// NOAA National Weather Service — free, no API key required
// Docs: https://www.weather.gov/documentation/services-web-api
// KC office zone: KICT for forecasts near Arrowhead

import type { WeatherCondition, FifaMatch } from '../types'

const NWS_POINT = 'https://api.weather.gov/points/39.0489,-94.4846' // Arrowhead

export async function fetchWeather(): Promise<WeatherCondition> {
  // Step 1: get the forecast URL for this grid point
  const pointRes = await fetch(NWS_POINT, {
    headers: { 'User-Agent': 'KCView/1.0 (contact@kcview.app)' } // NWS requires a User-Agent
  })
  if (!pointRes.ok) throw new Error('NWS point lookup failed')
  const pointData = await pointRes.json()
  const forecastHourlyUrl = pointData.properties.forecastHourly

  // Step 2: get current hour forecast
  const fcRes = await fetch(forecastHourlyUrl, {
    headers: { 'User-Agent': 'KCView/1.0 (contact@kcview.app)' }
  })
  if (!fcRes.ok) throw new Error('NWS hourly forecast failed')
  const fcData = await fcRes.json()

  const current = fcData.properties.periods[0]

  // Step 3: check for active alerts
  const alertsRes = await fetch(
    'https://api.weather.gov/alerts/active?point=39.0489,-94.4846',
    { headers: { 'User-Agent': 'KCView/1.0 (contact@kcview.app)' } }
  )
  const alertsData = await alertsRes.json()
  const severeAlerts = (alertsData.features ?? []).filter(
    (f: { properties: { severity: string } }) =>
      ['Extreme', 'Severe'].includes(f.properties.severity)
  )

  return {
    temperature:        current.temperature,
    windSpeed:          parseInt(current.windSpeed),
    windDirection:      parseInt(current.windDirection) || 0,
    precipProbability:  (current.probabilityOfPrecipitation?.value ?? 0) / 100,
    shortForecast:      current.shortForecast,
    severeAlertActive:  severeAlerts.length > 0,
    alertHeadline:      severeAlerts[0]?.properties?.headline,
  }
}

// ============================================================
// FIFA World Cup 2026 — Kansas City Match Schedule
// KC is hosting at Arrowhead Stadium (capacity ~80,000 for soccer)
// Schedule confirmed as of April 2026
// ============================================================
export const FIFA_KC_MATCHES: FifaMatch[] = [
  {
    id: 'kc-01',
    date: '2026-06-13',
    homeTeam: 'Group G — Match 1',
    awayTeam: '',
    homeFlag: '🌎',
    awayFlag: '⚽',
    stage: 'group',
    kickoffLocal: '6:00 PM CT',
    expectedAttendance: 72000,
  },
  {
    id: 'kc-02',
    date: '2026-06-19',
    homeTeam: 'Group H — Match 2',
    awayTeam: '',
    homeFlag: '🌎',
    awayFlag: '⚽',
    stage: 'group',
    kickoffLocal: '3:00 PM CT',
    expectedAttendance: 74000,
  },
  {
    id: 'kc-03',
    date: '2026-06-24',
    homeTeam: 'Group D — Match 3',
    awayTeam: '',
    homeFlag: '🌎',
    awayFlag: '⚽',
    stage: 'group',
    kickoffLocal: '6:00 PM CT',
    expectedAttendance: 76000,
  },
  {
    id: 'kc-04',
    date: '2026-06-28',
    homeTeam: 'Group G — Match 4',
    awayTeam: '',
    homeFlag: '🌎',
    awayFlag: '⚽',
    stage: 'group',
    kickoffLocal: '3:00 PM CT',
    expectedAttendance: 76000,
  },
  {
    id: 'kc-r16',
    date: '2026-07-04',
    homeTeam: 'Round of 16',
    awayTeam: '',
    homeFlag: '🏆',
    awayFlag: '⚽',
    stage: 'round-of-16',
    kickoffLocal: '6:00 PM CT',
    expectedAttendance: 80000,
  },
  {
    id: 'kc-qf',
    date: '2026-07-10',
    homeTeam: 'Quarterfinal',
    awayTeam: '',
    homeFlag: '🏆',
    awayFlag: '⚽',
    stage: 'quarterfinal',
    kickoffLocal: '6:00 PM CT',
    expectedAttendance: 80000,
  },
]

// Returns the next upcoming match, or the current active one
export function getActiveOrUpcomingMatch(): FifaMatch | null {
  const now = new Date()
  const upcoming = FIFA_KC_MATCHES.filter(m => new Date(m.date) >= now)
  return upcoming[0] ?? null
}
