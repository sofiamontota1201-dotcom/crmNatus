import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServer } from '@/lib/supabase-server'
import { DianClient } from '@/lib/integrations/dianClient'

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { documentId, token: tokenFromBody, documentType } = await request.json()

    const cookieStore = await cookies()
    const tokenCookie = cookieStore.get('dian_token')?.value
    const token = tokenCookie ?? tokenFromBody

    if (!documentId || !token) {
      return NextResponse.json({ error: 'Missing document ID or token' }, { status: 400 })
    }

    const dian = new DianClient()
    const data = await dian.getDocumentStatus({ documentId, token, documentType })
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('API Get Document Status Error:', err)
    const status = typeof err?.status === 'number' ? err.status : 500
    return NextResponse.json({ error: 'Failed to get document status', details: err?.details ?? err?.message }, { status })
  }
}
