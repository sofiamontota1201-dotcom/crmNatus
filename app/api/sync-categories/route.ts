import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import * as XLSX from 'xlsx'
import path from 'path'
import fs from 'fs'

export async function POST() {
    try {
        const excelPath = path.join(
            process.env.USERPROFILE || process.env.HOME || '',
            'Downloads', 'Monica85_5999', 'Monica85', 'INVENTARIO_MONICA.xlsx'
        )

        if (!fs.existsSync(excelPath)) {
            return NextResponse.json({ error: `No se encontró el archivo: ${excelPath}` }, { status: 404 })
        }

        const workbook = XLSX.readFile(excelPath)
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows: any[] = XLSX.utils.sheet_to_json(sheet)

        // 1. Crear categorías que no existen
        const uniqueCategories = [...new Set(rows.map(r => r.CATEGORIA).filter(Boolean))]
        const { data: existingCats } = await supabaseAdmin.from('categories').select('id, name')
        const existingNames = new Map((existingCats || []).map(c => [c.name.toLowerCase(), c.id]))

        const newCatNames = uniqueCategories.filter(name => !existingNames.has(name.toLowerCase()))
        const createdCategoryMap = new Map<string, number>()

        for (const name of newCatNames) {
            const { data, error } = await supabaseAdmin
                .from('categories')
                .insert({ name, status: 1 })
                .select('id, name')
                .single()

            if (error) {
                console.error(`Error creando categoría "${name}":`, error)
                continue
            }
            createdCategoryMap.set(name.toLowerCase(), data.id)
        }

        // Merge existing + created categories
        const allCategories = new Map<string, number>()
        for (const [name, id] of existingNames) allCategories.set(name, id)
        for (const [name, id] of createdCategoryMap) allCategories.set(name, id)

        // 2. Obtener todos los productos del CRM
        const { data: products } = await supabaseAdmin
            .from('products')
            .select('id, barcode, product_name, category_id')

        const productByBarcode = new Map<string, any>()
        for (const p of products || []) {
            if (p.barcode) productByBarcode.set(p.barcode.toString(), p)
        }

        // 3. Emparejar productos Excel con CRM por código de barras
        let matched = 0
        let updated = 0
        let skipped = 0
        const errors: string[] = []

        for (const row of rows) {
            const barcode = row.CODIGO?.toString()
            const categoryName = row.CATEGORIA

            if (!barcode || !categoryName) {
                skipped++
                continue
            }

            const catId = allCategories.get(categoryName.toLowerCase())
            if (!catId) {
                errors.push(`Categoría no encontrada: "${categoryName}"`)
                continue
            }

            const product = productByBarcode.get(barcode)
            if (!product) {
                skipped++
                continue
            }

            matched++

            if (product.category_id === catId) continue

            const { error } = await supabaseAdmin
                .from('products')
                .update({ category_id: catId })
                .eq('id', product.id)

            if (error) {
                errors.push(`Error actualizando producto ${product.id}: ${error.message}`)
            } else {
                updated++
            }
        }

        return NextResponse.json({
            success: true,
            excel_products: rows.length,
            excel_categories: uniqueCategories.length,
            categories_created: newCatNames.length,
            crm_products: (products || []).length,
            products_matched: matched,
            products_updated: updated,
            products_skipped: skipped,
            errors: errors.slice(0, 20)
        })

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
