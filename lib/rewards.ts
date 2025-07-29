/**
 * Utilitários para cálculo de recompensas monetárias baseadas em períodos
 * Implementa lógica de ciclos dinâmicos para premiação de metas
 */

import { GoalPeriod, type SectorGoal, type Submission } from '@/lib/appwrite';
import { centavosToReais } from '@/lib/currency';
import { 
  startOfDay, endOfDay, 
  startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter,
  startOfYear, endOfYear,
  isWithinInterval,
  parseISO
} from 'date-fns';

/**
 * Interface para representar uma recompensa calculada
 */
export interface CalculatedReward {
  goalId: string;
  goalTitle: string;
  periodType: GoalPeriod;
  totalMonetaryValue: number; // valor total da meta em centavos
  dailyValue: number; // valor por dia em centavos
  periodStart: Date;
  periodEnd: Date;
  isEarned: boolean;
  completionRate: number; // percentual de conclusão no período
  daysAchieved: number; // quantos dias foram atingidos
  totalDaysInPeriod: number; // total de dias no período
  earnedAmount: number; // valor efetivamente ganho em centavos
}

/**
 * Interface para estatísticas de recompensas de um colaborador
 */
export interface UserRewardStats {
  totalEarnedThisMonth: number; // em centavos
  totalEarnedThisWeek: number; // em centavos
  totalEarnedToday: number; // em centavos
  totalPendingRewards: number; // em centavos
  totalAvailableRewards: number; // em centavos
  rewardsByPeriod: CalculatedReward[];
}

/**
 * Obter intervalo de datas baseado no período da meta
 */
export const getPeriodInterval = (period: GoalPeriod, referenceDate: Date = new Date()) => {
  switch (period) {
    case GoalPeriod.DAILY:
      return {
        start: startOfDay(referenceDate),
        end: endOfDay(referenceDate)
      };
    case GoalPeriod.WEEKLY:
      return {
        start: startOfWeek(referenceDate, { weekStartsOn: 1 }), // Segunda-feira
        end: endOfWeek(referenceDate, { weekStartsOn: 1 })
      };
    case GoalPeriod.MONTHLY:
      return {
        start: startOfMonth(referenceDate),
        end: endOfMonth(referenceDate)
      };
    case GoalPeriod.QUARTERLY:
      return {
        start: startOfQuarter(referenceDate),
        end: endOfQuarter(referenceDate)
      };
    case GoalPeriod.YEARLY:
      return {
        start: startOfYear(referenceDate),
        end: endOfYear(referenceDate)
      };
    default:
      throw new Error(`Período não suportado: ${period}`);
  }
};

/**
 * Obter número de dias em um período específico
 */
export const getDaysInPeriod = (period: GoalPeriod, referenceDate: Date = new Date()): number => {
  switch (period) {
    case GoalPeriod.DAILY:
      return 1;
    case GoalPeriod.WEEKLY:
      return 7;
    case GoalPeriod.MONTHLY:
      // Pegar o número real de dias no mês atual
      const monthInterval = getPeriodInterval(GoalPeriod.MONTHLY, referenceDate);
      return Math.ceil((monthInterval.end.getTime() - monthInterval.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    case GoalPeriod.QUARTERLY:
      // Aproximadamente 90 dias (pode variar)
      const quarterInterval = getPeriodInterval(GoalPeriod.QUARTERLY, referenceDate);
      return Math.ceil((quarterInterval.end.getTime() - quarterInterval.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    case GoalPeriod.YEARLY:
      // Verificar se é ano bissexto
      const year = referenceDate.getFullYear();
      return ((year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)) ? 366 : 365;
    default:
      return 1;
  }
};

/**
 * Calcular valor diário da recompensa baseado no período
 */
export const calculateDailyRewardValue = (
  monetaryValue: number, // em centavos
  period: GoalPeriod,
  referenceDate: Date = new Date()
): number => {
  const daysInPeriod = getDaysInPeriod(period, referenceDate);
  return Math.round(monetaryValue / daysInPeriod);
};

/**
 * Verificar se uma meta foi atingida no período especificado
 * Retorna também o número de dias que a meta foi atingida
 */
export const isGoalAchievedInPeriod = (
  goal: SectorGoal,
  submissions: Submission[],
  userId: string,
  periodStart: Date,
  periodEnd: Date
): { achieved: boolean; completionRate: number; daysAchieved: number; totalDaysInPeriod: number } => {
  // Filtrar submissões do usuário no período
  const userSubmissions = submissions.filter(sub => 
    sub.userProfile.userId === userId &&
    isWithinInterval(parseISO(sub.$createdAt!), { start: periodStart, end: periodEnd })
  );

  const totalDaysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (userSubmissions.length === 0) {
    return { achieved: false, completionRate: 0, daysAchieved: 0, totalDaysInPeriod };
  }

  // Contar quantos dias a meta foi atingida
  let daysAchieved = 0;
  
  for (const submission of userSubmissions) {
    try {
      const checklist = JSON.parse(submission.checklist);
      const goalResult = checklist[goal.$id!];
      
      let dayAchieved = false;
      
      if (typeof goalResult === 'boolean') {
        dayAchieved = goalResult;
      } else if (goal.type === 'numeric' || goal.type === 'percentage') {
        const value = parseFloat(goalResult) || 0;
        dayAchieved = value >= goal.targetValue;
      }
      
      if (dayAchieved) {
        daysAchieved++;
      }
    } catch (error) {
      // Ignora erros de parsing
      continue;
    }
  }

  const completionRate = userSubmissions.length > 0 
    ? (daysAchieved / userSubmissions.length) * 100 
    : 0;

  // Para períodos mais longos, considerar atingido se pelo menos 80% dos dias foram cumpridos
  // Para período diário, precisa de 100%
  const requiredRate = goal.period === GoalPeriod.DAILY ? 100 : 80;
  const achieved = completionRate >= requiredRate;

  return { achieved, completionRate, daysAchieved, totalDaysInPeriod };
};

/**
 * Calcular recompensas de um usuário para suas metas individuais
 */
export const calculateUserRewards = (
  goals: SectorGoal[],
  submissions: Submission[],
  userId: string,
  referenceDate: Date = new Date()
): UserRewardStats => {
  // Filtrar apenas metas individuais com recompensa monetária do usuário
  const userGoalsWithRewards = goals.filter(goal => 
    goal.scope === 'individual' && 
    goal.assignedUserId === userId &&
    goal.hasMonetaryReward && 
    goal.monetaryValue && 
    goal.monetaryValue > 0 &&
    goal.isActive
  );

  const rewardsByPeriod: CalculatedReward[] = [];
  let totalEarnedThisMonth = 0;
  let totalEarnedThisWeek = 0;
  let totalEarnedToday = 0;
  let totalPendingRewards = 0;
  let totalAvailableRewards = 0;

  // Obter intervalos de referência
  const todayInterval = getPeriodInterval(GoalPeriod.DAILY, referenceDate);
  const weekInterval = getPeriodInterval(GoalPeriod.WEEKLY, referenceDate);
  const monthInterval = getPeriodInterval(GoalPeriod.MONTHLY, referenceDate);

  for (const goal of userGoalsWithRewards) {
    const periodInterval = getPeriodInterval(goal.period, referenceDate);
    const { achieved, completionRate, daysAchieved, totalDaysInPeriod } = isGoalAchievedInPeriod(
      goal, 
      submissions, 
      userId, 
      periodInterval.start, 
      periodInterval.end
    );

    // Calcular valor diário e valor ganho
    const dailyValue = calculateDailyRewardValue(goal.monetaryValue!, goal.period, referenceDate);
    const earnedAmount = daysAchieved * dailyValue;

    const reward: CalculatedReward = {
      goalId: goal.$id!,
      goalTitle: goal.title,
      periodType: goal.period,
      totalMonetaryValue: goal.monetaryValue!,
      dailyValue: dailyValue,
      periodStart: periodInterval.start,
      periodEnd: periodInterval.end,
      isEarned: achieved,
      completionRate,
      daysAchieved,
      totalDaysInPeriod,
      earnedAmount
    };

    rewardsByPeriod.push(reward);
    totalAvailableRewards += goal.monetaryValue!;

    // Adicionar aos totais baseado no valor efetivamente ganho
    if (earnedAmount > 0) {
      // Verificar se a recompensa já foi "paga" (período já passou)
      const isPeriodCompleted = referenceDate > periodInterval.end;
      
      if (isPeriodCompleted) {
        // Período completado, recompensa foi ganha
        totalPendingRewards += earnedAmount;
      }

      // Contabilizar recompensas por período de referência
      if (isWithinInterval(periodInterval.start, monthInterval) || 
          isWithinInterval(periodInterval.end, monthInterval)) {
        totalEarnedThisMonth += earnedAmount;
      }

      if (isWithinInterval(periodInterval.start, weekInterval) || 
          isWithinInterval(periodInterval.end, weekInterval)) {
        totalEarnedThisWeek += earnedAmount;
      }

      if (isWithinInterval(periodInterval.start, todayInterval) || 
          isWithinInterval(periodInterval.end, todayInterval)) {
        totalEarnedToday += earnedAmount;
      }
    }
  }

  return {
    totalEarnedThisMonth,
    totalEarnedThisWeek,
    totalEarnedToday,
    totalPendingRewards,
    totalAvailableRewards,
    rewardsByPeriod
  };
};

/**
 * Formatar período para exibição
 */
export const formatPeriodDisplay = (period: GoalPeriod): string => {
  const periodNames: Record<GoalPeriod, string> = {
    [GoalPeriod.DAILY]: 'Diária',
    [GoalPeriod.WEEKLY]: 'Semanal', 
    [GoalPeriod.MONTHLY]: 'Mensal',
    [GoalPeriod.QUARTERLY]: 'Trimestral',
    [GoalPeriod.YEARLY]: 'Anual'
  };
  
  return periodNames[period] || period;
};

/**
 * Obter próxima data de reset do período
 */
export const getNextPeriodReset = (period: GoalPeriod, referenceDate: Date = new Date()): Date => {
  const interval = getPeriodInterval(period, referenceDate);
  return interval.end;
};

/**
 * Verificar se um período está ativo (ainda não terminou)
 */
export const isPeriodActive = (period: GoalPeriod, referenceDate: Date = new Date()): boolean => {
  const interval = getPeriodInterval(period, referenceDate);
  return referenceDate <= interval.end;
};

/**
 * Calcular total de recompensas ganhas em um mês específico
 */
export const calculateMonthlyEarnings = (
  goals: SectorGoal[],
  submissions: Submission[],
  userId: string,
  month: Date
): number => {
  const monthInterval = getPeriodInterval(GoalPeriod.MONTHLY, month);
  const userGoalsWithRewards = goals.filter(goal => 
    goal.scope === 'individual' && 
    goal.assignedUserId === userId &&
    goal.hasMonetaryReward && 
    goal.monetaryValue && 
    goal.monetaryValue > 0 &&
    goal.isActive
  );

  let totalEarnings = 0;

  for (const goal of userGoalsWithRewards) {
    const periodInterval = getPeriodInterval(goal.period, month);
    
    // Verificar se o período da meta se sobrepõe com o mês consultado
    const periodsOverlap = 
      periodInterval.start <= monthInterval.end && 
      periodInterval.end >= monthInterval.start;

    if (periodsOverlap) {
      const { daysAchieved } = isGoalAchievedInPeriod(
        goal, 
        submissions, 
        userId, 
        periodInterval.start, 
        periodInterval.end
      );

      if (daysAchieved > 0) {
        const dailyValue = calculateDailyRewardValue(goal.monetaryValue!, goal.period, month);
        const earnedAmount = daysAchieved * dailyValue;
        totalEarnings += earnedAmount;
      }
    }
  }

  return totalEarnings;
};
