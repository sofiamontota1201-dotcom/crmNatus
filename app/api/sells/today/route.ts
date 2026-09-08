import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
)

export async function GET() {
    try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const { data: sells, error } = await adminClient
            .from('sells')
            .select(`
                id,
                created_at,
                total_amount,
                paid_amount,
                discount_amount,
                payment_method,
                payment_status,
                customers(customer_name, email, phone)
            `)
            .gte('created_at', today.toISOString())
            .lt('created_at', tomorrow.toISOString())
            .order('id', { ascending: false })

        if (error) throw error

        // Get details for each sell
        const sellIds = (sells || []).map((s: any) => s.id)
        let detailsMap: Record<number, any[]> = {}

        if (sellIds.length > 0) {
            const { data: details } = await adminClient
                .from('sell_details')
                .select('sell_id, sold_quantity, sold_price, total_sold_price, stocks!inner(id, product_code, products!inner(product_name))')
                .in('sell_id', sellIds)

            for (const d of (details || []) as any[]) {
                if (!detailsMap[d.sell_id]) detailsMap[d.sell_id] = []
                detailsMap[d.sell_id].push({
                    productName: d.stocks?.products?.product_name || 'Producto',
                    productCode: d.stocks?.product_code || '',
                    quantity: d.sold_quantity,
                    unitPrice: d.sold_price,
                    total: d.total_sold_price,
                })
            }
        }

        const result = (sells || []).map((s: any) => ({
            id: s.id,
            createdAt: s.created_at,
            totalAmount: s.total_amount,
            paidAmount: s.paid_amount,
            discountAmount: s.discount_amount,
            paymentMethod: s.payment_method,
            paymentStatus: s.payment_status,
            customerName: s.customers?.customer_name || 'Consumidor Final',
            customerEmail: s.customers?.email || '',
            customerPhone: s.customers?.phone || '',
            details: detailsMap[s.id] || [],
        }))

        const totalDay = result.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0)
        const totalSales = result.length
        const totalProducts = result.reduce((sum, s) => sum + s.details.reduce((ds: number, d: any) => ds + d.quantity, 0), 0)

        return NextResponse.json({
            sells: result,
            summary: {
                totalDay,
                totalSales,
                totalProducts,
                date: today.toISOString().split('T')[0],
            }
        })

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
