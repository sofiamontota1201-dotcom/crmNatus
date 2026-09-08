import { rateLimit } from './rate-limit'

/**
 * Rate limiter específico para el chat
 * Límites más estrictos para prevenir abuso de la API de IA
 */
export async function chatRateLimit(identifier: string) {
    // 20 mensajes por minuto por usuario
    const result = await rateLimit(identifier, {
        limit: 20,
        windowSec: 60,
    })

    return result
}

/**
 * Rate limiter para operaciones costosas del chat (análisis complejos)
 */
export async function chatAnalysisRateLimit(identifier: string) {
    // 5 análisis complejos por minuto por usuario
    const result = await rateLimit(identifier, {
        limit: 5,
        windowSec: 60,
    })

    return result
}
