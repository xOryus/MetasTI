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
 * Obter intervalo de datas baseado no período da meta e na data de referência (calendário atual)
 * A janela é alinhada ao calendário do referenceDate e CLAMP no início pela data de criação da meta.
 * Ex.: Mensal → [início do mês atual, fim do mês atual], mas não antes da criação da meta.
 */
export const getPeriodInterval = (
  period: GoalPeriod, 
  goalCreatedAt: string, // Data de criação da meta
  referenceDate: Date = new Date()
) => {
  const goalCreationDate = parseISO(goalCreatedAt);

  let calendarStart: Date;
  let calendarEnd: Date;

  switch (period) {
    case GoalPeriod.DAILY: {
      calendarStart = startOfDay(referenceDate);
      calendarEnd = endOfDay(referenceDate);
      break;
    }
    case GoalPeriod.WEEKLY: {
      calendarStart = startOfWeek(referenceDate);
      calendarEnd = endOfWeek(referenceDate);
      break;
    }
    case GoalPeriod.MONTHLY: {
      calendarStart = startOfMonth(referenceDate);
      calendarEnd = endOfMonth(referenceDate);
      break;
    }
    case GoalPeriod.QUARTERLY: {
      calendarStart = startOfQuarter(referenceDate);
      calendarEnd = endOfQuarter(referenceDate);
      break;
    }
    case GoalPeriod.YEARLY: {
      calendarStart = startOfYear(referenceDate);
      calendarEnd = endOfYear(referenceDate);
      break;
    }
    default:
      throw new Error(`Período não suportado: ${period}`);
  }

  // Início não pode ser antes da criação da meta
  const start = goalCreationDate > calendarStart ? startOfDay(goalCreationDate) : calendarStart;
  const end = calendarEnd;
  return { start, end };
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
  // Regra de exibição do valor diário:
  // - Diário: valor integral
  // - Semanal: dividir por 7
  // - Mensal: dividir pelos dias do mês calendário de referência
  // - Trimestral: dividir pelos dias do trimestre calendário de referência
  // - Anual: dividir pelos dias do ano calendário de referência
  // Motivo: exibição estável e coerente com a perspectiva do período do calendário,
  // independente do dia de criação da meta.
  switch (period) {
    case GoalPeriod.DAILY: {
      // Metas diárias: o valor total é distribuído pelos dias do mês calendário atual
      const start = startOfMonth(referenceDate);
      const end = endOfMonth(referenceDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return Math.round(monetaryValue / days);
    }
    case GoalPeriod.WEEKLY: {
      return Math.round(monetaryValue / 7);
    }
    case GoalPeriod.MONTHLY: {
      const start = startOfMonth(referenceDate);
      const end = endOfMonth(referenceDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return Math.round(monetaryValue / days);
    }
    case GoalPeriod.QUARTERLY: {
      const start = startOfQuarter(referenceDate);
      const end = endOfQuarter(referenceDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return Math.round(monetaryValue / days);
    }
    case GoalPeriod.YEARLY: {
      const start = startOfYear(referenceDate);
      const end = endOfYear(referenceDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return Math.round(monetaryValue / days);
    }
    default: {
      const periodInterval = getPeriodInterval(period, goalCreatedAt, referenceDate);
      const daysInPeriod = Math.ceil((periodInterval.end.getTime() - periodInterval.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return Math.round(monetaryValue / daysInPeriod);
    }
  }
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
          // CORREÇÃO: Para metas numéricas, somar os valores (não fazer média)
          if (goal.type === 'numeric') {
            totalCurrentValue += currentValue;
          } else {
            // Para outros tipos, manter a lógica de média para compatibilidade
            totalCurrentValue += currentValue;
            submissionsWithValue++;
          }
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

  const completionRate = totalDaysInPeriod > 0 
    ? (daysAchieved / totalDaysInPeriod) * 100 
    : 0;

  // Nova regra de conclusão:
  // - Diário: precisa atingir TODOS os dias do período (100%)
  // - Demais períodos (semanal/mensal/...): basta atingir pelo menos 1 dia no período
  const achieved = goal.period === GoalPeriod.DAILY
    ? daysAchieved === totalDaysInPeriod
    : daysAchieved > 0;

  // CORREÇÃO: Para metas numéricas, usar o valor total acumulado
  // Para outros tipos, usar a média como antes
  let finalCurrentValue = 0;
  if (goal.type === 'numeric') {
    finalCurrentValue = totalCurrentValue; // Valor total acumulado
  } else {
    finalCurrentValue = submissionsWithValue > 0 ? totalCurrentValue / submissionsWithValue : 0;
  }

  return { 
    achieved, 
    completionRate, 
    daysAchieved, 
    totalDaysInPeriod,
    currentValue: finalCurrentValue
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
    
    // Cálculo de ganho conforme regra de período
    let earnedAmount = 0;
    if (goal.period === GoalPeriod.DAILY) {
      // Diário: paga por dia batido dentro do período; valor diário é o total do mês dividido por dias do mês
      earnedAmount = daysAchieved * dailyValue;
    } else {
      // Semanal/Mensal/Trimestral/Anual: paga 1x o valor total quando houver ao menos 1 dia atingido no período
      if (goal.type === 'numeric' && currentValue && currentValue > 0) {
        const progressRatio = Math.min(currentValue / goal.targetValue, 1);
        earnedAmount = daysAchieved > 0 ? Math.round(goal.monetaryValue! * progressRatio) : 0;
      } else {
        earnedAmount = daysAchieved > 0 ? goal.monetaryValue! : 0;
      }
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
      const isPeriodCompleted = referenceDate > periodInterval.end;
      if (isPeriodCompleted) totalPendingRewards += earnedAmount;

      // Distribuição dos ganhos conforme recorte de referência:
      // - Para metas diárias: ganhos podem cair em Today/Week/Month proporcionalmente por dia
      //   (já que earnedAmount já é a soma diária do período atual, contamos no mês/semana/dia se sobrepor)
      // - Para metas não diárias: o ganho é 1x no período; se o período sobrepõe o mês/semana/hoje, contamos integralmente
      if (doPeriodsOverlap(periodInterval, monthInterval)) {
        totalEarnedThisMonth += earnedAmount;
      }

      if (doPeriodsOverlap(periodInterval, weekInterval)) {
        totalEarnedThisWeek += earnedAmount;
      }

      if (doPeriodsOverlap(periodInterval, todayInterval)) {
        if (goal.period === GoalPeriod.DAILY) {
          // Aproximação: considerar apenas 1 dia do valor diário quando há sobreposição com hoje
          totalEarnedToday += Math.min(dailyValue, earnedAmount);
        } else {
          // Para não diárias, quando há qualquer dia hoje dentro do período, exibimos 0 para Today
          // pois o pagamento é 1x no período e não fracionamos por dia para Today.
          // Mantemos 0 aqui para evitar percepção de pagamento diário em metas mensais.
        }
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
