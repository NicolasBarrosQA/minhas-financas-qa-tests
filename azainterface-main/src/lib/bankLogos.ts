// Mapeamento de logos de bancos brasileiros usando assets locais
import nubankLogo from "@/assets/banks/nubank.png";
import itauLogo from "@/assets/banks/itau.png";
import interLogo from "@/assets/banks/inter.png";
import bradescoLogo from "@/assets/banks/bradesco.png";
import bbLogo from "@/assets/banks/bb.png";
import santanderLogo from "@/assets/banks/santander.png";
import caixaLogo from "@/assets/banks/caixa.png";
import mercadopagoLogo from "@/assets/banks/mercadopago.png";

export interface BankInfo {
  name: string;
  logo: string;
  color: string;
  initials: string;
}

// Mapeamento usando logos locais
export const BANK_LOGOS: Record<string, BankInfo> = {
  // Nubank
  "nubank": {
    name: "Nubank",
    logo: nubankLogo,
    color: "#820AD1",
    initials: "NU"
  },
  
  // Itaú
  "itau": {
    name: "Itaú",
    logo: itauLogo,
    color: "#EC7000",
    initials: "IT"
  },
  "itaú": {
    name: "Itaú",
    logo: itauLogo,
    color: "#EC7000",
    initials: "IT"
  },
  
  // Inter
  "inter": {
    name: "Inter",
    logo: interLogo,
    color: "#FF7A00",
    initials: "IN"
  },
  "banco inter": {
    name: "Inter",
    logo: interLogo,
    color: "#FF7A00",
    initials: "IN"
  },
  
  // Bradesco
  "bradesco": {
    name: "Bradesco",
    logo: bradescoLogo,
    color: "#CC092F",
    initials: "BR"
  },
  
  // Banco do Brasil
  "banco do brasil": {
    name: "Banco do Brasil",
    logo: bbLogo,
    color: "#FFEF00",
    initials: "BB"
  },
  "bb": {
    name: "Banco do Brasil",
    logo: bbLogo,
    color: "#FFEF00",
    initials: "BB"
  },
  
  // Santander
  "santander": {
    name: "Santander",
    logo: santanderLogo,
    color: "#EC0000",
    initials: "SA"
  },
  
  // Caixa
  "caixa": {
    name: "Caixa",
    logo: caixaLogo,
    color: "#005CA9",
    initials: "CX"
  },
  "caixa economica": {
    name: "Caixa",
    logo: caixaLogo,
    color: "#005CA9",
    initials: "CX"
  },
  "caixa econômica": {
    name: "Caixa",
    logo: caixaLogo,
    color: "#005CA9",
    initials: "CX"
  },
  
  // Mercado Pago
  "mercado pago": {
    name: "Mercado Pago",
    logo: mercadopagoLogo,
    color: "#00B1EA",
    initials: "MP"
  },
  "mercadopago": {
    name: "Mercado Pago",
    logo: mercadopagoLogo,
    color: "#00B1EA",
    initials: "MP"
  },
  
  // Bancos sem logo local - usam iniciais coloridas
  "c6": {
    name: "C6 Bank",
    logo: "",
    color: "#242424",
    initials: "C6"
  },
  "c6 bank": {
    name: "C6 Bank",
    logo: "",
    color: "#242424",
    initials: "C6"
  },
  "picpay": {
    name: "PicPay",
    logo: "",
    color: "#21C25E",
    initials: "PP"
  },
  "pagbank": {
    name: "PagBank",
    logo: "",
    color: "#00A859",
    initials: "PB"
  },
  "pagseguro": {
    name: "PagBank",
    logo: "",
    color: "#00A859",
    initials: "PB"
  },
  "neon": {
    name: "Neon",
    logo: "",
    color: "#00FFA3",
    initials: "NE"
  },
  "next": {
    name: "Next",
    logo: "",
    color: "#00E575",
    initials: "NX"
  },
  "original": {
    name: "Banco Original",
    logo: "",
    color: "#00A651",
    initials: "OR"
  },
  "banco original": {
    name: "Banco Original",
    logo: "",
    color: "#00A651",
    initials: "OR"
  },
  "btg": {
    name: "BTG Pactual",
    logo: "",
    color: "#001E62",
    initials: "BT"
  },
  "btg pactual": {
    name: "BTG Pactual",
    logo: "",
    color: "#001E62",
    initials: "BT"
  },
  "xp": {
    name: "XP",
    logo: "",
    color: "#000000",
    initials: "XP"
  },
  "xp investimentos": {
    name: "XP",
    logo: "",
    color: "#000000",
    initials: "XP"
  },
  "sicoob": {
    name: "Sicoob",
    logo: "",
    color: "#003641",
    initials: "SC"
  },
  "sicredi": {
    name: "Sicredi",
    logo: "",
    color: "#00543C",
    initials: "SI"
  },
  "safra": {
    name: "Banco Safra",
    logo: "",
    color: "#00205B",
    initials: "SF"
  },
  "banco safra": {
    name: "Banco Safra",
    logo: "",
    color: "#00205B",
    initials: "SF"
  },
  "pan": {
    name: "Banco Pan",
    logo: "",
    color: "#00AEEF",
    initials: "PN"
  },
  "banco pan": {
    name: "Banco Pan",
    logo: "",
    color: "#00AEEF",
    initials: "PN"
  },
};

/**
 * Busca informações do banco baseado no nome da instituição
 * Faz match parcial e case-insensitive
 */
export function getBankInfo(institutionName?: string | null): BankInfo | null {
  if (!institutionName) return null;
  
  const normalized = institutionName.toLowerCase().trim();
  
  // Busca exata primeiro
  if (BANK_LOGOS[normalized]) {
    return BANK_LOGOS[normalized];
  }
  
  // Busca parcial
  for (const [key, value] of Object.entries(BANK_LOGOS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  return null;
}

/**
 * Gera iniciais a partir do nome da instituição
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Retorna a URL do logo ou null se não encontrar
 */
export function getBankLogo(institutionName?: string | null): string | null {
  const info = getBankInfo(institutionName);
  return info?.logo || null;
}

/**
 * Retorna a cor da marca do banco ou uma cor padrão
 */
export function getBankColor(institutionName?: string | null, defaultColor?: string): string {
  const info = getBankInfo(institutionName);
  return info?.color || defaultColor || "hsl(var(--primary))";
}
