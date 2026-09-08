
"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import {
    FileDown, Search, Calendar, DollarSign, ShoppingCart,
    TrendingUp, CheckSquare, Square, ListChecks, X, ChevronDown, ChevronUp
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SaleItem {
    id: number
    created_at: string
    total_amount: number
    payment_method: number
    customer_name: string
    items_count: number
    details_summary: string
}

// ─── Chips de periodo ───────────────────────────────────────────────────────
const PERIODS = [
    { key: 'today', label: 'Hoy' },
    { key: 'week', label: 'Semana' },
    { key: 'month', label: 'Mes' },
    { key: 'year', label: 'Año' },
    { key: 'custom', label: 'Personalizado' },
] as const

type PeriodKey = typeof PERIODS[number]['key']

function getDateRange(type: PeriodKey): { start: string; end: string } | null {
    const now = new Date()
    const fmt = (d: Date) => d.toISOString().split('T')[0]

    if (type === 'today') {
        const s = fmt(now)
        return { start: s, end: s }
    }
    if (type === 'week') {
        const day = now.getDay() === 0 ? 6 : now.getDay() - 1 // lunes=0
        const mon = new Date(now); mon.setDate(now.getDate() - day)
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
        return { start: fmt(mon), end: fmt(sun) }
    }
    if (type === 'month') {
        return {
            start: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
            end: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
        }
    }
    if (type === 'year') {
        return {
            start: fmt(new Date(now.getFullYear(), 0, 1)),
            end: fmt(new Date(now.getFullYear(), 11, 31)),
        }
    }
    return null
}

// ─── Componente principal ───────────────────────────────────────────────────
export function SalesReport() {
    const [loading, setLoading] = useState(false)
    const [sales, setSales] = useState<SaleItem[]>([])
    const [period, setPeriod] = useState<PeriodKey>('month')
    const [dateRange, setDateRange] = useState({ start: '', end: '' })
    const [searchTerm, setSearchTerm] = useState('')

    // Panel de selección de facturas — carga TODAS las facturas
    const [showSelector, setShowSelector] = useState(false)
    const [allSales, setAllSales] = useState<SaleItem[]>([])
    const [loadingAll, setLoadingAll] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [selectorSearch, setSelectorSearch] = useState('')
    
    // Panel de Notas Ejecutivas (IA)
    const [executiveNotes, setExecutiveNotes] = useState("")

    // ── carga inicial
    useEffect(() => {
        const range = getDateRange('month')!
        setDateRange(range)
    }, [])

    useEffect(() => {
        if (dateRange.start && dateRange.end) fetchSales()
    }, [dateRange])

    // ── cuando se abre el selector, cargar TODAS las facturas (una sola vez)
    useEffect(() => {
        if (showSelector && allSales.length === 0 && !loadingAll) {
            fetchAllSales()
        }
    }, [showSelector])

    const fetchAllSales = async () => {
        setLoadingAll(true)
        try {
            const { data: sellsData, error: sellsError } = await supabase
                .from('sells')
                .select(`
                    id, created_at, total_amount, payment_method,
                    customers(customer_name)
                `)
                .order('id', { ascending: false })
                .limit(500)

            if (sellsError) throw sellsError

            const sellIds = (sellsData ?? []).map((s: any) => s.id)

            const detailsMap: Record<number, string> = {}
            if (sellIds.length > 0) {
                const { data: detailsData } = await supabase
                    .from('sell_details')
                    .select('sell_id, sold_quantity, stocks(products(product_name))')
                    .in('sell_id', sellIds)

                for (const d of (detailsData ?? []) as any[]) {
                    const productName = d.stocks?.products?.product_name || 'Item'
                    const line = `${d.sold_quantity}x ${productName}`
                    detailsMap[d.sell_id] = detailsMap[d.sell_id] ? detailsMap[d.sell_id] + ', ' + line : line
                }
            }

            const formatted: SaleItem[] = (sellsData ?? []).map((s: any) => ({
                id: s.id,
                created_at: s.created_at,
                total_amount: s.total_amount,
                payment_method: s.payment_method,
                customer_name: s.customers?.customer_name || 'Cliente Casual',
                items_count: 0,
                details_summary: detailsMap[s.id] || '',
            }))
            setAllSales(formatted)
        } catch (err) {
            console.error(err)
        } finally {
            setLoadingAll(false)
        }
    }

    // ── limpiar selección cuando cambian las ventas
    useEffect(() => {
        setSelectedIds(new Set())
    }, [sales])

    const handlePeriodChange = (p: PeriodKey) => {
        setPeriod(p)
        if (p !== 'custom') {
            const range = getDateRange(p)
            if (range) setDateRange(range)
        }
    }

    const fetchSales = async () => {
        setLoading(true)
        try {
            const { data: sellsData, error: sellsError } = await supabase
                .from('sells')
                .select(`
                    id,
                    created_at,
                    total_amount,
                    payment_method,
                    customers(customer_name)
                `)
                .gte('created_at', `${dateRange.start}T00:00:00`)
                .lte('created_at', `${dateRange.end}T23:59:59`)
                .order('created_at', { ascending: false })

            if (sellsError) throw sellsError

            const sellIds = (sellsData ?? []).map((s: any) => s.id)

            const detailsMap: Record<number, string> = {}
            if (sellIds.length > 0) {
                const { data: detailsData } = await supabase
                    .from('sell_details')
                    .select('sell_id, sold_quantity, stocks(products(product_name))')
                    .in('sell_id', sellIds)

                for (const d of (detailsData ?? []) as any[]) {
                    const productName = d.stocks?.products?.product_name || 'Item'
                    const line = `${d.sold_quantity}x ${productName}`
                    detailsMap[d.sell_id] = detailsMap[d.sell_id] ? detailsMap[d.sell_id] + ', ' + line : line
                }
            }

            const formatted: SaleItem[] = (sellsData ?? []).map((s: any) => ({
                id: s.id,
                created_at: s.created_at,
                total_amount: s.total_amount,
                payment_method: s.payment_method,
                customer_name: s.customers?.customer_name || 'Cliente Casual',
                items_count: 0,
                details_summary: detailsMap[s.id] || '',
            }))

            setSales(formatted)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    // ── filtrado por búsqueda en tabla principal
    const filteredSales = useMemo(() =>
        sales.filter(s =>
            s.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.id.toString().includes(searchTerm)
        ), [sales, searchTerm])

    // ── facturas para el selector
    const selectorSales = useMemo(() =>
        allSales.filter(s =>
            s.id.toString().includes(selectorSearch) ||
            s.customer_name.toLowerCase().includes(selectorSearch.toLowerCase())
        ), [allSales, selectorSearch])

    // ── facturas activas para el balance (si hay selección, usar allSales; si no, filteredSales)
    const activeSales = useMemo(() =>
        selectedIds.size > 0
            ? allSales.filter(s => selectedIds.has(s.id))
            : filteredSales,
        [filteredSales, allSales, selectedIds])

    const totalRevenue = useMemo(() => activeSales.reduce((a, s) => a + s.total_amount, 0), [activeSales])
    const avgTicket = activeSales.length > 0 ? totalRevenue / activeSales.length : 0

    // ── helpers de selección
    const toggleId = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }
    const selectAll = () => setSelectedIds(new Set(selectorSales.map(s => s.id)))
    const clearAll = () => setSelectedIds(new Set())

    // ── exportar PDF Ejecutivo (solo facturas activas)
    const exportPDF = async () => {
        const [jsPDFMod, autoTableMod] = await Promise.all([
            import('jspdf'),
            import('jspdf-autotable')
        ])
        const jsPDF = jsPDFMod.default
        const autoTable = autoTableMod.default
        const doc = new jsPDF()
        
        // Colores corporativos y estilos (Azul Navy / Gris Oxford)
        const primaryColor: [number, number, number] = [15, 35, 70] // Azul Navy Corporativo
        const secondaryColor: [number, number, number] = [80, 85, 95] // Gris Oxford suave
        
        // 1. HEADER (Encabezado Ejecutivo)
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.rect(0, 0, 210, 40, 'F')
        
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(22)
        doc.setFont("helvetica", "bold")
        doc.text("REPORTE EJECUTIVO DE VENTAS", 105, 18, { align: "center" })
        
        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        const selLabel = selectedIds.size > 0 
            ? `Análisis de Selección Específica (${selectedIds.size} facturas auditadas)` 
            : `Período de Análisis: ${dateRange.start} al ${dateRange.end}`
        doc.text(selLabel, 105, 26, { align: "center" })
        doc.text(`Emitido el: ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`, 105, 32, { align: "center" })

        // 2. RESUMEN DE INDICADORES CLAVE (KPIs)
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.text("1. Resumen de Indicadores Clave (KPIs)", 14, 52)
        
        // Dibujar cajas de KPIs
        doc.setFillColor(248, 248, 252)
        doc.setDrawColor(220, 220, 230)
        
        // KPI 1 - Ingresos Totales
        doc.setFillColor(248, 248, 252)
        doc.setDrawColor(220, 220, 230)
        doc.roundedRect(14, 58, 55, 22, 2, 2, 'FD')
        doc.setFontSize(9)
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
        doc.setFont("helvetica", "bold")
        doc.text("INGRESOS TOTALES", 41.5, 65, { align: "center" })
        doc.setFontSize(14)
        doc.setTextColor(20, 20, 20)
        doc.text(`$${totalRevenue.toLocaleString()}`, 41.5, 74, { align: "center" })

        // KPI 2 - Ticket Promedio
        doc.setFillColor(248, 248, 252)
        doc.setDrawColor(220, 220, 230)
        doc.roundedRect(77, 58, 55, 22, 2, 2, 'FD')
        doc.setFontSize(9)
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
        doc.text("TICKET PROMEDIO", 104.5, 65, { align: "center" })
        doc.setFontSize(14)
        doc.setTextColor(20, 20, 20)
        doc.text(`$${avgTicket.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 104.5, 74, { align: "center" })

        // KPI 3 - Volumen de Ventas
        doc.setFillColor(248, 248, 252)
        doc.setDrawColor(220, 220, 230)
        doc.roundedRect(140, 58, 55, 22, 2, 2, 'FD')
        doc.setFontSize(9)
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
        doc.text("VOLUMEN DE VENTAS", 167.5, 65, { align: "center" })
        doc.setFontSize(14)
        doc.setTextColor(20, 20, 20)
        doc.text(`${activeSales.length} Facturas`, 167.5, 74, { align: "center" })

        // 3. ANÁLISIS DE CLIENTES PRINCIPALES
        // Calcular top 3 clientes
        const clientTotals: Record<string, number> = {}
        activeSales.forEach(s => {
            const name = s.customer_name || 'Desconocido'
            clientTotals[name] = (clientTotals[name] || 0) + s.total_amount
        })
        const topClients = Object.entries(clientTotals).sort((a, b) => b[1] - a[1]).slice(0, 3)

        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.text("2. Análisis de Clientes Principal", 14, 94)

        doc.setTextColor(60, 60, 60)
        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        doc.text("Clientes con mayor contribución al volumen de ingresos en esta selección:", 14, 102)
        
        let currentY = 108
        if (topClients.length > 0) {
            topClients.forEach((c) => {
                doc.setFont("helvetica", "bold")
                doc.text(`• ${c[0].toUpperCase()}:`, 18, currentY)
                doc.setFont("helvetica", "normal")
                doc.text(`Aportó $${c[1].toLocaleString()} al ingreso total.`, 80, currentY)
                currentY += 6
            })
        } else {
            doc.text("No hay datos de clientes suficientes.", 18, currentY)
            currentY += 6
        }

        // 4. DETALLE DE TRANSACCIONES (Tabla Estilizada)
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        currentY += 4
        doc.text("3. Desglose Financiero de Transacciones", 14, currentY)

        autoTable(doc, {
            head: [['N° Factura', 'Fecha', 'Cliente', 'Resumen Artículos', 'Método', 'Total']],
            body: activeSales.map(s => [
                `#${s.id}`,
                new Date(s.created_at).toLocaleDateString(),
                s.customer_name,
                s.details_summary.length > 40 ? s.details_summary.substring(0, 40) + '...' : s.details_summary,
                s.payment_method === 0 ? 'Efectivo' : s.payment_method === 1 ? 'Tarjeta' : 'Digital',
                `$${s.total_amount.toLocaleString()}`,
            ]),
            startY: currentY + 4,
            styles: { fontSize: 8, cellPadding: 3, textColor: [40, 40, 40] },
            headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', halign: 'center' },
            columnStyles: { 
                0: { halign: 'center', cellWidth: 20 }, 
                4: { halign: 'center', cellWidth: 20 },
                5: { halign: 'right', fontStyle: 'bold', textColor: [20, 120, 50] } 
            },
            alternateRowStyles: { fillColor: [250, 248, 252] }
        })

        // 5. RECOMENDACIONES ESTRATÉGICAS / NOTAS ESTRUCTURADAS (Opcional - Desde la UI)
        if (executiveNotes.trim().length > 0) {
            // @ts-ignore
            const finalY = doc.lastAutoTable.finalY || 150
            
            let notesY = finalY > 230 ? 20 : finalY + 15
            if (notesY === 20) doc.addPage()

            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
            doc.setFontSize(14)
            doc.setFont("helvetica", "bold")
            doc.text("4. Recomendaciones Estratégicas y Notas Analíticas", 14, notesY)
            
            doc.setTextColor(50, 50, 50)
            doc.setFontSize(10)
            doc.setFont("helvetica", "normal")
            
            const lines = doc.splitTextToSize(executiveNotes, 180)
            doc.text(lines, 14, notesY + 8)
        }

        const d = new Date()
        doc.save(`Reporte_Ejecutivo_Ventas_${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}.pdf`)
    }

    const payLabel = (p: number) =>
        p === 0 ? 'Efectivo' : p === 1 ? 'Tarjeta' : 'Digital'

    return (
        <div className="space-y-4">
            {/* ─── Filtros ──────────────────────────────────────────────── */}
            <Card className="border-gray-200 bg-white shadow-sm">
                <CardContent className="p-4 space-y-3">
                    {/* Chips de periodo */}
                    <div className="flex flex-wrap gap-2">
                        {PERIODS.map(p => (
                            <button
                                key={p.key}
                                onClick={() => handlePeriodChange(p.key)}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all duration-200 border",
                                    period === p.key
                                        ? "bg-primary text-white border-primary shadow-sm"
                                        : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 hover:text-gray-800"
                                )}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Fechas — solo visibles en modo personalizado */}
                    {period === 'custom' && (
                        <div className="flex flex-wrap gap-2 items-center">
                            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                            <Input
                                type="date"
                                value={dateRange.start}
                                onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))}
                                className="bg-gray-50 border-gray-200 text-sm h-9 flex-1 min-w-[130px] text-gray-800"
                            />
                            <span className="text-gray-400 text-sm">→</span>
                            <Input
                                type="date"
                                value={dateRange.end}
                                onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))}
                                className="bg-gray-50 border-gray-200 text-sm h-9 flex-1 min-w-[130px] text-gray-800"
                            />
                            <Button onClick={fetchSales} disabled={loading} size="sm"
                                className="bg-primary hover:bg-primary/80 h-9 px-4 shrink-0">
                                {loading ? '...' : 'Buscar'}
                            </Button>
                        </div>
                    )}

                    {/* Búsqueda en tabla */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar por nombre o #Factura..."
                            className="pl-9 bg-gray-50 border-gray-200 h-9 text-gray-800 w-full"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* ─── Tarjetas de resumen ──────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                    {
                        icon: <DollarSign className="w-5 h-5" />, color: 'text-green-600', bg: 'bg-green-100',
                        label: selectedIds.size > 0 ? `Ingresos (${selectedIds.size} fact.)` : 'Ingresos Totales',
                        value: `$${totalRevenue.toLocaleString()}`
                    },
                    {
                        icon: <ShoppingCart className="w-5 h-5" />, color: 'text-primary', bg: 'bg-primary/10',
                        label: 'Transacciones', value: activeSales.length
                    },
                    {
                        icon: <TrendingUp className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-100',
                        label: 'Ticket Promedio',
                        value: `$${avgTicket.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                    },
                ].map((c, i) => (
                    <Card key={i} className="border-gray-200 bg-white shadow-sm">
                        <CardContent className="p-6 text-gray-800">
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 ${c.bg} rounded-lg ${c.color}`}>{c.icon}</div>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{c.label}</span>
                            </div>
                            <div className="text-3xl font-black">{c.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ─── Panel de selección de facturas ──────────────────────── */}
            <Card className="border-gray-200 bg-white shadow-sm overflow-hidden">
                <CardHeader
                    className="flex flex-row items-center justify-between bg-gray-50 border-b border-gray-200 cursor-pointer select-none py-3 px-4"
                    onClick={() => setShowSelector(v => !v)}
                >
                    <div className="flex items-center gap-2">
                        <ListChecks className="w-4 h-4 text-primary" />
                        <CardTitle className="text-sm font-bold text-gray-800">
                            Selección de Facturas para Balance
                        </CardTitle>
                        {selectedIds.size > 0 && (
                            <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                {selectedIds.size} seleccionadas
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedIds.size > 0 && (
                            <button
                                onClick={e => { e.stopPropagation(); clearAll() }}
                                className="text-red-500 hover:text-red-600 text-xs font-bold flex items-center gap-1"
                            >
                                <X className="w-3 h-3" /> Limpiar
                            </button>
                        )}
                        {showSelector
                            ? <ChevronUp className="w-4 h-4 text-gray-400" />
                            : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                </CardHeader>

                {showSelector && (
                    <CardContent className="p-4 space-y-3">
                        <p className="text-[11px] text-gray-500">
                            Marca las facturas que quieres incluir en el balance. Las tarjetas de resumen y el PDF se calcularán solo con las seleccionadas.
                        </p>

                        {/* Barra de búsqueda + select all */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <Input
                                    placeholder="#Factura o cliente..."
                                    className="pl-8 bg-gray-50 border-gray-200 h-8 text-gray-800 text-xs"
                                    value={selectorSearch}
                                    onChange={e => setSelectorSearch(e.target.value)}
                                />
                            </div>
                            <Button size="sm" variant="outline"
                                className="h-8 text-xs border-gray-200 text-gray-600 hover:bg-gray-100"
                                onClick={selectAll}>
                                <CheckSquare className="w-3 h-3 mr-1" /> Todas
                            </Button>
                            <Button size="sm" variant="outline"
                                className="h-8 text-xs border-gray-200 text-gray-600 hover:bg-gray-100"
                                onClick={clearAll}>
                                <Square className="w-3 h-3 mr-1" /> Ninguna
                            </Button>
                        </div>

                        {/* Grid de facturas con checkbox */}
                        <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                            {selectorSales.length === 0 ? (
                                <p className="text-center text-gray-400 text-sm py-6">Sin facturas en el período seleccionado</p>
                            ) : selectorSales.map(s => {
                                const checked = selectedIds.has(s.id)
                                return (
                                    <label
                                        key={s.id}
                                        className={cn(
                                            "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all",
                                            checked
                                                ? "bg-primary/5 border border-primary/30"
                                                : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                                        )}
                                    >
                                        <Checkbox
                                            checked={checked}
                                            onCheckedChange={() => toggleId(s.id)}
                                            className="border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                        <span className={cn("font-mono text-xs font-bold shrink-0", checked ? "text-primary" : "text-gray-500")}>
                                            #{s.id}
                                        </span>
                                        <span className="flex-1 text-xs text-gray-800 truncate">{s.customer_name}</span>
                                        <span className="text-xs text-gray-400 shrink-0">
                                            {new Date(s.created_at).toLocaleDateString()}
                                        </span>
                                        <span className={cn("text-xs font-black shrink-0", checked ? "text-green-600" : "text-gray-500")}>
                                            ${s.total_amount.toLocaleString()}
                                        </span>
                                    </label>
                                )
                            })}
                        </div>

                        {selectedIds.size > 0 && (
                            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                <p className="text-xs text-gray-500">
                                    <span className="text-gray-800 font-bold">{selectedIds.size}</span> facturas · Total:{' '}
                                    <span className="text-green-600 font-bold">${totalRevenue.toLocaleString()}</span>
                                </p>
                                <Button size="sm" onClick={exportPDF}
                                    className="bg-primary hover:bg-primary/80 h-8 text-xs">
                                    <FileDown className="w-3 h-3 mr-1" /> Exportar selección
                                </Button>
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>

            {/* ─── Tabla de ventas ─────────────────────────────────────── */}
            <Card className="border-gray-200 bg-white overflow-hidden shadow-sm">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 gap-3 space-y-0 text-gray-800 border-b border-gray-200">
                    <CardTitle className="text-base font-bold text-gray-800">
                        Registro de Ventas
                        {selectedIds.size > 0 && (
                            <span className="ml-2 text-xs text-primary font-bold">(mostrando selección)</span>
                        )}
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={exportPDF}
                        className="text-gray-700 hover:bg-gray-50 border-gray-200 w-full sm:w-auto">
                        <FileDown className="mr-2 h-4 w-4" />
                        {selectedIds.size > 0 ? `Exportar ${selectedIds.size} fact.` : 'Exportar Registro'}
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    {/* Desktop */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm text-gray-800">
                            <thead>
                                <tr className="bg-gray-50 text-[10px] font-black uppercase text-gray-500 tracking-widest text-left">
                                    <th className="p-4 w-10">
                                        <Checkbox
                                            checked={selectedIds.size === activeSales.length && activeSales.length > 0}
                                            onCheckedChange={(v) => v ? setSelectedIds(new Set(activeSales.map(s => s.id))) : clearAll()}
                                            className="border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                    </th>
                                    <th className="p-4">Factura</th>
                                    <th className="p-4">Fecha</th>
                                    <th className="p-4">Cliente</th>
                                    <th className="p-4">Método</th>
                                    <th className="p-4 text-right">Monto Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {activeSales.length > 0 ? activeSales.map(sale => {
                                    const checked = selectedIds.has(sale.id)
                                    return (
                                        <tr key={sale.id}
                                            className={cn("transition-colors cursor-pointer",
                                                checked ? "bg-primary/5" : "hover:bg-gray-50")}
                                            onClick={() => toggleId(sale.id)}>
                                            <td className="p-4">
                                                <Checkbox
                                                    checked={checked}
                                                    onCheckedChange={() => toggleId(sale.id)}
                                                    className="border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                />
                                            </td>
                                            <td className={cn("p-4 font-mono text-[11px]", checked ? "text-primary" : "text-gray-500")}>
                                                #{sale.id}
                                            </td>
                                            <td className="p-4 text-[11px] text-gray-500">
                                                {new Date(sale.created_at).toLocaleDateString()}
                                                <div className="opacity-50">{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            <td className="p-4 font-bold text-gray-800 uppercase text-[10px] tracking-tight">{sale.customer_name}</td>
                                            <td className="p-4">
                                                <div className="bg-gray-100 text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded text-gray-600 w-fit">
                                                    {payLabel(sale.payment_method)}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-black text-green-600 text-sm">
                                                ${sale.total_amount.toLocaleString()}
                                            </td>
                                        </tr>
                                    )
                                }) : (
                                    <tr><td colSpan={6} className="p-12 text-center text-gray-400 font-bold italic">Sin registros en este período.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile */}
                    <div className="md:hidden divide-y divide-gray-100">
                        {activeSales.length > 0 ? activeSales.map(sale => {
                            const checked = selectedIds.has(sale.id)
                            return (
                                <div key={sale.id}
                                    onClick={() => toggleId(sale.id)}
                                    className={cn("p-4 flex items-center gap-3 cursor-pointer transition-colors",
                                        checked ? "bg-primary/5" : "hover:bg-gray-50")}>
                                    <Checkbox
                                        checked={checked}
                                        className="border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className={cn("font-mono text-xs", checked ? "text-primary" : "text-gray-500")}>#{sale.id}</span>
                                            <span className="bg-gray-100 text-[9px] uppercase font-black px-1.5 py-0.5 rounded text-gray-500">
                                                {payLabel(sale.payment_method)}
                                            </span>
                                        </div>
                                        <p className="font-bold text-gray-800 text-xs uppercase truncate">{sale.customer_name}</p>
                                        <p className="text-gray-400 text-[10px]">{new Date(sale.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <span className="text-green-600 font-black text-base shrink-0">
                                        ${sale.total_amount.toLocaleString()}
                                    </span>
                                </div>
                            )
                        }) : (
                            <div className="p-12 text-center text-gray-400 font-bold italic">Sin registros.</div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ─── Panel para Notas AI ─────────────────────────────────── */}
            <Card className="border-gray-200 bg-white shadow-sm overflow-hidden mt-4">
                <CardHeader className="bg-gray-50 border-b border-gray-200 py-4 px-4">
                    <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <span>🤖 inyectar Análisis de Inteligencia Artificial al Reporte (Opcional)</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <Textarea 
                        placeholder="Pega aquí el resultado de tu prompt (ej. Recomendaciones, Análisis de KPI, Avisos de auditoría...). Se anexará estéticamente al final del PDF."
                        className="min-h-[120px] bg-gray-50 border-gray-200 text-gray-800 text-sm"
                        value={executiveNotes}
                        onChange={(e) => setExecutiveNotes(e.target.value)}
                    />
                    <p className="text-xs text-gray-400 mt-2">
                        * Toda la información que pegues aquí se formateará e incluirá en el documento final bajo la sección "Recomendaciones Estratégicas y Notas Analíticas".
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
