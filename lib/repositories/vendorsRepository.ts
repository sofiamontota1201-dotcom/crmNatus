import type { SupabaseClient } from '@supabase/supabase-js'
import { toCamelCaseKeys, toSnakeCaseKeys } from '@/lib/utils/case'
import type { Vendor } from '@/types/domain'

export class VendorsRepository {
  constructor(private readonly client: SupabaseClient<any, any, any>) {}

  async list(): Promise<Vendor[]> {
    const { data, error } = await this.client
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((row) => toCamelCaseKeys<Vendor>(row))
  }

  async create(input: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vendor> {
    const payload = toSnakeCaseKeys(input)
    const { data, error } = await this.client
      .from('vendors')
      .insert([payload])
      .select()
      .single()
    if (error) throw error
    return toCamelCaseKeys<Vendor>(data)
  }

  async update(id: number, input: Partial<Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Vendor> {
    const payload = toSnakeCaseKeys(input)
    const { data, error } = await this.client
      .from('vendors')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return toCamelCaseKeys<Vendor>(data)
  }

  async remove(id: number): Promise<void> {
    const { error } = await this.client.from('vendors').delete().eq('id', id)
    if (error) throw error
  }
}

