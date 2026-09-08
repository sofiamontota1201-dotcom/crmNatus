export type RateLimitResult = {
  ok: boolean
  remaining?: number
  limit?: number
  reset?: number
}

function getClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return { url: url.replace(/\/$/, ''), token }
}

async function upstash(cmd: string[]): Promise<any> {
  const client = getClient()
  if (!client) return null
  const res = await fetch(client.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${client.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ command: cmd }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Upstash error ${res.status}`)
  return res.json()
}

export async function rateLimit(identifier: string, opts?: { limit?: number; windowSec?: number }): Promise<RateLimitResult> {
  const limit = opts?.limit ?? 60
  const windowSec = opts?.windowSec ?? 60
  const now = Math.floor(Date.now() / 1000)
  const key = `rl:${identifier}`

  const client = getClient()
  if (!client) {
    // No Upstash configured, allow
    return { ok: true }
  }

  // Increment counter and set expiry if this is the first hit
  const incr = await upstash(['INCR', key])
  const count = Number(incr?.result ?? 0)
  if (count === 1) {
    await upstash(['EXPIRE', key, String(windowSec)])
  }

  const ok = count <= limit
  const reset = now + windowSec
  return { ok, remaining: Math.max(0, limit - count), limit, reset }
}

