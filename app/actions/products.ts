'use server'

import { createClient } from '@supabase/supabase-js'
import { ProductsRepository } from '@/lib/repositories/productsRepository'
import { Product } from '@/types/domain'
import { revalidatePath } from 'next/cache'

// Admin client with service role key — bypasses RLS for server actions
const getRepository = () => {
    const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!
    )
    return new ProductsRepository(adminClient)
}

export async function createProductAction(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'categories'>) {
    const repository = getRepository()
    const newProduct = await repository.create(data)
    revalidatePath('/products')
    return newProduct
}

export async function updateProductAction(id: number, data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'categories'>>) {
    const repository = getRepository()
    const updatedProduct = await repository.update(id, data)
    revalidatePath('/products')
    return updatedProduct
}

export async function deleteProductAction(id: number) {
    const repository = getRepository()
    await repository.remove(id)
    revalidatePath('/products')
}
