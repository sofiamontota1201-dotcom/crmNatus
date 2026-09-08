import { SupabaseClient } from '@supabase/supabase-js';

// Definición mejorada de las herramientas con validación estricta
// Los parámetros `limit` fueron eliminados del schema para evitar que Groq
// rechace con error 400 cuando el LLM los envía como string.
// Los valores por defecto están hardcodeados en executeTool().
export const toolsDefinition = [
    {
        type: 'function',
        function: {
            name: 'get_low_stock_products',
            description: 'Obtiene una lista de productos con stock bajo. Úsalo cuando pregunten qué productos faltan o están por acabarse.',
            parameters: {
                type: 'object',
                properties: {}
            },
        }
    },
    {
        type: 'function',
        function: {
            name: 'search_products',
            description: 'Busca productos por nombre, referencia o descripción en el inventario. Úsalo cuando mencionen un producto específico o quieran buscar algo.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'El término de búsqueda (nombre del producto, palabra clave, referencia)'
                    },
                },
                required: ['query'],
            },
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_recent_sales',
            description: 'Obtiene las ventas más recientes con detalles completos. Úsalo cuando pregunten por ventas, lo que se ha vendido o el movimiento del día.',
            parameters: {
                type: 'object',
                properties: {}
            },
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_general_stats',
            description: 'Obtiene un resumen completo del negocio: total de productos, alertas de stock y ventas del día. Úsalo para saludos o preguntas generales como "cómo va todo" o "dame un resumen".',
            parameters: {
                type: 'object',
                properties: {}
            },
        }
    },
    {
        type: 'function',
        function: {
            name: 'query_supabase',
            description: 'Ejecuta una consulta SELECT dinámica en la base de datos. Úsalo como motor principal para extraer cualquier información que el usuario pida (precios, clientes, facturas, etc).',
            parameters: {
                type: 'object',
                properties: {
                    table: { type: 'string', description: 'Nombre de la tabla principal (ej: products, sells, customers)' },
                    select: { type: 'string', description: 'Columnas a seleccionar. Puede incluir relaciones (ej: "id, product_name, stocks(selling_price, current_quantity)")' },
                    filters: {
                        type: 'array',
                        description: 'Filtros para aplicar a la consulta (opcional)',
                        items: {
                            type: 'object',
                            properties: {
                                column: { type: 'string', description: 'Columna a filtrar' },
                                operator: { type: 'string', description: 'Operador de Supabase: eq, ilike, gt, lt, gte, lte' },
                                value: { type: 'string', description: 'Valor del filtro' }
                            }
                        }
                    },
                    orderColumn: { type: 'string', description: 'Columna para ordenar (opcional)' },
                    ascending: { type: 'boolean', description: 'Orden ascendente (true) o descendente (false)' },
                    limit: { type: 'number', description: 'Límite de resultados (máximo 20)' }
                },
                required: ['table', 'select']
            }
        }
    }
];

// Función auxiliar para formatear precios en pesos colombianos
function formatCurrency(amount: number): string {
    return `$${amount.toLocaleString('es-CO')}`;
}

// Función auxiliar para formatear fechas de forma amigable
function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = date.toISOString().split('T')[0];
    const todayOnly = today.toISOString().split('T')[0];
    const yesterdayOnly = yesterday.toISOString().split('T')[0];

    if (dateOnly === todayOnly) {
        return `Hoy ${date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (dateOnly === yesterdayOnly) {
        return `Ayer ${date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
        return date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
}

// Implementación robusta de las funciones con manejo de errores
export async function executeTool(toolName: string, args: any, supabase: SupabaseClient) {
    console.log(`🛠️ Executing tool: ${toolName} with args:`, args);

    // Normalizar argumentos y aplicar valores por defecto.
    // Usamos != null para no tratar limit=0 como "ausente".
    const normalizedArgs = {
        limit: args?.limit != null ? Math.floor(Number(args.limit)) : undefined,
        query: args?.query?.trim() || undefined
    };

    try {
        switch (toolName) {
            case 'get_general_stats': {
                // 1. Total Productos
                const { count: productsCount, error: productsError } = await supabase
                    .from('products')
                    .select('*', { count: 'exact', head: true });

                if (productsError) throw productsError;

                // 2. Stock Bajo (límite de 10 unidades)
                const { count: lowStockCount, error: lowStockError } = await supabase
                    .from('stocks')
                    .select('*', { count: 'exact', head: true })
                    .lte('current_quantity', 10);

                if (lowStockError) throw lowStockError;

                // 3. Ventas Hoy
                const today = new Date().toISOString().split('T')[0];
                const { data: salesToday, error: salesTodayError } = await supabase
                    .from('sells')
                    .select('total_amount')
                    .gte('created_at', today);

                if (salesTodayError) throw salesTodayError;

                const totalVentasHoy = salesToday?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;

                return JSON.stringify({
                    total_productos: productsCount || 0,
                    lotes_stock_bajo: lowStockCount || 0,
                    ventas_hoy: salesToday?.length || 0,
                    monto_ventas_hoy: formatCurrency(totalVentasHoy),
                    mensaje: "✅ Resumen actualizado"
                });
            }

            case 'get_low_stock_products': {
                const limit = normalizedArgs.limit || 10;

                const { data: stocks, error: stockError } = await supabase
                    .from('stocks')
                    .select('*, products(product_name)')
                    .lte('current_quantity', limit)
                    .order('current_quantity', { ascending: true })
                    .limit(15); // Limitar a 15 resultados máximo

                if (stockError) throw stockError;

                if (!stocks || stocks.length === 0) {
                    return JSON.stringify({
                        mensaje: `✅ ¡Excelente! No hay productos con stock bajo (≤${limit} unidades)`,
                        productos: []
                    });
                }

                const formattedStocks = stocks.map((s: any) => ({
                    producto: s.products?.product_name || 'Desconocido',
                    cantidad_actual: s.current_quantity,
                    precio_venta: formatCurrency(s.selling_price || 0)
                }));

                return JSON.stringify({
                    mensaje: `⚠️ Encontrados ${stocks.length} producto(s) con stock ≤${limit} unidades`,
                    productos: formattedStocks
                });
            }

            case 'search_products': {
                if (!normalizedArgs.query) {
                    return JSON.stringify({
                        mensaje: '❌ Por favor especifica qué producto buscas',
                        productos: []
                    });
                }

                const searchQuery = normalizedArgs.query;

                // Dividir la búsqueda en palabras clave (ignorando preposiciones cortas)
                const words = searchQuery.split(' ').filter((w: string) => w.length > 2);

                // Construir la consulta de Supabase dinámica
                let dbQuery = supabase
                    .from('products')
                    .select('*, stocks(current_quantity, selling_price)');

                if (words.length > 0) {
                    // Buscar cada palabra clave en el nombre o los detalles
                    words.forEach((word: string) => {
                        dbQuery = dbQuery.or(`product_name.ilike.%${word}%,details.ilike.%${word}%`);
                    });
                } else {
                    // Fallback para palabras muy cortas
                    dbQuery = dbQuery.ilike('product_name', `%${searchQuery}%`);
                }

                const { data: products, error: prodError } = await dbQuery.limit(15);

                if (prodError) throw prodError;

                if (!products || products.length === 0) {
                    return JSON.stringify({
                        mensaje: `🤷 No encontré productos que coincidan con "${searchQuery}"`,
                        sugerencia: 'Intenta con otro término de búsqueda',
                        productos: []
                    });
                }

                const formattedProducts = products.map((p: any) => {
                    const stockInfo = p.stocks?.[0];
                    return {
                        id: p.id,
                        nombre: p.product_name,
                        stock_actual: stockInfo?.current_quantity ?? 0,
                        precio: formatCurrency(stockInfo?.selling_price ?? 0),
                        categoria: p.category || 'Sin categoría'
                    };
                });

                return JSON.stringify({
                    mensaje: `✅ Encontrados ${products.length} producto(s) para "${searchQuery}"`,
                    productos: formattedProducts
                });
            }

            case 'get_recent_sales': {
                const salesLimit = Math.min(normalizedArgs.limit || 5, 10); // Máximo 10 ventas

                // 1. Obtener las ventas principales
                const { data: sales, error: salesError } = await supabase
                    .from('sells')
                    .select('id, total_amount, created_at, customer_id, customers(customer_name)')
                    .order('created_at', { ascending: false })
                    .limit(salesLimit);

                if (salesError) throw salesError;

                if (!sales || sales.length === 0) {
                    return JSON.stringify({
                        mensaje: '📭 No hay ventas registradas todavía',
                        ventas: []
                    });
                }

                const saleIds = sales.map(s => s.id);

                // 2. Obtener items de las ventas
                let rawItems: any[] = [];

                const { data: detailsA, error: detailsError } = await supabase
                    .from('sell_details')
                    .select('sell_id, product_id, sold_quantity')
                    .in('sell_id', saleIds);

                if (detailsError) {
                    console.warn('⚠️ Error obteniendo sell_details:', detailsError);
                } else if (detailsA && detailsA.length > 0) {
                    rawItems = detailsA;
                }

                // 3. Obtener nombres de productos
                const productIds = [...new Set(rawItems.map(i => i.product_id).filter(id => id))];
                let productMap: Record<number, string> = {};

                if (productIds.length > 0) {
                    const { data: products, error: productsError } = await supabase
                        .from('products')
                        .select('id, product_name')
                        .in('id', productIds);

                    if (productsError) {
                        console.warn('⚠️ Error obteniendo productos:', productsError);
                    } else {
                        products?.forEach((p: any) => {
                            productMap[p.id] = p.product_name;
                        });
                    }
                }

                // 4. Formatear ventas
                const formattedSales = sales.map((sale: any) => {
                    const myItems = rawItems.filter(item => item.sell_id === sale.id);

                    const productsList = myItems.length > 0
                        ? myItems.map(item => {
                            const name = productMap[item.product_id] || `Producto #${item.product_id}`;
                            const qty = item.sold_quantity || 1;
                            return `${name} (x${qty})`;
                        }).join(', ')
                        : 'Sin detalles de items';

                    return {
                        id: sale.id,
                        cliente: sale.customers?.customer_name || 'Cliente directo',
                        total: formatCurrency(sale.total_amount || 0),
                        fecha: formatDate(sale.created_at),
                        productos: productsList
                    };
                });

                return JSON.stringify({
                    mensaje: `💰 Últimas ${sales.length} venta(s)`,
                    ventas: formattedSales
                });
            }

            case 'query_supabase': {
                if (!args.table || !args.select) {
                    return JSON.stringify({ error: 'Falta table o select en los parámetros' });
                }

                console.log(`🔍 Construyendo query dinámica para: ${args.table}`);
                let query: any = supabase.from(args.table).select(args.select);

                // Aplicar filtros dinámicamente
                if (args.filters && Array.isArray(args.filters)) {
                    for (const f of args.filters) {
                        if (!f.column || !f.operator || f.value === undefined) continue;
                        
                        switch (f.operator) {
                            case 'eq': query = query.eq(f.column, f.value); break;
                            case 'ilike': query = query.ilike(f.column, `%${f.value}%`); break;
                            case 'gt': query = query.gt(f.column, f.value); break;
                            case 'lt': query = query.lt(f.column, f.value); break;
                            case 'gte': query = query.gte(f.column, f.value); break;
                            case 'lte': query = query.lte(f.column, f.value); break;
                        }
                    }
                }

                // Ordenar
                if (args.orderColumn) {
                    query = query.order(args.orderColumn, { ascending: args.ascending !== false });
                }

                // Limitar (seguridad: max 20)
                const limit = Math.min(Number(args.limit) || 10, 20);
                query = query.limit(limit);

                const { data, error } = await query;
                
                if (error) {
                    console.error('❌ Error en query_supabase:', error);
                    return JSON.stringify({ error: 'Error en la consulta a la base de datos', detalle: error.message });
                }

                return JSON.stringify({
                    mensaje: data && data.length > 0 ? `✅ Resultados obtenidos (${data.length})` : '🤷 No se encontraron datos para esa consulta',
                    resultados: data
                });
            }

            default:
                return JSON.stringify({
                    error: `❌ Herramienta "${toolName}" no encontrada`,
                    mensaje: 'Esta función no está disponible'
                });
        }
    } catch (e: any) {
        console.error(`❌ Tool execution error [${toolName}]:`, e);
        return JSON.stringify({
            error: true,
            mensaje: `⚠️ Error al ejecutar ${toolName}`,
            detalle: e.message || 'Error desconocido',
            sugerencia: 'Por favor intenta de nuevo o contacta al administrador'
        });
    }
}
