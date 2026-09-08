"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, Send, CheckCircle2, User, FileText, AlertCircle, DollarSign, Search, ChevronDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { SellsRepository } from "@/lib/repositories/sellsRepository"

export default function FacturacionPage() {
  const { toast } = useToast()

  // States
  const [sales, setSales] = useState<any[]>([])
  const [loadingSales, setLoadingSales] = useState(true)
  const [searchSaleTerm, setSearchSaleTerm] = useState("")
  const [showSalesDropdown, setShowSalesDropdown] = useState(false)

  // Form States
  const [selectedSaleObject, setSelectedSaleObject] = useState<any>(null)
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null)
  const [email, setEmail] = useState("")
  const [clientName, setClientName] = useState("")
  const [invoiceAmount, setInvoiceAmount] = useState("")

  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)

  const sellsRepository = new SellsRepository(supabase)

  // Cargar ventas al entrar
  useEffect(() => {
    fetchSales()
  }, [])

  const fetchSales = async () => {
    setLoadingSales(true)
    try {
      const data = await sellsRepository.list()
      setSales(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingSales(false)
    }
  }

  // Filtrar facturas
  const filteredSales = sales.filter(sale =>
    String(sale.id).includes(searchSaleTerm) ||
    (sale.customers?.customerName || "").toLowerCase().includes(searchSaleTerm.toLowerCase())
  ).slice(0, 10) // Mostrar solo últimas 10

  const handleSelectSale = async (sale: any) => {
    // Buscar detalles completos
    setSearchSaleTerm("Cargando detalles...")
    try {
      const detailedSale = await sellsRepository.getWithDetails(sale.id)
      setSelectedSaleObject(detailedSale)
      setSelectedSaleId(detailedSale.id)
      setEmail(detailedSale.customers?.email || "")
      setClientName(detailedSale.customers?.customerName || "Consumidor Final")
      setInvoiceAmount(String(detailedSale.totalAmount))
      setShowSalesDropdown(false)
      setSearchSaleTerm("") // reset search
      toast({ title: 'Venta seleccionada', description: `Se cargaron los datos de la Factura #${detailedSale.id} listos para PDF` })
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo cargar el detalle de la venta', variant: 'destructive' })
      setSearchSaleTerm("")
    }
  }

  const getPaymentMethodName = (id: number) => {
    const methods = ["Efectivo", "Tarjeta", "Transferencia"]
    return methods[id] || "Otro"
  }

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

  const generateInvoiceBase64 = async (sale: any): Promise<string | null> => {
    try {
      if (!sale) return null;
      const [jsPDFMod, autoTableMod] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ])
      const jsPDF = jsPDFMod.default
      const autoTable = autoTableMod.default
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape

      const PURPLE = [34, 139, 34] as [number, number, number]; // Verde GGL

      // --- HEADER ---
      doc.setFontSize(18);
      const headerColor: [number, number, number] = sale.paymentStatus === 0 ? [245, 158, 11] : PURPLE
      doc.setTextColor(...headerColor);
      doc.text(sale.paymentStatus === 0 ? "COTIZACIÓN DE VENTA" : "GGL EXPRESS", 14, 15);

      doc.setDrawColor(...headerColor);
      doc.setLineWidth(1);
      doc.line(14, 20, 283, 20);

      let yPos = 25;

      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);

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
      const splitAddress = doc.splitTextToSize(address, 70);
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


      doc.setDrawColor(200, 200, 200);
      doc.line(110, 23, 110, 60);

      doc.setFont("helvetica", "bold");
      doc.text("Término de Negociación", 115, 25);
      doc.text("País Origen", 115, 45);

      doc.line(160, 23, 160, 60);

      let rightY = 25;
      doc.setFont("helvetica", "bold");
      doc.text("Fecha Expedición", 165, rightY);
      doc.setFont("helvetica", "normal");
      doc.text(new Date(sale.sellDate || sale.createdAt).toLocaleDateString(), 230, rightY);
      rightY += 6;

      const fillDateColor: [number, number, number] = sale.paymentStatus === 0 ? [245, 158, 11] : PURPLE
      doc.setFillColor(...fillDateColor);
      doc.rect(162, rightY - 4, 120, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(sale.paymentStatus === 0 ? "Vigencia de Cotización" : "Fecha Vencimiento", 165, rightY);
      doc.text(new Date(sale.sellDate || sale.createdAt).toLocaleDateString(), 230, rightY);
      doc.setTextColor(0, 0, 0);
      rightY += 6;

      doc.setFont("helvetica", "bold");
      doc.text("Días de Vencimiento", 165, rightY);
      rightY += 6;

      doc.text(sale.paymentStatus === 0 ? "Cotización No." : "Pedido No.", 165, rightY);
      doc.setFont("helvetica", "normal");
      doc.text(sale.id?.toString() || "0", 200, rightY);
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


      yPos = Math.max(yPos, 65);

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
        `COP ${Math.round(d.totalSoldPrice || d.soldQuantity * d.soldPrice || 0).toLocaleString('es-CO')}`
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
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        columnStyles: {
          1: { halign: 'left' },
          4: { halign: 'right' },
          6: { halign: 'right' }
        }
      });

      const lastTable = (doc as any).lastAutoTable;
      yPos = (lastTable ? lastTable.finalY : yPos) + 5;

      doc.setDrawColor(150, 150, 150);
      // @ts-ignore - jsPDF method not in type definitions
      doc.setLineDashPattern([3, 3], 0);
      doc.line(14, yPos, 283, yPos);
      // @ts-ignore - jsPDF method not in type definitions
      doc.setLineDashPattern([], 0);
      yPos += 5;

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

      yPos += 10;
      const totalInt = Math.round(sale.totalAmount || 0);
      doc.setFont("helvetica", "bold");
      doc.text("Valor en Letras:", 14, yPos);
      doc.setFont("helvetica", "normal");
      const words = numberToWordsES(totalInt).toUpperCase();
      const splitWords = doc.splitTextToSize(words, 150);
      doc.text(splitWords, 35, yPos);

      let totalsY = bottomYStart;
      const rightXStart = 200;
      const rightXValue = 260;
      const lineHeight = 5;

      // Calcular correctamente los totales (sin IVA)
      const descuento = sale.discountAmount || 0;
      const subtotalConDescuento = sale.totalAmount;
      const subtotalSinDescuento = subtotalConDescuento + descuento;

      const totals = [
        { label: "Subtotal SIN Desc.", value: subtotalSinDescuento },
        { label: "Descuento", value: descuento },
        { label: "Subtotal CON Desc.", value: subtotalConDescuento },
        { label: sale.paymentStatus === 0 ? "Total Cotización" : "Total Factura", value: sale.totalAmount }
      ];

      doc.setDrawColor(200, 200, 200);
      doc.line(195, bottomYStart, 195, bottomYStart + (totals.length * lineHeight) + 15);

      totals.forEach(t => {
        doc.setFont("helvetica", "normal");
        if (t.label === "Total Factura") doc.setFont("helvetica", "bold");

        doc.text(t.label, rightXStart, totalsY);
        doc.text(`COP ${Math.round(t.value).toLocaleString('es-CO')}`, rightXValue, totalsY, { align: "right" });
        totalsY += lineHeight;
      });

      totalsY += 2;
      const fillTotalColor: [number, number, number] = sale.paymentStatus === 0 ? [245, 158, 11] : PURPLE
      doc.setFillColor(...fillTotalColor);
      doc.rect(195, totalsY - 4, 95, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(sale.paymentStatus === 0 ? "Valor Cotizado:" : "Total:", rightXStart + 2, totalsY + 4);
      doc.text(`COP ${Math.round(sale.totalAmount).toLocaleString('es-CO')}`, rightXValue, totalsY + 4, { align: "right" });

      const dataUrlStr = doc.output('datauristring');
      return dataUrlStr.split(',')[1];

    } catch (error) {
      console.error("PDF EXPORT ERROR:", error);
      return null;
    }
  }

  const handleSendInvoice = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast({ title: "Error", description: "El correo es obligatorio para enviar la factura.", variant: "destructive" })
      return
    }

    setSending(true)
    setSuccess(false)

    try {

      // Generar el PDF si hay venta seleccionada
      let pdfBase64 = null;
      if (selectedSaleObject) {
        pdfBase64 = await generateInvoiceBase64(selectedSaleObject);
      }

      const res = await fetch('/api/enviar-factura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteEmail: email,
          clienteName: clientName,
          monto: invoiceAmount,
          idFactura: selectedSaleId,
          pdfBase64: pdfBase64,
          isCotizacion: selectedSaleObject?.paymentStatus === 0
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data?.error || 'No se pudo enviar el correo')

      setSuccess(true)
      toast({ title: '¡Factura enviada!', description: 'El cliente recibirá el correo y el PDF adjunto.' })

      // Resetear forma tras éxito
      setTimeout(() => {
        setSuccess(false)
        setEmail("")
        setClientName("")
        setInvoiceAmount("")
        setSelectedSaleId(null)
        setSelectedSaleObject(null)
      }, 4000)

    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation />
      <main className="flex-1 p-6 md:p-12 relative overflow-hidden flex flex-col items-center justify-center min-h-[calc(100vh-2rem)]">

        {/* Abstract Background */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-2xl relative z-10 -mt-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="mb-8 text-center">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 rounded-2xl mb-6 shadow-sm ring-1 ring-blue-500/20"
              >
                <FileText className="w-10 h-10" />
              </motion.div>
              <div className="flex items-center justify-center gap-4 mb-4">
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                  Envio de Facturas
                </h1>
              </div>
              <p className="text-slate-500 text-lg max-w-lg mx-auto leading-relaxed">
                Busca una factura generada y envíasela directamente al correo de tu cliente. El PDF se adjuntará automáticamente.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl shadow-indigo-500/5 border border-white/50 p-8 md:p-10 transition-all duration-300">

              {success ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center justify-center py-8 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
                    className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-500/30"
                  >
                    <CheckCircle2 className="w-12 h-12 text-white" />
                  </motion.div>
                  <h3 className="text-3xl font-bold text-slate-800 mb-4">¡Factura Despachada!</h3>
                  <p className="text-slate-500 text-lg mb-8 max-w-sm">
                    El sistema ha enviado exitosamente el correo de agradecimiento automático con el <strong className="text-blue-500">PDF adjunto</strong> al cliente.
                  </p>
                  <Button
                    onClick={() => setSuccess(false)}
                    variant="outline"
                    className="rounded-xl h-12 px-8 font-medium border-slate-200 hover:bg-slate-50"
                  >
                    Enviar otra factura
                  </Button>
                </motion.div>
              ) : (
                <form onSubmit={handleSendInvoice} className="space-y-7">

                  {/* Selector de Venta (Buscador) */}
                  <div className="space-y-2 relative">
                    <Label className="text-sm font-semibold text-slate-700">Vincular Venta (Búsqueda)</Label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        type="text"
                        onFocus={() => setShowSalesDropdown(true)}
                        placeholder="Buscar cliente o número de factura..."
                        value={searchSaleTerm}
                        onChange={(e) => setSearchSaleTerm(e.target.value)}
                        className="pl-12 pr-10 h-14 bg-blue-50/50 border-blue-200 focus:bg-blue-50 focus:ring-4 focus:ring-blue-500/20 text-lg transition-all rounded-2xl font-medium"
                      />
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    </div>

                    {selectedSaleId && !showSalesDropdown && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center bg-green-50 text-green-700 px-4 py-2 mt-2 rounded-xl text-sm font-medium border border-green-200">
                        <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Factura #{selectedSaleId} vinculada y PDF creado</span>
                        <button type="button" onClick={() => {
                          setSelectedSaleId(null)
                          setSelectedSaleObject(null)
                        }} className="text-xs hover:underline text-green-600">Desvincular</button>
                      </motion.div>
                    )}

                    {/* Dropdown de Resultados */}
                    <AnimatePresence>
                      {showSalesDropdown && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowSalesDropdown(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute top-[80px] left-0 w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-20 max-h-60 overflow-y-auto"
                          >
                            {loadingSales ? (
                              <p className="p-4 text-center text-sm text-slate-500">Cargando recibos...</p>
                            ) : filteredSales.length > 0 ? (
                              filteredSales.map((sale) => (
                                <button
                                  type="button"
                                  key={sale.id}
                                  onClick={() => handleSelectSale(sale)}
                                  className="w-full text-left p-3 hover:bg-slate-50 rounded-xl transition-colors flex justify-between items-center"
                                >
                                  <div>
                                    <span className="font-bold text-slate-800">#{sale.id}</span>
                                    <span className="ml-2 text-slate-600 text-sm">{sale.customers?.customerName || "Consumidor Final"}</span>
                                  </div>
                                  <span className="text-primary font-bold text-sm">${sale.totalAmount.toLocaleString()}</span>
                                </button>
                              ))
                            ) : (
                              <p className="p-4 text-center text-sm text-slate-500">No hay ventas recientes o que coincidan.</p>
                            )}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Campos Datos */}
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="relative group">
                        <Label className="text-sm font-semibold text-slate-700 mb-2 block">Nombre del Cliente</Label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                          <Input
                            type="text"
                            placeholder="Ej. Ana Gómez"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            className="pl-12 h-14 bg-slate-50/50 border-slate-200 hover:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all rounded-2xl"
                          />
                        </div>
                      </div>

                      <div className="relative group">
                        <Label className="text-sm font-semibold text-slate-700 mb-2 block">Monto a Enviar ($)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={invoiceAmount}
                            onChange={(e) => setInvoiceAmount(e.target.value)}
                            className="pl-12 h-14 bg-slate-50/50 border-slate-200 hover:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all rounded-2xl"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="relative group">
                      <Label className="text-sm font-semibold text-slate-700 mb-2 block">Correo Electronico</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input
                          type="email"
                          placeholder="correo@cliente.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-12 h-14 bg-slate-50 border-slate-200 hover:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-lg font-medium transition-all rounded-2xl"
                        />
                      </div>
                    </div>

                  </div>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={sending}
                      className="w-full h-16 text-lg font-bold shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 rounded-2xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-0"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        {sending ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Enviando Correo...
                          </>
                        ) : (
                          <>
                            <Mail className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            Enviar Correo
                          </>
                        )}
                      </span>
                    </Button>
                  </div>
                  <div className="text-center mt-4 flex items-center justify-center gap-2">
                    <div className="p-1 rounded-full bg-blue-100 text-blue-500">
                      <AlertCircle className="w-3 h-3" />
                    </div>
                    <p className="text-xs font-semibold text-slate-500 tracking-wider">
                      De: ggllogisticaydistribucion@gmail.com
                    </p>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
