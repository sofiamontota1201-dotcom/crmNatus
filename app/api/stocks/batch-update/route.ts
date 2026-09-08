import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { updates } = await request.json()

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'updates array is required' }, { status: 400 })
    }

    const promises = updates.map(({ id, currentQuantity }: { id: number; currentQuantity: number }) =>
      adminClient
        .from('stocks')
        .update({ current_quantity: currentQuantity })
        .eq('id', id)
    )

    const results = await Promise.all(promises)

    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      console.error('Batch update errors:', errors.map(e => e.error?.message))
      return NextResponse.json({ error: `Failed to update ${errors.length} items` }, { status: 500 })
    }

    return NextResponse.json({ updated: updates.length })
  } catch (e: any) {
    console.error('Batch update error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
