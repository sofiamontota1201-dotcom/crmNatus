import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { DianClient } from '@/lib/integrations/dianClient'

export async function POST(request: Request) {
  try {
    // Require authenticated user to use this internal API
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: any = null
    try {
      body = await request.json()
    } catch {}
    const username = process.env.NODE_ENV === 'production' ? undefined : (body?.username as string | undefined)
    const password = process.env.NODE_ENV === 'production' ? undefined : (body?.password as string | undefined)

    const dian = new DianClient()
    const data = await dian.login({ username, password })
    const token = (data as any).token ?? data

    const res = NextResponse.json({ ok: true })
    // Store token in HttpOnly cookie to avoid exposing it in client storage
    res.cookies.set('dian_token', String(token), {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60, // 1 hour (adjust to provider TTL)
    })
    return res
  } catch (err: any) {
    console.error('API Login Error:', err)
    const status = typeof err?.status === 'number' ? err.status : 500
    return NextResponse.json({ error: 'Failed to authenticate with external API', details: err?.details ?? err?.message }, { status })
  }
}
