import {
  Briefcase,
  Monitor,
  TrendingUp,
  Coins,
  Utensils,
  Car,
  Home,
  Heart,
  Gamepad2,
  GraduationCap,
  Sparkles,
  Package,
  ShoppingCart,
  Plane,
  Film,
  Smartphone,
  Shirt,
  Gift,
  Zap,
  Dumbbell,
  Dog,
  Pill,
  BookOpen,
  Wrench,
  CreditCard,
  Building,
  Music,
  Coffee,
  Wine,
  ArrowLeftRight,
  Landmark,
  PiggyBank,
  Wallet,
  BarChart3,
  MoreHorizontal,
  Target,
  Flame,
  Trophy,
  Star,
  Award,
  Crown,
  Gem,
  Leaf,
  Rocket,
  Scale,
  Snowflake,
  User,
  Users,
  CircleDollarSign,
  Receipt,
  Calculator,
  type LucideIcon
} from 'lucide-react';

// Mapeamento central de ícones por categoria/tipo
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  // Trabalho & Renda
  'salario': Briefcase,
  'trabalho': Briefcase,
  'freelance': Monitor,
  'investimentos': TrendingUp,
  
  // Despesas principais
  'alimentacao': Utensils,
  'restaurante': Utensils,
  'supermercado': ShoppingCart,
  'transporte': Car,
  'moradia': Home,
  'saude': Heart,
  'lazer': Gamepad2,
  'entretenimento': Gamepad2,
  'educacao': GraduationCap,
  'pessoal': Sparkles,
  'compras': ShoppingCart,
  'outros': Package,
  
  // Subcategorias
  'viagem': Plane,
  'cinema': Film,
  'celular': Smartphone,
  'roupa': Shirt,
  'presente': Gift,
  'energia': Zap,
  'utilidades': Zap,
  'academia': Dumbbell,
  'pet': Dog,
  'farmacia': Pill,
  'livros': BookOpen,
  'manutencao': Wrench,
  'cartao': CreditCard,
  'banco': Building,
  'musica': Music,
  'cafe': Coffee,
  'bebida': Wine,
  
  // Transferências
  'transferencia': ArrowLeftRight,
  
  // Tipos de conta
  'corrente': Landmark,
  'poupanca': PiggyBank,
  'carteira': Wallet,
  'investimento': BarChart3,
  'credito': CreditCard,
  
  // Gamificação
  'meta': Target,
  'streak': Flame,
  'conquista': Trophy,
  'estrela': Star,
  'badge': Award,
  'coroa': Crown,
  'diamante': Gem,
  'iniciante': Leaf,
  'foguete': Rocket,
  'balanca': Scale,
  'gelo': Snowflake,
  'usuario': User,
  'usuarios': Users,
  'dinheiro': CircleDollarSign,
  'recibo': Receipt,
  'calculadora': Calculator,
  'moeda': Coins,
};

// Função para obter ícone por nome
export function getCategoryIcon(iconName: string): LucideIcon {
  const normalizedName = iconName.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]/g, ''); // Remove caracteres especiais
  
  return CATEGORY_ICON_MAP[normalizedName] || Package;
}

// Ícones disponíveis para seleção (para formulários)
export const AVAILABLE_ICONS = [
  { name: 'trabalho', label: 'Trabalho', icon: Briefcase },
  { name: 'freelance', label: 'Freelance', icon: Monitor },
  { name: 'investimentos', label: 'Investimentos', icon: TrendingUp },
  { name: 'dinheiro', label: 'Dinheiro', icon: Coins },
  { name: 'alimentacao', label: 'Alimentação', icon: Utensils },
  { name: 'transporte', label: 'Transporte', icon: Car },
  { name: 'moradia', label: 'Moradia', icon: Home },
  { name: 'saude', label: 'Saúde', icon: Heart },
  { name: 'lazer', label: 'Lazer', icon: Gamepad2 },
  { name: 'educacao', label: 'Educação', icon: GraduationCap },
  { name: 'pessoal', label: 'Pessoal', icon: Sparkles },
  { name: 'compras', label: 'Compras', icon: ShoppingCart },
  { name: 'viagem', label: 'Viagem', icon: Plane },
  { name: 'cinema', label: 'Cinema', icon: Film },
  { name: 'celular', label: 'Celular', icon: Smartphone },
  { name: 'roupa', label: 'Roupas', icon: Shirt },
  { name: 'presente', label: 'Presente', icon: Gift },
  { name: 'energia', label: 'Energia', icon: Zap },
  { name: 'academia', label: 'Academia', icon: Dumbbell },
  { name: 'pet', label: 'Pet', icon: Dog },
  { name: 'farmacia', label: 'Farmácia', icon: Pill },
  { name: 'livros', label: 'Livros', icon: BookOpen },
  { name: 'manutencao', label: 'Manutenção', icon: Wrench },
  { name: 'musica', label: 'Música', icon: Music },
  { name: 'cafe', label: 'Café', icon: Coffee },
  { name: 'outros', label: 'Outros', icon: Package },
];

// Ícones para tipos de conta
export const ACCOUNT_TYPE_ICON_MAP: Record<string, LucideIcon> = {
  'CORRENTE': Landmark,
  'POUPANCA': PiggyBank,
  'CARTEIRA': Wallet,
  'INVESTIMENTO': BarChart3,
  'CREDITO': CreditCard,
  'OUTROS': Package,
};

// Ícones para gamificação
export const GAMIFICATION_ICONS: Record<string, LucideIcon> = {
  'streak': Flame,
  'meta': Target,
  'conquista': Trophy,
  'badge': Award,
  'level': Star,
  'xp': Zap,
};
