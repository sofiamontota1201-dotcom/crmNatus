"use client"

import type React from "react"
import { useState, useTransition } from "react"
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
import type { Product, Category, Vendor } from "@/types/domain"
import { Plus, Edit, Trash2, Search, Package, Tag, Factory, ShoppingBag, FolderOpen, PowerOff, Power, Box, DollarSign, TrendingUp, Check, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createProductAction, updateProductAction, deleteProductAction, updateProductSellingPriceAction } from "@/app/actions/products"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface ProductsClientProps {
    initialProducts: Product[]
    categories: Category[]
    vendors: Vendor[]
}

export function ProductsClient({ initialProducts, categories, vendors }: ProductsClientProps) {
    const [products, setProducts] = useState<Product[]>(initialProducts)

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string>("all")
    const [selectedVendor, setSelectedVendor] = useState<string>("all")
    const [stockFilter, setStockFilter] = useState<string>("all")
    const [editingSellingPrice, setEditingSellingPrice] = useState<{ productId: number; price: string } | null>(null)
    const { toast } = useToast()
    const [isPending, startTransition] = useTransition()

    const [formData, setFormData] = useState({
        productName: "",
        details: "",
        categoryId: "",
        vendorId: "",
        status: 1,
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.productName.trim()) {
            toast({
                title: "Campo requerido",
                description: "Por favor ingresa un nombre para el producto.",
                variant: "destructive",
            })
            return
        }

        const productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'categories'> = {
            productName: formData.productName.trim(),
            details: formData.details.trim() || null,
            categoryId: formData.categoryId && formData.categoryId !== "-1" ? Number.parseInt(formData.categoryId) : null,
            vendorId: formData.vendorId && formData.vendorId !== "-1" ? Number.parseInt(formData.vendorId) : null,
            status: formData.status,
        }

        startTransition(async () => {
            try {
                if (editingProduct) {
                    const updated = await updateProductAction(editingProduct.id, productData)
                    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p))
                } else {
                    const created = await createProductAction(productData)
                    setProducts(prev => [created, ...prev])
                }
                toast({ title: "¡Operación Exitosa!", description: `Producto ${editingProduct ? "actualizado" : "creado"} correctamente` })
                setIsDialogOpen(false)
                resetForm()
            } catch (error) {
                console.error("Action error:", error)
                toast({ title: "Error", description: `No se pudo ${editingProduct ? "actualizar" : "crear"} el producto.`, variant: "destructive" })
            }
        })
    }

    const handleDelete = async (id: number) => {
        if (confirm("¿Esta acción es irreversible. ¿Deseas eliminar este producto permanentemente?")) {
            startTransition(async () => {
                try {
                    await deleteProductAction(id)
                    setProducts(prev => prev.filter(p => p.id !== id))
                    toast({ title: "Producto Eliminado", description: "El registro ha sido borrado del sistema." })
                } catch (error) {
                    toast({ title: "Error", description: "No se pudo eliminar el producto", variant: "destructive" })
                }
            })
        }
    }

    const handleToggleStatus = (product: Product) => {
        const newStatus = product.status === 1 ? 0 : 1
        const label = newStatus === 1 ? "activar" : "desactivar"
        if (confirm(`¿Deseas ${label} el producto "${product.productName}"?`)) {
            startTransition(async () => {
                try {
                    const updated = await updateProductAction(product.id, { status: newStatus })
                    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p))
                    toast({ title: "Estado actualizado", description: `Producto ${newStatus === 1 ? "activado" : "desactivado"} correctamente` })
                } catch (error) {
                    toast({ title: "Error", description: "No se pudo cambiar el estado", variant: "destructive" })
                }
            })
        }
    }

    const handleSaveSellingPrice = async (productId: number) => {
        if (!editingSellingPrice?.price) return
        const price = parseFloat(editingSellingPrice.price)
        if (isNaN(price) || price <= 0) {
            toast({ title: "Precio inválido", description: "Ingresa un precio mayor a 0.", variant: "destructive" })
            return
        }
        startTransition(async () => {
            try {
                await updateProductSellingPriceAction(productId, price)
                setProducts(prev => prev.map(p => {
                    if (p.id !== productId) return p
                    return {
                        ...p,
                        stocks: p.stocks?.map(s => ({ ...s, sellingPrice: price }))
                    }
                }))
                setEditingSellingPrice(null)
                toast({ title: "Precio actualizado", description: "Precio de venta guardado correctamente." })
            } catch (error) {
                toast({ title: "Error", description: "No se pudo actualizar el precio.", variant: "destructive" })
            }
        })
    }

    const resetForm = () => {
        setFormData({
            productName: "",
            details: "",
            categoryId: "",
            vendorId: "",
            status: 1,
        })
        setEditingProduct(null)
    }

    const openEditDialog = (product: Product) => {
        setEditingProduct(product)
        setFormData({
            productName: product.productName,
            details: product.details || "",
            categoryId: product.categoryId?.toString() || "",
            vendorId: product.vendorId?.toString() || "",
            status: product.status,
        })
        setIsDialogOpen(true)
    }

    const filteredProducts = products.filter((product) => {
        const matchesSearch =
            product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.details && product.details.toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesCategory = selectedCategory === "all" || product.categoryId?.toString() === selectedCategory
        const matchesVendor = selectedVendor === "all" || product.vendorId?.toString() === selectedVendor
        const totalStock = product.stocks?.reduce((acc, s) => acc + s.currentQuantity, 0) || 0
        const matchesStock = stockFilter === "all"
            || (stockFilter === "with" && totalStock > 0)
            || (stockFilter === "without" && totalStock === 0)
        return matchesSearch && matchesCategory && matchesVendor && matchesStock
    })

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            <Navigation />
            <main className="flex-1 p-4 md:p-8 transition-all duration-300 overflow-y-auto scrollbar-thin">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pt-16 md:pt-0">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">
                            Catálogo de Productos
                        </h1>
                        <p className="text-gray-500 mt-1">Administra tu inventario maestro</p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                onClick={resetForm}
                                disabled={isPending}
                                className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 rounded-xl"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Nuevo Producto
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white border-gray-200 text-gray-800 sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle className="text-xl flex items-center gap-2">
                                    {editingProduct ? <Edit className="w-5 h-5 text-primary" /> : <Package className="w-5 h-5 text-primary" />}
                                    {editingProduct ? "Editar Producto" : "Nuevo Producto"}
                                </DialogTitle>
                                <DialogDescription className="text-gray-400">
                                    Completa la ficha técnica del producto.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                                <div className="grid gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="product_name" className="text-gray-600">Nombre del Producto</Label>
                                        <div className="relative">
                                            <ShoppingBag className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                            <Input
                                                id="product_name"
                                                value={formData.productName}
                                                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                                                required
                                                placeholder="Ej: Arroz Premium"
                                                disabled={isPending}
                                                className="pl-9 bg-gray-50 border-gray-200 text-gray-800 focus:ring-primary/50"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-gray-600">Categoría</Label>
                                            <Select
                                                value={formData.categoryId}
                                                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                                                disabled={isPending}
                                            >
                                                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-800">
                                                    <SelectValue placeholder="Seleccionar..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white border-gray-200 text-gray-800">
                                                    <SelectItem value="-1">Sin categoría</SelectItem>
                                                    {categories.map((category) => (
                                                        <SelectItem key={category.id} value={category.id.toString()}>
                                                            {category.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-gray-600">Proveedor</Label>
                                            <Select
                                                value={formData.vendorId}
                                                onValueChange={(value) => setFormData({ ...formData, vendorId: value })}
                                                disabled={isPending}
                                            >
                                                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-800">
                                                    <SelectValue placeholder="Seleccionar..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white border-gray-200 text-gray-800">
                                                    <SelectItem value="-1">Sin proveedor</SelectItem>
                                                    {vendors.map((vendor) => (
                                                        <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                                            {vendor.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="details" className="text-gray-600">Detalles</Label>
                                        <Textarea
                                            id="details"
                                            value={formData.details}
                                            onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                                            placeholder="Características, peso, unidades..."
                                            rows={3}
                                            disabled={isPending}
                                            className="bg-gray-50 border-gray-200 text-gray-800 focus:ring-primary/50"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-gray-600">Estado</Label>
                                        <Select
                                            value={formData.status.toString()}
                                            onValueChange={(value) => setFormData({ ...formData, status: Number.parseInt(value) })}
                                            disabled={isPending}
                                        >
                                            <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-800">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white border-gray-200 text-gray-800">
                                                <SelectItem value="1">Activo</SelectItem>
                                                <SelectItem value="0">Inactivo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isPending} className="hover:bg-gray-100 text-gray-600">
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-white">
                                        {isPending ? "Guardando..." : (editingProduct ? "Actualizar" : "Crear")}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8 p-4 rounded-2xl bg-white border border-gray-200">
                    <div className="md:col-span-4 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            placeholder="Buscar producto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-gray-50 border-gray-200 text-gray-800 focus:ring-primary/50"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-800">
                                <SelectValue placeholder="Categoría" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200 text-gray-800">
                                <SelectItem value="all">Todas</SelectItem>
                                {categories.map((category) => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-2">
                        <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                            <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-800">
                                <SelectValue placeholder="Proveedor" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200 text-gray-800">
                                <SelectItem value="all">Todos</SelectItem>
                                {vendors.map((vendor) => (
                                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                        {vendor.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-2">
                        <Select value={stockFilter} onValueChange={setStockFilter}>
                            <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-800">
                                <SelectValue placeholder="Stock" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200 text-gray-800">
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="with">Con stock</SelectItem>
                                <SelectItem value="without">Sin stock</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-2 flex items-center">
                        <Badge variant="outline" className="text-gray-500 border-gray-200">
                            {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''}
                        </Badge>
                    </div>
                </div>

                {/* Grid de Productos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                    <AnimatePresence>
                        {filteredProducts.map((product) => (
                            <motion.div
                                key={product.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                whileHover={{ y: -5 }}
                                className="group relative"
                            >
                                <Card className="h-full bg-white border-gray-200 hover:border-primary/50 transition-colors overflow-hidden">
                                    <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Package className="w-24 h-24 text-primary -rotate-12" />
                                    </div>

                                    <CardContent className="p-6 flex flex-col h-full relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-primary shadow-inner">
                                                <Package className="w-6 h-6" />
                                            </div>
                                            <Badge variant={product.status === 1 ? "default" : "destructive"} className="text-xs">
                                                {product.status === 1 ? "Activo" : "Inactivo"}
                                            </Badge>
                                        </div>

                                        <h3 className="text-lg font-bold text-gray-800 mb-1 line-clamp-1" title={product.productName}>
                                            {product.productName}
                                        </h3>

                                        <p className="text-gray-400 text-sm mb-4 line-clamp-2 min-h-[40px]">
                                            {product.details || "Sin descripción detallada."}
                                        </p>

                                        <div className="mt-auto space-y-3">
                                            <div className="flex items-center justify-between bg-primary/5 p-2 rounded-lg border border-primary/10">
                                                <div className="flex items-center gap-2">
                                                    <Box className="w-3.5 h-3.5 text-primary" />
                                                    <span className="text-[10px] uppercase font-bold text-gray-400">Existencias Totales</span>
                                                </div>
                                                <span className={cn(
                                                    "font-mono font-black text-sm",
                                                    (product.stocks?.reduce((acc, s) => acc + s.currentQuantity, 0) || 0) <= 5 ? "text-red-500" : "text-primary"
                                                )}>
                                                    {product.stocks?.reduce((acc, s) => acc + s.currentQuantity, 0) || 0}
                                                </span>
                                            </div>

                                            {(() => {
                                                const stocks = product.stocks || []
                                                const avgBuying = stocks.length ? stocks.reduce((acc, s) => acc + s.buyingPrice, 0) / stocks.length : 0
                                                const avgSelling = stocks.length ? stocks.reduce((acc, s) => acc + s.sellingPrice, 0) / stocks.length : 0
                                                return (
                                                    <>
                                                        <div className="flex items-center justify-between bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                                                            <div className="flex items-center gap-2">
                                                                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                                                                <span className="text-[10px] uppercase font-bold text-gray-400">Precio Compra</span>
                                                            </div>
                                                            <span className="font-mono font-bold text-sm text-emerald-700">
                                                                {avgBuying > 0 ? `Q${avgBuying.toFixed(2)}` : <span className="text-gray-300 text-xs">Sin precio</span>}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center justify-between bg-blue-50 p-2 rounded-lg border border-blue-100">
                                                            <div className="flex items-center gap-2">
                                                                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                                                                <span className="text-[10px] uppercase font-bold text-gray-400">Precio Venta</span>
                                                            </div>
                                                            {editingSellingPrice?.productId === product.id ? (
                                                                <div className="flex items-center gap-1">
                                                                    <Input
                                                                        type="number"
                                                                        step="0.01"
                                                                        min="0"
                                                                        value={editingSellingPrice.price}
                                                                        onChange={(e) => setEditingSellingPrice({ ...editingSellingPrice, price: e.target.value })}
                                                                        className="h-6 w-20 text-xs font-mono p-1 bg-white border-blue-300"
                                                                        autoFocus
                                                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSellingPrice(product.id) }}
                                                                        disabled={isPending}
                                                                    />
                                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-green-600 hover:bg-green-100" onClick={() => handleSaveSellingPrice(product.id)} disabled={isPending}>
                                                                        <Check className="w-3 h-3" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:bg-gray-100" onClick={() => setEditingSellingPrice(null)}>
                                                                        <X className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            ) : avgSelling > 0 ? (
                                                                <span className="font-mono font-bold text-sm text-blue-700 cursor-pointer hover:text-blue-900" onClick={() => setEditingSellingPrice({ productId: product.id, price: avgSelling.toFixed(2) })} title="Click para editar">
                                                                    Q{avgSelling.toFixed(2)}
                                                                </span>
                                                            ) : (
                                                                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-blue-600 hover:bg-blue-100 px-2" onClick={() => setEditingSellingPrice({ productId: product.id, price: "" })}>
                                                                    + Colocar
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </>
                                                )
                                            })()}

                                            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                                                <Tag className="w-3 h-3 text-primary" />
                                                <span className="truncate">{product.categories?.name || "Sin categoría"}</span>
                                            </div>

                                            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                                                <Factory className="w-3 h-3 text-secondary" />
                                                <span className="truncate">{product.vendors?.name || "Sin proveedor"}</span>
                                            </div>

                                            <div className="pt-4 flex gap-2 border-t border-gray-100 flex-wrap">
                                                <Button
                                                    variant="ghost"
                                                    className="flex-1 text-blue-400 hover:text-gray-800 hover:bg-blue-500/10 h-8 text-xs"
                                                    onClick={() => openEditDialog(product)}
                                                    disabled={isPending}
                                                >
                                                    <Edit className="w-3 h-3 mr-1" /> Editar
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    className={cn(
                                                        "flex-1 h-8 text-xs",
                                                        product.status === 1
                                                            ? "text-yellow-400 hover:text-gray-800 hover:bg-yellow-500/10"
                                                            : "text-green-400 hover:text-gray-800 hover:bg-green-500/10"
                                                    )}
                                                    onClick={() => handleToggleStatus(product)}
                                                    disabled={isPending}
                                                >
                                                    {product.status === 1
                                                        ? <><PowerOff className="w-3 h-3 mr-1" /> Desactivar</>
                                                        : <><Power className="w-3 h-3 mr-1" /> Activar</>}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    className="flex-1 text-red-400 hover:text-gray-800 hover:bg-red-500/10 h-8 text-xs"
                                                    onClick={() => handleDelete(product.id)}
                                                    disabled={isPending}
                                                >
                                                    <Trash2 className="w-3 h-3 mr-1" /> Borrar
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {filteredProducts.length === 0 && (
                        <div className="col-span-full py-20 text-center text-gray-500">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FolderOpen className="w-10 h-10 opacity-50" />
                            </div>
                            <p className="text-lg">No se encontraron productos</p>
                            <p className="text-sm">Intenta con otros filtros o crea uno nuevo</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
