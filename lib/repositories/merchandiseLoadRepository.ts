import type { SupabaseClient } from '@supabase/supabase-js'
import { toCamelCaseKeys, toSnakeCaseKeys } from '@/lib/utils/case'
import type { MerchandiseLoad } from '@/types/domain'

export class MerchandiseLoadRepository {
    constructor(private readonly client: SupabaseClient<any, any, any>) { }

    async list(): Promise<MerchandiseLoad[]> {
        const { data, error } = await this.client
            .from('merchandise_loads')
            .select(`
                *,
                vendors:vendors(name, phone),
                items:merchandise_load_items(
                    *,
                    products:products(product_name, sku, barcode)
                )
            `)
            .order('id', { ascending: false })

        if (error) throw error
        return (data ?? []).map(row => toCamelCaseKeys<MerchandiseLoad>(row))
    }

    async listByVendor(vendorId: number): Promise<MerchandiseLoad[]> {
        const { data, error } = await this.client
            .from('merchandise_loads')
            .select(`
                *,
                vendors:vendors(name, phone),
                items:merchandise_load_items(
                    *,
                    products:products(product_name, sku, barcode)
                )
            `)
            .eq('vendor_id', vendorId)
            .order('id', { ascending: false })

        if (error) throw error
        return (data ?? []).map(row => toCamelCaseKeys<MerchandiseLoad>(row))
    }

    async getById(id: number): Promise<MerchandiseLoad> {
        const { data, error } = await this.client
            .from('merchandise_loads')
            .select(`
                *,
                vendors:vendors(name, phone),
                items:merchandise_load_items(
                    *,
                    products:products(product_name, sku, barcode)
                )
            `)
            .eq('id', id)
            .single()

        if (error) throw error
        return toCamelCaseKeys<MerchandiseLoad>(data)
    }

    async updateStatus(id: number, status: string): Promise<void> {
        const { error } = await this.client
            .from('merchandise_loads')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)

        if (error) throw error
    }

    async remove(id: number): Promise<void> {
        const { data: items } = await this.client
            .from('merchandise_load_items')
            .select('stock_id, quantity')
            .eq('load_id', id)

        if (items && items.length > 0) {
            for (const item of items) {
                if (item.stock_id) {
                    const { data: stock } = await this.client
                        .from('stocks')
                        .select('current_quantity, stock_quantity')
                        .eq('id', item.stock_id)
                        .single()

                    if (stock) {
                        await this.client
                            .from('stocks')
                            .update({
                                current_quantity: Math.max(0, stock.current_quantity - item.quantity),
                                stock_quantity: Math.max(0, stock.stock_quantity - item.quantity),
                            })
                            .eq('id', item.stock_id)
                    }
                }
            }
        }

        await this.client.from('merchandise_load_items').delete().eq('load_id', id)
        const { error } = await this.client.from('merchandise_loads').delete().eq('id', id)
        if (error) throw error
    }
}
