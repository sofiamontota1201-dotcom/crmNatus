import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { startDate, endDate, minDifference = 0 } = await request.json()

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
          },
        },
      }
    )

    // 1. Fetch all sells
    let sellsQuery = supabase
      .from('sells')
      .select('id, total_amount, discount_amount, sell_date, payment_status, customers(customer_name)')
      .order('id', { ascending: false })

    if (startDate) sellsQuery = sellsQuery.gte('sell_date', startDate)
    if (endDate) sellsQuery = sellsQuery.lte('sell_date', endDate)

    const { data: sells, error: sellsError } = await sellsQuery

    if (sellsError) {
      return Response.json({ status: 'error', error: `Error fetching sells: ${sellsError.message}` }, { status: 500 })
    }

    // 2. For each sell, fetch details and compare
    const discrepancies: any[] = []
    let checked = 0

    for (const sell of sells || []) {
      const { data: details, error: detailsError } = await supabase
        .from('sell_details')
        .select('id, total_sold_price, sold_quantity, sold_price, stock_id')
        .eq('sell_id', sell.id)

      if (detailsError) continue

      const detailsTotal = (details || []).reduce((sum: number, d: any) => sum + (d.total_sold_price || 0), 0)
      const registeredTotal = sell.total_amount || 0
      const difference = Math.abs(registeredTotal - detailsTotal)

      if (difference > minDifference) {
        discrepancies.push({
          sell_id: sell.id,
          registered_total: registeredTotal,
          real_total: detailsTotal,
          difference,
          details_count: details?.length || 0,
          sell_date: sell.sell_date,
          payment_status: sell.payment_status,
          customer: (sell.customers as any)?.customer_name || 'Sin cliente',
          details: details || [],
        })
      }
      checked++
    }

    return Response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      total_sells: sells?.length || 0,
      checked,
      min_difference_filter: minDifference,
      discrepancies_found: discrepancies.length,
      discrepancies,
    })
  } catch (error: any) {
    console.error('Check invoices error:', error)
    return Response.json(
      { status: 'error', error: error.message || 'Internal error', timestamp: new Date().toISOString() },
      { status: 500 }
    )
  }
}
