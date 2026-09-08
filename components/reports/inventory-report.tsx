
"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { ReportsRepository, InventoryValuationItem } from "@/lib/repositories/reportsRepository"
import { FileDown, Package, AlertTriangle, BarChart3, Search, CheckCircle, BookUser } from "lucide-react"

export function InventoryReport() {
    const [loading, setLoading] = useState(true)
    const [items, setItems] = useState<InventoryValuationItem[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [showOnlyZeroStock, setShowOnlyZeroStock] = useState(false)
    const repo = new ReportsRepository(supabase)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const data = await repo.getInventoryValuation()
            setItems(data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const totalStockValue = items.reduce((acc, item) => acc + item.totalValue, 0)
    const lowStockItems = items.filter(i => i.currentQuantity <= 10).length
    const outOfStockItems = items.filter(i => i.currentQuantity === 0).length

    const filteredItems = items.filter(item => {
        const matchesSearch = item.products?.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.productCode?.toLowerCase().includes(searchTerm.toLowerCase())
        
        if (showOnlyZeroStock) {
            return matchesSearch && item.currentQuantity === 0
        }
        
        return matchesSearch
    })

    const exportPDF = async () => {
        const [jsPDFMod, autoTableMod] = await Promise.all([
            import('jspdf'),
            import('jspdf-autotable')
        ])
        const jsPDF = jsPDFMod.default
        const autoTable = autoTableMod.default
        const doc = new jsPDF()
        doc.setFontSize(22)
        doc.text("Reporte de Valoración de Inventario", 105, 20, { align: "center" })
        doc.setFontSize(10)
        doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 30)
        doc.text(`Valor Total: $${totalStockValue.toLocaleString()}`, 14, 35)

        const tableColumn = ["Ref", "Producto", "Stock", "Costo", "Total", "Est"]
        const tableRows = items.map(item => [
            item.productCode,
            item.products?.productName || "N/A",
            item.currentQuantity,
            `$${item.buyingPrice.toLocaleString()}`,
            `$${item.totalValue.toLocaleString()}`,
            item.currentQuantity === 0 ? "AGOTADO" : item.currentQuantity <= 10 ? "BAJO" : "OK"
        ])

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [60, 20, 120] },
            didParseCell: (hookData: any) => {
                // Resaltar en rojo las filas con stock en 0
                const rowIndex = hookData.row.index
                if (rowIndex !== undefined && rowIndex < items.length && items[rowIndex].currentQuantity === 0) {
                    hookData.cell.styles.fillColor = [255, 200, 200]
                    hookData.cell.styles.textColor = [139, 0, 0]
                    hookData.cell.styles.fontStyle = 'bold'
                }
            }
        })

        const d = new Date();
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        const dateStr = `${day}-${month}-${year}`;

        const fileName = `Inventario_${dateStr}.pdf`;
        doc.save(fileName);
    }

    const exportClientCatalog = async () => {
        const [jsPDFMod, autoTableMod] = await Promise.all([
            import('jspdf'),
            import('jspdf-autotable')
        ])
        const jsPDF = jsPDFMod.default
        const autoTable = autoTableMod.default
        const doc = new jsPDF()

        // ── Header ──────────────────────────────────────────────────────────────
        doc.setFillColor(30, 10, 80)
        doc.rect(0, 0, 210, 40, 'F')

        doc.setTextColor(255, 255, 255)
        doc.setFontSize(20)
        doc.setFont('helvetica', 'bold')
        doc.text('Catálogo de Productos', 105, 18, { align: 'center' })

        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 105, 28, { align: 'center' })

        // ── Filter: only items with stock and a selling price ────────────────────
        const catalogItems = items.filter(i => i.currentQuantity > 0 && i.sellingPrice > 0)

        const tableColumn = ['Referencia', 'Producto', 'Cantidad Disponible', 'Precio de Venta']
        const tableRows = catalogItems.map(item => [
            item.productCode || '—',
            item.products?.productName || 'Sin nombre',
            item.currentQuantity.toString(),
            `$${item.sellingPrice.toLocaleString('es-CO')}`,
        ])

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 48,
            styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
            headStyles: {
                fillColor: [30, 10, 80],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center',
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 35 },
                1: { halign: 'left' },
                2: { halign: 'center', cellWidth: 40 },
                3: { halign: 'right', cellWidth: 40, fontStyle: 'bold' },
            },
            alternateRowStyles: { fillColor: [245, 243, 255] },
            didDrawPage: (hookData: any) => {
                // footer with page number
                const pageCount = (doc as any).internal.getNumberOfPages()
                doc.setFontSize(8)
                doc.setTextColor(150)
                doc.text(
                    `Página ${hookData.pageNumber} de ${pageCount}`,
                    105,
                    doc.internal.pageSize.height - 10,
                    { align: 'center' }
                )
            },
        })

        const d = new Date()
        const dateStr = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getFullYear()).slice(-2)}`
        doc.save(`Catalogo_Clientes_${dateStr}.pdf`)
    }

    if (loading) return <div className="p-20 text-center animate-pulse text-primary font-bold uppercase tracking-widest">Analizando Almacén...</div>

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-gray-200 bg-white shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary"><Package className="w-5 h-5" /></div>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Valorización Total</span>
                        </div>
                        <div className="text-3xl font-black text-gray-800">${totalStockValue.toLocaleString()}</div>
                    </CardContent>
                </Card>

                <Card className="border-gray-200 bg-white shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600"><AlertTriangle className="w-5 h-5" /></div>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sugerencias Compra</span>
                        </div>
                        <div className="text-3xl font-black text-yellow-600 font-mono">{lowStockItems} Items</div>
                    </CardContent>
                </Card>

                <Card className="border-gray-200 bg-white shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-100 rounded-lg text-red-600"><AlertTriangle className="w-5 h-5" /></div>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Quiebre de Stock</span>
                        </div>
                        <div className="text-3xl font-black text-red-600 font-mono">{outOfStockItems} Items</div>
                    </CardContent>
                </Card>

                <Card className="border-gray-200 bg-white shadow-sm flex items-center p-4 gap-3 col-span-2 md:col-span-1">
                    <div className="flex flex-col gap-2 w-full">
                        <Button
                            onClick={exportPDF}
                            variant="outline"
                            className="w-full text-gray-700 hover:bg-gray-50 border-gray-200 font-black text-[10px] uppercase"
                        >
                            <FileDown className="mr-2 h-4 w-4" /> Exportar Inventario
                        </Button>
                        <Button
                            onClick={exportClientCatalog}
                            className="w-full bg-primary/90 hover:bg-primary text-white font-black text-[10px] uppercase shadow-sm"
                        >
                            <BookUser className="mr-2 h-4 w-4" /> Exportar Catálogo Cliente
                        </Button>
                    </div>
                    <Button onClick={loadData} variant="ghost" className="h-full px-3 text-gray-400 hover:text-gray-700 shrink-0">
                        <BarChart3 className="h-5 w-5" />
                    </Button>
                </Card>
            </div>

            <Card className="border-gray-200 bg-white overflow-hidden shadow-sm">
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between bg-gray-50 gap-3 border-b border-gray-200">
                    <CardTitle className="text-base font-bold text-gray-800">Detalle de Valoración</CardTitle>
                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:flex-none md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Buscar producto..."
                                className="pl-9 bg-white border-gray-200 text-[10px] h-10 text-gray-800 w-full"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button
                            onClick={() => setShowOnlyZeroStock(!showOnlyZeroStock)}
                            variant={showOnlyZeroStock ? "default" : "outline"}
                            className={`text-[10px] font-black uppercase whitespace-nowrap ${
                                showOnlyZeroStock 
                                    ? 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200' 
                                    : 'text-gray-700 hover:bg-gray-50 border-gray-200'
                            }`}
                        >
                            ⚠️ Sin Stock ({outOfStockItems})
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-gray-800">
                            <thead>
                                <tr className="bg-gray-50 text-[10px] font-black uppercase text-gray-500 tracking-widest text-left">
                                    <th className="p-4">Ref</th>
                                    <th className="p-4">Producto</th>
                                    <th className="p-4 text-center">Físico</th>
                                    <th className="p-4 text-right">Costo Prom.</th>
                                    <th className="p-4 text-right">Valor Total</th>
                                    <th className="p-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredItems.map((item) => (
                                    <tr 
                                        key={item.id} 
                                        className={`hover:bg-gray-50 transition-colors ${item.currentQuantity === 0 ? 'bg-red-50 border-l-2 border-l-red-500' : ''}`}
                                    >
                                        <td className={`p-4 font-mono text-[10px] ${item.currentQuantity === 0 ? 'text-red-600' : 'text-primary'}`}>{item.productCode}</td>
                                        <td className={`p-4 font-bold text-xs uppercase tracking-tight ${item.currentQuantity === 0 ? 'text-red-600' : 'text-gray-800'}`}>{item.products?.productName}</td>
                                        <td className={`p-4 text-center font-bold ${item.currentQuantity === 0 ? 'text-red-600 font-black' : 'text-gray-800'}`}>
                                            {item.currentQuantity}
                                        </td>
                                        <td className={`p-4 text-right text-xs ${item.currentQuantity === 0 ? 'text-red-500' : 'text-gray-500'}`}>${item.buyingPrice.toLocaleString()}</td>
                                        <td className={`p-4 text-right font-black text-xs ${item.currentQuantity === 0 ? 'text-red-600' : 'text-gray-800'}`}>${item.totalValue.toLocaleString()}</td>
                                        <td className="p-4 text-center">
                                            {item.currentQuantity === 0 ? (
                                                <div className="text-red-700 text-[9px] font-black uppercase border-2 border-red-300 px-2 py-0.5 rounded bg-red-100">⚠️ AGOTADO</div>
                                            ) : item.currentQuantity <= 10 ? (
                                                <div className="text-yellow-700 text-[9px] font-black uppercase border border-yellow-300 px-2 py-0.5 rounded bg-yellow-50">Bajo</div>
                                            ) : (
                                                <div className="text-green-700 text-[9px] font-black uppercase border border-green-300 px-2 py-0.5 rounded bg-green-50">Óptimo</div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
