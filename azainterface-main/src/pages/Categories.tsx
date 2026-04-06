import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Pencil, Trash2, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, groupCategoriesByType, CATEGORY_COLORS } from "@/hooks/useCategories";
import { getCategoryIcon, AVAILABLE_ICONS } from "@/lib/icons";
import type { Category, CategoryType } from "@/types/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type TabType = "DESPESA" | "RECEITA";

export function Categories() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("DESPESA");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: 'outros',
    color: CATEGORY_COLORS[0],
    type: 'DESPESA' as CategoryType,
  });

  const { data: categories = [] } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const grouped = groupCategoriesByType(categories);
  // Filter out subcategories entirely
  const currentCategories = grouped[activeTab].filter(c => !c.parentId);

  const handleOpenDrawer = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        icon: category.icon || 'outros',
        color: category.color || CATEGORY_COLORS[0],
        type: category.type,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        icon: 'outros',
        color: CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)],
        type: activeTab,
      });
    }
    setIsDrawerOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    if (editingCategory) {
      updateCategory.mutate({
        id: editingCategory.id,
        data: { name: formData.name, icon: formData.icon, color: formData.color },
      }, {
        onSuccess: () => setIsDrawerOpen(false),
      });
    } else {
      createCategory.mutate({
        name: formData.name,
        type: formData.type,
        icon: formData.icon,
        color: formData.color,
      }, {
        onSuccess: () => setIsDrawerOpen(false),
      });
    }
  };

  const handleDelete = (category: Category) => {
    deleteCategory.mutate({ id: category.id });
  };

  const totalCategories = currentCategories.length;

  return (
    <MainLayout hideNav>
      <div className="min-h-screen bg-background">
        <div className="px-4 pt-4 pb-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="w-10 h-10 rounded-xl bg-card flex items-center justify-center shadow-sm border border-border"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Settings2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">Categorias</h1>
                  <p className="text-xs text-muted-foreground">
                    {totalCategories} categorias
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-card rounded-2xl p-1.5 flex gap-1 mb-4 shadow-sm border border-border"
          >
            {(["DESPESA", "RECEITA"] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {tab === "DESPESA" ? "Despesas" : "Receitas"}
              </button>
            ))}
          </motion.div>

          {/* Category List */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2.5"
            >
              {currentCategories.map((category, index) => {
                const CatIcon = getCategoryIcon(category.icon || 'outros');

                return (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="bg-card rounded-2xl p-3.5 shadow-sm border border-border flex items-center gap-3"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <CatIcon className="w-5 h-5" style={{ color: category.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground">{category.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {category.isSystem ? "Padrão" : "Personalizada"}
                      </p>
                    </div>

                    <div className="flex gap-1.5">
                      {!category.isSystem && (
                        <button
                          onClick={() => handleOpenDrawer(category)}
                          className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center"
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      )}
                      {!category.isSystem && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Transações vinculadas ficarão sem categoria.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(category)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* Add button */}
              <button
                onClick={() => handleOpenDrawer()}
                className="w-full bg-card rounded-2xl p-3.5 shadow-sm border border-dashed border-primary/30 flex items-center justify-center gap-2 text-primary font-bold text-sm hover:bg-primary/5 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Nova categoria
              </button>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Drawer */}
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerContent className="max-h-[85vh]">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mb-4 mt-2" />
            
            <div className="px-4 pb-8 overflow-y-auto">
              {/* Drawer Header with preview */}
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${formData.color}20` }}
                >
                  {(() => {
                    const PreviewIcon = getCategoryIcon(formData.icon);
                    return <PreviewIcon className="w-6 h-6" style={{ color: formData.color }} />;
                  })()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {editingCategory ? "Editar Categoria" : "Nova Categoria"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {formData.name || "Preencha os dados abaixo"}
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Name */}
                <div>
                  <Label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">
                    Nome
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Assinaturas, Uber, Gym..."
                    className="h-12 bg-muted/50 border-0 rounded-xl focus-visible:ring-primary"
                  />
                </div>

                {/* Type */}
                {!editingCategory && (
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">
                      Tipo
                    </Label>
                    <Select
                      value={formData.type}
                      onValueChange={(v) => setFormData({ ...formData, type: v as CategoryType })}
                    >
                      <SelectTrigger className="h-12 bg-muted/50 border-0 rounded-xl focus:ring-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DESPESA">Despesa</SelectItem>
                        <SelectItem value="RECEITA">Receita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Icon picker */}
                <div>
                  <Label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">
                    Ícone
                  </Label>
                  <div className="grid grid-cols-7 gap-1.5">
                    {AVAILABLE_ICONS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.name}
                          onClick={() => setFormData({ ...formData, icon: item.name })}
                          className={`aspect-square rounded-xl flex items-center justify-center transition-all ${
                            formData.icon === item.name
                              ? "bg-primary text-primary-foreground shadow-sm scale-105"
                              : "bg-muted/50 text-muted-foreground hover:bg-muted"
                          }`}
                          title={item.label}
                        >
                          <Icon className="w-4.5 h-4.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color picker */}
                <div>
                  <Label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">
                    Cor
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    {CATEGORY_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-9 h-9 rounded-full transition-all ${
                          formData.color === color ? "scale-110 ring-2 ring-offset-2 ring-primary" : ""
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-12 rounded-xl"
                    onClick={() => setIsDrawerOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 h-12 rounded-xl font-bold"
                    onClick={handleSubmit}
                    disabled={!formData.name.trim() || createCategory.isPending || updateCategory.isPending}
                  >
                    {editingCategory ? "Salvar" : "Criar"}
                  </Button>
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </MainLayout>
  );
}
