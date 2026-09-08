import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  return NextResponse.json({ ok: true, ts: Date.now(), user: user ? { id: user.id, email: user.email } : null })
}

