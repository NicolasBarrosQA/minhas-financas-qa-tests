import type { AvatarConfig } from "@/types/avatar";

// Base pig imports
import basePink from "@/assets/avatar/base-pink.png";
import baseGold from "@/assets/avatar/base-gold.png";
import baseBlue from "@/assets/avatar/base-blue.png";
import baseLavender from "@/assets/avatar/base-lavender.png";
import baseMint from "@/assets/avatar/base-mint.png";

// Accessory imports
import accCrown from "@/assets/avatar/acc-crown.png";
import accAviator from "@/assets/avatar/acc-aviator.png";
import accGlasses from "@/assets/avatar/acc-glasses.png";
import accPartyhat from "@/assets/avatar/acc-partyhat.png";
import accFlowers from "@/assets/avatar/acc-flowers.png";

export const BASE_IMAGES: Record<string, string> = {
  pink: basePink,
  gold: baseGold,
  blue: baseBlue,
  lavender: baseLavender,
  mint: baseMint,
};

// Only keep pig-compatible overlays in the main experience.
export const ACCESSORY_CONFIG: Record<string, { src: string; position: string }> = {
  crown: { src: accCrown, position: "top-[-18%] left-[11%] w-[78%]" },
  partyhat: { src: accPartyhat, position: "top-[-22%] left-[19%] w-[62%]" },
  flowers: { src: accFlowers, position: "top-[-13%] left-[7%] w-[86%]" },
  // Legacy options kept for backward compatibility, but hidden in editor.
  aviator: { src: accAviator, position: "top-[-9999px] left-[-9999px] w-0" },
  glasses: { src: accGlasses, position: "top-[-9999px] left-[-9999px] w-0" },
};

interface AvatarComposerProps {
  config: AvatarConfig;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showFrame?: boolean;
}

const sizeClasses = {
  sm: "w-16 h-16",
  md: "w-24 h-24",
  lg: "w-32 h-32",
  xl: "w-40 h-40",
};

export function AvatarComposer({ config, size = "md", className = "" }: AvatarComposerProps) {
  const baseImg = BASE_IMAGES[config.baseColor] ?? basePink;
  const acc =
    config.accessory !== "none" && (config.accessory === "crown" || config.accessory === "partyhat" || config.accessory === "flowers")
      ? ACCESSORY_CONFIG[config.accessory]
      : null;

  return (
    <div
      className={`relative ${sizeClasses[size]} ${className}`}
    >
      <div
        className="absolute inset-0 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.22)]"
        style={{
          background: `radial-gradient(120% 120% at 18% 12%, rgba(255,255,255,0.85) 0%, ${config.background} 58%, rgba(0,0,0,0.08) 100%)`,
        }}
      />
      <div className="absolute inset-[3%] rounded-full overflow-hidden border border-white/60">
        <img src={baseImg} alt="Avatar" className="w-full h-full object-cover" />
      </div>

      {/* Overlay accessory */}
      {acc && (
        <img
          src={acc.src}
          alt={config.accessory}
          className={`absolute ${acc.position} pointer-events-none`}
        />
      )}

      <div className="absolute inset-0 rounded-full ring-1 ring-black/10 pointer-events-none" />
    </div>
  );
}
