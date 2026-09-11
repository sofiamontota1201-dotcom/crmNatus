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
    sellingPrice?: number
    sellingPrice2?: number
    sellingPrice3?: number
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

        for (const item of body.items) {
            let stockId = item.stockId

            if (stockId) {
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
                }
            } else {
                // Reutilizar la fila de stock existente del producto: las unidades se
                // suman y las referencias de compra quedan en merchandise_load_items
                const { data: existingStocks } = await adminClient
                    .from('stocks')
                    .select('id, current_quantity, stock_quantity')
                    .eq('product_id', item.productId)
                    .eq('status', 1)
                    .order('created_at', { ascending: false })
                    .limit(1)

                const existing = existingStocks?.[0]

                if (existing) {
                    const { error: updateError } = await adminClient
                        .from('stocks')
                        .update({
                            current_quantity: existing.current_quantity + item.quantity,
                            stock_quantity: existing.stock_quantity + item.quantity,
                            buying_price: item.unitCost,
                            ...(item.sellingPrice > 0 ? { selling_price: item.sellingPrice } : {}),
                            ...(item.sellingPrice2 > 0 ? { selling_price_2: item.sellingPrice2 } : {}),
                            ...(item.sellingPrice3 > 0 ? { selling_price_3: item.sellingPrice3 } : {}),
                        })
                        .eq('id', existing.id)

                    if (updateError) throw updateError
                    stockId = existing.id
                } else {
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
                            selling_price: item.sellingPrice || 0,
                            selling_price_2: item.sellingPrice2 || 0,
                            selling_price_3: item.sellingPrice3 || 0,
                            stock_quantity: item.quantity,
                            current_quantity: item.quantity,

                            status: 1,
                        })
                        .select('id')
                        .single()

                    if (stockError) throw stockError
                    stockId = newStock.id
                }
            }

            const { error: itemError } = await adminClient
                .from('merchandise_load_items')
                .insert({
                    load_id: load.id,
                    stock_id: stockId,
                    product_id: item.productId,
                    quantity: item.quantity,
                    unit_cost: item.unitCost,
                    total_cost: item.quantity * item.unitCost,
                })

            if (itemError) throw itemError
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

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const vendorId = searchParams.get('vendor_id')

        let query = adminClient
            .from('merchandise_loads')
            .select(`
                *,
                vendors:vendors(name, phone),
                items:merchandise_load_items(
                    *,
                    products:products(product_name, sku, barcode),
                    stocks:stocks(selling_price, selling_price_2, selling_price_3)
                )
            `)
            .order('id', { ascending: false })

        if (vendorId) {
            query = query.eq('vendor_id', Number(vendorId))
        }

        const { data, error } = await query

        if (error) throw error
        return NextResponse.json(data)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, status, notes } = body

        if (!id) {
            return NextResponse.json({ error: 'ID de carga requerido' }, { status: 400 })
        }

        const updateData: Record<string, any> = {}
        if (status) updateData.status = status
        if (notes !== undefined) updateData.notes = notes
        updateData.updated_at = new Date().toISOString()

        const { data, error } = await adminClient
            .from('merchandise_loads')
            .update(updateData)
            .eq('id', id)
            .select('id')
            .single()

        if (error) throw error
        return NextResponse.json({ success: true, id: data.id })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID de carga requerido' }, { status: 400 })
        }

        const { data: items, error: itemsError } = await adminClient
            .from('merchandise_load_items')
            .select('stock_id, quantity')
            .eq('load_id', Number(id))

        if (itemsError) throw itemsError

        if (items && items.length > 0) {
            for (const item of items) {
                if (item.stock_id) {
                    const { data: stock } = await adminClient
                        .from('stocks')
                        .select('current_quantity, stock_quantity')
                        .eq('id', item.stock_id)
                        .single()

                    if (stock) {
                        const newCurrent = Math.max(0, stock.current_quantity - item.quantity)
                        const newStock = Math.max(0, stock.stock_quantity - item.quantity)
                        await adminClient
                            .from('stocks')
                            .update({
                                current_quantity: newCurrent,
                                stock_quantity: newStock,
                            })
                            .eq('id', item.stock_id)
                    }
                }
            }
        }

        await adminClient
            .from('merchandise_load_items')
            .delete()
            .eq('load_id', Number(id))

        const { error } = await adminClient
            .from('merchandise_loads')
            .delete()
            .eq('id', Number(id))

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
