import { motion } from "framer-motion";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Mascot } from "./Mascot";
import type { ReactNode } from "react";

interface StateWrapperProps {
  children: ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  errorMessage?: string;
  emptyMessage?: string;
  emptyMood?: "confused" | "sad";
  onRetry?: () => void;
  loadingText?: string;
}

export function StateWrapper({
  children,
  isLoading = false,
  isError = false,
  isEmpty = false,
  errorMessage = "Algo deu errado. Tente novamente.",
  emptyMessage = "Nada por aqui ainda...",
  emptyMood = "confused",
  onRetry,
  loadingText = "Carregando...",
}: StateWrapperProps) {
  // Loading State
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16 gap-4"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-10 h-10 text-primary" />
        </motion.div>
        <p className="text-muted-foreground font-medium">{loadingText}</p>
      </motion.div>
    );
  }

  // Error State
  if (isError) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-12 gap-4"
      >
        <Mascot mood="sad" size="lg" />
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-destructive mb-2">
            <AlertTriangle className="w-5 h-5" />
            <p className="font-semibold">Ops!</p>
          </div>
          <p className="text-muted-foreground text-sm max-w-xs">{errorMessage}</p>
        </div>
        {onRetry && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </motion.button>
        )}
      </motion.div>
    );
  }

  // Empty State
  if (isEmpty) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-12"
      >
        <Mascot mood={emptyMood} size="lg" message={emptyMessage} />
      </motion.div>
    );
  }

  // Normal content
  return <>{children}</>;
}
