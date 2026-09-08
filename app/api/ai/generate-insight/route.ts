
import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';

export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServer();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.warn(`[SOC ALERT] 🛡️ Intento de acceso no autorizado a IA Insight. VULN-2 (Resource Exhaustion) bloqueada.`);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { reportType, summaryData } = await req.json();

        const apiKey = process.env.NEXT_GROQ_API_KEY?.trim();
        if (!apiKey) {
            return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
        }

        const openai = new OpenAI({
            apiKey: apiKey,
            baseURL: 'https://api.groq.com/openai/v1',
        });

        let prompt = '';

        if (reportType === 'inventory') {
            prompt = `
        ROL: Consultor Senior en Optimización de Cadena de Suministro.
        OBJETIVO: Analizar la salud del inventario y detectar riesgos operativos.
        
        DATOS DE ENTRADA:
        - Capital Inmovilizado (Valor Total): $${summaryData.totalValue}
        - Diversidad de Inventario (Items): ${summaryData.totalItems}
        - Alertas de Ruptura (Stock Bajo): ${summaryData.lowStockCount}
        - Categoría Dominante (Pareto): ${summaryData.topCategory}
        
        INSTRUCCIONES:
        1. Evalúa el equilibrio entre capital inmovilizado y disponibilidad de stock.
        2. Genera una "Acción Prioritaria" basada en los items con stock bajo o la categoría dominante.
        3. Mantén el análisis en máximo 2 párrafos concisos. Tono: Directivo y analítico.
      `;
        } else if (reportType === 'profitability') {
            prompt = `
        ROL: Estratega Financiero de Alto Nivel.
        OBJETIVO: Interpretar el rendimiento financiero actual y sugerir maniobras de rentabilidad.

        METRICAS CLAVE:
        - Flujo de Caja (Ventas Brutas): $${summaryData.totalGrossSales}
        - Ganancia Neta Operativa (Utilidad): $${summaryData.grossProfit}
        - Índice de Eficiencia (Margen): ${summaryData.contributionMarginPercent}%
        - Motor de Rentabilidad (Top Producto): ${summaryData.topProduct}
        
        INSTRUCCIONES:
        1. Diagnostica la salud del margen de contribución.
        2. Propone una estrategia táctica para apalancar el "Top Producto" o mejorar márgenes bajos.
        3. Salida: Máximo 2 párrafos. Tono: Perspicaz y motivador.
      `;
        } else {
            return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
        }

        const completion = await openai.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: 'Eres Lyra, una asistente experta en inteligencia de negocios y análisis de datos. Tu misión es transformar datos crudos en decisiones estratégicas claras. Responde en español profesional.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        const text = completion.choices[0]?.message?.content || "No se pudo generar el análisis.";

        return NextResponse.json({ insight: text });
    } catch (error: any) {
        console.error('Error generating AI insight:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
