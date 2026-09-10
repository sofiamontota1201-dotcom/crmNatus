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
  DialogFooter,
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
import { Plus, Trash2, Search, Package, UserPlus, CreditCard, Banknote, Minus, ShoppingCart, RefreshCcw, ChevronDown, FileText, Receipt } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { todayLocalISO } from "@/lib/utils/date"
import { isNumericCodeName } from "@/lib/utils/product"

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
  const [selectedItems, setSelectedItems] = useState<SellItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("natus_cart")
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  const [formData, setFormData] = useState(() => {
    return {
      customerId: "",
      sellDate: todayLocalISO(),
      paymentMethod: "0",
    }
  })
  const [documentType, setDocumentType] = useState<"express">("express")
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

  // --- SAVE CART TO LOCALSTORAGE ---
  useEffect(() => {
    localStorage.setItem("natus_cart", JSON.stringify(selectedItems))
  }, [selectedItems])

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
          stocksRepository.listForPOS(),
          categoriesRepository.listActive()
        ])
        if (mounted) {
          setCustomers(c)
          setStocks(s)
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

  const addProductToCart = (stock: Stock, priceLevel: 1 | 2 | 3 = 1) => {
    const activeDiscount = parseFloat(globalDiscount) || 0
    const existingIndex = selectedItems.findIndex(item => item.stockId === stock.id.toString())

    let selectedPrice = stock.sellingPrice
    if (priceLevel === 2) selectedPrice = stock.sellingPrice2 ?? 0
    if (priceLevel === 3) selectedPrice = stock.sellingPrice3 ?? 0

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
        price: selectedPrice,
        unit: "UNID",
        discountPercent: activeDiscount,
        total: calculateItemTotal(selectedPrice, 1, activeDiscount),
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

  const updatePrice = (index: number, newPrice: number) => {
    const newItems = [...selectedItems]
    const item = newItems[index]

    const validPrice = Math.max(0, newPrice)
    item.price = validPrice
    item.total = calculateItemTotal(validPrice, item.quantity, item.discountPercent)
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
    localStorage.removeItem("natus_cart")
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

  // --- EXPRESS CHECKOUT ---
  const [expressModalOpen, setExpressModalOpen] = useState(false)
  const [expressPaymentMethod, setExpressPaymentMethod] = useState("0")

  const handleExpressCheckout = () => {
    if (selectedItems.length === 0) {
      toast({ title: "Carrito vacío", description: "Agrega productos", variant: "destructive" })
      return
    }
    if (!formData.customerId) {
      toast({ title: "Cliente requerido", description: "Selecciona un cliente", variant: "destructive" })
      return
    }
    setExpressModalOpen(true)
  }

  const confirmExpressSale = async () => {
    setExpressModalOpen(false)
    setProcessing(true)
    try {
      // Validar stock de todos los productos ANTES de crear la venta
      for (const item of selectedItems) {
        const stock = stocks.find((s) => s.id.toString() === item.stockId)
        if (!stock) {
          toast({ title: "Producto no disponible", description: `"${item.productName}" ya no tiene stock. Elimínalo del carrito.`, variant: "destructive" })
          setProcessing(false)
          return
        }
        if ((stock.currentQuantity ?? 0) < item.quantity) {
          toast({ title: "Stock insuficiente", description: `"${item.productName}" solo tiene ${stock.currentQuantity} unidades.`, variant: "destructive" })
          setProcessing(false)
          return
        }
      }

      const sellData = {
        customerId: Number.parseInt(formData.customerId),
        branchId: 1,
        totalAmount: total,
        paidAmount: total,
        sellDate: formData.sellDate,
        discountAmount: totalDiscount,
        paymentMethod: Number.parseInt(expressPaymentMethod),
        paymentStatus: 0,  // Pendiente - se marca pagada en Cerrar Caja
      }
      const sell = await sellsRepository.create(sellData as any)

      for (const item of selectedItems) {
        const stock = stocks.find((s) => s.id.toString() === item.stockId)
        if (!stock) continue
        const itemDiscountAmount = item.price * item.quantity - item.total
        await sellsRepository.createDetail({
          stockId: Number(item.stockId),
          sellId: sell.id,
          soldQuantity: item.quantity,
          buyPrice: stock.buyingPrice,
          soldPrice: item.price,
          totalBuyPrice: stock.buyingPrice * item.quantity,
          totalSoldPrice: item.total,
          discount: item.discountPercent,
          discountType: 2,
          discountAmount: itemDiscountAmount,
        } as any)
        await stocksRepository.update(stock.id, { currentQuantity: stock.currentQuantity - item.quantity } as any)
      }

      const customer = customers.find(c => c.id.toString() === formData.customerId)
      const jsPDFMod = await import('jspdf')
      const jsPDF = jsPDFMod.default
      const autoTableMod = await import('jspdf-autotable')
      const autoTable = autoTableMod.default
      const doc = new jsPDF('l', 'mm', 'a4')
      const GREEN = [34, 139, 34] as [number, number, number]

      doc.setFillColor(...GREEN)
      doc.rect(0, 0, 297, 35, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('FACTURA EXPRESS', 148.5, 15, { align: 'center' })
      doc.setFontSize(10)
      doc.text(`Venta #${sell.id} - ${new Date().toLocaleDateString('es-CO')}`, 148.5, 25, { align: 'center' })

      doc.setTextColor(40, 40, 40)
      doc.setFont('helvetica', 'bold')
      doc.text('Cliente:', 14, 48)
      doc.setFont('helvetica', 'normal')
      doc.text(customer?.customerName || 'Consumidor Final', 40, 48)
      const payLabel = expressPaymentMethod === "0" ? 'Efectivo' : expressPaymentMethod === "1" ? 'Tarjeta' : 'Transferencia'
      doc.setFont('helvetica', 'bold')
      doc.text('Pago:', 180, 48)
      doc.setFont('helvetica', 'normal')
      doc.text(payLabel, 200, 48)

      autoTable(doc, {
        head: [['#', 'Producto', 'Cant.', 'P. Unitario', 'Total']],
        body: selectedItems.map((item, i) => [(i+1).toString(), item.productName, item.quantity.toString(), `$${item.price.toLocaleString()}`, `$${item.total.toLocaleString()}`]),
        startY: 65,
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: GREEN, textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 250, 245] },
      })

      const lastY = (doc as any).lastAutoTable.finalY + 10
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(`TOTAL: $${total.toLocaleString()}`, 283, lastY, { align: 'right' })
      doc.save(`Factura_Express_${sell.id}.pdf`)

      toast({ title: "¡Factura Express!", description: `Venta #${sell.id} generada` })
      clearCart()
      const updatedStocks = await stocksRepository.listForPOS()
      setStocks(updatedStocks.filter(s => (s.currentQuantity ?? 0) > 0 && s.status === 1))
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "No se pudo generar la factura", variant: "destructive" })
    } finally {
      setProcessing(false)
    }
  }

  // --- CARGAR FACTURA (sin PDF) ---
  const handleCargarFactura = async () => {
    setExpressModalOpen(false)
    setProcessing(true)
    try {
      // Validar stock de todos los productos ANTES de crear la venta
      for (const item of selectedItems) {
        const stock = stocks.find((s) => s.id.toString() === item.stockId)
        if (!stock) {
          toast({ title: "Producto no disponible", description: `"${item.productName}" ya no tiene stock. Elimínalo del carrito.`, variant: "destructive" })
          setProcessing(false)
          return
        }
        if ((stock.currentQuantity ?? 0) < item.quantity) {
          toast({ title: "Stock insuficiente", description: `"${item.productName}" solo tiene ${stock.currentQuantity} unidades.`, variant: "destructive" })
          setProcessing(false)
          return
        }
      }

      const sellData = {
        customerId: Number.parseInt(formData.customerId),
        branchId: 1,
        totalAmount: total,
        paidAmount: total,
        sellDate: formData.sellDate,
        discountAmount: totalDiscount,
        paymentMethod: Number.parseInt(expressPaymentMethod),
        paymentStatus: 0,
      }
      const sell = await sellsRepository.create(sellData as any)

      for (const item of selectedItems) {
        const stock = stocks.find((s) => s.id.toString() === item.stockId)
        if (!stock) continue
        const itemDiscountAmount = item.price * item.quantity - item.total
        await sellsRepository.createDetail({
          stockId: Number(item.stockId),
          sellId: sell.id,
          soldQuantity: item.quantity,
          buyPrice: stock.buyingPrice,
          soldPrice: item.price,
          totalBuyPrice: stock.buyingPrice * item.quantity,
          totalSoldPrice: item.total,
          discount: item.discountPercent,
          discountType: 2,
          discountAmount: itemDiscountAmount,
        } as any)
        await stocksRepository.update(stock.id, { currentQuantity: stock.currentQuantity - item.quantity } as any)
      }

      toast({ title: "Venta Cargada", description: `Venta #${sell.id} cargada al historial. Pendiente de facturación.` })
      clearCart()
      const updatedStocks = await stocksRepository.listForPOS()
      setStocks(updatedStocks.filter(s => (s.currentQuantity ?? 0) > 0 && s.status === 1))
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "No se pudo cargar la venta", variant: "destructive" })
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
    return matchSearch && matchCat && !isNumericCodeName(stock.products?.productName)
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
              {filteredStocks.map((stock) => {
                const isOutOfStock = (stock.currentQuantity ?? 0) <= 0
                return (
                <motion.div
                  key={stock.id}
                  whileHover={isOutOfStock ? {} : { scale: 1.02 }}
                  whileTap={isOutOfStock ? {} : { scale: 0.98 }}
                  onClick={() => {
                    if (isOutOfStock) return
                    addProductToCart(stock);
                    const { dismiss } = toast({
                      title: "✓ Producto agregado",
                      description: stock.products?.productName,
                      variant: "success" as any,
                    })
                    setTimeout(dismiss, 3000)
                  }}
                  className={cn(
                    "rounded-xl p-3 flex flex-col justify-between h-auto transition-all relative overflow-hidden group",
                    isOutOfStock
                      ? "bg-red-50 border border-red-200 cursor-not-allowed opacity-70"
                      : "cursor-pointer bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-primary/50"
                  )}
                >
                  <div className="mb-2">
                    <div className="flex justify-between items-start">
                      <Badge variant="outline" className={cn(
                        "border-gray-200 text-[10px]",
                        isOutOfStock ? "bg-red-100 text-red-500 border-red-200" : "bg-gray-100 text-gray-500"
                      )}>
                        {stock.productCode}
                      </Badge>
                      {isOutOfStock ? (
                        <span className="text-[10px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded">Sin Stock</span>
                      ) : (
                        <span className="text-[10px] text-gray-500">Stock: {stock.currentQuantity}</span>
                      )}
                    </div>

                    <h3 className={cn(
                      "font-bold text-sm mt-1 leading-tight",
                      isOutOfStock ? "text-red-400" : "text-gray-800"
                    )}>{stock.products?.productName}</h3>
                  </div>

                  <div className="mt-auto">
                    <div className="flex items-center gap-1 mb-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isOutOfStock) addProductToCart(stock, 1);
                        }}
                        disabled={isOutOfStock}
                        className={cn(
                          "flex-1 text-[9px] font-bold py-1 px-1.5 rounded border transition-colors",
                          isOutOfStock
                            ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
                            : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                        )}
                      >
                        P1: ${stock.sellingPrice.toLocaleString()}
                      </button>
                      {(stock.sellingPrice2 ?? 0) > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isOutOfStock) addProductToCart(stock, 2);
                          }}
                          disabled={isOutOfStock}
                          className={cn(
                            "flex-1 text-[9px] font-bold py-1 px-1.5 rounded border transition-colors",
                            isOutOfStock
                              ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
                              : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                          )}
                        >
                          P2: ${stock.sellingPrice2!.toLocaleString()}
                        </button>
                      )}
                      {(stock.sellingPrice3 ?? 0) > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isOutOfStock) addProductToCart(stock, 3);
                          }}
                          disabled={isOutOfStock}
                          className={cn(
                            "flex-1 text-[9px] font-bold py-1 px-1.5 rounded border transition-colors",
                            isOutOfStock
                              ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
                              : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                          )}
                        >
                          P3: ${stock.sellingPrice3!.toLocaleString()}
                        </button>
                      )}
                    </div>
                    <div className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center transition-colors",
                      isOutOfStock
                        ? "bg-red-100 text-red-300"
                        : "bg-primary/20 text-primary group-hover:bg-primary group-hover:text-white"
                    )}>
                      <Plus className="w-3 h-3" />
                    </div>
                  </div>
                </motion.div>
                )
              })}
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
          <div className="p-2 md:p-3 border-b border-gray-200 bg-white flex flex-col gap-2">
            {/* Row 1: Title + Clear button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-600" />
                <span className="text-sm font-bold text-gray-800">Factura Express</span>
              </div>
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

              {/* Express Invoice Modal */}
              <Dialog open={expressModalOpen} onOpenChange={setExpressModalOpen}>
                <DialogContent className="bg-white border-gray-200 text-gray-800 max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-green-600" />
                      Factura Express
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-3">
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Cliente</p>
                      <p className="text-sm font-bold text-gray-800">
                        {customers.find(c => c.id.toString() === formData.customerId)?.customerName || 'Consumidor Final'}
                      </p>
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {selectedItems.map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-xs py-1.5 px-2 bg-gray-50 rounded">
                          <span className="text-gray-700 truncate flex-1">{item.productName}</span>
                          <span className="text-gray-500 mx-2">{item.quantity}x</span>
                          <span className="font-bold text-gray-800">${item.total.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Método de pago</Label>
                      <Select value={expressPaymentMethod} onValueChange={setExpressPaymentMethod}>
                        <SelectTrigger className="bg-gray-50 border-gray-200 h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">
                          <SelectItem value="0">Efectivo</SelectItem>
                          <SelectItem value="1">Tarjeta</SelectItem>
                          <SelectItem value="2">Transferencia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-sm font-bold text-gray-800">TOTAL</span>
                      <span className="text-lg font-black text-green-600">${total.toLocaleString()}</span>
                    </div>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={() => setExpressModalOpen(false)} className="text-gray-500">
                      Cancelar
                    </Button>
                    <Button onClick={confirmExpressSale} className="bg-green-600 hover:bg-green-700 text-white font-bold">
                      <FileText className="w-4 h-4 mr-2" />
                      Confirmar + PDF
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Table Area */}
          <div className="flex-1 overflow-auto bg-white p-2 md:p-3">

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
                        <Input
                          type="number"
                          className="h-7 bg-gray-50 border-gray-200 text-sm font-semibold p-1"
                          value={item.price}
                          min={0}
                          onChange={(e) => updatePrice(index, parseFloat(e.target.value) || 0)}
                        />
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
                    <TableHead className="text-gray-700 font-bold text-[11px] py-2 px-3 w-[90px]">Ref</TableHead>
                    <TableHead className="text-gray-700 font-bold text-[11px] py-2 px-3">Producto</TableHead>
                    <TableHead className="text-gray-700 font-bold text-[11px] py-2 px-3 text-center w-[70px]">Cant.</TableHead>
                    <TableHead className="text-gray-700 font-bold text-[11px] py-2 px-3 text-center w-[50px]">U.M.</TableHead>
                    <TableHead className="text-gray-700 font-bold text-[11px] py-2 px-3 text-right">P. Unitario</TableHead>
                    <TableHead className="text-gray-700 font-bold text-[11px] py-2 px-3 text-center w-[80px]">% Desc.</TableHead>
                    <TableHead className="text-gray-700 font-bold text-[11px] py-2 px-3 text-right">Total</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedItems.map((item, index) => (
                    <TableRow key={`${item.stockId}-${index}`} className="hover:bg-gray-50 border-gray-200">
                      <TableCell className="font-medium text-gray-700 text-[11px] py-1.5 px-3">{item.productCode}</TableCell>
                      <TableCell className="text-gray-700 text-[11px] py-1.5 px-3 max-w-[180px] truncate" title={item.productName}>
                        {item.productName}
                      </TableCell>
                      <TableCell className="text-center py-1.5 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(index, -1)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="number"
                            className="w-12 h-6 bg-gray-50 border-gray-200 text-center text-[11px] p-0"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0
                              updateQuantity(index, val - item.quantity)
                            }}
                          />
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(index, 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-[11px] text-gray-500 py-1.5 px-3">{item.unit}</TableCell>
                      <TableCell className="text-right py-1.5 px-3">
                        <Input
                          type="number"
                          className="w-20 h-6 bg-gray-50 border-gray-200 text-right text-[11px] p-0"
                          value={item.price}
                          min={0}
                          onChange={(e) => updatePrice(index, parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell className="text-center py-1.5 px-3">
                        <Input
                          type="number"
                          className="w-14 h-6 bg-gray-50 border-gray-200 text-center text-[11px] p-0"
                          value={item.discountPercent === 0 ? "" : item.discountPercent}
                          placeholder="0"
                          max={100}
                          min={0}
                          onChange={(e) => updateDiscount(index, parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600 text-[11px] py-1.5 px-3">
                        ${item.total.toLocaleString()}
                      </TableCell>
                      <TableCell className="py-1.5 px-2">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => removeItem(index)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {selectedItems.length === 0 && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={8} className="h-40 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-2 opacity-50">
                          <ShoppingCart className="w-8 h-8" />
                          <p className="text-xs">Sin productos</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Summary & Actions */}
          <div className="p-2 md:p-3 bg-white border-t border-gray-200 space-y-2 shadow-sm">

            {/* Totals */}
            <div className="bg-gray-100 rounded-xl p-3 space-y-2 border border-gray-200">
              <div className="flex justify-between w-full text-sm text-gray-400">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString()}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between w-full text-sm text-yellow-400">
                  <span>Descuento</span>
                  <span>- ${totalDiscount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex flex-wrap justify-between w-full gap-1 text-lg md:text-2xl font-bold text-gray-800 pt-2 border-t border-gray-200">
                <span className="text-base md:text-xl">Total</span>
                <span className="text-green-600">${total.toLocaleString()}</span>
              </div>
            </div>

            {/* Cargar Factura Button - SECUNDARIO */}
            <Button
              size="lg"
              variant="outline"
              className="w-full font-bold h-11 rounded-xl border-2 border-primary/30 text-primary hover:bg-primary hover:text-white transition-all"
              onClick={() => {
                if (selectedItems.length === 0) { toast({ title: "Carrito vacío", description: "Agrega productos", variant: "destructive" }); return }
                if (!formData.customerId) { toast({ title: "Cliente requerido", description: "Selecciona un cliente", variant: "destructive" }); return }
                handleCargarFactura()
              }}
              disabled={processing || selectedItems.length === 0 || !formData.customerId}
            >
              <Receipt className="w-5 h-5 mr-2" />
              Cargar Factura
            </Button>

            {/* Factura Express Button - PRINCIPAL */}
            <Button
              size="lg"
              className="w-full font-bold h-11 rounded-xl shadow-lg transition-all bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-green-500/25"
              onClick={handleExpressCheckout}
              disabled={processing || selectedItems.length === 0 || !formData.customerId}
            >
              {processing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <FileText className="w-5 h-5 mr-2" />
                  Factura Express
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
