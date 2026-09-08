"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import type { Stock, Product, Vendor, Category } from "@/types/domain"
import { StocksRepository } from "@/lib/repositories/stocksRepository"
import { ProductsRepository } from "@/lib/repositories/productsRepository"
import { VendorsRepository } from "@/lib/repositories/vendorsRepository"
import { CategoriesRepository } from "@/lib/repositories/categoriesRepository"
import { Plus, Edit, Trash2, Package, AlertTriangle, Search, X, RefreshCcw, Tag, Factory, TrendingUp, Info, DollarSign, FileDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export default function StockPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stocks, setStocks] = useState<Stock[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingStock, setEditingStock] = useState<Stock | null>(null)

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [mainSearchTerm, setMainSearchTerm] = useState("")
  const [mainSelectedCategory, setMainSelectedCategory] = useState("all")

  const { toast } = useToast()

  const [formData, setFormData] = useState({
    productId: "",
    vendorId: "",
    buyingPrice: "",
    sellingPrice: "",
    discount: "0",
    stockQuantity: "",
    currentQuantity: "",
    addQuantity: "0",
    note: "",
  })

  const stocksRepository = new StocksRepository(supabase)
  const productsRepository = new ProductsRepository(supabase)
  const vendorsRepository = new VendorsRepository(supabase)
  const categoriesRepository = new CategoriesRepository(supabase)

  useEffect(() => {
    const init = async () => {
      try {
        const [s, p, v, c] = await Promise.all([
          stocksRepository.listWithRelations(),
          productsRepository.list(),
          vendorsRepository.list(),
          categoriesRepository.listActive()
        ])
        setStocks(s)
        setProducts(p)
        setVendors(v)
        setCategories(c)
      } catch (error) {
        console.error(error)
        toast({ title: "Error", description: "No se pudieron cargar los datos", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const fetchStocks = async () => {
    setLoading(true)
    try {
      const stocksData = await stocksRepository.listWithRelations()
      setStocks(stocksData)
    } finally {
      setLoading(false)
    }
  }

  const generateProductCode = () => `STOCK-${Date.now().toString().slice(-8)}`
  const generateChalanNo = () => `CH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-4)}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.productId || !formData.buyingPrice || !formData.sellingPrice || !formData.stockQuantity) {
      return toast({ title: "Error", description: "Completa los campos obligatorios", variant: "destructive" })
    }

    try {
      const selectedProduct = products.find((p) => p.id === Number.parseInt(formData.productId))
      const parsedStockQuantity = Number.parseInt(formData.stockQuantity)
      const parsedCurrentQuantity = Number.parseInt(formData.currentQuantity || formData.stockQuantity)
      
      if (isNaN(parsedStockQuantity) || isNaN(parsedCurrentQuantity)) {
        throw new Error("Las cantidades deben ser números válidos")
      }

      const added = Number.parseInt(formData.addQuantity) || 0
      const stockData = {
        categoryId: selectedProduct?.categoryId || null,
        productCode: editingStock?.productCode || generateProductCode(),
        productId: Number.parseInt(formData.productId),
        vendorId: formData.vendorId && formData.vendorId !== "0" ? Number.parseInt(formData.vendorId) : null,
        chalanNo: editingStock?.chalanNo || generateChalanNo(),
        buyingPrice: Number.parseFloat(formData.buyingPrice) || 0,
        sellingPrice: Number.parseFloat(formData.sellingPrice) || 0,
        discount: Number.parseFloat(formData.discount) || 0,
        stockQuantity: parsedStockQuantity + (editingStock ? added : 0),
        currentQuantity: parsedCurrentQuantity + (editingStock ? added : 0),
        note: formData.note,
        status: 1,
      }

      if (editingStock) {
        await stocksRepository.update(editingStock.id, stockData as any)
      } else {
        await stocksRepository.create(stockData as any)
      }
      toast({ title: "Éxito", description: "Registro guardado correctamente" })
      setIsDialogOpen(false)
      resetForm()
      fetchStocks()
    } catch (e: any) {
      console.error("Error saving stock:", e)
      toast({ 
        title: "Error", 
        description: e.message || "No se pudo guardar el stock", 
        variant: "destructive" 
      })
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de eliminar este lote de stock?")) {
      try {
        await stocksRepository.remove(id)
        toast({ title: "Eliminado", description: "El stock ha sido removido" })
        fetchStocks()
      } catch (e) {
        toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" })
      }
    }
  }

  const resetForm = () => {
    setFormData({
      productId: "",
      vendorId: "",
      buyingPrice: "",
      sellingPrice: "",
      discount: "0",
      stockQuantity: "",
      currentQuantity: "",
      addQuantity: "0",
      note: "",
    })
    setEditingStock(null)
  }

  const openEditDialog = (stock: Stock) => {
    setEditingStock(stock)
    setFormData({
      productId: stock.productId?.toString() || "",
      vendorId: stock.vendorId?.toString() || "",
      buyingPrice: stock.buyingPrice.toString(),
      sellingPrice: stock.sellingPrice.toString(),
      discount: stock.discount.toString(),
      stockQuantity: stock.stockQuantity.toString(),
      currentQuantity: stock.currentQuantity.toString(),
      addQuantity: "0",
      note: stock.note || "",
    })
    setIsDialogOpen(true)
  }

  const downloadExcelReport = async () => {
    try {
      const XLSX = await import("xlsx-js-style")
      // Build rows using the original column names expected by the user
      const rows = filteredStocks.map(stock => ({
        'Referencia (Codigo)': stock.productCode || '',
        'Producto': stock.products?.productName || 'N/A',
        'Categoria': stock.categories?.name || 'N/A',
        'Cantidad Inicial': stock.stockQuantity ?? 0,
        'Stock Actual': stock.currentQuantity ?? 0,
        'Estado': (() => {
          const cur = stock.currentQuantity ?? 0;
          const init = stock.stockQuantity ?? 0;
          if (cur >= init) return 'COMPLETO (SIN VENTAS)';
          if (cur < 10) return 'ALERTA: STOCK BAJO';
          if (cur < 20) return 'STOCK MEDIO';
          return 'NORMAL';
        })(),
        'Cantidad a Pedir': ''
      }));

      // Header order matching the original layout
      const header = [
        'Referencia (Codigo)',
        'Producto',
        'Categoria',
        'Cantidad Inicial',
        'Stock Actual',
        'Estado',
        'Cantidad a Pedir'
      ];

      const ws = XLSX.utils.json_to_sheet(rows, { header });

      // Style the header row (bold, dark background, white text)
      header.forEach((h, i) => {
        const addr = XLSX.utils.encode_cell({ c: i, r: 0 });
        if (!ws[addr]) return;
        ws[addr].s = {
          font: { bold: true, color: { rgb: 'FFFFFFFF' } },
          fill: { fgColor: { rgb: 'FF2C3E50' } },
          alignment: { vertical: 'center', horizontal: 'center' }
        };
      });

      // Auto‑size columns based on longest content
      const colWidths = header.map(h => ({ wch: h.length + 5 }));
      rows.forEach(row => {
        header.forEach((h, i) => {
          const val = row[h as keyof typeof row];
          const len = (val?.toString().length ?? 0) + 2;
          if (len > colWidths[i].wch) colWidths[i].wch = len;
        });
      });
      ws['!cols'] = colWidths;

      // Conditional cell background for "Stock Actual" column (E)
      const stockColIdx = header.indexOf('Stock Actual');
      rows.forEach((_row, rowIdx) => {
        const cellAddr = XLSX.utils.encode_cell({ c: stockColIdx, r: rowIdx + 1 });
        const cell = ws[cellAddr];
        if (!cell) return;
        const cur = Number(cell.v);
        const init = Number(_row['Cantidad Inicial']);
        let fillColor = 'FF28A745'; // green default
        if (cur >= init) fillColor = 'FF0000FF'; // blue when never sold (full stock)
        else if (cur < 10) fillColor = 'FFFF0000'; // red low stock
        else if (cur < 20) fillColor = 'FFFFFF00'; // yellow medium stock
        cell.s = { fill: { fgColor: { rgb: fillColor } }, alignment: { vertical: 'center', horizontal: 'center' } };
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Pedidos Proveedor');
      XLSX.writeFile(wb, `reporte_pedido_proveedor_${new Date().toISOString().slice(0, 10)}.xlsx`);

      toast({ title: 'Éxito', description: 'Reporte de pedido XLSX descargado correctamente' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'No se pudo generar el reporte en formato Excel XLSX', variant: 'destructive' });
    }
  };

  const filteredStocks = stocks.filter((stock) => {
    const matchesSearch = (stock.products?.productName || "").toLowerCase().includes(mainSearchTerm.toLowerCase()) ||
      (stock.productCode || "").toLowerCase().includes(mainSearchTerm.toLowerCase())
    const matchesCategory = mainSelectedCategory === "all" || stock.categoryId?.toString() === mainSelectedCategory
    return matchesSearch && matchesCategory
  })

  // Modal product filter
  const modalFilteredProducts = products.filter(p =>
    (!searchTerm || p.productName.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!selectedCategory || selectedCategory === "all" || p.categoryId?.toString() === selectedCategory)
  )

  if (loading && stocks.length === 0) return (
    <div className="flex bg-background min-h-screen">
      <Navigation />
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCcw className="w-10 h-10 text-primary animate-spin" />
          <p className="text-gray-500">Sincronizando Inventario...</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Navigation />

      <main className="flex-1 p-4 md:p-8 transition-all duration-300 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pt-16 md:pt-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Gestión de Stock
            </h1>
            <p className="text-gray-500 mt-1">Control de lotes, precios y existencias disponibles</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={fetchStocks}
              className="w-full md:w-auto justify-center bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button
              variant="outline"
              onClick={downloadExcelReport}
              className="w-full md:w-auto justify-center border-green-500/30 text-green-600 hover:text-green-700 hover:bg-green-50 h-10 gap-2"
            >
              <FileDown className="w-4 h-4" />
              Reporte Pedido
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="w-full md:w-auto bg-primary hover:bg-primary/90 text-gray-800 shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Stock
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-gray-200 text-gray-800 max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    {editingStock ? "Actualizar Lote" : "Nueva Entrada de Stock"}
                  </DialogTitle>
                  <DialogDescription className="text-gray-500">
                    Registra el ingreso de productos con sus costos y precios de venta.
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="search" className="mt-4">
                  <TabsList className="grid w-full grid-cols-2 bg-gray-50 border border-gray-200 p-1 mb-6 h-auto">
                    <TabsTrigger value="search" className="data-[state=active]:bg-primary text-xs sm:text-sm py-2">1. Buscar Producto</TabsTrigger>
                    <TabsTrigger value="form" className="data-[state=active]:bg-primary text-xs sm:text-sm py-2">2. Detalles del Lote</TabsTrigger>
                  </TabsList>

                  <TabsContent value="search" className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                          placeholder="Filtrar productos por nombre..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 bg-gray-50 border-gray-200 focus:ring-primary/50"
                        />
                      </div>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-full sm:w-[200px] bg-gray-50 border-gray-200">
                          <SelectValue placeholder="Categoría" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 text-gray-800">
                          <SelectItem value="all">Todas</SelectItem>
                          {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                      {modalFilteredProducts.map(p => (
                        <div
                          key={p.id}
                          onClick={() => setFormData({
                            ...formData,
                            productId: p.id.toString(),
                            vendorId: p.vendorId ? p.vendorId.toString() : "0"
                          })}
                          className={cn(
                            "p-4 rounded-xl border cursor-pointer transition-all",
                            formData.productId === p.id.toString()
                              ? "bg-primary/20 border-primary shadow-lg shadow-primary/10"
                              : "bg-gray-50 border-gray-100 hover:border-gray-300 hover:bg-gray-100"
                          )}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <Package className={cn("w-5 h-5", formData.productId === p.id.toString() ? "text-primary" : "text-gray-500")} />
                              <span className="font-medium text-sm">{p.productName}</span>
                            </div>
                            {formData.productId === p.id.toString() && <Badge className="bg-primary">Seleccionado</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="form" className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <Label className="text-gray-500">Proveedor</Label>
                        <Select value={formData.vendorId} onValueChange={(v) => setFormData({ ...formData, vendorId: v })}>
                          <SelectTrigger className="bg-gray-50 border-gray-200">
                            <SelectValue placeholder="Seleccionar proveedor" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200 text-gray-800">
                            <SelectItem value="0">Sin proveedor</SelectItem>
                            {vendors.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-500">{editingStock ? "Cantidad Inicial (Histórico)" : "Cantidad Inicial"}</Label>
                        <Input
                          type="number"
                          value={formData.stockQuantity}
                          disabled={!!editingStock}
                          onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value, currentQuantity: e.target.value })}
                          className={cn("bg-gray-50 border-gray-200", editingStock && "opacity-50 cursor-not-allowed")}
                        />
                      </div>
                      {editingStock && (
                        <div className="space-y-2">
                          <Label className="text-primary font-bold">Agregar Nueva Cantidad</Label>
                          <div className="flex gap-2 items-center">
                            <Plus className="w-4 h-4 text-primary" />
                            <Input
                              type="number"
                              placeholder="0"
                              value={formData.addQuantity}
                              onChange={(e) => setFormData({ ...formData, addQuantity: e.target.value })}
                              className="bg-primary/10 border-primary/30 focus:border-primary text-primary font-bold text-lg"
                            />
                          </div>
                          <p className="text-[10px] text-primary/60 italic">Esto se sumará a las existencias actuales.</p>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label className="text-gray-500">Precio de Compra</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.buyingPrice}
                            onChange={(e) => {
                              const buyingPrice = e.target.value
                              // Auto-calculate selling price with 13% markup
                              const sellingPrice = buyingPrice 
                                ? (Number.parseFloat(buyingPrice) * 1.13).toFixed(2)
                                : ""
                              setFormData({ ...formData, buyingPrice, sellingPrice })
                            }}
                            className="pl-9 bg-gray-50 border-gray-200"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-500">Precio de Venta (Auto +13%)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.sellingPrice}
                            onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                            className="pl-9 bg-gray-50 border-gray-200 text-green-400 font-bold"
                            placeholder="0.00"
                          />
                        </div>
                        <p className="text-[10px] text-green-600/60">Se calcula automáticamente al cambiar precio de compra</p>
                      </div>
                      <div className="col-span-1 sm:col-span-2 space-y-2">
                        <Label className="text-gray-500">Notas Adicionales</Label>
                        <Textarea
                          value={formData.note}
                          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                          className="bg-gray-50 border-gray-200"
                        />
                      </div>
                    </div>
                    <DialogFooter className="mt-8">
                      <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-gray-500 hover:text-gray-800">Cancelar</Button>
                      <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90 min-w-[150px]">Guardar Stock</Button>
                    </DialogFooter>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Global Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8 bg-white !p-4 border border-gray-200">
          <div className="md:col-span-7 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por lote o producto..."
              value={mainSearchTerm}
              onChange={(e) => setMainSearchTerm(e.target.value)}
              className="pl-10 bg-gray-50 border-gray-200 text-gray-800 focus:ring-primary/50"
            />
          </div>
          <div className="md:col-span-5">
            <Select value={mainSelectedCategory} onValueChange={setMainSelectedCategory}>
              <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-600">
                <SelectValue placeholder="Filtrar por categoría" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 text-gray-800">
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stock List Grid */}
        <div className="grid gap-6 pb-32">
          <AnimatePresence>
            {filteredStocks.map((stock) => (
              <motion.div
                key={stock.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group"
              >
                <Card className="bg-white border-gray-100 hover:border-primary/40 transition-all overflow-hidden">
                  <CardContent className="p-0">
                    {/* ── HEADER INFO ── */}
                    <div className="p-4 md:p-5">
                      {/* Encabezado: sólo nombre y badges. Botones van abajo */}
                      <div className="flex items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-1">
                            <Package className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <h3 className="font-bold text-sm md:text-base text-gray-800 break-words leading-tight">
                              {stock.products?.productName}
                            </h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="border-gray-200 text-gray-500 text-[9px] h-5 font-mono">
                              #{stock.productCode}
                            </Badge>
                            <Badge variant={stock.currentQuantity < 10 ? "destructive" : "secondary"} className="text-[9px] h-5">
                              {stock.currentQuantity < 10 ? "BAJO" : "EN REGLA"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Categoría */}
                      <div className="mb-2">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500">Categoría</span>
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-0.5">
                          <Tag className="w-3 h-3 text-primary shrink-0" />
                          <span>{stock.categories?.name || "Sin categoría"}</span>
                        </div>
                      </div>

                      {/* Proveedor + Fecha en la misma fila */}
                      <div className="flex gap-6">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-gray-500">Proveedor</span>
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-0.5">
                            <Factory className="w-3 h-3 text-gray-500 shrink-0" />
                            <span className="truncate max-w-[120px]">{stock.vendors?.name || "Indirecto"}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-gray-500">Fecha</span>
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-0.5">
                            <Info className="w-3 h-3 text-gray-500 shrink-0" />
                            <span>{new Date(stock.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* ── PRICING + ACTIONS PANEL ── */}
                    <div className="border-t border-gray-100 bg-white/[0.02] px-4 py-3">
                      {/* Grid de precios */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                          <span className="text-[10px] text-gray-500 block">Costo</span>
                          <span className="text-gray-700 font-semibold text-sm mt-0.5 block">${stock.buyingPrice.toLocaleString()}</span>
                        </div>
                        <div className="bg-green-500/10 rounded-lg p-2.5 border border-green-500/20">
                          <span className="text-[10px] text-green-700/70 block">Venta</span>
                          <span className="text-green-600 font-bold text-sm mt-0.5 block">${stock.sellingPrice.toLocaleString()}</span>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                          <span className="text-[10px] text-gray-500 block">Existencias</span>
                          <div className="mt-0.5">
                            <span className={cn("font-black text-base leading-none", stock.currentQuantity < 10 ? "text-red-500" : "text-gray-800")}>
                              {stock.currentQuantity}
                            </span>
                            <span className="text-gray-600 text-[10px] ml-1">/ {stock.stockQuantity}</span>
                            <div className="h-1 w-full bg-gray-50 rounded-full overflow-hidden mt-1.5">
                              <div
                                className={cn("h-full rounded-full transition-all duration-700", stock.currentQuantity < 10 ? "bg-red-500" : "bg-primary")}
                                style={{ width: `${Math.min(100, (stock.currentQuantity / stock.stockQuantity) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="bg-primary/10 rounded-lg p-2.5 border border-primary/20">
                          <span className="text-[10px] text-primary/70 block">Valor Total</span>
                          <span className="text-primary font-bold text-sm mt-0.5 block">${(stock.sellingPrice * stock.currentQuantity).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(stock)}
                          className="w-full flex items-center justify-center gap-2 border-gray-200 text-gray-600 hover:text-gray-800 hover:bg-gray-100 h-9"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(stock.id)}
                          className="w-full flex items-center justify-center gap-2 border-red-500/20 text-red-600 hover:text-red-700 hover:bg-red-50 h-9"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredStocks.length === 0 && (
            <div className="py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
                <Search className="w-10 h-10 text-gray-600" />
              </div>
              <p className="text-gray-500">No hay lotes que coincidan con los filtros</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
