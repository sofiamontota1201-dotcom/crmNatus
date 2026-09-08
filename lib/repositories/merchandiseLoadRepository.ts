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
                vendors:vendors(name),
                items:merchandise_load_items(
                    *,
                    products:products(product_name, sku, barcode)
                )
            `)
            .order('id', { ascending: false })

        if (error) throw error
        return (data ?? []).map(row => toCamelCaseKeys<MerchandiseLoad>(row))
    }

    async getById(id: number): Promise<MerchandiseLoad> {
        const { data, error } = await this.client
            .from('merchandise_loads')
            .select(`
                *,
                vendors:vendors(name),
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
}
