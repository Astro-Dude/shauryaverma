/**
 * GET /api/github → how much I've pushed at work since I joined, straight from GitHub.
 *
 *   { total: 3222, months: 11, since: "2025-11-17", updatedAt: "2026-10-28T01:02:03.000Z" }
 *
 * No database. Vercel's CDN keeps the response until the next 6 AM IST; the first visitor after
 * that is served the cached copy at once while Vercel fetches a fresh one in the background
 * (stale-while-revalidate). So GitHub is asked at most about once a day, and only if someone
 * actually looks.
 *
 * Needs GITHUB_TOKEN in the Vercel project's environment: any token works, it needs no scopes.
 * Private work shows up as "restricted" contributions, which GitHub counts for anyone who asks
 * as long as the profile has "Include private contributions" switched on. Only the numbers leave
 * this function: no repo or org names.
 */

const LOGIN = process.env.GITHUB_LOGIN || 'shaurya-evaratus';
export const SINCE = '2025-11-17';
const SINCE_AT = new Date(`${SINCE}T00:00:00+05:30`);
const YEAR_MS = 365 * 24 * 3600 * 1000;

const QUERY = `query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) { contributionsCollection(from: $from, to: $to) { contributionCalendar { totalContributions } } }
}`;

/** Whole months from `a` to `b`, the way people count them (17 Nov → 16 Dec is 0, → 17 Dec is 1). */
export function monthsBetween(a, b) {
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m -= 1;
  return Math.max(0, m);
}

/** Seconds until the next 6 AM in India (00:30 UTC). */
function untilMorning(now = new Date()) {
  const next = new Date(now);
  next.setUTCHours(0, 30, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return Math.max(60, Math.round((next - now) / 1000));
}

async function contributions(token, from, to) {
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'portfolio-stats' },
    body: JSON.stringify({ query: QUERY, variables: { login: LOGIN, from: from.toISOString(), to: to.toISOString() } }),
  });
  if (!r.ok) throw new Error(`GitHub said ${r.status}`);
  const j = await r.json();
  const n = j.data?.user?.contributionsCollection?.contributionCalendar?.totalContributions;
  if (typeof n !== 'number') throw new Error(j.errors?.[0]?.message ?? 'no contribution count in the reply');
  return n;
}

export async function getStats(token = process.env.GITHUB_TOKEN, now = new Date()) {
  if (!token) throw new Error('GITHUB_TOKEN is not set');
  // GitHub answers for at most a year per question, so a longer stretch is asked in yearly slices.
  let total = 0;
  for (let from = SINCE_AT; from < now; from = new Date(from.getTime() + YEAR_MS)) {
    const to = new Date(Math.min(from.getTime() + YEAR_MS - 1000, now.getTime()));
    total += await contributions(token, from, to);
  }
  return { total, months: monthsBetween(SINCE_AT, now), since: SINCE, updatedAt: now.toISOString() };
}

export default async function handler(req, res) {
  try {
    const stats = await getStats();
    const fresh = untilMorning();
    // The CDN holds it till morning, then may serve it a day longer while it refreshes. Browsers
    // keep it for five minutes, so reopening the popup doesn't refetch.
    res.setHeader('Vercel-CDN-Cache-Control', `max-age=${fresh}, stale-while-revalidate=86400`);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).json(stats);
  } catch (err) {
    // Don't cache a failure for long; the page falls back to the number baked into it.
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.status(502).json({ error: String(err.message ?? err) });
  }
}
