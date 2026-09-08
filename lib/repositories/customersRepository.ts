import type { SupabaseClient } from '@supabase/supabase-js'
import { toCamelCaseKeys, toSnakeCaseKeys } from '@/lib/utils/case'
import type { Customer } from '@/types/domain'

export class CustomersRepository {
  constructor(private readonly client: SupabaseClient<any, any, any>) {}

  async list(): Promise<Customer[]> {
    const { data, error } = await this.client
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((row) => toCamelCaseKeys<Customer>(row))
  }

  async listActive(): Promise<Customer[]> {
    const { data, error } = await this.client
      .from('customers')
      .select('*')
      .eq('status', 1)
      .order('customer_name')
    if (error) throw error
    return (data ?? []).map((row) => toCamelCaseKeys<Customer>(row))
  }

  async create(input: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    const payload = toSnakeCaseKeys(input)
    const { data, error } = await this.client
      .from('customers')
      .insert([payload])
      .select()
      .single()
    if (error) throw error
    return toCamelCaseKeys<Customer>(data)
  }

  async update(id: number, input: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Customer> {
    const payload = toSnakeCaseKeys(input)
    const { data, error } = await this.client
      .from('customers')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return toCamelCaseKeys<Customer>(data)
  }

  async remove(id: number): Promise<void> {
    const { error } = await this.client.from('customers').delete().eq('id', id)
    if (error) throw error
  }
}

