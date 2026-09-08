import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { createSupabaseServer } from '@/lib/supabase-server';
import { toolsDefinition, executeTool } from '@/lib/chat-tools';

/**
 * Sanitiza el historial de mensajes para que solo contenga roles válidos
 * (user / assistant con texto plano).
 *
 * Groq devuelve error 400 (tool_use_failed) cuando el historial incluye:
 *  - mensajes con role: 'tool'
 *  - mensajes assistant que tienen tool_calls (sin el correspondiente tool result)
 *
 * La solución es inyectar los datos de las herramientas como un mensaje de
 * sistema, no a través del protocolo nativo tool → tool_result.
 */
function sanitizeMessages(messages: any[]): { role: 'user' | 'assistant'; content: string }[] {
    return messages
        .filter((m: any) => m.role === 'user' || m.role === 'assistant')
        .map((m: any) => ({
            role: m.role as 'user' | 'assistant',
            // Si el contenido es un array multipart, extraer solo el texto
            content: typeof m.content === 'string'
                ? m.content
                : Array.isArray(m.content)
                    ? m.content
                        .filter((p: any) => p.type === 'text')
                        .map((p: any) => p.text)
                        .join(' ')
                    : String(m.content ?? ''),
        }))
        .filter((m) => m.content.trim() !== '');
}

export async function POST(req: Request) {
    try {
        const apiKey = process.env.NEXT_GROQ_API_KEY?.trim() || '';
        console.log('--- DEBUG GROQ API KEY ---');
        console.log('Length:', apiKey.length);
        console.log('Starts with:', apiKey.substring(0, 8));
        console.log('Ends with:', apiKey.substring(apiKey.length - 4));
        console.log('--------------------------');

        const openai = new OpenAI({
            apiKey: apiKey,
            baseURL: 'https://api.groq.com/openai/v1',
        });

        const { messages } = await req.json();

        // 1. Auth & Setup
        const supabase = await createSupabaseServer();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return new Response('Unauthorized', { status: 401 });
        if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_key_here') {
            return new Response(JSON.stringify({ error: 'GROQ_API_KEY missing' }), { status: 500 });
        }

        // Limpiar historial: eliminar roles 'tool' y tool_calls que rompen Groq
        const cleanMessages = sanitizeMessages(messages);

        // 2. Primera llamada a Groq con Tools definidas
        const initialResponse = await openai.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `Eres un asistente experto en gestión de inventarios para "Sistem 2.0". Eres amigable, preciso y organizas la información de forma visual.

HERRAMIENTAS DISPONIBLES:
- search_products: Buscar productos por nombre.
- get_low_stock_products: Ver alertas de stock bajo.
- get_recent_sales: Ver últimas ventas.
- get_general_stats: Resumen general del negocio.

INSTRUCCIONES:
1. Si el usuario pregunta algo que requiere datos (stock, precios, ventas), USA LAS HERRAMIENTAS.
2. No inventes datos. Si la herramienta no devuelve nada, dilo claramente.
3. Responde siempre en español.

REGLAS DE FORMATO (OBLIGATORIO):
- Usa emojis relevantes al inicio de secciones y puntos clave.
- Cuando tengas LISTAS DE DATOS (productos, ventas, clientes), SIEMPRE preséntala como una tabla Markdown con encabezados.
- Formato de tabla: | Columna1 | Columna2 | seguido de | --- | --- | y luego las filas.
- Usa **negrita** para valores importantes (montos, cantidades críticas).
- Usa encabezados ## o ### para separar secciones cuando la respuesta tiene varias partes.
- Finaliza con un 💡 consejo o resumen breve cuando aplique.`
                },
                ...cleanMessages
            ],
            // @ts-ignore
            tools: toolsDefinition,
            tool_choice: 'auto',
        });

        const responseMessage = initialResponse.choices[0].message;

        // 3. Verificar si Groq quiere ejecutar una herramienta
        if (responseMessage.tool_calls) {
            const toolCalls = responseMessage.tool_calls;
            let toolsContext = 'RESULTADOS DE LA BASE DE DATOS:\n';

            // Ejecutar cada tool solicitada y acumular resultados como texto plano
            for (const toolCallPlain of toolCalls) {
                const toolCall = toolCallPlain as any;
                const functionName = toolCall.function.name;
                let functionArgs = {};
                try {
                    functionArgs = JSON.parse(toolCall.function.arguments);
                } catch (e) {
                    console.error('Error parsing args:', e);
                }

                console.log(`⚡ Executing local function: ${functionName}`);

                // Ejecutar función real contra Supabase
                const functionResponse = await executeTool(functionName, functionArgs, supabase);

                console.log(`✅ Result for ${functionName}:`, functionResponse.substring(0, 50) + '...');

                toolsContext += `\n--- Herramienta: ${functionName} ---\nDatos devueltos: ${functionResponse}\n`;
            }

            // 4. Estrategia de Context Injection:
            // Inyectamos los datos como mensaje de sistema en lugar de usar
            // el protocolo tool → tool_result que causa error 400 en Groq.
            const finalMessages = [
                {
                    role: 'system',
                    content: `Eres un asistente experto en gestión de inventarios para "Sistem 2.0". Eres amigable, preciso y organizas la información de forma visual.

${toolsContext}

USA LOS DATOS DE ARRIBA para responder al usuario. REGLAS DE FORMATO OBLIGATORIAS:
- Usa emojis relevantes al inicio de cada sección (📦 inventario, 💰 ventas, ⚠️ alertas, ✅ OK, 📊 estadísticas).
- Si los datos contienen una LISTA de productos, ventas o items: SIEMPRE usa tabla Markdown:
  | Columna1 | Columna2 | Columna3 |
  | --- | --- | --- |
  | valor | valor | valor |
- Usa **negrita** para resaltar cantidades críticas, montos totales y alertas.
- Usa encabezados ### para separar secciones.
- Si la lista está vacía, indícalo con ❌ y sugiere qué hacer.
- Finaliza con un 💡 consejo breve cuando sea útil.
- Responde en español.`
                },
                ...cleanMessages // Historial limpio del usuario
            ];

            const secondResponse = await openai.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                stream: true,
                messages: finalMessages as any,
            });

            return new StreamingTextResponse(OpenAIStream(secondResponse as any));
        }

        // Sin tool calls: stream directo con historial limpio
        const directStreamResponse = await openai.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            stream: true,
            messages: [
                {
                    role: 'system',
                    content: `Eres un asistente experto en gestión de inventarios para "Sistem 2.0". Eres amigable y organizas bien la información.
Responde en español. Usa emojis relevantes, **negrita** para datos importantes, y tablas Markdown cuando presentes listas de datos.
Si el usuario saluda o hace una pregunta general, responde de forma amigable con emojis y ofrece ayuda.`
                },
                ...cleanMessages
            ],
        });

        return new StreamingTextResponse(OpenAIStream(directStreamResponse as any));

    } catch (error: any) {
        console.error('❌ Chat API Error:', error);
        const errorMessage = error.response?.data?.error?.message || error.message || 'Error desconocido';
        return new Response(JSON.stringify({
            error: `Error de API: ${errorMessage}`
        }), { status: 500 });
    }
}
