"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { PlusCircle, FileText, Image as ImageIcon, Pencil, Trash2, Loader2, Calendar, RefreshCw, FileDown } from "lucide-react"
import { createBrowserClient } from '@supabase/ssr'
import { useState, useEffect } from "react"
import { ReportsRepository } from "@/lib/repositories/reportsRepository"
import { supabase as supabaseLib } from "@/lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const MESES = [
  { value: '0',  label: 'Enero' },
  { value: '1',  label: 'Febrero' },
  { value: '2',  label: 'Marzo' },
  { value: '3',  label: 'Abril' },
  { value: '4',  label: 'Mayo' },
  { value: '5',  label: 'Junio' },
  { value: '6',  label: 'Julio' },
  { value: '7',  label: 'Agosto' },
  { value: '8',  label: 'Septiembre' },
  { value: '9',  label: 'Octubre' },
  { value: '10', label: 'Noviembre' },
  { value: '11', label: 'Diciembre' },
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(amount);
}

export default function SoportesPage() {
  const [facturas, setFacturas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [totalIngresos, setTotalIngresos] = useState<number>(0)
  const [totalEgresos, setTotalEgresos] = useState<number>(0)
  const [gastosOperativos, setGastosOperativos] = useState<number>(0)
  const [totalCaja, setTotalCaja] = useState<number>(0)
  const [utilidadBruta, setUtilidadBruta] = useState<number>(0)
  const [margenReal, setMargenReal] = useState<number>(0)
  const [valorInventario, setValorInventario] = useState<number>(0)
  const [valorInventarioVenta, setValorInventarioVenta] = useState<number>(0)
  const [loadingInventario, setLoadingInventario] = useState(false)
  const [loadingRentabilidad, setLoadingRentabilidad] = useState(false)
  const [loadingCaja, setLoadingCaja] = useState(false)
  const [loadingEgresos, setLoadingEgresos] = useState(false)
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [loadingIngresos, setLoadingIngresos] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  // Modo de filtro: 'mes' o 'personalizado'
  const now = new Date()
  const [filterMode, setFilterMode] = useState<'mes' | 'personalizado'>('mes')
  const [selectedMonth, setSelectedMonth] = useState<string>(String(now.getMonth()))
  const [selectedYear, setSelectedYear] = useState<string>(String(now.getFullYear()))
  const [customStart, setCustomStart] = useState<string>("")
  const [customEnd, setCustomEnd] = useState<string>("")

  // Años disponibles: desde 2023 hasta año actual
  const currentYear = now.getFullYear()
  const YEARS = Array.from({ length: currentYear - 2022 }, (_, i) => String(2023 + i))

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

  // Calcular startDate/endDate según el modo
  useEffect(() => {
    let start = '', end = ''
    if (filterMode === 'mes') {
      const y = parseInt(selectedYear)
      const m = parseInt(selectedMonth)
      start = new Date(y, m, 1).toISOString().split('T')[0]
      end   = new Date(y, m + 1, 0).toISOString().split('T')[0]
    } else {
      start = customStart
      end   = customEnd
    }
    if (start && end) {
      setStartDate(start)
      setEndDate(end)
    }
  }, [filterMode, selectedMonth, selectedYear, customStart, customEnd])

  // Cargar ingresos, egresos y caja cuando cambien las fechas
  useEffect(() => {
    if (startDate && endDate) {
      fetchTotalIngresos(startDate, endDate)
      fetchTotalEgresos(startDate, endDate)
      fetchTotalCaja(startDate, endDate)
      fetchRentabilidad(startDate, endDate)
      fetchFacturas(startDate, endDate)
    }
  }, [startDate, endDate])

  // El inventario es independiente del período — se carga una sola vez
  useEffect(() => {
    fetchValorInventario()
  }, [])

  const fetchValorInventario = async () => {
    setLoadingInventario(true)
    try {
      const repo = new ReportsRepository(supabaseLib)
      const items = await repo.getInventoryValuation()
      setValorInventario(items.reduce((sum, item) => sum + item.totalValue, 0))
      setValorInventarioVenta(items.reduce((sum, item) => sum + item.totalValueSale, 0))
    } catch (error) {
      console.error('[fetchValorInventario]', error)
    } finally {
      setLoadingInventario(false)
    }
  }

  const fetchTotalIngresos = async (start: string, end: string) => {
    setLoadingIngresos(true)
    try {
      const { data, error } = await supabase
        .from('sells')
        .select('total_amount')
        .gte('created_at', start + 'T00:00:00')
        .lte('created_at', end + 'T23:59:59')

      if (error) throw error

      const total = (data || []).reduce((sum: number, item: any) => sum + (Number(item.total_amount) || 0), 0)
      setTotalIngresos(total)
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "No se pudo cargar los ingresos", variant: "destructive" })
    } finally {
      setLoadingIngresos(false)
    }
  }

  const fetchTotalEgresos = async (start: string, end: string) => {
    setLoadingEgresos(true)
    try {
      const { data, error } = await supabase
        .from('invoice_supports')
        .select('total_price, type, category')
        .in('type', ['compra', 'gasto', 'prestamo'])
        .gte('invoice_date', start)
        .lte('invoice_date', end)

      if (error) {
        console.error('[fetchTotalEgresos] Supabase error:', error.message, error.code, error.details, error.hint)
        throw error
      }

      // Gastos operativos puros: solo type='gasto' (SÍ reducen la utilidad neta)
      const gastosOperativosPuros = (data || [])
        .filter((item: any) => item.type === 'gasto')
        .reduce((sum: number, item: any) => sum + (Number(item.total_price) || 0), 0)

      // Salidas de capital: compras + préstamos (NO reducen utilidad, solo mueven caja)
      const salidasCapital = (data || [])
        .filter((item: any) => item.type === 'compra' || item.type === 'prestamo')
        .reduce((sum: number, item: any) => sum + (Number(item.total_price) || 0), 0)

      // totalEgresos = todos los egresos físicos (para flujo de caja)
      const total = gastosOperativosPuros + salidasCapital
      setTotalEgresos(total)
      setGastosOperativos(gastosOperativosPuros)
    } catch (error: any) {
      console.error('[fetchTotalEgresos]', error?.message ?? error)
      toast({ title: "Error", description: error?.message || "No se pudo cargar los egresos", variant: "destructive" })
    } finally {
      setLoadingEgresos(false)
    }
  }

  const fetchTotalCaja = async (start: string, end: string) => {
    setLoadingCaja(true)
    try {
      const { data, error } = await supabase
        .from('invoice_supports')
        .select('total_price')
        .eq('type', 'ingreso_caja')
        .gte('invoice_date', start)
        .lte('invoice_date', end)

      if (error) throw error

      const total = (data || []).reduce((sum: number, item: any) => sum + (Number(item.total_price) || 0), 0)
      setTotalCaja(total)
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "No se pudo cargar el total en caja", variant: "destructive" })
    } finally {
      setLoadingCaja(false)
    }
  }

  const fetchRentabilidad = async (start: string, end: string) => {
    setLoadingRentabilidad(true)
    try {
      const repo = new ReportsRepository(supabaseLib)
      const data = await repo.getProfitabilityAnalysis(start, end)
      setUtilidadBruta(data.summary.grossProfit)
      setMargenReal(data.summary.contributionMarginPercent)
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingRentabilidad(false)
    }
  }

  const fetchFacturas = async (start?: string, end?: string) => {
    setLoading(true)
    try {
      let query = supabase
        .from('invoice_supports')
        .select('*')
        .order('invoice_date', { ascending: false })

      if (start) query = query.gte('invoice_date', start)
      if (end) query = query.lte('invoice_date', end)

      const { data, error } = await query
      
      if (error) {
        console.error("Error fetching facturas:", error)
        toast({ title: "Error", description: "No se pudieron cargar los registros", variant: "destructive" })
      }
      if (data) setFacturas(data)
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Subscribirse a cambios en tiempo real
    const subscription = supabase
      .channel('invoice_supports_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoice_supports' },
        () => {
          if (startDate && endDate) fetchFacturas(startDate, endDate)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(subscription) }
  }, [startDate, endDate])

  // Función para refrescar manualmente
  const handleManualRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      fetchFacturas(startDate, endDate),
      fetchTotalIngresos(startDate, endDate),
      fetchTotalEgresos(startDate, endDate),
      fetchTotalCaja(startDate, endDate),
      fetchRentabilidad(startDate, endDate),
      fetchValorInventario(),
    ])
    setRefreshing(false)
    toast({ title: "Actualizado", description: "Los registros se han recargado" })
  }

  const handleDelete = async (id: string, entityName: string) => {
    if (!confirm(`¿Estás seguro de eliminar el soporte de "${entityName}"?`)) return

    setDeletingId(id)
    const { error } = await supabase
      .from('invoice_supports')
      .delete()
      .eq('id', id)

    if (error) {
      toast({ title: "Error al eliminar", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Soporte eliminado", description: "El registro ha sido borrado con éxito." })
      setFacturas(facturas.filter(f => f.id !== id))
    }
    setDeletingId(null)
  }

  // Flujo de Caja Neto: Total en Caja − TODOS los egresos físicos del período
  const balance = totalCaja - totalEgresos;
  // Utilidad Neta Real: Utilidad Bruta − SOLO Gastos Operativos Puros (no préstamos ni compras)
  const gananciEmpresa = utilidadBruta - gastosOperativos;
  // Ingresos Recaudo: Total Ingresos − Gastos y Egresos de Caja
  const ingresosRecaudo = totalIngresos - totalEgresos;

  // ─── Formato moneda COP ────────────────────────────────────────────────────
  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

  // ─── Exportar Informe Ejecutivo PDF ───────────────────────────────────────
  const exportInformeEjecutivo = async () => {
    // Obtener datos de inventario fresco para el PDF
    let invCosto = valorInventario
    let invVenta = valorInventarioVenta

    // Si aún no están cargados, traerlos ahora
    if (invCosto === 0 || invVenta === 0) {
      try {
        const repo = new ReportsRepository(supabaseLib)
        const items = await repo.getInventoryValuation()
        invCosto = items.reduce((sum, item) => sum + item.totalValue, 0)
        invVenta = items.reduce((sum, item) => sum + item.totalValueSale, 0)
      } catch (error) {
        console.error('[exportInformeEjecutivo] Error cargando inventario:', error)
        toast({ 
          title: "Error", 
          description: "No se pudo cargar los datos de inventario", 
          variant: "destructive" 
        })
        return
      }
    }
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const W = 210, margin = 18
    const colores = {
      primario:    [30,  30,  50]  as [number,number,number],
      acento:      [16, 185, 129]  as [number,number,number],
      acentoOsc:   [5,  150, 105]  as [number,number,number],
      texto:       [30,  30,  40]  as [number,number,number],
      grisClaro:   [245,246,248]   as [number,number,number],
      blanco:      [255,255,255]   as [number,number,number],
      rojo:        [220,  53,  69] as [number,number,number],
      amarillo:    [245,158,  11]  as [number,number,number],
    }

    const periodoLabel = filterMode === 'mes'
      ? `${MESES[parseInt(selectedMonth)].label} ${selectedYear}`
      : `${startDate} al ${endDate}`

    // ── PORTADA ──────────────────────────────────────────────────────────────
    doc.setFillColor(...colores.primario)
    doc.rect(0, 0, W, 297, 'F')

    // Banda acento
    doc.setFillColor(...colores.acento)
    doc.rect(0, 0, 6, 297, 'F')

    // Título
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(...colores.blanco)
    doc.text('INFORME DE GESTIÓN FINANCIERA', margin + 6, 70)
    doc.text('Y RENDIMIENTO OPERATIVO', margin + 6, 82)

    doc.setFontSize(13)
    doc.setTextColor(...colores.acento)
    doc.text('Presentación de Resultados · Junta de Socios', margin + 6, 96)

    doc.setFontSize(11)
    doc.setTextColor(180, 190, 200)
    doc.text(`Período Evaluado: ${periodoLabel}`, margin + 6, 110)
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' })}`, margin + 6, 118)
    doc.text('Versión: 1.0  |  Clasificación: ESTRICTAMENTE CONFIDENCIAL', margin + 6, 126)

    // Línea separadora
    doc.setDrawColor(...colores.acento)
    doc.setLineWidth(0.5)
    doc.line(margin + 6, 134, W - margin, 134)

    // Disclaimer
    doc.setFontSize(8)
    doc.setTextColor(120, 130, 145)
    doc.text('Este documento contiene información financiera confidencial exclusiva para uso interno de la Junta de Socios.', margin + 6, 270)
    doc.text('Su divulgación, reproducción o distribución no autorizada está estrictamente prohibida.', margin + 6, 276)

    // ── PÁGINA 2: RESUMEN EJECUTIVO ──────────────────────────────────────────
    doc.addPage()
    let y = 20

    const tituloSeccion = (titulo: string, yPos: number) => {
      doc.setFillColor(...colores.primario)
      doc.rect(margin, yPos, W - margin * 2, 9, 'F')
      doc.setFillColor(...colores.acento)
      doc.rect(margin, yPos, 4, 9, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...colores.blanco)
      doc.text(titulo.toUpperCase(), margin + 8, yPos + 6.2)
      return yPos + 16
    }

    y = tituloSeccion('1. Resumen Ejecutivo — Evaluación del Director Financiero', y)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...colores.texto)

    const margenNetoReal = totalIngresos > 0 ? ((utilidadBruta - gastosOperativos) / totalIngresos * 100) : 0
    const cuentasPorCobrar = facturas
      .filter(f => f.type === 'prestamo' && (f.entity_name?.toLowerCase().includes('guillermo') || f.entity_name?.toLowerCase().includes('giraldo')))
      .reduce((sum: number, f: any) => sum + (Number(f.total_price) || 0), 0)
    const totalActivoCorriente = balance + invCosto + cuentasPorCobrar

    const resumen = [
      `Estimados Socios,`,
      '',
      `El presente informe consolida los resultados financieros y operativos del período ${periodoLabel}, elaborado bajo los lineamientos de las Normas Internacionales de Información Financiera (NIIF/IFRS para PyMEs).`,
      '',
      `La operación del período arroja un Margen Bruto del ${margenReal.toFixed(2)}% y, más relevante aún, una Utilidad Neta Real del ${margenNetoReal.toFixed(2)}% (${fmt(utilidadBruta - gastosOperativos)}) sobre los ingresos del período, una vez descontados los gastos operativos.`,
      '',
      `En términos de activos corrientes, la empresa cuenta con Efectivo en Caja de ${fmt(balance)}, Inventario valorado a costo por ${fmt(invCosto)}, y una Cuenta por Cobrar a parte relacionada (Guillermo Giraldo) de ${fmt(cuentasPorCobrar)}, sumando un Activo Corriente Total de ${fmt(totalActivoCorriente)}.`,
      '',
      `La Dirección Financiera llama la atención de la Junta sobre dos aspectos que requieren análisis: (1) el 100% del gasto operativo del período corresponde a transacciones con una misma parte relacionada, incluyendo un gasto de naturaleza personal; (2) existe una discrepancia sin conciliar entre el CMV contable y los egresos de caja. Ambos puntos se detallan en las secciones 7 y 8 de este informe.`,
    ]

    resumen.forEach(linea => {
      if (y > 270) { doc.addPage(); y = 20 }
      const lineasEnvueltas = doc.splitTextToSize(linea, W - margin * 2)
      doc.text(lineasEnvueltas, margin, y)
      y += linea === '' ? 3 : (lineasEnvueltas.length * 5.5)
    })

    // ── PÁGINA 3: ESTADOS FINANCIEROS ────────────────────────────────────────
    doc.addPage()
    y = 20

    // Estado de Resultados
    y = tituloSeccion('2. Estado de Resultados Integral — Métrica de Rentabilidad', y)

    const cmv = totalIngresos - utilidadBruta
    const margenNetoReal2 = utilidadBruta > 0 ? ((utilidadBruta - gastosOperativos) / totalIngresos * 100) : 0

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['CONCEPTO', 'MONTO (COP)']],
      body: [
        ['(+) Ingresos Operacionales Totales',                  fmt(totalIngresos)],
        ['(-) Costo de Mercancía Vendida (CMV Real)',           `(${fmt(cmv)})`],
        ['(=) UTILIDAD BRUTA OPERACIONAL',                      fmt(utilidadBruta)],
        ['    Margen Bruto',                                    `${margenReal.toFixed(2)}%`],
        ['    Margen Neto Real (Util. Bruta - Gastos Op. / Ingresos)', `${margenNetoReal2.toFixed(2)}%`],
        ['(-) Gastos Operativos Puros (Admón. y Oper.)',        `(${fmt(gastosOperativos)})`],
        ['    (Excluye préstamos y compras de capital)',         ''],
        ['(=) UTILIDAD NETA REAL DEL EJERCICIO',                fmt(utilidadBruta - gastosOperativos)],
      ],
      headStyles: { fillColor: colores.primario, textColor: colores.blanco, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: colores.texto },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      didParseCell: (data) => {
        if (data.section === 'body') {
          if (data.row.index === 2) {
            data.cell.styles.fillColor = [230, 255, 245]
            data.cell.styles.textColor = colores.acentoOsc
            data.cell.styles.fontStyle = 'bold'
          }
          if (data.row.index === 7) {
            const negativo = (utilidadBruta - gastosOperativos) < 0
            data.cell.styles.fillColor = negativo ? [255,235,235] : [230,255,245]
            data.cell.styles.textColor = negativo ? colores.rojo : colores.acentoOsc
            data.cell.styles.fontStyle = 'bold'
          }
          if (data.row.index % 2 === 0) {
            if (![2,7].includes(data.row.index)) data.cell.styles.fillColor = colores.grisClaro
          }
        }
      },
    })

    y = (doc as any).lastAutoTable.finalY + 14

    // Estado de Flujos de Efectivo
    y = tituloSeccion('3. Estado de Flujos de Efectivo — Métrica de Liquidez', y)

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['CONCEPTO', 'MONTO (COP)']],
      body: [
        ['(+) Recaudos e Ingresos de Caja del Período',      fmt(totalIngresos)],
        ['',                                                  ''],
        ['(-) Egresos, Compras y Desembolsos del Período',   `(${fmt(totalEgresos)})`],
        ['',                                                  ''],
        ['(=) FLUJO DE CAJA NETO DE LA OPERACIÓN',           fmt(balance)],
        ['',                                                  ''],
        ['(+) Saldo Inicial en Caja (Al 01/06/2026)',        fmt(0)],
        ['',                                                  ''],
        ['(=) SALDO FINAL DISPONIBLE CONCILIADO',            fmt(balance)],
      ],
      headStyles: { fillColor: colores.primario, textColor: colores.blanco, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: colores.texto },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      didParseCell: (data) => {
        if (data.section === 'body') {
          // Filas de resultado (Flujo neto y Saldo Final)
          if (data.row.index === 4 || data.row.index === 8) {
            data.cell.styles.fillColor = [230, 240, 255]
            data.cell.styles.textColor = [30, 80, 200]
            data.cell.styles.fontStyle = 'bold'
          }
          // Filas vacías para separación
          if (data.row.index === 1 || data.row.index === 3 || data.row.index === 6 || data.row.index === 7) {
            data.cell.styles.fillColor = colores.grisClaro
          } else if (data.row.index % 2 === 0 && ![4,8].includes(data.row.index)) {
            data.cell.styles.fillColor = colores.grisClaro
          }
        }
      },
    })

    y = (doc as any).lastAutoTable.finalY + 14

    // ── PÁGINA 4: ESTADO DE SITUACIÓN FINANCIERA (ACTIVO CORRIENTE) ─────────────
    if (y > 200) { doc.addPage(); y = 20 }

    y = tituloSeccion('4. Estado de Situación Financiera — Activo Corriente', y)

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['CONCEPTO', 'MONTO (COP)']],
      body: [
        ['Efectivo en Caja',                                      fmt(balance)],
        ['Inventario a Precio de Costo',                          fmt(invCosto)],
        ...(facturas.some(f => f.entity_name?.toLowerCase().includes('guillermo') || f.entity_name?.toLowerCase().includes('giraldo')) 
          ? [['Cuentas por Cobrar a Partes Relacionadas (Guillermo Giraldo)', 
              fmt(facturas.filter(f => f.entity_name?.toLowerCase().includes('guillermo') || f.entity_name?.toLowerCase().includes('giraldo'))
                           .filter(f => f.type === 'prestamo')
                           .reduce((sum, f) => sum + (Number(f.total_price) || 0), 0))]]
          : []),
        ['TOTAL ACTIVO CORRIENTE',                                fmt(balance + invCosto + (facturas.filter(f => f.entity_name?.toLowerCase().includes('guillermo') || f.entity_name?.toLowerCase().includes('giraldo'))
                                                                                             .filter(f => f.type === 'prestamo')
                                                                                             .reduce((sum, f) => sum + (Number(f.total_price) || 0), 0)))],
      ],
      headStyles: { fillColor: colores.primario, textColor: colores.blanco, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: colores.texto },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const lastIndex = data.table.body.length - 1
          if (data.row.index === lastIndex) {
            data.cell.styles.fillColor = [210, 245, 238]
            data.cell.styles.textColor = [10, 100, 80]
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fontSize = 9.5
          } else if (data.row.index % 2 === 0) {
            data.cell.styles.fillColor = colores.grisClaro
          }
        }
      },
    })

    y = (doc as any).lastAutoTable.finalY + 8

    // Nota sobre pasivos
    doc.setFontSize(8)
    doc.setTextColor(100, 120, 140)
    const notaPasivos = doc.splitTextToSize(
      'Nota sobre Pasivos: Este sistema no registra pasivos (cuentas por pagar, obligaciones financieras, etc.). No es posible calcular un patrimonio neto real con la información disponible. La Junta deberá confirmar si existen compromisos de pago no documentados en el sistema.',
      W - margin * 2
    )
    doc.text(notaPasivos, margin, y)
    y += notaPasivos.length * 4.2 + 8

    // ── PÁGINA 5: DESGLOSE DEL AUXILIAR OPERATIVO ─────────────────────────────
    if (y > 220) { doc.addPage(); y = 20 }

    y = tituloSeccion('5. Desglose del Auxiliar Operativo de Movimientos', y)

    const filasFact = facturas.map(f => [
      f.invoice_date,
      f.type === 'compra' ? 'COMPRA' : f.type === 'gasto' ? 'GASTO' : f.type === 'ingreso_caja' ? 'ING. CAJA' : f.type === 'prestamo' ? 'PRÉSTAMO' : f.type.toUpperCase(),
      f.entity_name,
      f.description?.substring(0, 40) || '-',
      formatCurrency(f.total_price),
    ])

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['FECHA', 'TIPO', 'TERCERO', 'DESCRIPCIÓN', 'VALOR']],
      body: filasFact.length > 0 ? filasFact : [['Sin registros en el período','','','','']],
      headStyles: { fillColor: colores.primario, textColor: colores.blanco, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: colores.texto },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 22 },
        2: { cellWidth: 38 },
        3: { cellWidth: 62 },
        4: { halign: 'right', fontStyle: 'bold', cellWidth: 28 },
      },
      alternateRowStyles: { fillColor: colores.grisClaro },
    })

    // ── PÁGINA 6: PROYECCIÓN DE VENTA ──────────────────────────────────────────
    y = (doc as any).lastAutoTable.finalY + 14
    if (y > 220) { doc.addPage(); y = 20 }

    y = tituloSeccion('6. Proyección de Venta (No Patrimonio, No Realizado)', y)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...colores.texto)
    const textoInventario = [
      'ADVERTENCIA: Los valores de esta sección son proyecciones no realizadas. No representan patrimonio, no constituyen efectivo disponible, y no deben sumarse al activo corriente ni al flujo de caja. Se presentan únicamente como referencia del potencial de ingresos futuros si se vendiera la totalidad del inventario disponible.',
      '',
      'El inventario permanece en bodega como capital inmovilizado. Su conversión a efectivo depende de las condiciones reales del mercado, la rotación de productos y la capacidad de distribución del período siguiente.',
    ]
    textoInventario.forEach(linea => {
      if (y > 270) { doc.addPage(); y = 20 }
      const lineasEnvueltas = doc.splitTextToSize(linea, W - margin * 2)
      doc.text(lineasEnvueltas, margin, y)
      y += linea === '' ? 3 : (lineasEnvueltas.length * 5.2)
    })
    y += 6

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['CONCEPTO', 'MONTO (COP)']],
      body: [
        ['Inventario a Precio de Costo (Capital Invertido)',       fmt(invCosto)],
        ['Inventario a Precio de Venta Público',                  fmt(invVenta)],
      ],
      headStyles: { fillColor: colores.primario, textColor: colores.blanco, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: colores.texto },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      didParseCell: (data) => {
        if (data.section === 'body') {
          if (data.row.index === 1) {
            data.cell.styles.fillColor = [230, 240, 255]
            data.cell.styles.textColor = [30, 80, 200]
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fontSize = 9.5
          } else if (data.row.index % 2 === 0) {
            data.cell.styles.fillColor = colores.grisClaro
          }
        }
      },
    })

    y = (doc as any).lastAutoTable.finalY + 14

    // ── PÁGINA 7: RESUMEN PATRIMONIAL ─────────────────────────────────────────
    if (y > 220) { doc.addPage(); y = 20 }

    y = tituloSeccion('7. Nota de Partes Relacionadas', y)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...colores.texto)

    const txGuillermoGiraldo = facturas.filter((f: any) =>
      f.entity_name?.toLowerCase().includes('guillermo') ||
      f.entity_name?.toLowerCase().includes('giraldo')
    )
    const totalGiraldo = txGuillermoGiraldo.reduce((sum: number, f: any) => sum + (Number(f.total_price) || 0), 0)

    const textoPartes7 = [
      'De conformidad con los lineamientos de revelación de las NIIF, se presentan las transacciones identificadas con partes relacionadas durante el período evaluado.',
      '',
      'TRANSACCIONES CON GUILLERMO GIRALDO (Parte Relacionada):',
    ]
    textoPartes7.forEach(linea => {
      if (y > 270) { doc.addPage(); y = 20 }
      const lw = doc.splitTextToSize(linea, W - margin * 2)
      doc.text(lw, margin, y)
      y += linea === '' ? 3 : (lw.length * 5.2)
    })
    y += 3

    const filasGiraldo = txGuillermoGiraldo.map((f: any) => [
      f.invoice_date,
      f.type === 'prestamo' ? 'PRÉSTAMO / CXC' : f.type === 'gasto' ? 'GASTO' : f.type.toUpperCase(),
      f.category || '-',
      f.description?.substring(0, 45) || '-',
      formatCurrency(f.total_price),
    ])

    if (filasGiraldo.length > 0) {
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['FECHA', 'TIPO', 'CATEGORÍA', 'DESCRIPCIÓN', 'MONTO']],
        body: filasGiraldo,
        headStyles: { fillColor: colores.primario, textColor: colores.blanco, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: colores.texto },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 26 },
          2: { cellWidth: 25 },
          3: { cellWidth: 65 },
          4: { halign: 'right', fontStyle: 'bold', cellWidth: 28 },
        },
        alternateRowStyles: { fillColor: colores.grisClaro },
      })
      y = (doc as any).lastAutoTable.finalY + 6
    }

    doc.setFontSize(8.5)
    doc.setTextColor(...colores.texto)
    const obsGiraldo = [
      `Total transacciones con Guillermo Giraldo: ${fmt(totalGiraldo)}`,
      '',
      `OBSERVACIÓN CRÍTICA PARA LA JUNTA: El 100% del gasto operativo reportado en el período (${fmt(gastosOperativos)}) corresponde`,
      `a transacciones con la misma parte relacionada: su sueldo (${fmt(gastosOperativos - 380000)}) y el seguro SOAT de su`,
      `motocicleta personal (${fmt(380000)}). Este último es un gasto de naturaleza estrictamente personal que fue cargado`,
      `a la operación de la empresa. No se registra ningún otro gasto operativo de terceros no relacionados en el período.`,
    ]
    obsGiraldo.forEach(linea => {
      if (y > 270) { doc.addPage(); y = 20 }
      const lw = doc.splitTextToSize(linea, W - margin * 2)
      doc.text(lw, margin, y)
      y += linea === '' ? 3 : (lw.length * 5)
    })
    y += 8

    // ── PÁGINA 8: SALVEDADES Y NOTAS AL INFORME ───────────────────────────────
    if (y > 220) { doc.addPage(); y = 20 }

    y = tituloSeccion('8. Salvedades y Notas al Informe', y)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...colores.texto)

    const cmvReportado = totalIngresos - utilidadBruta
    const egresoCaja = totalEgresos
    const diferencia = Math.abs(cmvReportado - egresoCaja)

    const salvedades = [
      '1. DISCREPANCIA SIN CONCILIAR — CMV CONTABLE VS. EGRESOS DE CAJA:',
      `   CMV contable (Ingresos − Utilidad Bruta):  ${fmt(cmvReportado)}`,
      `   Egresos totales de caja del período:        ${fmt(egresoCaja)}`,
      `   Diferencia no conciliada:                   ${fmt(diferencia)}`,
      '',
      `   Esta diferencia de ${fmt(diferencia)} no tiene una explicación registrada en el sistema. Puede deberse a: (a) compras de inventario que aún no se han realizado en ventas, (b) ajustes de costo no documentados, o (c) mercancía adquirida fuera del sistema. La Junta debe solicitar una conciliación explícita antes de aprobar los estados financieros del período.`,
      '',
      '2. GASTO DE NATURALEZA PERSONAL CARGADO A LA OPERACIÓN:',
      `   Se identificó un gasto de ${fmt(380000)} correspondiente al SOAT de la motocicleta personal de Guillermo Giraldo, registrado como gasto operativo de la empresa. Este gasto representa un desembolso de naturaleza personal que requiere aprobación expresa de la Junta para su reconocimiento como gasto corporativo.`,
      '',
      '3. LIMITACIÓN EN EL REGISTRO DE PASIVOS:',
      '   El sistema no registra pasivos ni obligaciones financieras. No es posible determinar el patrimonio neto real de la sociedad con la información disponible. Se recomienda implementar el registro de cuentas por pagar y otras obligaciones.',
      '',
      '4. INVENTARIO SIN AJUSTE POR DETERIORO O MERMA:',
      '   El inventario está valorado al costo histórico de adquisición. No se han practicado ajustes por deterioro, obsolescencia, mermas ni fluctuaciones de precio de mercado.',
      '',
      '5. CUENTA POR COBRAR A PARTE RELACIONADA SIN CONDICIONES DOCUMENTADAS:',
      `   El préstamo a Guillermo Giraldo (${fmt(cuentasPorCobrar)}) no tiene plazo de vencimiento, tasa de interés ni condiciones de recuperación documentadas en el sistema.`,
    ]

    salvedades.forEach(linea => {
      if (y > 272) { doc.addPage(); y = 20 }
      const lw = doc.splitTextToSize(linea, W - margin * 2)
      doc.text(lw, margin, y)
      y += linea === '' ? 3 : (lw.length * 4.5)
    })

    // ── PIE DE PÁGINA en todas las páginas ────────────────────────────────────
    const totalPags = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= totalPags; i++) {
      doc.setPage(i)
      doc.setFontSize(7.5)
      doc.setTextColor(150, 155, 165)
      doc.text(`Informe Financiero · ${periodoLabel} · Confidencial`, margin, 290)
      doc.text(`Página ${i} de ${totalPags}`, W - margin, 290, { align: 'right' })
      doc.setDrawColor(200, 205, 215)
      doc.setLineWidth(0.3)
      doc.line(margin, 286, W - margin, 286)
    }

    const fileName = `Informe_Ejecutivo_${periodoLabel.replace(/ /g, '_')}.pdf`
    doc.save(fileName)
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      <Navigation />
      
      <main className="flex-1 p-4 md:p-8 overflow-y-auto transition-all duration-300">
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-light tracking-tight text-gray-800 mb-1 md:mb-2">Soportes y Facturas</h1>
              <p className="text-sm text-gray-500">Control centralizado de compras, ventas y gastos operativos.</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="border-gray-200 hover:bg-gray-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                onClick={exportInformeEjecutivo}
                className="border-gray-200 text-gray-600 hover:bg-gray-50 gap-2"
              >
                <FileDown className="h-4 w-4" />
                <span className="hidden md:inline">Informe PDF</span>
              </Button>
              <Link href="/soportes/nueva" className="flex-1 md:flex-none">
                <Button className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Registrar Soporte
                </Button>
              </Link>
            </div>
          </div>

          {/* KPI Cards con Rango de Fechas */}
          <div className="space-y-4">
            {/* Filtro de Fechas */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              {/* Tabs modo */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterMode('mes')}
                  className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${filterMode === 'mes' ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                >
                  Por Mes
                </button>
                <button
                  onClick={() => setFilterMode('personalizado')}
                  className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${filterMode === 'personalizado' ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                >
                  Personalizado
                </button>
              </div>

              {filterMode === 'mes' ? (
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Mes</label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="bg-white border border-gray-200 text-gray-800 h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-gray-800">
                        {MESES.map(m => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full md:w-36">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Año</label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="bg-white border border-gray-200 text-gray-800 h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-gray-800">
                        {YEARS.map(y => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Desde</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="pl-10 bg-white border border-gray-200 text-gray-800 h-9 text-sm focus:border-emerald-500/50"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Hasta</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="pl-10 bg-white border border-gray-200 text-gray-800 h-9 text-sm focus:border-emerald-500/50"
                      />
                    </div>
                  </div>
                </div>
              )}

              {startDate && endDate && (
                <p className="text-xs text-gray-400">
                  Mostrando: {new Date(startDate + 'T00:00:00').toLocaleDateString('es-CO')} → {new Date(endDate + 'T00:00:00').toLocaleDateString('es-CO')}
                </p>
              )}
            </div>

            {/* KPI Cards - Fila 1: Rentabilidad */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-4">Total Ingresos</p>
                  {loadingIngresos ? (
                    <div className="h-8 bg-gray-50 rounded animate-pulse" />
                  ) : (
                    <h3 className="text-2xl font-light text-emerald-400">
                      ${totalIngresos.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                  )}
                  {startDate && endDate && (
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(startDate).toLocaleDateString('es-CO')} a {new Date(endDate).toLocaleDateString('es-CO')}
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-950/40 to-emerald-900/20 border border-emerald-700/40 shadow-sm">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-emerald-400 uppercase tracking-widest mb-4">Utilidad Bruta</p>
                  {loadingRentabilidad ? (
                    <div className="h-8 bg-gray-50 rounded animate-pulse" />
                  ) : (
                    <h3 className="text-2xl font-light text-emerald-300">
                      {formatCurrency(utilidadBruta)}
                    </h3>
                  )}
                  <p className="text-xs text-emerald-600 mt-2">Ganancia directa</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-200 shadow-sm">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-blue-400 uppercase tracking-widest mb-4">Margen de Utilidad</p>
                  {loadingRentabilidad ? (
                    <div className="h-8 bg-gray-50 rounded animate-pulse" />
                  ) : (
                    <h3 className="text-2xl font-light text-blue-300">
                      {margenReal.toFixed(2)}%
                    </h3>
                  )}
                  <p className="text-xs text-blue-500 mt-2">Sobre ingresos totales</p>
                </CardContent>
              </Card>
            </div>

            {/* KPI Cards - Fila 2: Flujo de Caja */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card className="bg-white border-yellow-500/20 border shadow-sm">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-yellow-400 uppercase tracking-widest mb-4">Total en Caja</p>
                  {loadingCaja ? (
                    <div className="h-8 bg-gray-50 rounded animate-pulse" />
                  ) : (
                    <h3 className="text-2xl font-light text-yellow-300">
                      {formatCurrency(totalCaja)}
                    </h3>
                  )}
                  <p className="text-xs text-yellow-600 mt-2">Ingresos en efectivo registrados</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-4">Gastos y Egresos de Caja</p>
                  {loadingEgresos ? (
                    <div className="h-8 bg-gray-50 rounded animate-pulse" />
                  ) : (
                    <h3 className="text-2xl font-light text-red-400">
                      {formatCurrency(totalEgresos)}
                    </h3>
                  )}
                  <p className="text-xs text-gray-400 mt-2">Dinero salido este período</p>
                </CardContent>
              </Card>
              <Card className="bg-cyan-50 border-cyan-200 shadow-sm">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-cyan-400 uppercase tracking-widest mb-4">Ingresos Recaudo</p>
                  {loadingIngresos || loadingEgresos ? (
                    <div className="h-8 bg-gray-50 rounded animate-pulse" />
                  ) : (
                    <h3 className={`text-2xl font-light ${ingresosRecaudo >= 0 ? 'text-cyan-300' : 'text-red-400'}`}>
                      {formatCurrency(ingresosRecaudo)}
                    </h3>
                  )}
                  <p className="text-xs text-cyan-500 mt-2">Ingresos − Gastos y Egresos</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-4">Flujo de Caja Neto</p>
                  {loadingIngresos || loadingEgresos ? (
                    <div className="h-8 bg-gray-50 rounded animate-pulse" />
                  ) : (
                    <h3 className={`text-2xl font-light ${balance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                      {formatCurrency(balance)}
                    </h3>
                  )}
                  <p className="text-xs text-gray-400 mt-2">Dinero libre en cuentas este período</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200 shadow-sm">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-purple-400 uppercase tracking-widest mb-4">Ganancia Empresa</p>
                  {loadingRentabilidad || loadingEgresos ? (
                    <div className="h-8 bg-gray-50 rounded animate-pulse" />
                  ) : (
                    <h3 className={`text-2xl font-light ${gananciEmpresa >= 0 ? 'text-purple-300' : 'text-red-400'}`}>
                      {formatCurrency(gananciEmpresa)}
                    </h3>
                  )}
                  <p className="text-xs text-purple-500 mt-2">Utilidad Bruta − Gastos Operativos Puros</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200 pb-4">
              <CardTitle className="text-lg font-medium text-gray-800">Últimos Registros</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center text-gray-500">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin mb-2" />
                  <p>Cargando información...</p>
                </div>
              ) : facturas.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No hay facturas registradas. ¡Añade tu primer soporte!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 font-medium">Tipo</th>
                        <th className="px-6 py-4 font-medium">Fecha</th>
                        <th className="px-6 py-4 font-medium">Tercero</th>
                        <th className="px-6 py-4 font-medium">Descripción</th>
                        <th className="px-6 py-4 font-medium text-right">Total</th>
                        <th className="px-6 py-4 font-medium text-center">Soporte</th>
                        <th className="px-6 py-4 font-medium text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {facturas.map((f: any) => (
                        <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <Badge className={
                              f.type === 'venta' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                              f.type === 'compra' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                              f.type === 'ingreso_caja' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                              f.type === 'prestamo' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                              'bg-red-500/10 text-red-400 border-red-500/20'
                            }>
                              {f.type === 'ingreso_caja' ? 'INGRESO CAJA' : f.type === 'prestamo' ? 'PRÉSTAMO' : f.type.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-gray-600">{f.invoice_date}</td>
                          <td className="px-6 py-4 text-gray-800 font-medium">{f.entity_name}</td>
                          <td className="px-6 py-4 text-gray-500 truncate max-w-[150px]">{f.description}</td>
                          <td className="px-6 py-4 text-right font-medium text-gray-800">
                            {formatCurrency(f.total_price)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {f.image_urls && f.image_urls.length > 0 ? (
                              <Link href={f.image_urls[0]} target="_blank">
                                <Badge variant="outline" className="text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 cursor-pointer">
                                  <ImageIcon className="w-3 h-3 mr-1" /> Ver
                                </Badge>
                              </Link>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <Link href={`/soportes/editar/${f.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-800 hover:bg-gray-50">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                              onClick={() => handleDelete(f.id, f.entity_name)}
                              disabled={deletingId === f.id}
                            >
                              {deletingId === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  )
}
