"use client"

import { useRouter } from 'next/navigation'
import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import { supabase } from "@/lib/supabase"
import type { Category } from "@/types/domain"
import { CategoriesRepository } from "@/lib/repositories/categoriesRepository"
import { Plus, Edit, Trash2, Tag, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"

export default function CategoriesPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    status: true,
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const categoriesRepository = new CategoriesRepository(supabase)

  const fetchCategories = async () => {
    try {
      const list = await categoriesRepository.list()
      setCategories(list)
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar las categorías", variant: "destructive" })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const categoryData = {
      name: formData.name,
      status: formData.status ? 1 : 0,
    }

    try {
      if (editingCategory) {
        await categoriesRepository.update(editingCategory.id, categoryData)
      } else {
        await categoriesRepository.create(categoryData)
      }
      toast({ title: "Éxito", description: `Categoría ${editingCategory ? "actualizada" : "creada"} correctamente` })
      setIsDialogOpen(false)
      resetForm()
      fetchCategories()
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || 'No se pudo guardar', variant: "destructive" })
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta categoría?")) {
      try {
        await categoriesRepository.remove(id)
        toast({ title: "Éxito", description: "Categoría eliminada correctamente" })
        fetchCategories()
      } catch {
        toast({ title: "Error", description: "No se pudo eliminar la categoría", variant: "destructive" })
      }
    }
  }

  const resetForm = () => {
    setFormData({ name: "", status: true })
    setEditingCategory(null)
  }

  const openEditDialog = (category: Category) => {
    setEditingCategory(category)
    setFormData({ name: category.name, status: category.status === 1 })
    setIsDialogOpen(true)
  }

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Navigation />
      <main className="flex-1 p-4 md:p-8 transition-all duration-300 overflow-y-auto scrollbar-thin">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pt-16 md:pt-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Categorías</h1>
            <p className="text-gray-500">Organiza tu catálogo para una búsqueda más rápida</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Categoría
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
                <DialogDescription>
                  {editingCategory ? "Modifica los datos de la categoría" : "Completa la información de la nueva categoría"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre de Categoría *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex items-center space-x-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <Switch
                      id="status"
                      checked={formData.status}
                      onCheckedChange={(checked) => setFormData({ ...formData, status: checked })}
                    />
                    <Label htmlFor="status" className="text-sm font-medium text-gray-700">¿Categoría Activa?</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90 px-8">
                    {editingCategory ? "Actualizar" : "Crear"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative mb-8 w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar categorías..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredCategories.map((category) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                layout
              >
                <Card className="bg-white border-gray-200 hover:border-primary/50 transition-all overflow-hidden group shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <Tag className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-800 leading-tight">{category.name}</h3>
                            <Badge variant={category.status === 1 ? "secondary" : "destructive"} className="text-[9px] h-4">
                              {category.status === 1 ? "ACTIVA" : "INACTIVA"}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest pl-1">
                          Creada: {new Date(category.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(category)} className="h-8 w-8 text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)} className="h-8 w-8 text-red-500 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
