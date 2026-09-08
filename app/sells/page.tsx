"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import type { Sell, Customer, Stock, SellDetail } from "@/types/domain"
import { SellsRepository } from "@/lib/repositories/sellsRepository"
import { CustomersRepository } from "@/lib/repositories/customersRepository"
import { StocksRepository } from "@/lib/repositories/stocksRepository"
import { CategoriesRepository } from "@/lib/repositories/categoriesRepository"
import { Plus, Trash2, Search, Package, UserPlus, CreditCard, Banknote, ArrowRight, Minus, ShoppingCart, RefreshCcw, ChevronDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

// --- TYPES ---
interface SellItem {
  stockId: string
  productName: string
  productCode: string
  quantity: number
  price: number // Unit Price
  unit: string // U.M. (Unidad de Medida)
  discountPercent: number // % Descuento
  total: number // Valor Total con Descuento
  availableStock: number
}

// --- CONSTANTS ---
const PAYMENT_METHODS = [
  { id: "0", name: "Efectivo", icon: Banknote },
  { id: "1", name: "Tarjeta", icon: CreditCard },
  { id: "2", name: "Transferencia", icon: RefreshCcw },
]

export default function SellsPage() {
  const router = useRouter()
  const { toast } = useToast()

  // Data State
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  // Resources
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [categories, setCategories] = useState<any[]>([])

  // Search & Filter State
  const [productSearchTerm, setProductSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  // Mobile Tab State
  const [activeTab, setActiveTab] = useState<'products' | 'cart'>('products')

  // Cart & Form State
  const [selectedItems, setSelectedItems] = useState<SellItem[]>([])
  const [formData, setFormData] = useState({
    customerId: "",
    sellDate: new Date().toISOString().split("T")[0],
    paymentMethod: "0",
  })
  const [documentType, setDocumentType] = useState<"factura" | "cotizacion">("factura")
  const [globalDiscount, setGlobalDiscount] = useState<string>("")
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true)

  // Modals
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false)
  const [newCustomerForm, setNewCustomerForm] = useState({
    customerName: "",
    cedula: "",
    email: "",
    phone: "",
    address: "",
  })

  // Repositories
  const sellsRepository = new SellsRepository(supabase)
  const customersRepository = new CustomersRepository(supabase)
  const stocksRepository = new StocksRepository(supabase)
  const categoriesRepository = new CategoriesRepository(supabase)

  // --- INITIALIZATION ---
  useEffect(() => {
    let mounted = true
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (mounted) {
        setSession(user)
        if (!user) router.replace('/login')
      }
    }
    init()

    const loadData = async () => {
      try {
        const [c, s, cat] = await Promise.all([
          customersRepository.listActive(),
          stocksRepository.listWithRelations(),
          categoriesRepository.listActive()
        ])
        if (mounted) {
          setCustomers(c)
          setStocks(s.filter((item) => (item.currentQuantity ?? 0) > 0 && item.status === 1))
          setCategories(cat)
          setLoading(false)
        }
      } catch (err) {
        console.error("Error loading data:", err)
        toast({ title: "Error", description: "Error cargando datos del sistema", variant: "destructive" })
      }
    }
    loadData()

    return () => { mounted = false }
  }, [router])

  // --- CART ACTIONS ---
  const calculateItemTotal = (price: number, qty: number, discountPercent: number) => {
    const sub = price * qty
    const discount = sub * (discountPercent / 100)
    return sub - discount
  }

  const addProductToCart = (stock: Stock) => {
    const activeDiscount = parseFloat(globalDiscount) || 0
    const existingIndex = selectedItems.findIndex(item => item.stockId === stock.id.toString())

    if (existingIndex >= 0) {
      const newItems = [...selectedItems]
      const currentItem = newItems[existingIndex]

      if (currentItem.quantity + 1 > currentItem.availableStock) {
        toast({ title: "Stock Máximo", description: "No hay más unidades disponibles", variant: "destructive" })
        return
      }

      currentItem.quantity += 1
      currentItem.total = calculateItemTotal(currentItem.price, currentItem.quantity, currentItem.discountPercent)
      setSelectedItems(newItems)
    } else {
      const newItem: SellItem = {
        stockId: stock.id.toString(),
        productName: stock.products?.productName || "Producto",
        productCode: stock.productCode || "REF",
        quantity: 1,
        price: stock.sellingPrice,
        unit: "UNID",
        discountPercent: activeDiscount,
        total: calculateItemTotal(stock.sellingPrice, 1, activeDiscount),
        availableStock: stock.currentQuantity,
      }
      setSelectedItems([...selectedItems, newItem])
    }
  }

  const updateQuantity = (index: number, delta: number) => {
    const newItems = [...selectedItems]
    const item = newItems[index]
    const newQty = item.quantity + delta

    if (newQty <= 0) {
      removeItem(index)
      return
    }

    if (newQty > item.availableStock) {
      toast({ title: "Stock insuficiente", description: `Solo hay ${item.availableStock} disponibles`, variant: "destructive" })
      return
    }

    item.quantity = newQty
    item.total = calculateItemTotal(item.price, item.quantity, item.discountPercent)
    setSelectedItems(newItems)
  }

  const updateDiscount = (index: number, newDiscount: number) => {
    const newItems = [...selectedItems]
    const item = newItems[index]

    // Validate discount range (0-100)
    const validDiscount = Math.max(0, Math.min(100, newDiscount))

    item.discountPercent = validDiscount
    item.total = calculateItemTotal(item.price, item.quantity, validDiscount)
    setSelectedItems(newItems)
  }

  const removeItem = (index: number) => {
    const newItems = selectedItems.filter((_, i) => i !== index)
    setSelectedItems(newItems)
  }

  const clearCart = () => {
    setSelectedItems([])
    setFormData(prev => ({ ...prev, customerId: "" }))
    setGlobalDiscount("")
  }

  // --- CALCULATIONS ---
  const subtotal = selectedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  const totalDiscount = selectedItems.reduce((acc, item) => {
    const sub = item.price * item.quantity
    const discount = sub * (item.discountPercent / 100)
    return acc + discount
  }, 0)
  const subtotalAfterDiscount = subtotal - totalDiscount
  const total = subtotalAfterDiscount
  const globalDiscountPercent = parseFloat(globalDiscount) || 0

  // --- CHECKOUT LOGIC ---
  const handleCheckout = async () => {
    if (selectedItems.length === 0) return toast({ title: "Carrito vacío", description: "Agrega productos antes de cobrar", variant: "destructive" })
    if (!formData.customerId) return toast({ title: "Cliente requerido", description: "Selecciona un cliente para la factura", variant: "destructive" })

    setProcessing(true)
    try {
      // 1. Create Sell
      const sellData = {
        customerId: Number.parseInt(formData.customerId),
        branchId: 1,
        totalAmount: total,
        paidAmount: total,
        sellDate: formData.sellDate,
        discountAmount: totalDiscount,
        paymentMethod: Number.parseInt(formData.paymentMethod),
        paymentStatus: documentType === "factura" ? 1 : 0,
      }

      const sell = await sellsRepository.create(sellData as any)

      // 2. Create Details & Update Stock (Only if it's a real sale/factura)
      for (const item of selectedItems) {
        const stock = stocks.find((s) => s.id.toString() === item.stockId)
        if (!stock) continue

        const itemDiscountAmount = item.price * item.quantity - item.total

        await sellsRepository.createDetail({
          stockId: Number(item.stockId),
          sellId: sell.id,
          productId: stock.productId,
          soldQuantity: item.quantity,
          buyPrice: stock.buyingPrice,
          soldPrice: item.price,
          totalBuyPrice: stock.buyingPrice * item.quantity,
          totalSoldPrice: item.total,
          discount: item.discountPercent,
          discountType: 2,
          discountAmount: itemDiscountAmount,
        } as any)

        // ONLY UPDATE STOCK IF IT'S A PAID INVOICE
        if (documentType === "factura") {
          const newQty = stock.currentQuantity - item.quantity
          await stocksRepository.update(stock.id, { currentQuantity: newQty } as any)
        }
      }

      // 2. Register sale details
      const customerName = customers.find((c) => c.id.toString() === formData.customerId)?.customerName
      const pMethodName = PAYMENT_METHODS.find((m) => m.id === formData.paymentMethod)?.name

      toast({
        title: documentType === "factura" ? "¡Venta Exitosa!" : "¡Cotización Generada!",
        description: `${documentType === "factura" ? "Factura" : "Cotización"} #${sell.id} guardada.`,
      })
      clearCart()

      // Refresh stocks
      const updatedStocks = await stocksRepository.listWithRelations()
      setStocks(updatedStocks.filter(s => (s.currentQuantity ?? 0) > 0 && s.status === 1))

    } catch (error) {
      console.error(error)
      toast({ title: "Error en la venta", description: "No se pudo procesar la transacción", variant: "destructive" })
    } finally {
      setProcessing(false)
    }
  }

  // --- NEW CUSTOMER ---
  const handleCreateCustomer = async () => {
    if (!newCustomerForm.customerName) return
    try {
      const newC = await customersRepository.create({
        ...newCustomerForm,
        status: 1
      } as any)
      setCustomers(prev => [...prev, newC])
      setFormData(prev => ({ ...prev, customerId: newC.id.toString() }))
      setIsNewCustomerOpen(false)
      setNewCustomerForm({ customerName: "", cedula: "", email: "", phone: "", address: "" })
      toast({ title: "Cliente Creado", description: `${newC.customerName} agregado.` })
    } catch (e) {
      toast({ title: "Error", description: "No se pudo crear el cliente", variant: "destructive" })
    }
  }

  // --- FILTERED STOCKS ---
  const filteredStocks = stocks.filter(stock => {
    const matchSearch = stock.products?.productName.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      stock.productCode?.toLowerCase().includes(productSearchTerm.toLowerCase())
    const matchCat = selectedCategory === "all" || stock.categoryId?.toString() === selectedCategory
    return matchSearch && matchCat
  })

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      <Navigation />

      <main className="flex-1 flex flex-col md:flex-row h-full transition-all duration-300 relative">

        {/* MOBILE TABS (Visible only on mobile) */}
        <div className="md:hidden flex h-14 border-b border-gray-200 bg-gray-50 z-20 shrink-0">
          <button
            onClick={() => setActiveTab('products')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 text-sm font-bold transition-colors",
              activeTab === 'products' ? "text-primary border-b-2 border-primary bg-gray-100" : "text-gray-500"
            )}
          >
            <Package className="w-4 h-4" /> Productos
          </button>
          <button
            onClick={() => setActiveTab('cart')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 text-sm font-bold transition-colors",
              activeTab === 'cart' ? "text-primary border-b-2 border-primary bg-gray-100" : "text-gray-500"
            )}
          >
            <ShoppingCart className="w-4 h-4" />
            Facturación
            {selectedItems.length > 0 && (
              <span className="bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full">{selectedItems.length}</span>
            )}
          </button>
        </div>

        {/* LEFT PANEL: PRODUCT CATALOG */}
        <div className={cn(
          "md:w-[55%] lg:w-[60%] flex flex-col p-4 md:p-6 gap-4 min-h-0 overflow-hidden border-r border-gray-200",
          "pt-4 md:pt-6",
          activeTab === 'cart' ? "hidden md:flex" : "flex"
        )}>
          {/* Header Area */}
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-800">Catálogo</h1>
              <p className="text-gray-500 text-xs">Busca y selecciona productos</p>
            </div>

            <div className="flex flex-col gap-2">
              {/* Search Bar */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
                <Input
                  placeholder="Buscar..."
                  className="pl-9 h-10 bg-gray-50 border-gray-200 focus-visible:ring-primary/50 text-gray-800 rounded-lg text-sm"
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                />
              </div>

              {/* Categories */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full h-10 bg-gray-50 border-gray-200 text-gray-800 rounded-lg text-sm">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-800">
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto scrollbar-thin pb-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {filteredStocks.map((stock) => (
                <motion.div
                  key={stock.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    addProductToCart(stock);
                    const { dismiss } = toast({
                      title: "✓ Producto agregado",
                      description: stock.products?.productName,
                      variant: "success" as any,
                    })
                    setTimeout(dismiss, 3000)
                  }}
                  className="cursor-pointer bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-primary/50 rounded-xl p-3 flex flex-col justify-between h-auto transition-all relative overflow-hidden group"
                >
                  <div className="mb-2">
                    <div className="flex justify-between items-start">
                      <Badge variant="outline" className="bg-gray-100 border-gray-200 text-gray-500 text-[10px]">
                        {stock.productCode}
                      </Badge>
                      <span className="text-[10px] text-gray-500">Stock: {stock.currentQuantity}</span>
                    </div>

                    <h3 className="font-bold text-gray-800 text-sm mt-1 leading-tight">{stock.products?.productName}</h3>
                  </div>

                  <div className="mt-auto flex justify-between items-center">
                    <div className="font-bold text-green-600 text-sm">
                      ${stock.sellingPrice.toLocaleString()}
                    </div>
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <Plus className="w-3 h-3" />
                    </div>
                  </div>
                </motion.div>
              ))}
              {filteredStocks.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center h-40 text-gray-500 text-sm">
                  <Package className="w-8 h-8 mb-2 opacity-20" />
                  <p>Sin resultados</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: BILLING TABLE */}
        <div className={cn(
          "flex-1 bg-gray-50 flex flex-col min-h-0 md:h-full relative z-10",
          activeTab === 'products' ? "hidden md:flex" : "flex"
        )}>

          {/* Customer Bar */}
          <div className="p-3 md:p-4 border-b border-gray-200 bg-white flex flex-col gap-3">
            {/* Row 1: Title + Clear button */}
            <div className="flex items-center justify-between">
              <h2 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                Facturación
              </h2>
              <Button variant="ghost" size="sm" onClick={clearCart} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 text-xs">
                <Trash2 className="w-3 h-3 mr-1" /> Limpiar
              </Button>
            </div>
            {/* Row 2: Client selector */}
            <div className="flex gap-2">
              <Select value={formData.customerId} onValueChange={(val) => setFormData({ ...formData, customerId: val })}>
                <SelectTrigger className="w-full bg-gray-50 border-gray-200 text-gray-800 h-9 text-sm">
                  <SelectValue placeholder="Seleccionar Cliente..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-800">
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.customerName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={isNewCustomerOpen} onOpenChange={setIsNewCustomerOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="outline" className="bg-gray-50 border-gray-200 hover:bg-primary h-9 w-9 text-gray-800 shrink-0">
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white border-gray-200 text-gray-800">
                  <DialogHeader>
                    <DialogTitle>Nuevo Cliente</DialogTitle>
                    <DialogDescription>Ingresa los datos básicos para facturación.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Nombre Completo</Label>
                      <Input
                        value={newCustomerForm.customerName}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, customerName: e.target.value })}
                        className="bg-gray-50 border-gray-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Teléfono / Celular</Label>
                      <Input
                        value={newCustomerForm.phone}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                        className="bg-gray-50 border-gray-200"
                      />
                    </div>
                    <Button onClick={handleCreateCustomer} className="w-full bg-primary hover:bg-primary/90">Guardar Cliente</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Table Area */}
          <div className="flex-1 overflow-auto bg-white p-3 md:p-4">

            {/* ===== MOBILE VIEW: Cards (hidden on md+) ===== */}
            <div className="flex flex-col gap-3 md:hidden">
              {selectedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500 opacity-50">
                  <ShoppingCart className="w-10 h-10 mb-2" />
                  <p className="text-sm">No hay productos en la factura</p>
                </div>
              ) : (
                selectedItems.map((item, index) => (
                  <div key={`mobile-${item.stockId}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-col gap-3">
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-800 font-bold text-sm leading-snug line-clamp-2">{item.productName}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{item.productCode} · {item.unit}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0 -mt-1 -mr-1" onClick={() => removeItem(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {/* Card Body: Qty + Price */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-gray-500 font-medium">Cantidad</span>
                        <div className="flex items-center gap-1.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7 border border-gray-200 rounded-md shrink-0" onClick={() => updateQuantity(index, -1)}><Minus className="w-3 h-3" /></Button>
                          <Input
                            type="number"
                            className="w-12 h-7 bg-gray-50 border-gray-200 text-center text-xs p-0"
                            value={item.quantity}
                            onChange={(e) => { const val = parseInt(e.target.value) || 0; updateQuantity(index, val - item.quantity) }}
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7 border border-gray-200 rounded-md shrink-0" onClick={() => updateQuantity(index, 1)}><Plus className="w-3 h-3" /></Button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-gray-500 font-medium">P. Unitario</span>
                        <span className="text-gray-700 font-semibold text-sm">${item.price.toLocaleString()}</span>
                      </div>
                    </div>
                    {/* Discount row */}
                    {item.discountPercent > 0 && (
                      <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                        <span className="text-xs text-gray-500">Descuento aplicado</span>
                        <span className="text-xs font-bold text-primary">{item.discountPercent}%</span>
                      </div>
                    )}
                    {/* Card Footer: Total */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <span className="text-gray-500 text-xs">Total</span>
                      <span className="text-green-600 font-bold text-base">${item.total.toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ===== DESKTOP VIEW: Table (hidden on mobile) ===== */}
            <div className="hidden md:block rounded-lg border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow className="hover:bg-transparent border-gray-200">
                    <TableHead className="text-gray-700 font-bold w-[100px]">Referencia</TableHead>
                    <TableHead className="text-gray-700 font-bold">Descripción</TableHead>
                    <TableHead className="text-gray-700 font-bold text-center w-[80px]">Cant.</TableHead>
                    <TableHead className="text-gray-700 font-bold text-center w-[60px]">U.M.</TableHead>
                    <TableHead className="text-gray-700 font-bold text-right">Precio Unitario</TableHead>
                    <TableHead className="text-gray-700 font-bold text-center w-[100px]">% Desc.</TableHead>
                    <TableHead className="text-gray-700 font-bold text-right">Valor Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedItems.map((item, index) => (
                    <TableRow key={`${item.stockId}-${index}`} className="hover:bg-gray-50 border-gray-200">
                      <TableCell className="font-medium text-gray-700">{item.productCode}</TableCell>
                      <TableCell className="text-gray-700 max-w-[200px] truncate" title={item.productName}>
                        {item.productName}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Input
                            type="number"
                            className="w-12 h-7 bg-gray-50 border-gray-200 text-center text-xs p-0"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0
                              updateQuantity(index, val - item.quantity)
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs text-gray-500">{item.unit}</TableCell>
                      <TableCell className="text-right text-gray-700 text-sm">
                        ${item.price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          <Input
                            type="number"
                            className="w-14 h-7 bg-gray-50 border-gray-200 text-center text-xs p-0"
                            value={item.discountPercent === 0 ? "" : item.discountPercent}
                            placeholder="0"
                            max={100}
                            min={0}
                            onChange={(e) => updateDiscount(index, parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600 text-sm">
                        ${item.total.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => removeItem(index)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {selectedItems.length === 0 && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={8} className="h-48 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-2 opacity-50">
                          <ShoppingCart className="w-10 h-10" />
                          <p>No hay productos en la factura</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Summary & Actions */}
          <div className="p-4 bg-white border-t border-gray-200 space-y-4 shadow-sm">

            {/* Collapsible Header */}
            <button
              onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-800 text-sm md:text-base flex items-center gap-2">
                  ⚙️ Detalles & Totales
                </span>
              </div>
              <ChevronDown className={cn(
                "w-5 h-5 text-gray-400 transition-transform duration-300",
                isDetailsExpanded && "rotate-180"
              )} />
            </button>

            {/* Collapsible Content */}
            <AnimatePresence>
              {isDetailsExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4 overflow-hidden"
                >

                  {/* Global Discount */}
                  <div className="flex items-center gap-2 flex-wrap bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <Label className="text-xs text-gray-400 whitespace-nowrap shrink-0">Descuento global:</Label>
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="Ingresa %"
                        value={globalDiscount}
                        onChange={(e) => {
                          const value = e.target.value
                          setGlobalDiscount(value)
                          const discountValue = value === "" ? 0 : parseFloat(value)
                          if (discountValue >= 0 && discountValue <= 100) {
                            setSelectedItems(prev => prev.map(item => ({
                              ...item,
                              discountPercent: discountValue,
                              total: calculateItemTotal(item.price, item.quantity, discountValue),
                            })))
                          }
                        }}
                        className="w-24 h-8 bg-gray-100 border-gray-200 text-gray-700 text-xs focus:ring-primary/50"
                      />
                      <span className="text-xs text-gray-400">%</span>
                    </div>
                    {globalDiscount !== "" && (
                      <button
                        onClick={() => {
                          setGlobalDiscount("")
                          setSelectedItems(prev => prev.map(item => ({
                            ...item,
                            discountPercent: 0,
                            total: calculateItemTotal(item.price, item.quantity, 0),
                          })))
                        }}
                        className="px-3 py-1 rounded-md text-xs font-bold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                      >
                        Quitar
                      </button>
                    )}
                  </div>

                  {/* Tipo de Factura */}
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <Label className="text-xs text-gray-400 mb-2 block">Tipo de Factura</Label>
                    <div className="flex gap-2 bg-gray-50 p-1 rounded-lg">
                      <button
                        onClick={() => setDocumentType("factura")}
                        className={cn(
                          "flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all text-white",
                          documentType === "factura"
                            ? "bg-primary shadow-lg shadow-primary/20"
                            : "text-gray-500 hover:text-gray-300",
                        )}
                      >
                        Factura Pago
                      </button>
                      <button
                        onClick={() => setDocumentType("cotizacion")}
                        className={cn(
                          "flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all text-white",
                          documentType === "cotizacion"
                            ? "bg-amber-500 shadow-lg shadow-amber-500/20"
                            : "text-gray-400 hover:text-gray-300",
                        )}
                      >
                        Cotización
                      </button>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="bg-gray-100 rounded-xl p-3 space-y-2 border border-gray-200">
                    <div className="flex justify-between w-full text-sm text-gray-400">
                      <span>Subtotal</span>
                      <span>${subtotal.toLocaleString()}</span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className="flex justify-between w-full text-sm text-yellow-400">
                        <span>Descuento{globalDiscountPercent > 0 ? ` (${globalDiscountPercent}%)` : ""}</span>
                        <span>- ${totalDiscount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap justify-between w-full gap-1 text-lg md:text-2xl font-bold text-gray-800 pt-2 border-t border-gray-200">
                      <span className="text-base md:text-xl">Total a Pagar</span>
                      <span className="text-green-400">${total.toLocaleString()}</span>
                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Total Summary (Always visible when collapsed) */}
            {!isDetailsExpanded && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 text-center">
                <p className="text-[10px] text-gray-400">Total a Pagar</p>
                <p className="text-lg font-bold text-green-400">${total.toLocaleString()}</p>
              </div>
            )}

            {documentType === "cotizacion" && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg animate-pulse">
                <p className="text-[10px] md:text-xs text-amber-500 font-bold text-center uppercase tracking-wider">
                  ⚠️ APENAS SE REALICE EL PAGO DE LA TOTALIDAD SE REALIZARA EL ENVIO DE LA MERCANCIA
                </p>
              </div>
            )}

            <Button
              size="lg"
              className={cn(
                "w-full font-bold h-12 rounded-xl shadow-lg transition-all",
                documentType === "factura"
                  ? "bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 shadow-primary/25"
                  : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/25",
              )}
              onClick={handleCheckout}
              disabled={processing}
            >
              {processing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {documentType === "factura" ? "Completar Venta" : "Generar Cotización"}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
