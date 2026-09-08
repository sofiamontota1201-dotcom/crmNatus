import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
)

interface LoadItem {
    productId: number
    stockId?: number | null
    quantity: number
    unitCost: number
}

interface CreateLoadRequest {
    vendorId?: number | null
    referenceCode?: string
    notes?: string
    items: LoadItem[]
    createdBy?: string
}

export async function POST(request: NextRequest) {
    try {
        const body: CreateLoadRequest = await request.json()

        if (!body.items || body.items.length === 0) {
            return NextResponse.json({ error: 'Debe agregar al menos un producto' }, { status: 400 })
        }

        const totalItems = body.items.reduce((sum, item) => sum + item.quantity, 0)
        const totalCost = body.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0)

        // 1. Create the load record
        const { data: load, error: loadError } = await adminClient
            .from('merchandise_loads')
            .insert({
                vendor_id: body.vendorId || null,
                reference_code: body.referenceCode || null,
                notes: body.notes || null,
                total_items: totalItems,
                total_cost: totalCost,
                status: 'completed',
                created_by: body.createdBy || null,
            })
            .select('id')
            .single()

        if (loadError) throw loadError

        // 2. Process each item: update stock and create load item records
        const stockUpdates: { stockId: number; newQty: number }[] = []

        for (const item of body.items) {
            let stockId = item.stockId

            if (stockId) {
                // Product already has a stock batch - get current quantity
                const { data: stock } = await adminClient
                    .from('stocks')
                    .select('id, current_quantity, stock_quantity')
                    .eq('id', stockId)
                    .single()

                if (stock) {
                    const newQty = stock.current_quantity + item.quantity
                    await adminClient
                        .from('stocks')
                        .update({
                            current_quantity: newQty,
                            stock_quantity: stock.stock_quantity + item.quantity,
                        })
                        .eq('id', stockId)

                    stockUpdates.push({ stockId, newQty })
                }
            } else {
                // No stock batch - create new one
                const productCode = `STOCK-${Date.now().toString().slice(-8)}`
                const chalanNo = `CH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`

                const { data: newStock, error: stockError } = await adminClient
                    .from('stocks')
                    .insert({
                        product_id: item.productId,
                        vendor_id: body.vendorId || null,
                        product_code: productCode,
                        chalan_no: chalanNo,
                        buying_price: item.unitCost,
                        selling_price: Math.round(item.unitCost * 1.13),
                        stock_quantity: item.quantity,
                        current_quantity: item.quantity,
                        minimum_stock: 5,
                        status: 1,
                    })
                    .select('id')
                    .single()

                if (stockError) throw stockError
                stockId = newStock.id
            }

            // Create load item record
            await adminClient
                .from('merchandise_load_items')
                .insert({
                    load_id: load.id,
                    stock_id: stockId,
                    product_id: item.productId,
                    quantity: item.quantity,
                    unit_cost: item.unitCost,
                    total_cost: item.quantity * item.unitCost,
                })
        }

        return NextResponse.json({
            success: true,
            loadId: load.id,
            totalItems,
            totalCost,
        })

    } catch (err: any) {
        console.error('Merchandise load error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function GET() {
    try {
        const { data, error } = await adminClient
            .from('merchandise_loads')
            .select(`
                *,
                vendors:vendors(name),
                items:merchandise_load_items(
                    *,
                    products:products(product_name, sku, barcode)
                )
            `)
            .order('id', { ascending: false })

        if (error) throw error
        return NextResponse.json(data)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
