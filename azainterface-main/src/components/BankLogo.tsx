import { useState } from "react";
import { getBankInfo, getInitials } from "@/lib/bankLogos";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface BankLogoProps {
  institution?: string | null;
  fallbackIcon?: LucideIcon;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};

const ICON_SIZE_CLASSES = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

const TEXT_SIZE_CLASSES = {
  xs: "text-[8px]",
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
};

export function BankLogo({ 
  institution, 
  fallbackIcon: FallbackIcon,
  size = "md",
  className,
}: BankLogoProps) {
  const [imageError, setImageError] = useState(false);
  const bankInfo = getBankInfo(institution);
  
  const hasValidLogo = bankInfo?.logo && !imageError;
  
  // Se tem logo válido, mostra a imagem
  if (hasValidLogo) {
    return (
      <div 
        className={cn(
          "rounded-xl flex items-center justify-center overflow-hidden bg-white shadow-sm border border-border/50",
          SIZE_CLASSES[size],
          className
        )}
      >
        <img 
          src={bankInfo.logo}
          alt={bankInfo.name}
          className="w-[80%] h-[80%] object-contain"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }
  
  // Se tem info do banco mas sem logo, mostra iniciais com a cor da marca
  if (bankInfo) {
    return (
      <div 
        className={cn(
          "rounded-xl flex items-center justify-center shadow-sm font-bold text-white",
          SIZE_CLASSES[size],
          TEXT_SIZE_CLASSES[size],
          className
        )}
        style={{ backgroundColor: bankInfo.color }}
      >
        {bankInfo.initials}
      </div>
    );
  }
  
  // Se tem ícone Lucide de fallback, usa ele
  if (FallbackIcon) {
    return (
      <div 
        className={cn(
          "rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/80 to-primary shadow-sm",
          SIZE_CLASSES[size],
          className
        )}
      >
        <FallbackIcon className={cn("text-primary-foreground", ICON_SIZE_CLASSES[size])} />
      </div>
    );
  }
  
  // Fallback final: iniciais da instituição
  const initials = institution ? getInitials(institution) : "$$";
  
  return (
    <div 
      className={cn(
        "rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/80 to-primary shadow-sm font-bold text-white",
        SIZE_CLASSES[size],
        TEXT_SIZE_CLASSES[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
