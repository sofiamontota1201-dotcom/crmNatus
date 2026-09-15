import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'

// Server-side client with service role key — bypasses RLS
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

// Whitelist de columnas insertables (protección contra mass assignment)
const ALLOWED_STOCK_FIELDS = new Set([
  'category_id', 'product_id', 'vendor_id', 'user_id',
  'product_code', 'chalan_no', 'buying_price', 'selling_price',
  'selling_price_2', 'selling_price_3', 'discount',
  'stock_quantity', 'current_quantity', 'minimum_stock', 'maximum_stock',
  'location', 'batch_number', 'expiry_date', 'note', 'status',
])

export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()

    const payload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_STOCK_FIELDS.has(key)) payload[key] = value
    }

    if (!payload.product_id) {
      return NextResponse.json({ error: 'product_id es requerido' }, { status: 400 })
    }

    const { data, error: insertError } = await adminClient
      .from('stocks')
      .insert([payload])
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
