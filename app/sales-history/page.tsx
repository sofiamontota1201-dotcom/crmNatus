"use client"

import { useState, useEffect, useMemo } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { SellsRepository } from "@/lib/repositories/sellsRepository"
import { Search, ShoppingBag, User, Calendar, DollarSign, ChevronRight, Package, Receipt, ArrowUpDown, FileDown, CheckCircle, CheckCircle2, XCircle, CreditCard, Trash2, Percent } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { StocksRepository } from "@/lib/repositories/stocksRepository"
import { useToast } from "@/hooks/use-toast"

export default function SalesHistoryPage() {
    const [sales, setSales] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedSale, setSelectedSale] = useState<any>(null)
    const [loadingDetails, setLoadingDetails] = useState(false)

    const { toast } = useToast()
    const sellsRepository = new SellsRepository(supabase)
    const stocksRepository = new StocksRepository(supabase)
    const [updating, setUpdating] = useState(false)
    const [discounts, setDiscounts] = useState<Record<number, number>>({})
    const [globalDiscount, setGlobalDiscount] = useState("")
    const [cajaStatus, setCajaStatus] = useState<Record<number, boolean>>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("cajaStatus")
            return saved ? JSON.parse(saved) : {}
        }
        return {}
    })

    useEffect(() => {
        fetchSales()
    }, [])

    const toggleCajaStatus = (saleId: number, e: React.MouseEvent) => {
        e.stopPropagation()
        setCajaStatus(prev => {
            const newState = { ...prev, [saleId]: !prev[saleId] }
            localStorage.setItem("cajaStatus", JSON.stringify(newState))
            return newState
        })
    }

    const fetchSales = async () => {
        setLoading(true)
        try {
            const data = await sellsRepository.list()
            setSales(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleViewDetails = async (saleId: number) => {
        setLoadingDetails(true)
        try {
            const detailedSale = await sellsRepository.getWithDetails(saleId)
            setSelectedSale(detailedSale)
            if (detailedSale.paymentStatus === 0) {
                const map: Record<number, number> = {}
                for (const d of detailedSale.details || []) {
                    if (d.id) map[d.id] = d.discount || 0
                }
                setDiscounts(map)
                setGlobalDiscount("")
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoadingDetails(false)
        }
    }

    const handleMarkAsPaid = async (sale: any) => {
        if (!sale || sale.paymentStatus !== 0) return

        setUpdating(true)
        try {
            // 1. Convert quote to paid invoice
            await sellsRepository.update(sale.id, { paymentStatus: 1 })

            // 2. Adjust Stock (Quotes didn't subtract it)
            for (const detail of sale.details || []) {
                if (!detail.stockId || !detail.soldQuantity) continue

                try {
                    const currentStock = await stocksRepository.getById(detail.stockId)
                    if (currentStock) {
                        const newQty = (currentStock.currentQuantity || 0) - detail.soldQuantity
                        await stocksRepository.update(detail.stockId, { currentQuantity: newQty } as any)
                    }
                } catch (stockErr) {
                    console.error("Error updating stock for item:", detail.stockId, stockErr)
                }
            }

            toast({
                title: "✓ Pago Procesado",
                description: `La cotización #${sale.id} ha sido convertida en factura de pago y el inventario actualizado.`,
            })

            // 3. Refresh and close
            fetchSales()
            setSelectedSale(null)
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "No se pudo procesar el pago de la cotización.",
                variant: "destructive",
            })
        } finally {
            setUpdating(false)
        }
    }

    const handleDeleteSale = async (saleId: number) => {
        if (!confirm("¿Estás seguro de que deseas eliminar permanentemente esta cotización?")) return

        setUpdating(true)
        try {
            await sellsRepository.remove(saleId)
            toast({
                title: "Cotización Eliminada",
                description: "El registro ha sido borrado del sistema.",
            })
            fetchSales()
            setSelectedSale(null)
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "No se pudo eliminar la cotización. Es posible que tenga registros asociados.",
                variant: "destructive",
            })
        } finally {
            setUpdating(false)
        }
    }

    const filteredSales = sales.filter(sale =>
        (sale.customers?.customerName || "Consumidor Final").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(sale.id).includes(searchTerm)
    )

    const isQuote = selectedSale?.paymentStatus === 0

    const quoteCalculations = useMemo(() => {
        if (!selectedSale?.details || selectedSale.details.length === 0) return null
        const lines = selectedSale.details.map((d: any) => {
            const sub = (d.soldPrice ?? 0) * (d.soldQuantity ?? 0)
            const pct = Math.max(0, Math.min(100, discounts[d.id] ?? d.discount ?? 0))
            const lineDiscount = Math.round(sub * (pct / 100))
            const lineTotal = Math.round(sub - lineDiscount)
            return { id: d.id, sub, pct, lineDiscount, lineTotal }
        })
        const subtotalSinDesc = lines.reduce((acc: number, l: any) => acc + l.sub, 0)
        const totalDiscount = lines.reduce((acc: number, l: any) => acc + l.lineDiscount, 0)
        const subtotalConDesc = subtotalSinDesc - totalDiscount
        const total = subtotalConDesc
        return { lines, subtotalSinDesc, totalDiscount, subtotalConDesc, total }
    }, [selectedSale, discounts])

    const handleDiscountChange = (detailId: number, value: string) => {
        if (value === "") {
            setDiscounts(prev => ({ ...prev, [detailId]: 0 }))
            return
        }
        const num = parseFloat(value)
        if (isNaN(num)) return
        const clamped = Math.max(0, Math.min(100, num))
        setDiscounts(prev => ({ ...prev, [detailId]: clamped }))
    }

    const handleApplyGlobalDiscount = (value: string) => {
        setGlobalDiscount(value)
        const num = value === "" ? 0 : parseFloat(value)
        if (value !== "" && isNaN(num)) return
        const clamped = Math.max(0, Math.min(100, num))
        const newMap: Record<number, number> = {}
        for (const d of selectedSale?.details || []) {
            if (d.id) newMap[d.id] = clamped
        }
        setDiscounts(newMap)
    }

    const handleSaveDiscounts = async () => {
        if (!selectedSale || !quoteCalculations || !isQuote) return
        setUpdating(true)
        try {
            for (const line of quoteCalculations.lines) {
                if (!line.id) continue
                await sellsRepository.updateDetail(line.id, {
                    discount: line.pct,
                    discountType: 2,
                    discountAmount: line.lineDiscount,
                    totalSoldPrice: line.lineTotal,
                })
            }
            await sellsRepository.update(selectedSale.id, {
                discountAmount: quoteCalculations.totalDiscount,
                totalAmount: quoteCalculations.total,
            })

            toast({
                title: "Descuento Aplicado",
                description: `La cotización #${selectedSale.id} fue actualizada con los descuentos.`,
            })

            fetchSales()
            await handleViewDetails(selectedSale.id)
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "No se pudieron guardar los descuentos de la cotización.",
                variant: "destructive",
            })
        } finally {
            setUpdating(false)
        }
    }

    const getPaymentMethodName = (id: number) => {
        const methods = ["Efectivo", "Tarjeta", "Transferencia"]
        return methods[id] || "Otro"
    }

    // --- PDF GENERATION HELPERS ---

    const numberToWordsES = (number: number): string => {
        const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
        const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
        const tens = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
        const hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

        const convertGroup = (n: number): string => {
            if (n === 100) return 'CIEN';
            let str = '';
            const h = Math.floor(n / 100);
            const t = Math.floor((n % 100) / 10);
            const u = n % 10;

            if (h > 0) str += hundreds[h] + ' ';

            if (t === 1) {
                str += teens[u] + ' ';
            } else {
                if (t > 1) str += tens[t] + ' ';
                if (t > 1 && u > 0) str += 'Y ';
                if (t !== 1 && u > 0) str += units[u] + ' ';
            }
            return str.trim();
        };

        if (number === 0) return 'CERO PESOS';

        let str = '';
        const millions = Math.floor(number / 1000000);
        const remainderMillion = number % 1000000;
        const thousands = Math.floor(remainderMillion / 1000);
        const remainder = remainderMillion % 1000;

        if (millions > 0) {
            if (millions === 1) str += 'UN MILLON ';
            else str += convertGroup(millions) + ' MILLONES ';
        }

        if (thousands > 0) {
            if (thousands === 1) str += 'MIL ';
            else str += convertGroup(thousands) + ' MIL ';
        }

        if (remainder > 0) {
            str += convertGroup(remainder);
        }

        return str.trim() + ' PESOS COLOMBIANOS';
    };

    const exportInvoicePDF = (sale: any) => {
        try {
            if (!sale) return
            const doc = new jsPDF('l', 'mm', 'a4') // Landscape

            const PURPLE = [34, 139, 34] as [number, number, number]; // Verde GGL

            // --- HEADER ---
            // Company Info (Top Center/Right)
            doc.setFontSize(18);
            doc.setTextColor(...PURPLE);
            doc.text(sale.paymentStatus === 0 ? "COTIZACIÓN DE VENTA" : "GGL EXPRESS", 14, 15);

            // Top Bar
            doc.setDrawColor(...PURPLE);
            doc.setLineWidth(1);
            doc.line(14, 20, 283, 20);

            let yPos = 25;

            // --- CUSTOMER & ORDER INFO GRID ---
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);

            // Left Column: Customer Data
            doc.setFont("helvetica", "bold");
            doc.text("Datos del Adquiriente", 14, yPos);
            yPos += 5;

            doc.setFont("helvetica", "bold");
            doc.text("Razón Social:", 14, yPos);
            doc.setFont("helvetica", "normal");
            doc.text((sale.customers?.customerName || "Consumidor Final").toUpperCase(), 40, yPos);
            yPos += 5;

            doc.setFont("helvetica", "bold");
            doc.text("Nit / CC:", 14, yPos);
            doc.setFont("helvetica", "normal");
            doc.text(sale.customers?.id?.toString() || "22222222", 40, yPos);
            yPos += 5;

            doc.setFont("helvetica", "bold");
            doc.text("Teléfono:", 14, yPos);
            doc.setFont("helvetica", "normal");
            doc.text(sale.customers?.phone || "N/A", 40, yPos);
            yPos += 5;

            doc.setFont("helvetica", "bold");
            doc.text("Dirección:", 14, yPos);
            doc.setFont("helvetica", "normal");
            const address = sale.customers?.address || "Dirección no registrada";
            const splitAddress = doc.splitTextToSize(address, 70); // Wrap text
            doc.text(splitAddress, 40, yPos);
            yPos += (splitAddress.length * 4) || 5;

            doc.setFont("helvetica", "bold");
            doc.text("Ciudad:", 14, yPos);
            doc.setFont("helvetica", "normal");
            doc.text("MEDELLÍN", 40, yPos);
            doc.setFont("helvetica", "bold");
            doc.text("País:", 80, yPos);
            doc.setFont("helvetica", "normal");
            doc.text("Colombia", 90, yPos);


            // Center Column: Negotiation
            // Divider
            doc.setDrawColor(200, 200, 200);
            doc.line(110, 23, 110, 60); // Vertical Line

            doc.setFont("helvetica", "bold");
            doc.text("Término de Negociación", 115, 25);
            // Content could go here if available
            doc.text("País Origen", 115, 45);


            // Right Column: Dates & Order Details
            // Divider
            doc.line(160, 23, 160, 60); // Vertical Line

            let rightY = 25;
            doc.setFont("helvetica", "bold");
            doc.text("Fecha Expedición", 165, rightY);
            doc.setFont("helvetica", "normal");
            doc.text(new Date(sale.sellDate || sale.createdAt).toLocaleDateString(), 230, rightY);
            rightY += 6;

            // Highlighted Date
            const fillColorDate: [number, number, number] = sale.paymentStatus === 0 ? [245, 158, 11] : PURPLE
            doc.setFillColor(...fillColorDate) // Amber if quote
            doc.rect(162, rightY - 4, 120, 6, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.text(sale.paymentStatus === 0 ? "Vigencia de Cotización" : "Fecha Vencimiento", 165, rightY);
            doc.text(new Date(sale.sellDate || sale.createdAt).toLocaleDateString(), 230, rightY); // Assuming same day for now
            doc.setTextColor(0, 0, 0);
            rightY += 6;

            doc.setFont("helvetica", "bold");
            doc.text("Días de Vencimiento", 165, rightY);
            rightY += 6;

            doc.text(sale.paymentStatus === 0 ? "Cotización No." : "Pedido No.", 165, rightY);
            doc.setFont("helvetica", "normal");
            doc.text(sale.id.toString(), 200, rightY);
            rightY += 6;

            doc.setFont("helvetica", "bold");
            doc.text("Vendedor", 165, rightY);
            doc.setFont("helvetica", "normal");
            doc.text("SISTEMA", 200, rightY);
            rightY += 6;

            doc.setFont("helvetica", "bold");
            doc.text("Medio de Pago", 165, rightY);
            doc.setFont("helvetica", "normal");
            doc.text(getPaymentMethodName(sale.paymentMethod).toUpperCase(), 200, rightY);
            rightY += 6;

            doc.setFont("helvetica", "bold");
            doc.text("Forma de Pago", 165, rightY);
            doc.setFont("helvetica", "normal");
            doc.text("CONTADO", 200, rightY);


            yPos = Math.max(yPos, 65); // Push down for table

            // --- TABLE ---
            const tableColumn = [
                "Referencia",
                "Descripción",
                "Cant.",
                "U.M.",
                "Precio Unitario",
                "% Desc.",
                "Valor Total"
            ];

            const tableRows = sale.details?.map((d: any) => [
                d.stock?.productCode || "GENERICO",
                d.stock?.product?.productName || "Producto",
                d.soldQuantity,
                "UNID",
                `COP ${Math.round(d.soldPrice || 0).toLocaleString('es-CO')}`,
                `${(d.discount || 0).toFixed(2).replace('.', ',')}`,
                `COP ${Math.round(d.totalSoldPrice || 0).toLocaleString('es-CO')}`
            ]) || [];

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: yPos,
                theme: 'plain',
                headStyles: {
                    fillColor: sale.paymentStatus === 0 ? [245, 158, 11] : PURPLE,
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'center',
                    fontSize: 9
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 3,
                    halign: 'center',
                    valign: 'middle',
                    lineColor: [200, 200, 200], // Light grey borders
                    lineWidth: 0.1
                },
                columnStyles: {
                    1: { halign: 'left' }, // Description aligned left
                    4: { halign: 'right' }, // Price
                    6: { halign: 'right' }  // Total
                },
                didDrawPage: (data) => {
                    // yPos = data.cursor?.y || yPos;
                }
            });

            // --- FOOTER SECTION ---
            const lastTable = (doc as any).lastAutoTable;
            yPos = (lastTable ? lastTable.finalY : yPos) + 5;

            // Dashed Line Separator
            doc.setDrawColor(150, 150, 150);
            doc.setLineDashPattern([3, 3], 0);
            doc.line(14, yPos, 283, yPos);
            doc.setLineDashPattern([], 0); // Reset
            yPos += 5;

            // Left Side: Observations & Words
            const bottomYStart = yPos;

            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text("Cantidad Líneas:", 150, yPos);
            doc.setFont("helvetica", "normal");
            doc.text(String(sale.details?.length || 0), 175, yPos);
            yPos += 10;

            doc.setFont("helvetica", "bold");
            doc.text("OBSERVACIONES:", 14, yPos);
            yPos += 4;
            doc.setFont("helvetica", "normal");
            doc.text(sale.paymentStatus === 0
                ? "APENAS SE REALICE EL PAGO DE LA TOTALIDAD SE REALIZARA EL ENVIO DE LA MERCANCIA."
                : "ANEXO Basado en Ventas del Sistema CRM GGL.", 14, yPos);

            // Amount in Words
            yPos += 10;
            const totalInt = Math.round(sale.totalAmount || 0);
            doc.setFont("helvetica", "bold");
            doc.text("Valor en Letras:", 14, yPos);
            doc.setFont("helvetica", "normal");
            const words = numberToWordsES(totalInt).toUpperCase();
            const splitWords = doc.splitTextToSize(words, 150);
            doc.text(splitWords, 35, yPos);

            // Right Side: Totals Box
            let totalsY = bottomYStart;
            const rightXStart = 200;
            const rightXValue = 260; // Right align anchor
            const lineHeight = 5;

            // Calcular correctamente los totales (sin IVA)
            const descuento = sale.discountAmount || 0;
            const subtotalConDescuento = sale.totalAmount;
            const subtotalSinDescuento = subtotalConDescuento + descuento;

            // List of totals
            const totals = [
                { label: "Subtotal SIN Desc.", value: subtotalSinDescuento },
                { label: "Descuento", value: descuento },
                { label: "Subtotal CON Desc.", value: subtotalConDescuento },
                { label: sale.paymentStatus === 0 ? "Total Cotización" : "Total Factura", value: sale.totalAmount }
            ];

            // Vertical divider
            doc.setDrawColor(200, 200, 200);
            doc.line(195, bottomYStart, 195, bottomYStart + (totals.length * lineHeight) + 15);

            totals.forEach(t => {
                doc.setFont("helvetica", "normal");
                if (t.label === "Total Factura") doc.setFont("helvetica", "bold");

                doc.text(t.label, rightXStart, totalsY);
                doc.text(`COP ${Math.round(t.value).toLocaleString('es-CO')}`, rightXValue, totalsY, { align: "right" });
                totalsY += lineHeight;
            });

            // Final Total Box (Purple)
            totalsY += 2;
            const fillColorTotal: [number, number, number] = sale.paymentStatus === 0 ? [245, 158, 11] : PURPLE
            doc.setFillColor(...fillColorTotal);
            doc.rect(195, totalsY - 4, 95, 12, 'F'); // Full width to right margin
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text(sale.paymentStatus === 0 ? "Valor Cotizado:" : "Total:", rightXStart + 2, totalsY + 4);
            doc.text(`COP ${Math.round(sale.totalAmount).toLocaleString('es-CO')}`, rightXValue, totalsY + 4, { align: "right" });


            // Save
            const dStr = new Date(sale.sellDate || sale.createdAt || new Date());
            const dateStr = `${String(dStr.getDate()).padStart(2, '0')}-${String(dStr.getMonth() + 1).padStart(2, '0')}-${dStr.getFullYear()}`;
            const clientName = (sale.customers?.customerName || "Cliente").replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\u00C0-\u00FF]/g, '');
            const prefix = sale.paymentStatus === 0 ? "Cotizacion" : "Factura";
            const fileName = `${prefix}_${clientName}_${dateStr}.pdf`;

            const pdfBlob = doc.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.target = "_blank";
            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 1000);

        } catch (error) {
            console.error("PDF EXPORT ERROR:", error)
        }
    }

    return (
        <div className="flex h-screen bg-background overflow-hidden font-sans">
            <Navigation />

            <main className="flex-1 p-4 md:p-8 transition-all duration-300 overflow-y-auto scrollbar-thin">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-800 via-gray-600 to-gray-400 tracking-tight">
                            Historial de Ventas
                        </h1>
                        <p className="text-gray-500 mt-1">Consulta cada compra realizada y el detalle de ítems.</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border-gray-200">
                        <Receipt className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-gray-800">{sales.length} Ventas Totales</span>
                    </div>
                </div>

                {/* Filters */}
                <div className="relative mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                        placeholder="Buscar por ID de factura o nombre de cliente..."
                        className="pl-12 h-14 bg-gray-50 border-gray-200 text-lg rounded-2xl focus:ring-primary/40 block w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Sales List */}
                <div className="grid grid-cols-1 gap-4 pb-20">
                    <AnimatePresence mode="popLayout">
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <div key={i} className="h-24 w-full bg-gray-100 rounded-2xl animate-pulse" />
                            ))
                        ) : filteredSales.length > 0 ? (
                            filteredSales.map((sale) => (
                                <motion.div
                                    key={sale.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    layout
                                >
                                    <Card
                                        className="bg-white border-gray-100 hover:border-primary/30 transition-all cursor-pointer group shadow-sm overflow-hidden"
                                        onClick={() => handleViewDetails(sale.id)}
                                    >
                                        <CardContent className="p-0">
                                            <div className="flex flex-col md:flex-row md:items-center p-6 gap-6">
                                                {/* Status Icon */}
                                                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                    <ShoppingBag className="w-6 h-6" />
                                                </div>

                                                {/* Invoice & Date */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-bold text-lg text-gray-800">
                                                            {sale.paymentStatus === 0 ? "Cotización" : "Factura"} #{sale.id}
                                                        </h3>
                                                        <Badge variant="outline" className={cn(
                                                            "text-[10px] border-gray-200",
                                                            sale.paymentStatus === 0 ? "text-amber-500 border-amber-500/20 bg-amber-500/5" : "text-gray-500"
                                                        )}>
                                                            {sale.paymentStatus === 0 ? "COTIZACIÓN" : getPaymentMethodName(sale.paymentMethod)}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {new Date(sale.sellDate || sale.createdAt).toLocaleDateString()}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 truncate">
                                                            <User className="w-3.5 h-3.5" />
                                                            {sale.customers?.customerName || "Consumidor Final"}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Amount & Action */}
                                                <div className="flex items-center justify-between md:justify-end gap-8">
                                                    <div className="text-right">
                                                        <span className="text-[10px] text-gray-500 block uppercase tracking-wider">Total Venta</span>
                                                        <span className="text-2xl font-black text-green-600">
                                                            ${sale.totalAmount.toLocaleString()}
                                                        </span>
                                                        <div
                                                            onClick={(e) => toggleCajaStatus(sale.id, e)}
                                                            className={cn(
                                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-2 cursor-pointer select-none transition-all duration-200 hover:scale-105",
                                                                (cajaStatus[sale.id] !== undefined ? cajaStatus[sale.id] : sale.paymentStatus === 1)
                                                                    ? "bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20"
                                                                    : "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                                                            )}
                                                        >
                                                            {(cajaStatus[sale.id] !== undefined ? cajaStatus[sale.id] : sale.paymentStatus === 1) ? (
                                                                <>
                                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                                    Factura pagada a caja
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <XCircle className="w-3.5 h-3.5" />
                                                                    Factura sin pagar a caja
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-center py-20">
                                <p className="text-gray-500">No se encontraron ventas con esos criterios.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Details Modal */}
                <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
                    <DialogContent className="bg-white border-gray-200 text-gray-800 max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 !bg-white shadow-lg">
                        {selectedSale && (
                            <>
                                <DialogHeader className="p-8 pb-4 border-b border-gray-100">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            {selectedSale.paymentStatus === 0 ? (
                                                <Badge className="mb-2 bg-amber-500/20 text-amber-500 border-amber-500/20">COTIZACIÓN PENDIENTE</Badge>
                                            ) : (
                                                <Badge className="mb-2 bg-primary/20 text-primary border-primary/20">VENTA COMPLETADA</Badge>
                                            )}
                                            <DialogTitle className="text-3xl font-black">
                                                {selectedSale.paymentStatus === 0 ? "Cotización" : "Recibo"} #{selectedSale.id}
                                            </DialogTitle>
                                            <DialogDescription className="text-gray-500 mt-1 flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                Emitido el {new Date(selectedSale.sellDate || selectedSale.createdAt).toLocaleDateString()}
                                            </DialogDescription>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500 uppercase">Cliente</p>
                                            <p className="text-lg font-bold text-gray-800 leading-tight">{selectedSale.customers?.customerName || "Consumidor Final"}</p>
                                            <p className="text-sm text-gray-500">{selectedSale.customers?.phone || "Sin teléfono"}</p>
                                        </div>
                                    </div>
                                </DialogHeader>

                                <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-6 scrollbar-thin">
                                    {/* Items Table */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                            <Package className="w-4 h-4 text-primary" />
                                            Productos Comprados
                                        </h4>

                                        <div className="bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden">

                                            {/* ── DESKTOP TABLE (md+) ── */}
                                            <table className="hidden md:table w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-gray-100 bg-gray-50">
                                                        <th className="p-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[40%]">Producto</th>
                                                        <th className="p-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[10%]">Cant.</th>
                                                        <th className="p-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[15%]">Precio Unit.</th>
                                                        {isQuote && (
                                                            <th className="p-3 text-center text-[10px] font-bold text-amber-500 uppercase tracking-wider w-[12%]">% Desc.</th>
                                                        )}
                                                        <th className="p-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[23%]">Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {selectedSale.details?.map((detail: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-gray-100 transition-colors">
                                                            <td className="p-3 font-medium text-gray-700 break-words">
                                                                {detail.stock?.product?.productName || "Producto Desconocido"}
                                                            </td>
                                                            <td className="p-3 text-center font-bold text-primary">{detail.soldQuantity}</td>
                                                            <td className="p-3 text-right text-gray-500">${(detail.soldPrice ?? 0).toLocaleString()}</td>
                                                            {isQuote && (
                                                                <td className="p-3 text-center">
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        max={100}
                                                                        value={quoteCalculations?.lines[idx]?.pct ?? 0}
                                                                        onChange={(e) => handleDiscountChange(detail.id, e.target.value)}
                                                                        className="w-20 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1 text-center text-amber-400 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                                                                    />
                                                                </td>
                                                            )}
                                                            <td className="p-3 text-right font-bold text-gray-800">${((quoteCalculations?.lines[idx]?.lineTotal ?? (detail.totalSoldPrice ?? (detail.soldQuantity * detail.soldPrice))) || 0).toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>

                                            {/* ── MOBILE CARDS (< md) ── */}
                                            <div className="md:hidden divide-y divide-gray-100">
                                                {selectedSale.details?.map((detail: any, idx: number) => (
                                                    <div key={idx} className="p-4 space-y-3">
                                                        {/* Nombre del producto */}
                                                        <p className="font-semibold text-sm text-gray-800 leading-tight">
                                                            {detail.stock?.product?.productName || "Producto Desconocido"}
                                                        </p>
                                                        {/* Fila de datos alineados */}
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <div className="bg-gray-50 rounded-lg p-2 text-center">
                                                                <span className="block text-gray-500 mb-0.5 uppercase text-[9px] tracking-wider">Cant.</span>
                                                                <span className="font-black text-primary text-base">{detail.soldQuantity}</span>
                                                            </div>
                                                            <div className="bg-gray-50 rounded-lg p-2 text-center">
                                                                <span className="block text-gray-500 mb-0.5 uppercase text-[9px] tracking-wider">Precio</span>
                                                                <span className="font-semibold text-gray-600">${(detail.soldPrice ?? 0).toLocaleString()}</span>
                                                            </div>
                                                            <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 text-center">
                                                                <span className="block text-primary/70 mb-0.5 uppercase text-[9px] tracking-wider">Subtotal</span>
                                                                <span className="font-black text-gray-800">${((quoteCalculations?.lines[idx]?.lineTotal ?? (detail.totalSoldPrice ?? (detail.soldQuantity * detail.soldPrice))) || 0).toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                        {isQuote && (
                                                            <div className="flex items-center justify-between gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">
                                                                <span className="text-amber-500/80 text-[10px] uppercase tracking-wider font-bold">% Desc.</span>
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={100}
                                                                    value={quoteCalculations?.lines[idx]?.pct ?? 0}
                                                                    onChange={(e) => handleDiscountChange(detail.id, e.target.value)}
                                                                    className="w-20 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1 text-center text-amber-400 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                        </div>
                                    </div>

                                    {/* Payment Info & Totals — mobile: columna, desktop: fila */}
                                    <div className="flex flex-col gap-4 pt-4">

                                        {/* Método de pago */}
                                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                            <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Método de Pago</h4>
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
                                                    <DollarSign className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800 text-sm">{getPaymentMethodName(selectedSale.paymentMethod)}</p>
                                                    <p className="text-xs text-green-500/70">Pagado el {new Date(selectedSale.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Resumen de totales */}
                                        <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                                            <div className="p-4 space-y-2">
                                                {/* Calcular subtotal sin IVA */}
                                                {(() => {
                                                    const totals = quoteCalculations
                                                        ? {
                                                            subtotalSinDescuento: quoteCalculations.subtotalSinDesc,
                                                            descuento: quoteCalculations.totalDiscount,
                                                            subtotalConDescuento: quoteCalculations.subtotalConDesc,
                                                        }
                                                        : (() => {
                                                            const descuento = selectedSale.discountAmount || 0;
                                                            return {
                                                                subtotalSinDescuento: selectedSale.totalAmount + descuento,
                                                                descuento,
                                                                subtotalConDescuento: selectedSale.totalAmount,
                                                            };
                                                        })();

                                                    return (
                                                        <>
                                                            {isQuote && (
                                                                <div className="mb-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <label className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                                                                            <Percent className="w-3.5 h-3.5" />
                                                                            Descuento Global (%)
                                                                        </label>
                                                                        <input
                                                                            type="number"
                                                                            min={0}
                                                                            max={100}
                                                                            value={globalDiscount}
                                                                            placeholder="0"
                                                                            onChange={(e) => handleApplyGlobalDiscount(e.target.value)}
                                                                            className="w-24 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1 text-center text-amber-400 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                                                                        />
                                                                    </div>
                                                                    <p className="text-[9px] text-gray-500 mt-1.5">Se aplica a todas las líneas. Ajusta línea por línea si lo necesitas.</p>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-gray-500">Subtotal SIN Desc.:</span>
                                                                <span className="text-gray-700 font-medium">${Math.round(totals.subtotalSinDescuento).toLocaleString()}</span>
                                                            </div>
                                                            {totals.descuento > 0 && (
                                                                <div className="flex justify-between items-center text-sm">
                                                                    <span className="text-gray-500">Descuento:</span>
                                                                    <span className="text-red-500 font-medium">-${Math.round(totals.descuento).toLocaleString()}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-gray-500">Subtotal CON Desc.:</span>
                                                                <span className="text-gray-700 font-medium">${Math.round(totals.subtotalConDescuento).toLocaleString()}</span>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            {/* Banner total — ocupa todo el ancho */}
                                            <div className={cn(
                                                "px-4 py-3 flex items-center justify-between border-t",
                                                selectedSale.paymentStatus === 0
                                                    ? "bg-amber-500/10 border-amber-500/20"
                                                    : "bg-green-500/10 border-green-500/20"
                                            )}>
                                                <span className="text-sm font-black text-gray-800 uppercase tracking-wide">
                                                    {selectedSale.paymentStatus === 0 ? "Total Cotizado" : "Total Cobrado"}
                                                </span>
                                                <span className={cn(
                                                    "text-xl md:text-2xl font-black",
                                                    selectedSale.paymentStatus === 0 ? "text-amber-400" : "text-green-400"
                                                )}>
                                                    ${((quoteCalculations?.total ?? selectedSale.totalAmount) || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        {selectedSale.paymentStatus === 0 && (
                                            <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl">
                                                <p className="text-xs text-amber-500 font-bold text-center uppercase tracking-wider leading-relaxed">
                                                    ⚠️ APENAS SE REALICE EL PAGO DE LA TOTALIDAD SE REALIZARA EL ENVIO DE LA MERCANCIA
                                                </p>
                                            </div>
                                        )}

                                    </div>
                                </div>

                                <div className="p-8 bg-gray-50 border-t border-gray-100 flex flex-wrap justify-end gap-3">
                                    <Button variant="outline" onClick={() => setSelectedSale(null)} className="text-gray-800">
                                        Cerrar
                                    </Button>

                                    {selectedSale.paymentStatus === 0 && (
                                        <Button
                                            onClick={handleSaveDiscounts}
                                            disabled={updating}
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-2 font-bold"
                                        >
                                            {updating ? (
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <Percent className="w-4 h-4" />
                                            )}
                                            Guardar Descuento
                                        </Button>
                                    )}

                                    {selectedSale.paymentStatus === 0 && (
                                        <Button
                                            onClick={() => handleMarkAsPaid(selectedSale)}
                                            disabled={updating}
                                            className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2 font-bold"
                                        >
                                            {updating ? (
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <CheckCircle className="w-4 h-4" />
                                            )}
                                            Marcar como Pagado
                                        </Button>
                                    )}

                                    {selectedSale.paymentStatus === 0 && (
                                        <Button
                                            onClick={() => handleDeleteSale(selectedSale.id)}
                                            disabled={updating}
                                            variant="ghost"
                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2 font-bold"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Eliminar
                                        </Button>
                                    )}

                                    <Button
                                        onClick={() => exportInvoicePDF(selectedSale)}
                                        className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2"
                                    >
                                        <FileDown className="w-4 h-4" /> Generar PDF Factura
                                    </Button>
                                </div>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    )
}
