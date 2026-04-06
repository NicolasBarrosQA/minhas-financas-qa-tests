import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import logo from "@/assets/aza-logo-wings.png";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    // Hold phase after entrance
    const holdTimer = setTimeout(() => setPhase('hold'), 600);
    
    // Exit phase
    const exitTimer = setTimeout(() => setPhase('exit'), 1800);
    
    // Complete
    const completeTimer = setTimeout(onComplete, 2400);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 'exit' ? 0 : 1 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(180deg, hsl(48, 100%, 55%) 0%, hsl(43, 96%, 50%) 100%)' }}
    >
      {/* Círculos decorativos de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1.5, opacity: 0.1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-white"
        />
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 2, opacity: 0.05 }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-white"
        />
      </div>

      {/* Logo Container */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ 
          scale: phase === 'exit' ? 0.8 : 1, 
          rotate: 0,
          y: phase === 'hold' ? -10 : 0
        }}
        transition={{ 
          type: "spring", 
          stiffness: 200, 
          damping: 15,
          duration: 0.6 
        }}
        className="relative"
      >
        {/* Glow effect */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.6, 0.3], scale: [0.8, 1.2, 1.1] }}
          transition={{ duration: 1.5, delay: 0.3 }}
          className="absolute inset-0 blur-2xl bg-white/40 rounded-full"
          style={{ width: 140, height: 140, top: -10, left: -10 }}
        />
        
        {/* Logo */}
        <motion.img
          src={logo}
          alt="AZA"
          className="w-44 h-44 object-contain relative z-10 drop-shadow-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        />
      </motion.div>

      {/* App Name */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="mt-6 text-center"
      >
        <h1 className="text-4xl font-black text-primary-foreground tracking-tight">
          AZA
        </h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-primary-foreground/80 text-sm font-medium mt-1"
        >
          Suas finanças em jogo
        </motion.p>
      </motion.div>

      {/* Loading indicator */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="absolute bottom-24 w-32 h-1 bg-white/20 rounded-full overflow-hidden"
      >
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ 
            duration: 1.2, 
            delay: 1,
            ease: "easeInOut",
            repeat: 0
          }}
          className="h-full w-full bg-white/60 rounded-full"
        />
      </motion.div>
    </motion.div>
  );
}