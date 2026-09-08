import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Server-side client with service role key — bypasses RLS
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error: insertError } = await adminClient
      .from('stocks')
      .insert([body])
      .select(`
        *,
        products:products(product_name, details, status),
        vendors:vendors(name, phone),
        categories:categories(name)
      `)
      .single()

    if (insertError) {
      console.error('Stock create error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (e: any) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
