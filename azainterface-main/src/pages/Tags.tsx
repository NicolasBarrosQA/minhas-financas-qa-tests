import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Pencil, Trash2, Tag as TagIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { useTags, useCreateTag, useUpdateTag, useDeleteTag, SUGGESTED_TAG_COLORS, getRandomTagColor } from "@/hooks/useTags";
import type { Tag } from "@/types/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

export function Tags() {
  const navigate = useNavigate();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: getRandomTagColor(),
  });

  const { data: tags = [], isLoading } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const handleOpenSheet = (tag?: Tag) => {
    if (tag) {
      setEditingTag(tag);
      setFormData({
        name: tag.name,
        color: tag.color || getRandomTagColor(),
      });
    } else {
      setEditingTag(null);
      setFormData({
        name: '',
        color: getRandomTagColor(),
      });
    }
    setIsSheetOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    if (editingTag) {
      updateTag.mutate({
        id: editingTag.id,
        data: { name: formData.name, color: formData.color },
      }, {
        onSuccess: () => setIsSheetOpen(false),
      });
    } else {
      createTag.mutate({
        name: formData.name,
        color: formData.color,
      }, {
        onSuccess: () => setIsSheetOpen(false),
      });
    }
  };

  const handleDelete = (tag: Tag) => {
    deleteTag.mutate(tag.id);
  };

  return (
    <MainLayout hideNav>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Tags</h1>
              <p className="text-sm text-muted-foreground">Etiquetas para transações</p>
            </div>
            <Button
              size="sm"
              className="ml-auto"
              onClick={() => handleOpenSheet()}
            >
              <Plus className="w-4 h-4 mr-1" />
              Nova
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <div className="p-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-primary/5 border border-primary/20 mb-4"
          >
            <div className="flex items-start gap-3">
              <TagIcon className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium mb-1">Use tags para organizar</h3>
                <p className="text-sm text-muted-foreground">
                  Crie tags para padronizar seus rótulos. O vínculo direto com transações será habilitado na próxima etapa.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Tags List */}
          <div className="space-y-2">
            {tags.map((tag, index) => (
              <motion.div
                key={tag.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="p-4 rounded-xl bg-card border border-border"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="font-semibold flex-1">{tag.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {tag.transactionCount} uso{tag.transactionCount !== 1 ? 's' : ''}
                  </Badge>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenSheet(tag)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir tag?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Essa ação não pode ser desfeita. A tag será removida permanentemente da sua lista.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(tag)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </motion.div>
            ))}

            {tags.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <TagIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma tag criada ainda</p>
                <Button
                  variant="link"
                  onClick={() => handleOpenSheet()}
                  className="mt-2"
                >
                  Criar primeira tag
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Sheet */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>
                {editingTag ? "Editar Tag" : "Nova Tag"}
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome da tag"
                />
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="grid grid-cols-5 gap-2">
                  {SUGGESTED_TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-10 h-10 rounded-lg transition-transform ${
                        formData.color === color ? "scale-110 ring-2 ring-offset-2 ring-primary" : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="p-4 rounded-xl bg-muted flex items-center justify-center">
                  <Badge
                    style={{ backgroundColor: formData.color, color: 'white' }}
                    className="text-sm px-3 py-1"
                  >
                    {formData.name || 'Nome da tag'}
                  </Badge>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={!formData.name.trim() || createTag.isPending || updateTag.isPending}
              >
                {editingTag ? "Salvar Alterações" : "Criar Tag"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </MainLayout>
  );
}
