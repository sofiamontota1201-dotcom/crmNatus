
import type { SupabaseClient } from '@supabase/supabase-js'
import { toCamelCaseKeys } from '@/lib/utils/case'
import type { Stock, SellDetail } from '@/types/domain'

export interface InventoryValuationItem extends Stock {
    totalValue: number;       // a precio de costo
    totalValueSale: number;   // a precio de venta
}

export interface ProfitabilityItem {
    productId: number;
    productName: string;
    categoryName?: string;
    totalUnitsSold: number;
    totalRevenue: number;
    totalCost: number;
    profit: number;
    marginPercent: number;
}

export interface SalesWithSupport {
    saleId: number;
    totalAmount: number;
    hasSupport: boolean;
    supportId?: string;
    supportType?: string;
}

export interface ProfitabilityReport {
    summary: {
        totalGrossSales: number;
        totalCOGS: number;
        grossProfit: number;
        contributionMarginPercent: number;
        averageMarginPercent: number;
        totalWithSupport: number;
        totalWithoutSupport: number;
        supportCoverage: number; // porcentaje
    };
    details: ProfitabilityItem[];
    salesWithSupport: SalesWithSupport[];
}

export class ReportsRepository {
    constructor(private readonly client: SupabaseClient<any, any, any>) { }

    async getInventoryValuation(): Promise<InventoryValuationItem[]> {
        const { data, error } = await this.client
            .from('stocks')
            .select(`
        *,
        products:products(product_name, details, status),
        vendors:vendors(name, phone),
        categories:categories(name)
      `)
            .order('current_quantity', { ascending: true }) // Sort by quantity (zero-stock first)
            .order('id', { ascending: false })

        if (error) throw error

        const stocks = (data ?? []).map((row) => toCamelCaseKeys<Stock>(row))

        return stocks.map(stock => ({
            ...stock,
            totalValue:     stock.currentQuantity * stock.buyingPrice,
            totalValueSale: stock.currentQuantity * stock.sellingPrice,
        }))
    }

    async getProfitabilityAnalysis(startDate?: string, endDate?: string): Promise<ProfitabilityReport> {
        // 1. Obtener ingresos totales desde sells (mismo cálculo que SalesReport)
        let sellsQuery = this.client
            .from('sells')
            .select('id, total_amount, created_at')
        
        if (startDate) {
            sellsQuery = sellsQuery.gte('created_at', `${startDate}T00:00:00`)
        }
        if (endDate) {
            sellsQuery = sellsQuery.lte('created_at', `${endDate}T23:59:59`)
        }

        const { data: sellsData, error: sellsError } = await sellsQuery;
        if (sellsError) throw sellsError;

        const totalGrossSales = (sellsData || []).reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
        
        // 1b. Obtener soportes factales (invoice_supports) para validación
        let supportsQuery = this.client
            .from('invoice_supports')
            .select('id, reference_id, type')
            .eq('type', 'venta')
        
        if (startDate) {
            supportsQuery = supportsQuery.gte('created_at', `${startDate}T00:00:00`)
        }
        if (endDate) {
            supportsQuery = supportsQuery.lte('created_at', `${endDate}T23:59:59`)
        }

        const { data: supportsData, error: supportsError } = await supportsQuery;
        if (supportsError) console.warn('Advertencia al obtener soportes:', supportsError);
        
        // Crear mapa de soportes por reference_id (sell_id)
        const supportMap = new Map<number, { id: string; type: string }>();
        (supportsData || []).forEach((support: any) => {
            const refId = Number(support.reference_id);
            if (refId && !supportMap.has(refId)) {
                supportMap.set(refId, {
                    id: support.id,
                    type: support.type
                });
            }
        });
        
        // Mapear ventas con soporte
        const salesWithSupport: SalesWithSupport[] = (sellsData || []).map((sale: any) => ({
            saleId: sale.id,
            totalAmount: Number(sale.total_amount) || 0,
            hasSupport: supportMap.has(sale.id),
            supportId: supportMap.get(sale.id)?.id,
            supportType: supportMap.get(sale.id)?.type
        }));
        
        // Calcular totales con y sin soporte
        const totalWithSupport = salesWithSupport
            .filter(s => s.hasSupport)
            .reduce((sum, s) => sum + s.totalAmount, 0);
        
        const totalWithoutSupport = totalGrossSales - totalWithSupport;
        const supportCoverage = totalGrossSales > 0 ? (totalWithSupport / totalGrossSales) * 100 : 0;

        // 2. Obtener categorías para mapear por category_id
        const { data: categoriesData } = await this.client
            .from('categories')
            .select('id, name')
        
        const categoryMap = new Map<number, string>();
        (categoriesData || []).forEach((c: any) => categoryMap.set(c.id, c.name));

        // 3. Obtener detalles de ventas para costos y utilidad por producto
        let detailsQuery = this.client
            .from('sell_details')
            .select(`
        *,
        sells!inner(created_at),
        stocks!inner(
            id,
            products!inner(id, product_name, category_id)
        )
      `)

        if (startDate) {
            detailsQuery = detailsQuery.gte('sells.created_at', `${startDate}T00:00:00`)
        }
        if (endDate) {
            detailsQuery = detailsQuery.lte('sells.created_at', `${endDate}T23:59:59`)
        }

        const { data: rawData, error: detailsError } = await detailsQuery;
        if (detailsError) throw detailsError;

        // 4. Process data to group by product
        const productMap = new Map<number, ProfitabilityItem>();
        let totalCOGS = 0;

        (rawData || []).forEach((row: any) => {
            const productId = row.stocks?.products?.id;
            const productName = row.stocks?.products?.product_name || 'Unknown Product';
            const categoryId = row.stocks?.products?.category_id;
            const categoryName = (categoryId ? categoryMap.get(categoryId) : null) || 'Uncategorized';

            const soldPrice = Number(row.sold_price) || 0;
            const buyPrice = Number(row.buy_price) || 0;
            const quantity = Number(row.sold_quantity) || 0;

            const revenue = soldPrice * quantity;
            const cost = buyPrice * quantity;

            totalCOGS += cost;

            if (!productMap.has(productId)) {
                productMap.set(productId, {
                    productId,
                    productName,
                    categoryName,
                    totalUnitsSold: 0,
                    totalRevenue: 0,
                    totalCost: 0,
                    profit: 0,
                    marginPercent: 0
                });
            }

            const item = productMap.get(productId)!;
            item.totalUnitsSold += quantity;
            item.totalRevenue += revenue;
            item.totalCost += cost;
            item.profit += (revenue - cost);
        });

        const details = Array.from(productMap.values()).map(item => ({
            ...item,
            marginPercent: item.totalRevenue > 0 ? (item.profit / item.totalRevenue) * 100 : 0
        })).sort((a, b) => b.profit - a.profit);

        const grossProfit = totalGrossSales - totalCOGS;
        const contributionMarginPercent = totalGrossSales > 0 ? (grossProfit / totalGrossSales) * 100 : 0;
        
        // Margen promedio por producto (NO sobre ventas totales)
        const averageMarginPercent = details.length > 0 
            ? details.reduce((sum, item) => sum + item.marginPercent, 0) / details.length 
            : 0;

        return {
            summary: {
                totalGrossSales,
                totalCOGS,
                grossProfit,
                contributionMarginPercent,
                averageMarginPercent,
                totalWithSupport,
                totalWithoutSupport,
                supportCoverage
            },
            details,
            salesWithSupport
        };
    }
}
