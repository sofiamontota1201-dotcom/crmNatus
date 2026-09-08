import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { toCamelCaseKeys } from '@/lib/utils/case'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  try {
    const { data, error } = await supabase
      .from('prospectos_clientes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    const prospects = (data ?? []).map((row) => toCamelCaseKeys(row))
    return NextResponse.json(prospects)
  } catch (error: any) {
    console.error('Error in /api/prospects:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
