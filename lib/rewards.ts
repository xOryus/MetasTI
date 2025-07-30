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
  parseISO,
  isSameDay
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
  goalType: string; // tipo da meta para debug
  targetValue: number; // valor alvo da meta
  currentValue?: number; // valor atual (para metas numéricas)
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
 * VERSÃO CORRIGIDA: Usa períodos baseados no mês atual para metas mensais
 */
export const getPeriodInterval = (
  period: GoalPeriod, 
  goalCreatedAt: string, // Data de criação da meta
  referenceDate: Date = new Date()
) => {
  const goalCreationDate = parseISO(goalCreatedAt);
  
  switch (period) {
    case GoalPeriod.DAILY:
      // Período diário: 24 horas a partir da criação
      return {
        start: startOfDay(goalCreationDate),
        end: endOfDay(goalCreationDate)
      };
      
    case GoalPeriod.WEEKLY:
      // Período semanal: 7 dias a partir da criação
      return {
        start: startOfDay(goalCreationDate),
        end: endOfDay(new Date(goalCreationDate.getTime() + (6 * 24 * 60 * 60 * 1000))) // +6 dias
      };
      
    case GoalPeriod.MONTHLY:
      // Período mensal: do dia da criação até o último dia do mês
      return {
        start: startOfDay(goalCreationDate),
        end: endOfMonth(goalCreationDate) // Último dia do mês da criação
      };
      
    case GoalPeriod.QUARTERLY:
      // Período trimestral: do dia da criação até o final do trimestre
      return {
        start: startOfDay(goalCreationDate),
        end: endOfQuarter(goalCreationDate) // Final do trimestre da criação
      };
      
    case GoalPeriod.YEARLY:
      // Período anual: do dia da criação até o final do ano
      return {
        start: startOfDay(goalCreationDate),
        end: endOfYear(goalCreationDate) // Final do ano da criação
      };
      
    default:
      throw new Error(`Período não suportado: ${period}`);
  }
};

/**
 * Obter número de dias em um período específico
 */
export const getDaysInPeriod = (period: GoalPeriod, goalCreatedAt: string, referenceDate: Date = new Date()): number => {
  const periodInterval = getPeriodInterval(period, goalCreatedAt, referenceDate);
  return Math.ceil((periodInterval.end.getTime() - periodInterval.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Verificar se dois intervalos de tempo se sobrepõem
 */
export const doPeriodsOverlap = (period1: { start: Date; end: Date }, period2: { start: Date; end: Date }): boolean => {
  return period1.start <= period2.end && period1.end >= period2.start;
};

/**
 * Calcular valor diário da recompensa baseado no período
 */
export const calculateDailyRewardValue = (
  monetaryValue: number, // em centavos
  period: GoalPeriod,
  goalCreatedAt: string, // Data de criação da meta
  referenceDate: Date = new Date()
): number => {
  const periodInterval = getPeriodInterval(period, goalCreatedAt, referenceDate);
  const daysInPeriod = Math.ceil((periodInterval.end.getTime() - periodInterval.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.round(monetaryValue / daysInPeriod);
};

/**
 * Verificar se uma meta foi atingida no período especificado
 * Versão refatorada com melhor suporte para diferentes tipos de meta
 */
export const isGoalAchievedInPeriod = (
  goal: SectorGoal,
  submissions: Submission[],
  userId: string,
  periodStart: Date,
  periodEnd: Date
): { achieved: boolean; completionRate: number; daysAchieved: number; totalDaysInPeriod: number; currentValue?: number } => {
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
  let totalCurrentValue = 0;
  let submissionsWithValue = 0;
  
  for (const submission of userSubmissions) {
    try {
      const checklist = JSON.parse(submission.checklist);
      const goalResult = checklist[goal.$id!];
      
      let dayAchieved = false;
      let currentValue = 0;
      
      if (typeof goalResult === 'boolean') {
        // Para metas booleanas (task_completion, boolean_checklist)
        dayAchieved = goalResult;
      } else if (goal.type === 'numeric' || goal.type === 'percentage') {
        // Para metas numéricas e de porcentagem
        currentValue = parseFloat(goalResult) || 0;
        
        if (goal.type === 'numeric') {
          // Meta numérica: atingido se valor >= targetValue
          dayAchieved = currentValue >= goal.targetValue;
        } else if (goal.type === 'percentage') {
          // Meta de porcentagem: atingido se valor >= targetValue%
          dayAchieved = currentValue >= goal.targetValue;
        }
        
        if (currentValue > 0) {
          totalCurrentValue += currentValue;
          submissionsWithValue++;
        }
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

  // Calcular valor médio atual para metas numéricas
  const averageCurrentValue = submissionsWithValue > 0 ? totalCurrentValue / submissionsWithValue : 0;

  return { 
    achieved, 
    completionRate, 
    daysAchieved, 
    totalDaysInPeriod,
    currentValue: averageCurrentValue
  };
};

/**
 * Calcular recompensas de um usuário para suas metas individuais
 * Versão refatorada com melhor integração entre tipos de meta e períodos
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

  // Obter intervalos de referência para contabilização
  const todayInterval = getPeriodInterval(GoalPeriod.DAILY, referenceDate.toISOString(), referenceDate);
  const weekInterval = getPeriodInterval(GoalPeriod.WEEKLY, referenceDate.toISOString(), referenceDate);
  const monthInterval = getPeriodInterval(GoalPeriod.MONTHLY, referenceDate.toISOString(), referenceDate);

  for (const goal of userGoalsWithRewards) {
    const periodInterval = getPeriodInterval(goal.period, goal.$createdAt!, referenceDate);
    const { achieved, completionRate, daysAchieved, totalDaysInPeriod, currentValue } = isGoalAchievedInPeriod(
      goal, 
      submissions, 
      userId, 
      periodInterval.start, 
      periodInterval.end
    );

    // Calcular valor diário e valor ganho
    const dailyValue = calculateDailyRewardValue(goal.monetaryValue!, goal.period, goal.$createdAt!, referenceDate);
    
    // Para metas numéricas, calcular proporcionalmente ao progresso
    let earnedAmount = 0;
    if (goal.type === 'numeric' && currentValue && currentValue > 0) {
      // Calcular proporção do progresso
      const progressRatio = Math.min(currentValue / goal.targetValue, 1);
      earnedAmount = Math.round(goal.monetaryValue! * progressRatio);
    } else {
      // Para outros tipos, usar dias atingidos
      earnedAmount = daysAchieved * dailyValue;
    }

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
      earnedAmount,
      goalType: goal.type,
      targetValue: goal.targetValue,
      currentValue
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

      // Contabilizar recompensas por período de referência usando sobreposição
      if (doPeriodsOverlap(periodInterval, monthInterval)) {
        totalEarnedThisMonth += earnedAmount;
      }

      if (doPeriodsOverlap(periodInterval, weekInterval)) {
        totalEarnedThisWeek += earnedAmount;
      }

      if (doPeriodsOverlap(periodInterval, todayInterval)) {
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
export const getNextPeriodReset = (period: GoalPeriod, goalCreatedAt: string, referenceDate: Date = new Date()): Date => {
  const interval = getPeriodInterval(period, goalCreatedAt, referenceDate);
  return interval.end;
};

/**
 * Verificar se um período está ativo (ainda não terminou)
 */
export const isPeriodActive = (period: GoalPeriod, goalCreatedAt: string, referenceDate: Date = new Date()): boolean => {
  const interval = getPeriodInterval(period, goalCreatedAt, referenceDate);
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
  // Para compatibilidade, usar o mês como referência para períodos fixos
  const monthInterval = getPeriodInterval(GoalPeriod.MONTHLY, month.toISOString(), month);
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
    const periodInterval = getPeriodInterval(goal.period, goal.$createdAt!, month);
    
    // Verificar se o período da meta se sobrepõe com o mês consultado
    const periodsOverlap = doPeriodsOverlap(periodInterval, monthInterval);

    if (periodsOverlap) {
      const { daysAchieved, currentValue } = isGoalAchievedInPeriod(
        goal, 
        submissions, 
        userId, 
        periodInterval.start, 
        periodInterval.end
      );

      if (daysAchieved > 0 || (goal.type === 'numeric' && currentValue && currentValue > 0)) {
        if (goal.type === 'numeric' && currentValue && currentValue > 0) {
          // Para metas numéricas, calcular proporcionalmente
          const progressRatio = Math.min(currentValue / goal.targetValue, 1);
          const earnedAmount = Math.round(goal.monetaryValue! * progressRatio);
          totalEarnings += earnedAmount;
        } else {
          // Para outros tipos, usar dias atingidos
          const dailyValue = calculateDailyRewardValue(goal.monetaryValue!, goal.period, goal.$createdAt!, month);
          const earnedAmount = daysAchieved * dailyValue;
          totalEarnings += earnedAmount;
        }
      }
    }
  }

  return totalEarnings;
};
