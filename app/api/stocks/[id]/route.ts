import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Server-side client with service role key — bypasses RLS
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const stockId = Number(id)

    if (isNaN(stockId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const { error } = await adminClient
      .from('stocks')
      .delete()
      .eq('id', stockId)

    if (error) {
      console.error('Stock delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}


export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const stockId = Number(id)

    if (isNaN(stockId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    // Perform the update using the service role (bypasses RLS)
    const { error: updateError } = await adminClient
      .from('stocks')
      .update(body)
      .eq('id', stockId)

    if (updateError) {
      console.error('Stock update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Fetch the updated record with relations
    const { data, error: fetchError } = await adminClient
      .from('stocks')
      .select(`
        *,
        products:products(product_name, details, status),
        vendors:vendors(name, phone),
        categories:categories(name)
      `)
      .eq('id', stockId)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (e: any) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
