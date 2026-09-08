"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { ReportsRepository, ProfitabilityReport, ProfitabilityItem } from "@/lib/repositories/reportsRepository"
import { FileDown, Search, TrendingUp, BarChart3 } from "lucide-react"
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

export function ProfitabilityAnalysisReport() {
    const [loading, setLoading] = useState(false)
    const [reportData, setReportData] = useState<ProfitabilityReport | null>(null)
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("")
    const [filteredDetails, setFilteredDetails] = useState<ProfitabilityItem[]>([])

    const repo = new ReportsRepository(supabase)

    useEffect(() => {
        const now = new Date()
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        setStartDate(firstDay)
        setEndDate(lastDay)
        loadData(firstDay, lastDay)
    }, [])

    useEffect(() => {
        if (reportData) {
            if (categoryFilter) {
                setFilteredDetails(reportData.details.filter(d =>
                    d.productName?.toLowerCase().includes(categoryFilter.toLowerCase()) ||
                    d.categoryName?.toLowerCase().includes(categoryFilter.toLowerCase())
                ))
            } else {
                setFilteredDetails(reportData.details)
            }
        }
    }, [reportData, categoryFilter])

    const loadData = async (start = startDate, end = endDate) => {
        setLoading(true)
        try {
            const data = await repo.getProfitabilityAnalysis(start, end)
            console.log('📊 Datos de Rentabilidad:', {
                ingresos: data.summary.totalGrossSales,
                costo: data.summary.totalCOGS,
                utilidad: data.summary.grossProfit,
                margen: data.summary.contributionMarginPercent
            })
            setReportData(data)
            setFilteredDetails(data.details)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const exportPDF = () => {
        if (!reportData) return
        const doc = new jsPDF()

        doc.setFontSize(18)
        doc.text("Análisis de Rentabilidad", 14, 20)
        doc.setFontSize(10)
        doc.text(`Periodo: ${startDate} a ${endDate}`, 14, 28)

        const tableColumn = ["Producto", "U. Vendidas", "Ingreso", "Costo", "Utilidad", "% Margen"]
        const tableRows = filteredDetails.map(item => [
            item.productName,
            item.totalUnitsSold,
            `$${item.totalRevenue.toLocaleString()}`,
            `$${item.totalCost.toLocaleString()}`,
            `$${item.profit.toLocaleString()}`,
            `${item.marginPercent.toFixed(1)}%`
        ])

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            headStyles: { fillColor: [60, 20, 120] }
        })

        const fileName = `Rentabilidad_${startDate}_${endDate}.pdf`.replace(/ /g, '_');
        doc.save(fileName);
    }

    // Chart data: Resumen total de ventas
    // Los ingresos vienen de la suma total de facturas vendidas
    const totalRevenue = reportData ? reportData.summary.totalGrossSales : 0
    const totalCost = reportData ? reportData.summary.totalCOGS : 0
    const totalProfit = reportData ? reportData.summary.grossProfit : 0
    
    // Margen de utilidad real sobre ingresos totales
    const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0

    // Datos para el gráfico de barras (resumen total)
    const chartData = reportData ? [
        {
            name: 'Total',
            revenue: Math.round(totalRevenue),
            cost: Math.round(totalCost),
            profit: Math.round(totalProfit),
            margin: profitMargin
        }
    ] : []

    // Pie chart data: Top 10 productos por ingresos
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];
    const pieData = reportData ? [...reportData.details]
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10)
        .map((item, idx) => ({
            name: item.productName.length > 12 ? item.productName.substring(0, 12) + '...' : item.productName,
            fullName: item.productName,
            value: Math.round(item.totalRevenue),
            quantity: item.totalUnitsSold,
            color: COLORS[idx % COLORS.length]
        })) : []

    if (loading && !reportData) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="text-center">
                    <div className="animate-pulse inline-block">
                        <div className="h-8 w-48 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-lg"></div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Toolbar: Filtros */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1 flex gap-2">
                        <div className="flex-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Desde</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="bg-gray-50 border border-gray-200 text-gray-800 h-9 text-sm focus:border-emerald-500/50"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Hasta</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="bg-gray-50 border border-gray-200 text-gray-800 h-9 text-sm focus:border-emerald-500/50"
                            />
                        </div>
                    </div>
                    <div className="flex-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Producto</label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Filtrar..."
                                className="pl-9 bg-gray-50 border border-gray-200 text-gray-800 h-9 text-sm focus:border-emerald-500/50"
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => loadData()}
                            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md transition"
                        >
                            <TrendingUp className="w-4 h-4 mr-1.5" />
                            Actualizar
                        </Button>
                        <Button
                            onClick={exportPDF}
                            variant="outline"
                            className="h-9 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-md"
                        >
                            <FileDown className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {reportData && (
                <>
                    {/* KPI Cards - Premium Layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* Ingresos Totales */}
                        <div className="bg-white border border-gray-200 rounded-lg p-5">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ingresos Totales</p>
                            <p className="text-xl lg:text-2xl font-black text-gray-800 font-mono break-words">
                                ${totalRevenue.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-gray-400 mt-1 font-medium">Suma de todas las facturas</p>
                        </div>

                        {/* Costo Total */}
                        <div className="bg-white border border-gray-200 rounded-lg p-5">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Costo (CMV)</p>
                            <p className="text-xl lg:text-2xl font-black text-gray-600 font-mono break-words">
                                ${totalCost.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-gray-400 mt-1 font-medium">Costo total</p>
                        </div>

                        {/* Utilidad Bruta */}
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5">
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Utilidad Bruta</p>
                            <p className="text-xl lg:text-2xl font-black text-emerald-700 font-mono break-words">
                                ${totalProfit.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-emerald-500 mt-1 font-medium">Ganancia directa</p>
                        </div>

                        {/* Margen de Utilidad Principal */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Margen de Utilidad Real</p>
                            <p className="text-xl lg:text-2xl font-black text-blue-700 font-mono">
                                {profitMargin.toFixed(2)}%
                            </p>
                            <p className="text-xs text-blue-500 mt-1 font-medium">Sobre ingresos totales</p>
                        </div>

                        {/* Margen Promedio por Producto */}
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
                            <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">Margen Promedio</p>
                            <p className="text-xl lg:text-2xl font-black text-purple-700 font-mono">
                                {(reportData.summary.averageMarginPercent ?? 0).toFixed(2)}%
                            </p>
                            <p className="text-xs text-purple-500 mt-1 font-medium">Por producto</p>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-emerald-600" />
                                Resumen de Ventas Totales
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">Ingresos, Costos y Utilidad del período</p>
                        </div>
                        <div className="h-80 p-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                    <defs>
                                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="#1e40af" stopOpacity={0.3} />
                                        </linearGradient>
                                        <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="#991b1b" stopOpacity={0.3} />
                                        </linearGradient>
                                        <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="#059669" stopOpacity={0.3} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#9ca3af"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={{ stroke: '#d1d5db' }}
                                    />
                                    <YAxis
                                        stroke="#9ca3af"
                                        fontSize={11}
                                        axisLine={false}
                                        tickLine={false}
                                        label={{ value: 'Monto ($)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#9ca3af' } }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#ffffff',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            padding: '12px'
                                        }}
                                        itemStyle={{ color: '#374151', fontSize: '12px' }}
                                        formatter={(value) => `$${value.toLocaleString()}`}
                                        labelStyle={{ color: '#111827', fontWeight: 'bold' }}
                                    />
                                    <Legend
                                        verticalAlign="top"
                                        height={30}
                                        wrapperStyle={{ fontSize: '12px' }}
                                        iconType="rect"
                                    />
                                    <Bar
                                        dataKey="revenue"
                                        name="Ingresos"
                                        fill="url(#revenueGradient)"
                                        radius={[6, 6, 0, 0]}
                                        barSize={60}
                                    />
                                    <Bar
                                        dataKey="cost"
                                        name="Costo"
                                        fill="url(#costGradient)"
                                        radius={[6, 6, 0, 0]}
                                        barSize={60}
                                    />
                                    <Bar
                                        dataKey="profit"
                                        name="Utilidad"
                                        fill="url(#profitGradient)"
                                        radius={[6, 6, 0, 0]}
                                        barSize={60}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Gráfico de Pie - Top 10 Productos por Ventas */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-blue-600" />
                                Top 10 Productos - Distribución de Ventas
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">Participación en ingresos totales</p>
                        </div>
                        <div className="h-96 p-4 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={120}
                                        paddingAngle={2}
                                        dataKey="value"
                                        label={({ name, quantity }) => `${name} (${quantity} u.)`}
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#ffffff',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            padding: '12px'
                                        }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload[0]) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm">
                                                        <p className="text-gray-800 font-semibold mb-2">{data.fullName}</p>
                                                        <p className="text-blue-600">Ventas: ${data.value.toLocaleString()}</p>
                                                        <p className="text-emerald-600">Cantidad: {data.quantity} u.</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={30}
                                        wrapperStyle={{ fontSize: '11px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </>
            )}
        </div>
    )
}
