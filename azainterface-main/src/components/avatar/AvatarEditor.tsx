import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, RotateCcw, Sparkles } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { AvatarComposer, BASE_IMAGES } from "./AvatarComposer";
import type { AvatarAccessory, AvatarBaseColor, AvatarConfig } from "@/types/avatar";
import { DEFAULT_AVATAR } from "@/types/avatar";

interface AvatarEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: AvatarConfig;
  onSave: (config: Partial<AvatarConfig>) => void;
}

type Tab = "estilo" | "acessorio" | "fundo";

type Preset = {
  id: string;
  label: string;
  description: string;
  config: AvatarConfig;
};

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "estilo", label: "Estilo" },
  { id: "acessorio", label: "Acessório" },
  { id: "fundo", label: "Fundo" },
];

const BASE_OPTIONS: Array<{ id: AvatarBaseColor; label: string }> = [
  { id: "pink", label: "Rosa" },
  { id: "gold", label: "Dourado" },
  { id: "blue", label: "Azul" },
  { id: "lavender", label: "Lavanda" },
  { id: "mint", label: "Menta" },
];

const ACCESSORY_OPTIONS: Array<{ id: AvatarAccessory; label: string }> = [
  { id: "none", label: "Sem acessório" },
  { id: "crown", label: "Coroa" },
  { id: "partyhat", label: "Festa" },
  { id: "flowers", label: "Flores" },
];

const BG_OPTIONS: Array<{ id: string; label: string }> = [
  { id: "#FFF9CC", label: "Luz" },
  { id: "#FFE89C", label: "Solar" },
  { id: "#FFE1C4", label: "Pêssego" },
  { id: "#DCEEFF", label: "Brisa" },
  { id: "#E8DEFF", label: "Lavanda" },
  { id: "#D7FFE8", label: "Menta" },
  { id: "#F6F6F7", label: "Neutro" },
  { id: "#1F2430", label: "Noite" },
];

const PRESETS: Preset[] = [
  {
    id: "default",
    label: "Clássico",
    description: "Visual limpo",
    config: { baseColor: "pink", accessory: "none", background: "#FFF9CC" },
  },
  {
    id: "queen",
    label: "Rainha",
    description: "Mais destaque",
    config: { baseColor: "gold", accessory: "crown", background: "#FFE89C" },
  },
  {
    id: "party",
    label: "Festa",
    description: "Leve e divertido",
    config: { baseColor: "blue", accessory: "partyhat", background: "#DCEEFF" },
  },
  {
    id: "nature",
    label: "Natureza",
    description: "Visual suave",
    config: { baseColor: "mint", accessory: "flowers", background: "#D7FFE8" },
  },
];

export function AvatarEditor({ open, onOpenChange, config, onSave }: AvatarEditorProps) {
  const [activeTab, setActiveTab] = useState<Tab>("estilo");
  const [draft, setDraft] = useState<AvatarConfig>(config);

  const hasChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(config), [draft, config]);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setDraft(config);
      setActiveTab("estilo");
    }
    onOpenChange(isOpen);
  };

  const handleSave = () => {
    onSave(draft);
    onOpenChange(false);
  };

  const applyPreset = (preset: Preset) => {
    setDraft(preset.config);
  };

  const resetDraft = () => {
    setDraft(DEFAULT_AVATAR);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpen}>
      <DrawerContent className="max-h-[88vh]">
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle className="text-lg font-black text-foreground">Personalizar avatar</DrawerTitle>
          <p className="text-sm text-muted-foreground">Deixe com a sua cara, mantendo o estilo do AZA.</p>
        </DrawerHeader>

        <div className="px-4 pb-6">
          <div className="rounded-3xl border border-border bg-gradient-to-b from-card to-muted/40 p-4 mb-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Pré-visualização</p>
                <p className="text-sm font-bold text-foreground">Seu avatar</p>
              </div>
              <Sparkles className="w-4 h-4 text-primary" />
            </div>

            <motion.div
              key={`${draft.baseColor}-${draft.accessory}-${draft.background}`}
              initial={{ scale: 0.95, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 18 }}
              className="flex justify-center"
            >
              <AvatarComposer config={draft} size="xl" />
            </motion.div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-muted p-1 mb-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`h-10 rounded-xl text-xs font-black transition-colors ${
                  activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="min-h-[180px]">
            {activeTab === "estilo" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  {PRESETS.map((preset) => {
                    const isSelected = JSON.stringify(draft) === JSON.stringify(preset.config);
                    return (
                      <button
                        key={preset.id}
                        onClick={() => applyPreset(preset)}
                        className={`relative rounded-2xl border p-2.5 text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                            : "border-border bg-card hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <AvatarComposer config={preset.config} size="sm" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground">{preset.label}</p>
                            <p className="text-[11px] text-muted-foreground">{preset.description}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Cor do personagem</p>
                  <div className="grid grid-cols-5 gap-2">
                    {BASE_OPTIONS.map((opt) => {
                      const selected = draft.baseColor === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setDraft((current) => ({ ...current, baseColor: opt.id }))}
                          className="flex flex-col items-center gap-1"
                        >
                          <div
                            className={`w-12 h-12 rounded-full overflow-hidden border ${
                              selected ? "border-primary ring-2 ring-primary/25" : "border-border"
                            }`}
                          >
                            <img src={BASE_IMAGES[opt.id]} alt={opt.label} className="w-full h-full object-cover" />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "acessorio" && (
              <div className="grid grid-cols-2 gap-2.5">
                {ACCESSORY_OPTIONS.map((option) => {
                  const selected = draft.accessory === option.id;
                  const previewConfig = { ...draft, accessory: option.id };
                  return (
                    <button
                      key={option.id}
                      onClick={() => setDraft((current) => ({ ...current, accessory: option.id }))}
                      className={`relative rounded-2xl border p-2.5 transition-all ${
                        selected
                          ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                          : "border-border bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <AvatarComposer config={previewConfig} size="sm" />
                        <div className="text-left">
                          <p className="text-xs font-bold text-foreground">{option.label}</p>
                        </div>
                      </div>
                      {selected && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === "fundo" && (
              <div className="grid grid-cols-4 gap-2.5">
                {BG_OPTIONS.map((option) => {
                  const selected = draft.background === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setDraft((current) => ({ ...current, background: option.id }))}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <div
                        className={`w-14 h-14 rounded-full border ${
                          selected ? "border-primary ring-2 ring-primary/25" : "border-border"
                        }`}
                        style={{ backgroundColor: option.id }}
                      />
                      <span className="text-[10px] text-muted-foreground">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-5">
            <button
              onClick={resetDraft}
              className="h-11 px-4 rounded-xl border border-border bg-card text-sm font-semibold text-foreground inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Resetar
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-black disabled:opacity-50"
            >
              Salvar avatar
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
