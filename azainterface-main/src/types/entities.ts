// ============= USER & AUTH =============
export interface User {
  id: string;
  email: string;
  name: string;
  cpf: string;
  phone?: string;
  birthDate?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  streak?: UserStreak;
  score?: UserScore;
  xp?: UserXP;
  badges?: string[];
  achievements?: {
    totalUnlocked: number;
    unviewedCount: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ============= ACCOUNTS =============
export type AccountType = 'CORRENTE' | 'POUPANCA' | 'CARTEIRA' | 'INVESTIMENTO' | 'CREDITO' | 'OUTROS';

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  initialBalance: number;
  isAuto: boolean;
  isArchived?: boolean;
  color?: string;
  institution?: string;
  createdAt: string;
  updatedAt: string;
  cards: Card[];
}

export interface CreateAccountPayload {
  name: string;
  type: AccountType;
  initialBalance?: number;
  color?: string;
  institution?: string;
}

export interface UpdateAccountPayload {
  name?: string;
  color?: string;
  institution?: string;
}

// ============= CARDS =============
export type CardType = 'CREDITO' | 'DEBITO' | 'CREDITO_E_DEBITO';

export interface Card {
  id: string;
  userId: string;
  accountId?: string;
  name: string;
  type: CardType;
  limit: number;
  currentSpend?: number;
  availableLimit?: number;
  closingDay: number;
  dueDay: number;
  brand?: string;
  lastFourDigits?: string;
  color?: string;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCardPayload {
  name: string;
  type: CardType;
  limit: number;
  closingDay: number;
  dueDay: number;
  brand?: string;
  lastFourDigits?: string;
  accountId?: string;
  color?: string;
}

export interface UpdateCardPayload {
  name?: string;
  limit?: number;
  closingDay?: number;
  dueDay?: number;
  accountId?: string;
  color?: string;
}

// ============= TRANSACTIONS =============
export type TransactionType = 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA';
export type TransactionStatus = 'PENDENTE' | 'EFETIVADA' | 'CANCELADA';
export type TransactionOrigin = 'MANUAL' | 'RECORRENTE' | 'TRANSFERENCIA' | 'IMPORTADA';

export interface TransactionTag {
  id: string;
  tag: {
    id: string;
    name: string;
    color?: string;
  };
}

export interface Transaction {
  id: string;
  userId: string;
  accountId?: string;
  cardId?: string;
  invoiceId?: string;
  categoryId?: string;
  recurrenceId?: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  status: TransactionStatus;
  origin: TransactionOrigin;
  isPending: boolean;
  isRecurring: boolean;
  installmentNumber?: number;
  totalInstallments?: number;
  installmentSeriesId?: string;
  note?: string;
  transferToAccountId?: string;
  createdAt: string;
  updatedAt: string;
  account?: Account;
  card?: Card;
  category?: Category;
  tags: TransactionTag[];
}

export interface TransactionFilters {
  accountId?: string;
  cardId?: string;
  categoryId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  tag?: string;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'amount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateTransactionPayload {
  accountId?: string;
  cardId?: string;
  categoryId?: string;
  invoiceId?: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  status?: TransactionStatus;
  origin?: TransactionOrigin;
  isRecurring?: boolean;
  note?: string;
  transferToAccountId?: string;
  tags?: string[];
}

export interface UpdateTransactionPayload {
  categoryId?: string;
  description?: string;
  date?: string;
  note?: string;
  status?: TransactionStatus;
  tags?: string[];
}

export interface TransactionSummary {
  period: {
    startDate: string;
    endDate: string;
  };
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    total: number;
    percentage: number;
  }>;
  dailyBalance: Array<{
    date: string;
    income: number;
    expense: number;
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============= CATEGORIES =============
export type CategoryType = 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA';

export interface Category {
  id: string;
  userId: string | null;
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
  parentId?: string;
  isSystem: boolean;
  children?: Category[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryPayload {
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
  parentId?: string;
}

export interface UpdateCategoryPayload {
  name?: string;
  color?: string;
  icon?: string;
}

// ============= TAGS =============
export interface Tag {
  id: string;
  userId: string;
  name: string;
  color?: string;
  transactionCount: number;
  createdAt: string;
}

export interface CreateTagPayload {
  name: string;
  color?: string;
}

// ============= INVOICES =============
export type InvoiceStatus = 'ABERTA' | 'PARCIALMENTE_PAGA' | 'PAGA' | 'ATRASADA';

export interface Invoice {
  id: string;
  userId: string;
  cardId: string;
  month: number;
  year: number;
  openingDate: string;
  dueDate: string;
  closingBalance: number;
  minimumPayment: number;
  status: InvoiceStatus;
  paidAmount: number;
  transactions: Transaction[];
  card?: Card;
}

export interface PayInvoicePayload {
  amount: number;
  accountId: string;
  date?: string;
}

export interface PayInvoiceResponse {
  invoice: Invoice;
  transaction: Transaction;
}

// ============= RECURRENCES =============
export type RecurrenceFrequency = 'DIARIA' | 'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
export type RecurrenceType = 'RECEITA' | 'DESPESA';

export interface Recurrence {
  id: string;
  userId: string;
  categoryId?: string;
  accountId?: string;
  name: string;
  type: RecurrenceType;
  frequency: RecurrenceFrequency;
  amount: number;
  dayOfMonth?: number;
  dayOfWeek?: number;
  lastRun?: string;
  nextRun: string;
  isActive: boolean;
  category?: Category;
}

export interface CreateRecurrencePayload {
  name: string;
  type: RecurrenceType;
  categoryId?: string;
  accountId?: string;
  amount: number;
  frequency: RecurrenceFrequency;
  dayOfMonth?: number;
  dayOfWeek?: number;
  startDate: string;
}

export interface UpdateRecurrencePayload {
  name?: string;
  categoryId?: string;
  amount?: number;
  frequency?: RecurrenceFrequency;
  dayOfMonth?: number;
  dayOfWeek?: number;
  isActive?: boolean;
}

// ============= BUDGETS =============
export type BudgetPeriod = 'SEMANAL' | 'MENSAL' | 'ANUAL' | 'CUSTOM';
export type BudgetStatus = 'ON_TRACK' | 'WARNING' | 'OVER';

export interface Budget {
  id: string;
  userId: string;
  categoryId?: string;
  name: string;
  amount: number;
  spent: number;
  remaining: number;
  period: BudgetPeriod;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  category?: Category;
  progress: number;
  status: BudgetStatus;
}

export interface CreateBudgetPayload {
  name: string;
  categoryId?: string;
  amount: number;
  period: BudgetPeriod;
  startDate: string;
  endDate?: string;
}

export interface UpdateBudgetPayload {
  name?: string;
  amount?: number;
  categoryId?: string;
  isActive?: boolean;
}

// ============= GOALS =============
export type GoalStatus = 'ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA' | 'PAUSADA';
export type GoalMovementType = 'APORTE' | 'RETIRADA';

export interface GoalMovement {
  id: string;
  goalId: string;
  type: GoalMovementType;
  amount: number;
  description?: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  deadline?: string;
  status: GoalStatus;
  category?: string;
  icon?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
  movements: GoalMovement[];
}

export interface CreateGoalPayload {
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount?: number;
  deadline?: string;
  category?: string;
  icon?: string;
  color?: string;
}

export interface UpdateGoalPayload {
  name?: string;
  description?: string;
  targetAmount?: number;
  deadline?: string;
  status?: GoalStatus;
  category?: string;
  icon?: string;
  color?: string;
}

export interface CreateGoalMovementPayload {
  type: GoalMovementType;
  amount: number;
  description?: string;
  date?: string;
}

export interface GoalMovementResponse {
  goal: Goal;
  movement: GoalMovement;
}

// ============= GAMIFICATION - XP =============
export type XPLevel = 'INICIANTE' | 'APRENDIZ' | 'CONTROLADO' | 'EXPERT' | 'LENDARIO';

export interface XPEvent {
  id: string;
  userId: string;
  xpAmount: number;
  eventType: string;
  description: string;
  createdAt: string;
}

export interface AntiFraudStatus {
  isLimited: boolean;
  dailyXpUsed: number;
  dailyXpLimit: number;
  recentEvents?: Array<{
    type: string;
    xpAmount: number;
    timestamp: string;
    status: 'APROVED' | 'LIMITED' | 'DECAYED';
  }>;
}

export interface UserXP {
  currentXp: number;
  level: XPLevel;
  nextLevelXp: number;
  progressToNextLevel: number;
  xpToNextLevel: number;
  rank: number;
  totalUsers?: number;
  recentHistory?: XPEvent[];
  antiFraudStatus?: AntiFraudStatus;
}

export interface LeaderboardUser {
  userId: string;
  name: string;
  avatar?: string;
  xp: number;
  level: string;
  rank: number;
}

export interface Leaderboard {
  myRank: number;
  totalUsers: number;
  topUsers: LeaderboardUser[];
  nearbyUsers: LeaderboardUser[];
}

// ============= GAMIFICATION - STREAK =============
export type StreakLevel = 'INICIANTE' | 'REGULAR' | 'CONSISTENTE' | 'DEDICADO' | 'MESTRE';

export interface StreakMilestone {
  daysRequired: number;
  xpReward: number;
  title: string;
  isUnlocked?: boolean;
}

export interface UserStreak {
  userId?: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  streakFreezes: number;
  level?: StreakLevel;
  nextMilestone?: StreakMilestone;
  milestones?: StreakMilestone[];
}

export interface UseStreakFreezeResponse {
  streakFreezesRemaining: number;
  currentStreak: number;
}

// ============= GAMIFICATION - SCORE =============
export type ScoreLevel = 'ATENCAO' | 'REGULAR' | 'BOM' | 'EXCELENTE';

export interface UserScore {
  healthScore: number;
  level: ScoreLevel;
  habitsScore: number;
  stabilityScore: number;
  debtsScore: number;
  goalsScore: number;
  suggestions: string[];
  lastCalculationAt?: string;
}

// ============= GAMIFICATION - BADGES =============
export type BadgeRarity = 'COMUM' | 'RARA' | 'EPICA' | 'LENDARIA';

export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: BadgeRarity;
  color: string;
  earnedAt?: string;
}

export interface BadgesResponse {
  earned: Badge[];
  available: Badge[];
  totalEarned: number;
  totalAvailable: number;
}

// ============= GAMIFICATION - ACHIEVEMENTS =============
export type AchievementDifficulty = 'FACIL' | 'MEDIO' | 'DIFICIL';

export interface AchievementCriteria {
  triggerType: string;
  targetValue: number;
  description: string;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  difficulty: AchievementDifficulty;
  xpReward: number;
  badge?: Badge;
  progress: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  isViewed: boolean;
  criteria: AchievementCriteria;
}

// ============= GAMIFICATION - CHALLENGES =============
export type ChallengeType = 'DIARIO' | 'SEMANAL' | 'MENSAL' | 'ESPECIAL';
export type ChallengeDifficulty = 'FACIL' | 'MEDIO' | 'DIFICIL';
export type ChallengeStatus = 'ATIVO' | 'COMPLETO' | 'FALHO' | 'CANCELADO';

export interface ChallengeCriteria {
  type: string;
  target: number;
  description: string;
}

export interface ChallengeProgress {
  status: ChallengeStatus;
  progress: number;
  startedAt: string;
  completedAt?: string;
}

export interface Challenge {
  id: string;
  code: string;
  title: string;
  description: string;
  type: ChallengeType;
  category: string;
  difficulty: ChallengeDifficulty;
  xpReward: number;
  badgeReward?: Badge;
  criteria: ChallengeCriteria;
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  isActive: boolean;
  myProgress?: ChallengeProgress;
}

export interface UserChallenge extends Challenge {
  myProgress: ChallengeProgress;
}

export interface ChallengesResponse {
  available: Challenge[];
  active: UserChallenge[];
  completed: UserChallenge[];
  failed: UserChallenge[];
}

// ============= DASHBOARD =============
export interface DashboardSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  accounts: Account[];
  cards: Card[];
  recentTransactions: Transaction[];
  streak?: UserStreak;
  score?: UserScore;
  xp?: UserXP;
}

// ============= API RESPONSE WRAPPERS =============
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
