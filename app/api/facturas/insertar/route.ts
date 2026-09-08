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

    const { invoiceData, token: tokenFromBody } = await request.json()

    const cookieStore = await cookies()
    const tokenCookie = cookieStore.get('dian_token')?.value
    const token = tokenCookie ?? tokenFromBody

    if (!invoiceData || !token) {
      return NextResponse.json({ error: 'Missing invoice data or token' }, { status: 400 })
    }

    const dian = new DianClient()
    const data = await dian.insertInvoice({ invoiceData, token })
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('API Insert Invoice Error:', err)
    const status = typeof err?.status === 'number' ? err.status : 500
    return NextResponse.json({ error: 'Failed to insert invoice', details: err?.details ?? err?.message }, { status })
  }
}
