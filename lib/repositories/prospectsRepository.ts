import type { SupabaseClient } from '@supabase/supabase-js'
import { toCamelCaseKeys, toSnakeCaseKeys } from '@/lib/utils/case'
import type { Prospect, Customer } from '@/types/domain'

export class ProspectsRepository {
  constructor(private readonly client: SupabaseClient<any, any, any>) {}

  async list(): Promise<Prospect[]> {
    const { data, error } = await this.client
      .from('prospectos_clientes')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((row) => toCamelCaseKeys<Prospect>(row))
  }

  async create(input: Omit<Prospect, 'id' | 'createdAt' | 'updatedAt'>): Promise<Prospect> {
    const payload = toSnakeCaseKeys(input)
    const { data, error } = await this.client
      .from('prospectos_clientes')
      .insert([payload])
      .select()
      .single()
    if (error) throw error
    return toCamelCaseKeys<Prospect>(data)
  }

  async update(id: number, input: Partial<Omit<Prospect, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Prospect> {
    const payload = toSnakeCaseKeys(input)
    const { data, error } = await this.client
      .from('prospectos_clientes')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return toCamelCaseKeys<Prospect>(data)
  }

  async convertToCustomer(prospectId: number): Promise<Customer> {
    // 1. Fetch prospect
    const { data: prospect, error: fetchError } = await this.client
      .from('prospectos_clientes')
      .select('*')
      .eq('id', prospectId)
      .single()
    
    if (fetchError) throw fetchError

    // 2. Insert into customers
    const customerPayload = {
      customer_name: prospect.name,
      phone: prospect.phone,
      address: prospect.address,
      city: prospect.city,
      latitude: prospect.latitude,
      longitude: prospect.longitude,
      status: 1 // Active
    }

    const { data: customer, error: insertError } = await this.client
      .from('customers')
      .insert([customerPayload])
      .select()
      .single()

    if (insertError) throw insertError

    // 3. Update prospect status or delete
    await this.client
      .from('prospectos_clientes')
      .update({ status: 'converted' })
      .eq('id', prospectId)

    return toCamelCaseKeys<Customer>(customer)
  }

  async remove(id: number): Promise<void> {
    const { error } = await this.client.from('prospectos_clientes').delete().eq('id', id)
    if (error) throw error
  }
}
