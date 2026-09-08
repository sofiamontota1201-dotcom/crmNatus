import type { SupabaseClient } from '@supabase/supabase-js'
import { toCamelCaseKeys, toSnakeCaseKeys } from '@/lib/utils/case'
import type { Sell, SellDetail } from '@/types/domain'
import { getUserPermissions, filterDataByPermissions } from '@/lib/permissions'

export class SellsRepository {
  constructor(private readonly client: SupabaseClient<any, any, any>) { }

  async list(): Promise<Sell[]> {
    const { data: { user } } = await this.client.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Obtener permisos del usuario
    const permissions = await getUserPermissions(this.client, user.id)

    const { data, error } = await this.client
      .from('sells')
      .select(`*, customers(*)`)
      .order('created_at', { ascending: false })
    if (error) throw error

    const sells = (data ?? []).map((row) => toCamelCaseKeys<Sell>(row))

    // Filtrar según permisos
    return filterDataByPermissions(sells, user.id, permissions)
  }

  async getWithDetails(sellId: number): Promise<Sell & { details: SellDetail[] }> {
    if (!sellId) throw new Error('sellId is required');

    // Fetch main sell data with customer info
    const { data: sellData, error: sellError } = await this.client
      .from('sells')
      .select(`
        *,
        customers (
          id,
          customer_name,
          email,
          phone,
          address
        )
      `)
      .eq('id', sellId)
      .single()

    if (sellError) throw new Error(`Error fetching sell: ${sellError.message}`);
    if (!sellData) throw new Error('Sell not found');

    // Fetch sell details with product info
    const { data: detailsData, error: detailsError } = await this.client
      .from('sell_details')
      .select(`
        *,
        stock:stocks (
          id,
          product_code,
          buying_price,
          selling_price,
          product:products (
            id,
            product_name,
            details,
            status
          )
        )
      `)
      .eq('sell_id', sellId)

    if (detailsError) throw new Error(`Error fetching details: ${detailsError.message}`);

    const transformedSell = toCamelCaseKeys<Sell>(sellData);
    if (transformedSell.customers) {
      transformedSell.customers = toCamelCaseKeys(transformedSell.customers);
    }

    return {
      ...transformedSell,
      details: (detailsData ?? []).map((d) => {
        const transformedDetail = toCamelCaseKeys<SellDetail>(d);

        // Transform nested stock data
        if (d.stock) {
          const transformedStock = toCamelCaseKeys(d.stock);

          // Transform nested product data
          if (d.stock.product) {
            transformedStock.product = toCamelCaseKeys(d.stock.product);
          }

          transformedDetail.stock = transformedStock;
        }

        return transformedDetail;
      }),
    }
  }

  async create(input: Omit<Sell, 'id' | 'createdAt' | 'updatedAt' | 'customers'>): Promise<Sell> {
    const payload = toSnakeCaseKeys(input)
    const { data, error } = await this.client
      .from('sells')
      .insert([payload])
      .select('*')
      .single()
    if (error) throw error
    return toCamelCaseKeys<Sell>(data)
  }

  async createDetail(input: Omit<SellDetail, 'id' | 'createdAt' | 'updatedAt' | 'products'>): Promise<SellDetail> {
    const payload = toSnakeCaseKeys(input)
    const { data, error } = await this.client
      .from('sell_details')
      .insert([payload])
      .select('*')
      .single()
    if (error) throw error
    return toCamelCaseKeys<SellDetail>(data)
  }

  async update(id: number, input: Partial<Sell>): Promise<Sell> {
    const payload = toSnakeCaseKeys(input)
    const { data, error } = await this.client
      .from('sells')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return toCamelCaseKeys<Sell>(data)
  }

  async updateDetail(id: number, input: Partial<SellDetail>): Promise<SellDetail> {
    const payload = toSnakeCaseKeys(input)
    const { data, error } = await this.client
      .from('sell_details')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return toCamelCaseKeys<SellDetail>(data)
  }

  async createDetailsBatch(details: Omit<SellDetail, 'id' | 'createdAt' | 'updatedAt' | 'products'>[]): Promise<SellDetail[]> {
    const payloads = details.map(d => toSnakeCaseKeys(d))
    const { data, error } = await this.client
      .from('sell_details')
      .insert(payloads)
      .select('*')
    if (error) throw error
    return (data ?? []).map(d => toCamelCaseKeys<SellDetail>(d))
  }

  async updateDetailsBatch(updates: { id: number; input: Partial<SellDetail> }[]): Promise<void> {
    const promises = updates.map(({ id, input }) => {
      const payload = toSnakeCaseKeys(input)
      return this.client
        .from('sell_details')
        .update(payload)
        .eq('id', id)
    })
    const results = await Promise.all(promises)
    for (const result of results) {
      if (result.error) throw result.error
    }
  }

  async remove(id: number): Promise<void> {
    // Delete details first to avoid foreign key constraints
    const { error: detailsError } = await this.client
      .from("sell_details")
      .delete()
      .eq("sell_id", id)

    if (detailsError) throw detailsError

    const { error } = await this.client.from("sells").delete().eq("id", id)
    if (error) throw error
  }
}
