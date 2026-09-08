"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, RefreshCw, BrainCircuit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface DashboardData {
    totalValue: number
    totalItems: number
    lowStockCount: number
    topCategory?: string
}

interface DashboardAIWidgetProps {
    data: DashboardData
}

export function DashboardAIWidget({ data }: DashboardAIWidgetProps) {
    const [insight, setInsight] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const generateInsight = async () => {
        setLoading(true)
        try {
            const response = await fetch("/api/ai/generate-insight", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reportType: "inventory",
                    summaryData: data,
                }),
            })

            if (!response.ok) throw new Error("Failed to generate insight")

            const result = await response.json()
            setInsight(result.insight)
        } catch (error) {
            console.error(error)
            setInsight("El asistente no pudo conectar con el núcleo de inteligencia en este momento.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="border-0 bg-[#0f1115] shadow-2xl overflow-hidden relative group rounded-2xl">
            {/* Background subtle gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/10 via-transparent to-purple-900/10 opacity-50"></div>
            
            <div className="absolute -right-10 -top-10 p-4 opacity-5 transition-transform duration-700 group-hover:rotate-12 group-hover:scale-110">
                <BrainCircuit className="w-48 h-48 text-cyan-400" />
            </div>

            <CardHeader className="flex flex-row items-center justify-between pb-4 relative z-10 border-b border-white/5">
                <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-cyan-400 tracking-wider uppercase">
                        <Sparkles className="w-4 h-4" />
                        Lyra AI · Analítica de Datos
                    </CardTitle>
                    <p className="text-xs text-slate-400 mt-1">Motor de inferencia neuronal</p>
                </div>
                {insight && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={generateInsight}
                        disabled={loading}
                        className="hover:bg-white/5 hover:text-cyan-400 text-slate-400 rounded-full h-8 w-8"
                    >
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </Button>
                )}
            </CardHeader>

            <CardContent className="relative z-10 pt-6">
                <AnimatePresence mode="wait">
                    {!insight && !loading ? (
                        <motion.div
                            key="cta"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-6 text-center"
                        >
                            <div className="w-12 h-12 rounded-full bg-cyan-900/20 border border-cyan-500/20 flex items-center justify-center mb-4">
                                <BrainCircuit className="w-6 h-6 text-cyan-400" />
                            </div>
                            <h3 className="text-slate-200 font-medium mb-2">Análisis de Cadena de Suministro</h3>
                            <p className="text-sm text-slate-500 mb-6 max-w-md">
                                Solicita un diagnóstico inteligente sobre el valor actual del inventario, alertas críticas y eficiencia operativa.
                            </p>
                            <Button 
                                onClick={generateInsight}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-full px-8 py-5 shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] transition-all duration-300 font-medium"
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                Generar Diagnóstico AI
                            </Button>
                        </motion.div>
                    ) : loading ? (
                        <motion.div
                            key="loader"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-8 gap-4"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-cyan-500 blur-[20px] opacity-20 rounded-full"></div>
                                <div className="flex gap-2 relative">
                                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                            </div>
                            <p className="text-xs font-mono text-cyan-400/80 uppercase tracking-widest">Sintetizando variables logísticas...</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="text-slate-300 text-sm leading-relaxed prose prose-invert max-w-none"
                        >
                            <div className="whitespace-pre-line border-l-2 border-cyan-500/50 pl-4 py-1">
                                {insight}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    )
}
