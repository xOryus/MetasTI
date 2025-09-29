/**
 * Dashboard Avançado do Gestor
 * Sistema inteligente de monitoramento com alertas, rankings e métricas gerenciais
 * Focado em insights acionáveis para tomada de decisão eficaz
 */

import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Chart } from '@/components/Chart';
import { useAuth } from '@/hooks/useAuth';
import { useSubmissions } from '@/hooks/useSubmissions';
import { useAllProfiles } from '@/hooks/useAllProfiles';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, eachDayOfInterval, differenceInDays, getDaysInMonth } from 'date-fns';
import { 
  Users, TrendingUp, Target, Award, BarChart3, Calendar, 
  Activity, PieChart, Trophy, TrendingDown, Eye, FileImage, User, Download,
  AlertTriangle, Clock, CheckCircle, XCircle, Star, Zap, ChevronDown, ChevronUp, Minimize2, Maximize2,
  MessageSquare, Calendar as CalendarIcon, Filter, Search
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { Role } from '@/lib/roles';
import { account } from '@/lib/appwrite';
import { formatCurrency, centavosToReais } from '@/lib/currency';
import { getFilePreview, getFileDownload } from '@/lib/appwrite';
import { useSectorGoals } from '@/hooks/useSectorGoals';
import { calculateUserRewards } from '@/lib/rewards';
import { useContestations } from '@/hooks/useContestations';
import { ContestationModal } from '@/components/ContestationModal';
import { useCompliments } from '@/hooks/useCompliments';
import { useFeedback } from '@/components/FeedbackProvider';

// Lazy load dos componentes pesados para melhorar LCP
const ProofImageViewer = lazy(() => import('@/components/ProofImageViewer'));

interface DashboardMetrics {
  taxaConclusao: number;
  usuariosAtivos: number;
  metaMensal: number;
  tendencia: 'crescendo' | 'decrescendo' | 'estavel';
  crescimentoSemanal: number;
  melhorPerformance: { setor: string; taxa: number };
  mediaGeral: number;
  metaMes: number;
  // Campos monetários
  totalRecompensasDisponiveis: number; // Total de recompensas pendentes para pagamento
  totalPotencialGanhos: number; // Total ganho este mês pelos colaboradores
  valorMedioPorMeta: number; // Média de recompensa por colaborador
  // Novos campos para recompensas que precisam ser pagas
  totalPendingRewards: number; // Total de recompensas pendentes para pagamento
  totalEarnedThisMonth: number; // Total ganho este mês pelos colaboradores
  totalEarnedThisWeek: number; // Total ganho esta semana pelos colaboradores
  totalEarnedToday: number; // Total ganho hoje pelos colaboradores
  collaboratorsWithRewards: number; // Número de colaboradores com recompensas
  averageRewardPerCollaborator: number; // Média de recompensa por colaborador
}

interface AlertItem {
  type: 'risk' | 'warning' | 'success';
  title: string;
  description: string;
  count: number;
  action?: string;
}

interface CollaboratorRanking {
  id: string;
  name: string;
  completionRate: number;
  streak: number;
  lastSubmission: string;
  submissionsThisWeek: number;
  status: 'active' | 'risk' | 'inactive';
}

interface ActionCard {
  title: string;
  value: number;
  trend: number;
  description: string;
  action?: string; // Tornando opcional
  icon: any;
  color: string;
}

export default function ManagerDashboard() {
  const { isAuthenticated, profile, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const {
    submissions,
    loading: submissionsLoading
  } = useSubmissions();

  const { profiles, loading: profilesLoading } = useAllProfiles();
  const { goals: sectorGoals, loading: goalsLoading, fetchActiveGoalsBySector } = useSectorGoals();
  const { contestations, createContestation, updateContestation, isGoalContested } = useContestations();
  const { createCompliment } = useCompliments();
  const complimentPresets = [
    { key: 'parabens', label: '🎉 Parabéns pelo excelente trabalho!' },
    { key: 'otimo', label: '👏 Ótimo desempenho hoje!' },
    { key: 'exemplo', label: '🌟 Você é um exemplo para o time!' },
  ];
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [customCompliment, setCustomCompliment] = useState<string>('');
  const [sendingComplimentTo, setSendingComplimentTo] = useState<string>('');
  const { toastSuccess, toastError } = useFeedback();
  
  // Fallback para quando a collection não existe ainda
  const isGoalContestedSafe = (goalId: string, submissionId: string) => {
    try {
      return isGoalContested(goalId, submissionId);
    } catch (error) {
      console.warn('Collection contestations não encontrada:', error);
      return null;
    }
  };

  // Função para obter arquivos de uma meta específica (suporta 1+ arquivos)
  const getGoalFiles = (submission: any, goalId: string): string[] => {
    try {
      if (submission.goalFiles) {
        const goalFiles = JSON.parse(submission.goalFiles);
        const value = goalFiles[goalId];
        if (!value) return [];
        if (Array.isArray(value)) return value as string[];
        if (typeof value === 'string') return [value];
      }
    } catch (error) {
      console.error('Erro ao parsear goalFiles:', error);
    }
    return [];
  };

  // Carregar metas do setor quando o componente montar
  useEffect(() => {
    if (profile && profile.sector) {
      fetchActiveGoalsBySector(profile.sector);
    }
  }, [profile, fetchActiveGoalsBySector]);

  // Função helper para formatar mês em português
  const getMonthNameInPortuguese = (date: Date) => {
    const months = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    return months[date.getMonth()];
  };

  // Estados para o modal de detalhes do colaborador
  const [selectedCollaborator, setSelectedCollaborator] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados para modais dos cards de ação
  const [isAttentionModalOpen, setIsAttentionModalOpen] = useState(false);
  const [isTopPerformersModalOpen, setIsTopPerformersModalOpen] = useState(false);
  const [isRewardsModalOpen, setIsRewardsModalOpen] = useState(false);
  
  // Estados para detalhes de submissões
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [filteredSubmissions, setFilteredSubmissions] = useState<any[]>([]);

  // Estados para contestação
  const [isContestationModalOpen, setIsContestationModalOpen] = useState(false);
  const [selectedGoalForContestation, setSelectedGoalForContestation] = useState<any>(null);
  
  // Estados para gerenciamento de contestações
  const [isContestationManagementOpen, setIsContestationManagementOpen] = useState(false);
  const [selectedContestation, setSelectedContestation] = useState<any>(null);
  const [contestationFilter, setContestationFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');

  // Estados para funcionalidades avançadas
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [collaboratorRankings, setCollaboratorRankings] = useState<CollaboratorRanking[]>([]);
  const [actionCards, setActionCards] = useState<ActionCard[]>([]);
  
  // Estado para controlar minimização dos alertas
  const [isAlertsMinimized, setIsAlertsMinimized] = useState(false);

  // Função para contestar uma meta específica
  const handleContestGoal = async (reason: string) => {
    if (!selectedGoalForContestation || !selectedSubmission || !profile) return;

    try {
      await createContestation({
        submissionId: selectedSubmission.$id,
        goalId: selectedGoalForContestation.goalId,
        collaboratorId: selectedSubmission.userProfile.$id,
        managerId: profile.$id,
        reason: reason
      });
      
      setIsContestationModalOpen(false);
      setSelectedGoalForContestation(null);
    } catch (error) {
      console.error('Erro ao criar contestação:', error);
      alert('Erro ao criar contestação. Verifique se a collection foi criada no Appwrite.');
    }
  };

  // Função para resolver contestação
  const handleResolveContestation = async (contestationId: string) => {
    try {
      await updateContestation(contestationId, { status: 'resolved' });
      setSelectedContestation(null);
    } catch (error) {
      console.error('Erro ao resolver contestação:', error);
    }
  };

  // Função para dispensar contestação
  const handleDismissContestation = async (contestationId: string) => {
    try {
      await updateContestation(contestationId, { status: 'dismissed' });
      setSelectedContestation(null);
    } catch (error) {
      console.error('Erro ao dispensar contestação:', error);
    }
  };

  // Filtrar contestações
  const filteredContestations = contestations.filter(contestation => {
    if (contestationFilter === 'all') return true;
    return contestation.status === contestationFilter;
  });

  // Obter nome do colaborador
  const getCollaboratorName = (collaboratorId: string) => {
    const collaborator = profiles.find(p => p.$id === collaboratorId);
    return collaborator?.name || 'Colaborador não encontrado';
  };

  // Obter dados completos da meta
  const getGoalDetails = (goalId: string) => {
    const goal = sectorGoals.find(g => g.$id === goalId);
    return goal || null;
  };

  // Obter nome da meta
  const getGoalName = (goalId: string) => {
    const goal = sectorGoals.find(g => g.$id === goalId);
    return goal?.title || 'Meta não encontrada';
  };

  // Obter detalhes da submissão
  const getSubmissionDetails = (submissionId: string) => {
    const submission = submissions.find(s => s.$id === submissionId);
    return submission || null;
  };
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');

  // Função para calcular desempenho real baseado em metas atingidas
  const calculateRealPerformance = (collaboratorId: string, goals: any[], submissions: any[]) => {
    if (!goals || !submissions) return { completionRate: 0, isGoalAchieved: false };
    
    // Buscar metas individuais do colaborador
    const userGoals = goals.filter(goal => 
      goal.scope === 'individual' && 
      goal.assignedUserId === collaboratorId &&
      goal.isActive
    );
    
    if (userGoals.length === 0) {
      // Se não tem metas individuais, usar cálculo tradicional
      const monthStart = startOfMonth(new Date());
      const collabSubmissions = submissions.filter(s => 
        s.userProfile.$id === collaboratorId && new Date(s.date) >= monthStart
      );
      const daysInMonth = new Date().getDate();
      const completionRate = (collabSubmissions.length / daysInMonth) * 100;
      return { completionRate: Math.round(completionRate), isGoalAchieved: false };
    }
    
    // Calcular desempenho baseado em metas atingidas
    let totalGoals = userGoals.length;
    let achievedGoals = 0;
    let totalProgress = 0;
    
    for (const goal of userGoals) {
      // Buscar submissões do colaborador para esta meta
      const goalSubmissions = submissions.filter(sub => {
        try {
          const checklist = JSON.parse(sub.checklist);
          return checklist[goal.$id!] !== undefined;
        } catch {
          return false;
        }
      });
      
      if (goalSubmissions.length === 0) {
        // Meta sem submissões
        totalProgress += 0;
        continue;
      }
      
      // Calcular progresso da meta
      let goalProgress = 0;
      let isGoalAchieved = false;
      
      if (goal.type === 'numeric') {
        // Para metas numéricas, somar valores acumulados
        let totalValue = 0;
        goalSubmissions.forEach(sub => {
          try {
            const checklist = JSON.parse(sub.checklist);
            const goalData = checklist[goal.$id!];
            if (goalData !== undefined && goalData !== null) {
              totalValue += parseFloat(goalData) || 0;
            }
          } catch {
            // Ignora erros de parsing
          }
        });
        
        goalProgress = Math.min((totalValue / goal.targetValue) * 100, 100);
        isGoalAchieved = totalValue >= goal.targetValue;
      } else if (goal.type === 'percentage') {
        // Para metas de porcentagem, usar último valor
        const lastSubmission = goalSubmissions[goalSubmissions.length - 1];
        try {
          const checklist = JSON.parse(lastSubmission.checklist);
          const goalData = checklist[goal.$id!];
          goalProgress = parseFloat(goalData) || 0;
          isGoalAchieved = goalProgress >= goal.targetValue;
        } catch {
          goalProgress = 0;
        }
      } else if (goal.type === 'task_completion') {
        // Para tarefas, verificar se foi completada
        const lastSubmission = goalSubmissions[goalSubmissions.length - 1];
        try {
          const checklist = JSON.parse(lastSubmission.checklist);
          const goalData = checklist[goal.$id!];
          goalProgress = Boolean(goalData) ? 100 : 0;
          isGoalAchieved = Boolean(goalData);
        } catch {
          goalProgress = 0;
        }
      } else if (goal.type === 'boolean_checklist') {
        // Para checklists, calcular porcentagem de itens completados
        const lastSubmission = goalSubmissions[goalSubmissions.length - 1];
        try {
          const checklist = JSON.parse(lastSubmission.checklist);
          const goalData = checklist[goal.$id!];
          
          if (Array.isArray(goalData)) {
            const completedItems = goalData.filter(Boolean).length;
            goalProgress = (completedItems / goalData.length) * 100;
            isGoalAchieved = completedItems === goalData.length;
          } else if (typeof goalData === 'object') {
            const completedItems = Object.values(goalData).filter(Boolean).length;
            const totalItems = Object.keys(goalData).length;
            goalProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
            isGoalAchieved = completedItems === totalItems;
          }
        } catch {
          goalProgress = 0;
        }
      }
      
      totalProgress += goalProgress;
      if (isGoalAchieved) {
        achievedGoals++;
      }
    }
    
    // Calcular taxa de conclusão final
    const averageProgress = totalGoals > 0 ? totalProgress / totalGoals : 0;
    
    // Se pelo menos uma meta foi atingida, garantir mínimo de 100%
    const finalCompletionRate = achievedGoals > 0 ? Math.max(averageProgress, 100) : averageProgress;
    
    return { 
      completionRate: Math.round(finalCompletionRate), 
      isGoalAchieved: achievedGoals > 0 
    };
  };

  // Cálculo das métricas principais do dashboard
  const calculateDashboardMetrics = (): DashboardMetrics => {
    if (!profile || !profiles || !submissions) {
      return {
        taxaConclusao: 0,
        usuariosAtivos: 0,
        metaMensal: 0,
        tendencia: 'estavel',
        crescimentoSemanal: 0,
        melhorPerformance: { setor: '', taxa: 0 },
        mediaGeral: 0,
        metaMes: 90,
        totalRecompensasDisponiveis: 0,
        totalPotencialGanhos: 0,
        valorMedioPorMeta: 0,
        totalPendingRewards: 0,
        totalEarnedThisMonth: 0,
        totalEarnedThisWeek: 0,
        totalEarnedToday: 0,
        collaboratorsWithRewards: 0,
        averageRewardPerCollaborator: 0
      };
    }

    const today = new Date();
    const startWeek = startOfWeek(today);
    const endWeek = endOfWeek(today);
    const startMonth = startOfMonth(today);
    const daysInMonth = today.getDate();

    // Filtrar colaboradores do setor do gestor
    const sectorCollaborators = profiles.filter(
      p => p.sector === profile.sector && p.role === Role.COLLABORATOR
    );

    const allCollaborators = profiles.filter(p => p.role === Role.COLLABORATOR);

    // Submissões do mês atual do setor
    const sectorSubmissions = submissions.filter(s => {
      const submissionDate = new Date(s.date);
      return submissionDate >= startMonth && 
             sectorCollaborators.some(collab => collab.$id === s.userProfile.$id);
    });



    // Taxa de conclusão (submissões vs esperado) - CORREÇÃO: Usar lógica baseada em metas
    // Calcular taxa de conclusão baseada em metas atingidas
    let totalCompletionRate = 0;
    
    for (const collaborator of sectorCollaborators) {
      const { completionRate, isGoalAchieved } = calculateRealPerformance(collaborator.$id, sectorGoals, submissions);
      totalCompletionRate += completionRate;
    }
    
    const taxaConclusao = sectorCollaborators.length > 0 ? totalCompletionRate / sectorCollaborators.length : 0;

    // Usuários ativos (colaboradores do setor)
    const usuariosAtivos = sectorCollaborators.length;

    // Meta mensal (pode ser configurável)
    const metaMensal = taxaConclusao;

    // Submissões semana atual
    const thisWeekSubmissions = submissions.filter(s => {
      const submissionDate = new Date(s.date);
      return submissionDate >= startWeek && 
             submissionDate <= endWeek &&
             sectorCollaborators.some(collab => collab.$id === s.userProfile.$id);
    });

    // Submissões semana passada
    const lastWeekStart = subDays(startWeek, 7);
    const lastWeekEnd = subDays(startWeek, 1);
    const lastWeekSubmissions = submissions.filter(s => {
      const submissionDate = new Date(s.date);
      return submissionDate >= lastWeekStart && 
             submissionDate <= lastWeekEnd &&
             sectorCollaborators.some(collab => collab.$id === s.userProfile.$id);
    });

    // Crescimento semanal
    const thisWeekRate = sectorCollaborators.length > 0 ? (thisWeekSubmissions.length / (sectorCollaborators.length * 7)) * 100 : 0;
    const lastWeekRate = sectorCollaborators.length > 0 ? (lastWeekSubmissions.length / (sectorCollaborators.length * 7)) * 100 : 0;
    const crescimentoSemanal = thisWeekRate - lastWeekRate;

    // Tendência
    let tendencia: 'crescendo' | 'decrescendo' | 'estavel' = 'estavel';
    if (crescimentoSemanal > 5) tendencia = 'crescendo';
    else if (crescimentoSemanal < -5) tendencia = 'decrescendo';

    // Melhor performance por setor
    const sectorNames = Array.from(new Set(profiles.map(p => p.sector)));
    const sectorPerformances = sectorNames.map(sector => {
      const sectorColabs = profiles.filter(p => p.sector === sector && p.role === Role.COLLABORATOR);
      const sectorSubs = submissions.filter(s => 
        sectorColabs.some(collab => collab.$id === s.userProfile.$id) &&
        new Date(s.date) >= startMonth
      );
      const taxa = sectorColabs.length > 0 ? 
        (sectorSubs.length / (sectorColabs.length * daysInMonth)) * 100 : 0;
      return { setor: sector, taxa };
    });

    const melhorPerformance = sectorPerformances.reduce((best, current) => 
      current.taxa > best.taxa ? current : best, { setor: '', taxa: 0 });

    // Média geral de todos os setores
    const totalSubmissionsMonth = submissions.filter(s => new Date(s.date) >= startMonth);
    const mediaGeral = allCollaborators.length > 0 ? 
      (totalSubmissionsMonth.length / (allCollaborators.length * daysInMonth)) * 100 : 0;

    // Cálculos monetários - Recompensas que precisam ser pagas aos colaboradores
    const calculateSectorMonetaryRewards = () => {
      if (!sectorGoals || !submissions || !sectorCollaborators.length) {
        return {
          totalPendingRewards: 0,
          totalEarnedThisMonth: 0,
          totalEarnedThisWeek: 0,
          totalEarnedToday: 0,
          collaboratorsWithRewards: 0,
          averageRewardPerCollaborator: 0
        };
      }

      let totalPendingRewards = 0;
      let totalEarnedThisMonth = 0;
      let totalEarnedThisWeek = 0;
      let totalEarnedToday = 0;
      let collaboratorsWithRewards = 0;

      // NOVA LÓGICA SIMPLIFICADA: Verificar cada meta individual
      for (const goal of sectorGoals) {
        // Só considerar metas individuais com recompensa monetária
        if (goal.scope !== 'individual' || !goal.hasMonetaryReward || !goal.monetaryValue || goal.monetaryValue <= 0) {
          continue;
        }

        // Buscar colaborador da meta
        const collaborator = sectorCollaborators.find(c => 
          c.$id === goal.assignedUserId || c.userId === goal.assignedUserId
        );
        if (!collaborator) {
          continue;
        }

        // Buscar todas as submissões do colaborador para esta meta
        const goalSubmissions = submissions.filter(sub => {
          try {
            const checklist = JSON.parse(sub.checklist);
            return checklist[goal.$id!] !== undefined;
          } catch {
            return false;
          }
        });

        if (goalSubmissions.length === 0) {
          continue; // Meta sem submissões
        }

        // Calcular se a meta foi atingida
        let isGoalAchieved = false;
        let totalValue = 0;

        if (goal.type === 'numeric') {
          // Para metas numéricas: somar todos os valores
          goalSubmissions.forEach(sub => {
            try {
              const checklist = JSON.parse(sub.checklist);
              const goalData = checklist[goal.$id!];
              if (goalData !== undefined && goalData !== null) {
                totalValue += parseFloat(goalData) || 0;
              }
            } catch {
              // Ignora erros
            }
          });
          isGoalAchieved = totalValue >= goal.targetValue;
        } else if (goal.type === 'percentage') {
          // Para metas de porcentagem: usar último valor
          const lastSubmission = goalSubmissions[goalSubmissions.length - 1];
          try {
            const checklist = JSON.parse(lastSubmission.checklist);
            const goalData = checklist[goal.$id!];
            totalValue = parseFloat(goalData) || 0;
            isGoalAchieved = totalValue >= goal.targetValue;
          } catch {
            // Ignora erros
          }
        } else if (goal.type === 'task_completion') {
          // Para tarefas: verificar se foi completada
          const lastSubmission = goalSubmissions[goalSubmissions.length - 1];
          try {
            const checklist = JSON.parse(lastSubmission.checklist);
            const goalData = checklist[goal.$id!];
            isGoalAchieved = Boolean(goalData);
          } catch {
            // Ignora erros
          }
        } else if (goal.type === 'boolean_checklist') {
          // Para checklists: verificar se todos os itens foram completados
          const lastSubmission = goalSubmissions[goalSubmissions.length - 1];
          try {
            const checklist = JSON.parse(lastSubmission.checklist);
            const goalData = checklist[goal.$id!];
            
            if (Array.isArray(goalData)) {
              isGoalAchieved = goalData.every(Boolean);
            } else if (typeof goalData === 'object') {
              isGoalAchieved = Object.values(goalData).every(Boolean);
            }
          } catch {
            // Ignora erros
          }
        }

        // Se a meta foi atingida, adicionar ao total pendente
        if (isGoalAchieved) {
          totalPendingRewards += goal.monetaryValue;
          totalEarnedThisMonth += goal.monetaryValue;
          collaboratorsWithRewards++;
        }
      }

      const averageRewardPerCollaborator = collaboratorsWithRewards > 0 ? 
        totalPendingRewards / collaboratorsWithRewards : 0;

      return {
        totalPendingRewards,
        totalEarnedThisMonth,
        totalEarnedThisWeek,
        totalEarnedToday,
        collaboratorsWithRewards,
        averageRewardPerCollaborator
      };
    };

    const monetaryRewards = calculateSectorMonetaryRewards();

    // Usar os novos cálculos de recompensas monetárias
    const totalRecompensasDisponiveis = monetaryRewards.totalPendingRewards;
    const totalPotencialGanhos = monetaryRewards.totalEarnedThisMonth;
    const valorMedioPorMeta = monetaryRewards.averageRewardPerCollaborator;

    return {
      taxaConclusao: Math.round(taxaConclusao * 10) / 10,
      usuariosAtivos,
      metaMensal: Math.round(metaMensal * 10) / 10,
      tendencia,
      crescimentoSemanal: Math.round(crescimentoSemanal * 10) / 10,
      melhorPerformance,
      mediaGeral: Math.round(mediaGeral * 10) / 10,
      metaMes: 90,
      // Campos monetários
      totalRecompensasDisponiveis,
      totalPotencialGanhos,
      valorMedioPorMeta,
      // Novos campos para recompensas que precisam ser pagas
      totalPendingRewards: monetaryRewards.totalPendingRewards,
      totalEarnedThisMonth: monetaryRewards.totalEarnedThisMonth,
      totalEarnedThisWeek: monetaryRewards.totalEarnedThisWeek,
      totalEarnedToday: monetaryRewards.totalEarnedToday,
      collaboratorsWithRewards: monetaryRewards.collaboratorsWithRewards,
      averageRewardPerCollaborator: monetaryRewards.averageRewardPerCollaborator
    };
  };

  // Performance e Tendência Consolidados (últimos 7 dias)
  const generatePerformanceTendencia = () => {
    if (!profile || !profiles || !submissions) return [];

    const sectorCollaborators = profiles.filter(
      p => p.sector === profile.sector && p.role === Role.COLLABORATOR
    );

    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const daySubmissions = submissions.filter(s => {
        const submissionDate = new Date(s.date);
        return submissionDate >= dayStart && 
               submissionDate <= dayEnd &&
               sectorCollaborators.some(collab => collab.$id === s.userProfile.$id);
      });

      const completionRate = sectorCollaborators.length > 0 ? 
        Math.round((daySubmissions.length / sectorCollaborators.length) * 100) : 0;

      // Calcular tendência (comparação com o dia anterior)
      let trend = 0;
      if (i > 0) {
        const previousDate = subDays(new Date(), 7 - i);
        const previousDayStart = startOfDay(previousDate);
        const previousDayEnd = endOfDay(previousDate);
        
        const previousDaySubmissions = submissions.filter(s => {
        const submissionDate = new Date(s.date);
          return submissionDate >= previousDayStart && 
                 submissionDate <= previousDayEnd &&
               sectorCollaborators.some(collab => collab.$id === s.userProfile.$id);
      });

        const previousCompletionRate = sectorCollaborators.length > 0 ? 
          Math.round((previousDaySubmissions.length / sectorCollaborators.length) * 100) : 0;
        
        trend = completionRate - previousCompletionRate;
      }

      return {
        date: format(date, 'dd/MM'),
        completion: completionRate,
        trend: trend,
        submissions: daySubmissions.length,
        totalCollaborators: sectorCollaborators.length
      };
    });
  };

  // ===============================
  // NOVAS FUNÇÕES AVANÇADAS
  // ===============================

  // Gerar alertas inteligentes para o gestor
  const generateSmartAlerts = (): AlertItem[] => {
    if (!profile || !profiles || !submissions) return [];

    const alerts: AlertItem[] = [];
    const today = new Date();
    const threeDaysAgo = subDays(today, 3);
    const sectorCollaborators = profiles.filter(
      p => p.sector === profile.sector && p.role === Role.COLLABORATOR
    );

    // Alerta: Colaboradores sem submissão há 3+ dias
    const inactiveCollaborators = sectorCollaborators.filter(collab => {
      const lastSubmission = submissions
        .filter(s => s.userProfile.$id === collab.$id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      if (!lastSubmission) return true;
      return new Date(lastSubmission.date) < threeDaysAgo;
    });

    if (inactiveCollaborators.length > 0) {
      alerts.push({
        type: 'risk',
        title: 'Colaboradores Inativos',
        description: `${inactiveCollaborators.length} colaborador(es) sem submissão há 3+ dias`,
        count: inactiveCollaborators.length
      });
    }

    // Alerta: Taxa de conclusão abaixo de 70%
    const weekStart = startOfWeek(today);
    const weekSubmissions = submissions.filter(s => {
      const subDate = new Date(s.date);
      return subDate >= weekStart && 
             sectorCollaborators.some(collab => collab.$id === s.userProfile.$id);
    });
    
    const expectedSubmissions = sectorCollaborators.length * differenceInDays(today, weekStart);
    const completionRate = expectedSubmissions > 0 ? (weekSubmissions.length / expectedSubmissions) * 100 : 0;

    if (completionRate < 70 && expectedSubmissions > 0) {
      alerts.push({
        type: 'warning',
        title: 'Performance Abaixo da Meta',
        description: `Taxa de conclusão semanal: ${Math.round(completionRate)}% (meta: 70%)`,
        count: Math.round(completionRate)
      });
    }

    // Alerta positivo: Melhoria significativa
    const lastWeekStart = subDays(weekStart, 7);
    const lastWeekEnd = subDays(weekStart, 1);
    const lastWeekSubmissions = submissions.filter(s => {
      const subDate = new Date(s.date);
      return subDate >= lastWeekStart && subDate <= lastWeekEnd &&
             sectorCollaborators.some(collab => collab.$id === s.userProfile.$id);
    });

    const lastWeekRate = sectorCollaborators.length > 0 ? (lastWeekSubmissions.length / (sectorCollaborators.length * 7)) * 100 : 0;
    const improvement = completionRate - lastWeekRate;

    if (improvement > 20) {
      alerts.push({
        type: 'success',
        title: 'Melhoria Significativa',
        description: `Performance +${Math.round(improvement)}% vs semana anterior`,
        count: Math.round(improvement),
        action: 'Reconhecer equipe'
      });
    }

    return alerts;
  };

  // Gerar ranking de colaboradores
  const generateCollaboratorRankings = (): CollaboratorRanking[] => {
    if (!profile || !profiles || !submissions) return [];

    const sectorCollaborators = profiles.filter(
      p => p.sector === profile.sector && p.role === Role.COLLABORATOR
    );

    const rankings = sectorCollaborators.map(collab => {
      // CORREÇÃO: Usar nova lógica de desempenho baseada em metas
      const { completionRate, isGoalAchieved } = calculateRealPerformance(collab.$id, sectorGoals, submissions);

      // Calcular streak (dias consecutivos)
      let streak = 0;
      const sortedSubmissions = submissions
        .filter(s => s.userProfile.$id === collab.$id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      for (let i = 0; i < 30; i++) { // Checar últimos 30 dias
        const checkDate = format(subDays(new Date(), i), 'yyyy-MM-dd');
        const hasSubmission = sortedSubmissions.some(s => 
          format(new Date(s.date), 'yyyy-MM-dd') === checkDate
        );
        
        if (hasSubmission) {
          streak++;
        } else if (i === 0) {
          break; // Se não tem submissão hoje, streak é 0
        } else {
          break; // Quebra o streak
        }
      }

      // Última submissão
      const lastSubmission = sortedSubmissions[0];
      const lastSubmissionDate = lastSubmission ? 
        format(new Date(lastSubmission.date), 'dd/MM/yyyy') : 'Nunca';

      // Submissões desta semana
      const weekStart = startOfWeek(new Date());
      const submissionsThisWeek = submissions.filter(s => 
        s.userProfile.$id === collab.$id && new Date(s.date) >= weekStart
      ).length;

      // Status do colaborador - CORREÇÃO: Considerar metas atingidas
      let status: 'active' | 'risk' | 'inactive' = 'active';
      if (!lastSubmission || new Date(lastSubmission.date) < subDays(new Date(), 3)) {
        status = 'inactive';
      } else if (completionRate < 50 && !isGoalAchieved) {
        // Só considerar risco se não atingiu nenhuma meta
        status = 'risk';
      }

      return {
        id: collab.$id,
        name: collab.name,
        completionRate: completionRate,
        streak,
        lastSubmission: lastSubmissionDate,
        submissionsThisWeek,
        status
      };
    });

    // Ordenar por taxa de conclusão (melhor primeiro)
    return rankings.sort((a, b) => b.completionRate - a.completionRate);
  };

  // Gerar cards de ação rápida
  const generateActionCards = (rankings: CollaboratorRanking[], alertsData: AlertItem[]): ActionCard[] => {
    if (!profile || !profiles || !submissions) return [];

    const sectorCollaborators = profiles.filter(
      p => p.sector === profile.sector && p.role === Role.COLLABORATOR
    );

    // Card 1: Colaboradores que precisam atenção
    const needAttention = rankings.filter(r => r.status !== 'active').length;
    const attentionTrend = needAttention / sectorCollaborators.length * 100;

    // Card 2: Performance semanal
    const weekStart = startOfWeek(new Date());
    const weekSubmissions = submissions.filter(s => {
      const subDate = new Date(s.date);
      return subDate >= weekStart && 
             sectorCollaborators.some(collab => collab.$id === s.userProfile.$id);
    });
    const expectedWeekly = sectorCollaborators.length * differenceInDays(new Date(), weekStart);
    const weeklyPerformance = expectedWeekly > 0 ? (weekSubmissions.length / expectedWeekly) * 100 : 0;

    // Card 3: Top performers
    const topPerformers = rankings.filter(r => r.completionRate >= 80).length;
    const topPerformersPercent = (topPerformers / sectorCollaborators.length) * 100;

    // Card 4: Recompensas Monetárias - Conectado com recompensas dos colaboradores
    const metrics = calculateDashboardMetrics();
    const totalPendingRewards = metrics.totalPendingRewards;
    const totalEarnedThisMonth = metrics.totalEarnedThisMonth;
    const collaboratorsWithRewards = metrics.collaboratorsWithRewards;

    return [
      {
        title: 'Precisam Atenção',
        value: needAttention,
        trend: -attentionTrend,
        description: `${needAttention} de ${sectorCollaborators.length} colaboradores`,
        action: 'Ver atenção',
        icon: AlertTriangle,
        color: needAttention > 0 ? 'text-red-600' : 'text-green-600'
      },
      {
        title: 'Performance Semanal',
        value: Math.round(weeklyPerformance),
        trend: 5, // Placeholder - poderia ser calculado vs semana anterior
        description: 'Taxa de conclusão desta semana',
        icon: TrendingUp,
        color: weeklyPerformance >= 70 ? 'text-green-600' : 'text-yellow-600'
      },
      {
        title: 'Top Performers',
        value: topPerformers,
        trend: topPerformersPercent,
        description: `${Math.round(topPerformersPercent)}% da equipe acima de 80%`,
        action: 'Reconhecer',
        icon: Trophy,
        color: 'text-blue-600'
      },
      {
        title: 'Recompensas',
        value: Math.round(centavosToReais(totalPendingRewards)),
        trend: totalEarnedThisMonth > 0 ? Math.round((totalEarnedThisMonth / totalPendingRewards) * 100) : 0,
        description: `${formatCurrency(centavosToReais(totalPendingRewards))} a pagar (${collaboratorsWithRewards} colaboradores)`,
        action: 'Ver recompensas',
        icon: Award,
        color: totalPendingRewards > 0 ? 'text-orange-600' : 'text-green-600'
      }
    ];
  };

  // Função para sanitizar e formatar respostas do checklist
  const formatChecklistResponses = (checklistString: string) => {
    try {
      const responses = JSON.parse(checklistString);
      const entries = Object.entries(responses);
      

      
      if (entries.length === 0) return 'Nenhuma resposta registrada';
      
      // Agrupar itens de checklist por meta pai
      const groupedResponses: any = {};
      
              entries.forEach(([key, value]) => {
          // Verificar se é um item de checklist (formato: goalId-index)
          if (key.includes('-') && key.length > 20) {
            // Extrair o ID da meta pai (parte antes do hífen)
            const goalId = key.split('-')[0];
            
            // Buscar a meta pai
            const parentGoal = sectorGoals?.find(goal => goal.$id === goalId);
            
            if (parentGoal && parentGoal.type === 'boolean_checklist') {
              // Agrupar sob a meta pai
              if (!groupedResponses[parentGoal.$id!]) {
                groupedResponses[parentGoal.$id!] = {
                  goalTitle: parentGoal.title,
                  goalDescription: parentGoal.description,
                  items: {}
                };
              }
              groupedResponses[parentGoal.$id!].items[key] = value;
            } else {
              // Se não encontrou a meta pai, manter como individual
              groupedResponses[key] = value;
            }
          } else {
            // Para outros tipos, manter como está
            groupedResponses[key] = value;
          }
        });
      
      // Processar as respostas agrupadas
      return Object.entries(groupedResponses).map(([key, value]) => {
        let goalName = key;
        let goalType = 'Meta Individual';
        let isCompleted = false;
        
        // Se é uma meta agrupada (checklist)
        if (typeof value === 'object' && value !== null && 'goalTitle' in value) {
          goalName = (value as any).goalTitle;
          goalType = 'Meta de Checklist';
          // Verificar se pelo menos um item está completo
          isCompleted = Object.values((value as any).items).some((itemValue: any) => 
            itemValue === true || itemValue === 'true'
          );

        } else {
          // Para metas individuais
          isCompleted = value === true || value === 'true';
          
          // Se for um ID de meta (formato UUID ou ObjectId), buscar no sectorGoals
          if (key.length >= 20) {
            const goal = sectorGoals?.find(g => g.$id === key);
            
            if (goal) {
              goalName = goal.title;
              goalType = goal.scope === 'individual' ? 'Meta Individual' : 'Meta Setorial';
            } else {
              goalName = 'Meta não encontrada';
              goalType = 'Meta Individual';
            }
        } else {
          // Limpar e formatar nomes de checklist
          goalName = key
            .replace(/^.*-/, '') // Remove prefixos com hífen
            .replace(/_/g, ' ') // Substitui underscores por espaços
            .replace(/([A-Z])/g, ' $1') // Adiciona espaço antes de maiúsculas
            .trim()
            .toLowerCase()
            .replace(/\b\w/g, l => l.toUpperCase()); // Capitaliza primeira letra de cada palavra
          }
        }
        
        const status = isCompleted ? '✅' : '❌';
        
        return { status, goalName, isCompleted, goalType, goalId: key };
      }).sort((a, b) => {
        // Ordena: concluídas primeiro, depois por nome
        if (a.isCompleted !== b.isCompleted) {
          return b.isCompleted ? 1 : -1;
        }
        return a.goalName.localeCompare(b.goalName);
      });
    } catch (error) {
      return 'Formato de resposta inválido';
    }
  };

  // Funções para lidar com os cliques dos botões dos cards
  const handleCardAction = (action: string) => {
    switch(action) {
      case 'Ver atenção':
        setIsAttentionModalOpen(true);
        break;
      case 'Ver recompensas':
        setIsRewardsModalOpen(true);
        break;
      case 'Reconhecer':
        setIsTopPerformersModalOpen(true);
        break;
      case 'Analisar tendência':
      case 'Incentivar':
        // Funcionalidades não implementadas - poderiam ser tooltips ou notificações
        break;
      default:
        break;
    }
  };

  // Filtrar colaboradores que precisam de atenção (performance < 70%)
  const getCollaboratorsNeedingAttention = () => {
    return collaboratorRankings
      .filter(collab => collab.completionRate < 70)
      .sort((a, b) => a.completionRate - b.completionRate); // Pior performance primeiro
  };

  // Filtrar top performers (performance >= 80%)
  const getTopPerformers = () => {
    return collaboratorRankings
      .filter(collab => collab.completionRate >= 80)
      .sort((a, b) => b.completionRate - a.completionRate); // Melhor performance primeiro
  };

  // Obter colaboradores com recompensas pendentes
  const getCollaboratorsWithRewards = () => {
    if (!profile || !profiles || !sectorGoals || !submissions) return [];
    
    const sectorCollaborators = profiles.filter(
      p => p.sector === profile.sector && p.role === Role.COLLABORATOR
    );

    const collaboratorsWithRewards = [];

    // Usar a mesma lógica do calculateSectorMonetaryRewards
    for (const goal of sectorGoals) {
      // Só considerar metas individuais com recompensa monetária
      if (goal.scope !== 'individual' || !goal.hasMonetaryReward || !goal.monetaryValue || goal.monetaryValue <= 0) {
        continue;
      }

      // Buscar colaborador da meta
      const collaborator = sectorCollaborators.find(c => 
        c.$id === goal.assignedUserId || c.userId === goal.assignedUserId
      );
      if (!collaborator) {
        continue;
      }

      // Buscar todas as submissões do colaborador para esta meta
      const goalSubmissions = submissions.filter(sub => {
        try {
          const checklist = JSON.parse(sub.checklist);
          return checklist[goal.$id!] !== undefined;
        } catch {
          return false;
        }
      });

      if (goalSubmissions.length === 0) {
        continue; // Meta sem submissões
      }

      // Calcular se a meta foi atingida
      let isGoalAchieved = false;
      let totalValue = 0;

      if (goal.type === 'numeric') {
        // Para metas numéricas: somar todos os valores
        goalSubmissions.forEach(sub => {
          try {
            const checklist = JSON.parse(sub.checklist);
            const goalData = checklist[goal.$id!];
            if (goalData !== undefined && goalData !== null) {
              totalValue += parseFloat(goalData) || 0;
            }
          } catch {
            // Ignora erros
          }
        });
        isGoalAchieved = totalValue >= goal.targetValue;
      } else if (goal.type === 'percentage') {
        // Para metas de porcentagem: usar último valor
        const lastSubmission = goalSubmissions[goalSubmissions.length - 1];
        try {
          const checklist = JSON.parse(lastSubmission.checklist);
          const goalData = checklist[goal.$id!];
          totalValue = parseFloat(goalData) || 0;
          isGoalAchieved = totalValue >= goal.targetValue;
        } catch {
          // Ignora erros
        }
      } else if (goal.type === 'task_completion') {
        // Para tarefas: verificar se foi completada
        const lastSubmission = goalSubmissions[goalSubmissions.length - 1];
        try {
          const checklist = JSON.parse(lastSubmission.checklist);
          const goalData = checklist[goal.$id!];
          isGoalAchieved = Boolean(goalData);
        } catch {
          // Ignora erros
        }
      } else if (goal.type === 'boolean_checklist') {
        // Para checklists: verificar se todos os itens foram completados
        const lastSubmission = goalSubmissions[goalSubmissions.length - 1];
        try {
          const checklist = JSON.parse(lastSubmission.checklist);
          const goalData = checklist[goal.$id!];
          
          if (Array.isArray(goalData)) {
            isGoalAchieved = goalData.every(Boolean);
          } else if (typeof goalData === 'object') {
            isGoalAchieved = Object.values(goalData).every(Boolean);
          }
        } catch {
          // Ignora erros
        }
      }

      // Se a meta foi atingida, adicionar ao array
      if (isGoalAchieved) {
        collaboratorsWithRewards.push({
          id: collaborator.$id,
          name: collaborator.name,
          totalEarned: goal.monetaryValue,
          pendingRewards: goal.monetaryValue,
          rewardsCount: 1,
          lastEarned: format(new Date(), 'dd/MM/yyyy'),
          goalTitle: goal.title
        });
      }
    }

    return collaboratorsWithRewards
      .sort((a, b) => b.totalEarned - a.totalEarned); // Maior recompensa primeiro
  };

  // Atualizar estados quando dados mudarem
  useEffect(() => {
    if (profiles && submissions && profile) {
      const alertsData = generateSmartAlerts();
      const rankingsData = generateCollaboratorRankings();
      const actionCardsData = generateActionCards(rankingsData, alertsData);
      
      setAlerts(alertsData);
      setCollaboratorRankings(rankingsData);
      setActionCards(actionCardsData);
    }
  }, [profiles, submissions, profile, generateCollaboratorRankings, generateSmartAlerts, generateActionCards]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      logger.auth.error(`Erro ao fazer logout: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // Componente de Loading Skeleton otimizado para melhor LCP
  const DashboardSkeleton = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded-lg w-64 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
        
        {/* Metrics Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm border animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
        
        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {[1,2].map(i => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm border animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (authLoading || submissionsLoading || profilesLoading) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated || !profile) {
    return null;
  }

  const dashboardMetrics = calculateDashboardMetrics();
  const performanceTendencia = generatePerformanceTendencia();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50">
      {/* Header Modernizado */}
      <div className="bg-gradient-to-r from-bovia-primary via-bovia-secondary to-bovia-accent shadow-lg">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                  <h1 className="text-2xl font-bold text-white">
                  Dashboard Gerencial - {profile.sector}
                </h1>
                  <div className="flex items-center space-x-2 text-white/90">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <p className="text-sm font-medium">
                      Bem-vindo, {profile.name || (profile.role === 'manager' ? 'Gestor' : profile.role)}
                </p>
              </div>
            </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-2 text-white/90">
                <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                <span className="text-sm font-medium">
                  {format(new Date(), 'dd/MM/yyyy')}
                </span>
              </div>
              <Button 
                onClick={handleLogout} 
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-white/20 rounded-full"></div>
                  <span>Sair</span>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Cards de Ação Rápida - Layout Moderno */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {actionCards.map((card, index) => {
            const IconComponent = card.icon;
            const isPositive = card.title.includes('Top') || card.title.includes('Performance');
            const isNegative = card.title.includes('Atenção');
            
            return (
              <Card key={index} className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-3 rounded-xl shadow-md ${
                          isPositive ? 'bg-gradient-to-br from-green-100 to-blue-100' :
                          isNegative ? 'bg-gradient-to-br from-red-100 to-orange-100' :
                          'bg-gradient-to-br from-purple-100 to-indigo-100'
                        }`}>
                          <IconComponent className={`w-6 h-6 ${card.color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                            {card.title}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className={`text-3xl font-bold ${card.color} leading-none`}>
                          {card.value}{card.title.includes('Performance') ? '%' : ''}
                        </p>
                        
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {card.description}
                        </p>
                        
                        {card.action && (
                          <div className="pt-3">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleCardAction(card.action!)}
                              className="group-hover:bg-blue-50 group-hover:text-blue-700 transition-all duration-200 rounded-lg px-3 py-1 text-xs font-semibold hover:shadow-md"
                            >
                              {card.action} 
                              <TrendingUp className="w-3 h-3 ml-2" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Indicador de trend */}
                  <div className="absolute top-4 right-4">
                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                      card.trend > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {card.trend > 0 ? '+' : ''}{Math.round(card.trend)}%
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Alertas Inteligentes - Design Moderno */}
        {alerts.length > 0 && (
          <div className="mb-8">
            <Card className="border-0 shadow-lg bg-white overflow-hidden">
              {/* Cabeçalho com toggle - estilo moderno */}
              <div 
                className="flex items-center justify-between px-6 py-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setIsAlertsMinimized(!isAlertsMinimized)}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-2 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Alertas Inteligentes</h2>
                    <p className="text-sm text-gray-500">Monitoramento proativo para tomada de decisão</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 mr-3">
                    {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-1 h-8 w-8"
                  >
                    {isAlertsMinimized ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Conteúdo colapsável */}
              <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  isAlertsMinimized ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
                }`}
              >
                <div className="p-5">
                  {/* Alertas em formato moderno e clean */}
                  <div className="space-y-3">
                    {alerts.map((alert, index) => (
                      <div 
                        key={index} 
                        className={`flex items-center border-0 rounded-lg shadow-sm overflow-hidden bg-gradient-to-r ${
                          alert.type === 'risk' ? 'from-red-50 to-red-100 border-l-4 border-red-500' :
                          alert.type === 'warning' ? 'from-amber-50 to-amber-100 border-l-4 border-amber-500' :
                          'from-green-50 to-green-100 border-l-4 border-green-500'
                        }`}
                      >
                        {/* Ícone */}
                        <div className={`p-4 ${
                          alert.type === 'risk' ? 'text-red-600' :
                          alert.type === 'warning' ? 'text-amber-600' :
                          'text-green-600'
                        }`}>
                          {alert.type === 'risk' ? <XCircle className="h-5 w-5" /> :
                           alert.type === 'warning' ? <Clock className="h-5 w-5" /> :
                           <CheckCircle className="h-5 w-5" />}
                        </div>
                        
                        {/* Conteúdo do alerta */}
                        <div className="py-3 px-2 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className={`font-semibold ${
                              alert.type === 'risk' ? 'text-red-900' :
                              alert.type === 'warning' ? 'text-amber-900' :
                              'text-green-900'
                            }`}>
                              {alert.title}
                            </h4>
                            <Badge className={`ml-2 ${
                              alert.type === 'risk' ? 'bg-red-200 text-red-800' :
                              alert.type === 'warning' ? 'bg-amber-200 text-amber-800' :
                              'bg-green-200 text-green-800'
                            }`}>
                              {alert.count}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 pr-4">
                            {alert.description}
                          </p>
                        </div>
                        
                        {/* Botão de ação */}
                        {alert.action && (
                          <div className="p-3 border-l border-gray-200">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`whitespace-nowrap ${
                                alert.type === 'risk' ? 'text-red-700 hover:text-red-800 hover:bg-red-100' :
                                alert.type === 'warning' ? 'text-amber-700 hover:text-amber-800 hover:bg-amber-100' :
                                'text-green-700 hover:text-green-800 hover:bg-green-100'
                              }`}
                            >
                              {alert.action}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Gerenciamento de Contestações */}
        <div className="mb-10">
          <Card className="shadow-lg border-0 bg-white overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-red-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Gerenciamento de Contestações</h3>
                    <p className="text-sm text-gray-600">Visualize e gerencie contestações de metas</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                    {contestations.filter(c => c.status === 'pending').length} Pendentes
                  </Badge>
                  <Button
                    onClick={() => setIsContestationManagementOpen(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Gerenciar Contestações
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-800">Contestações Pendentes</p>
                      <p className="text-2xl font-bold text-red-900">
                        {contestations.filter(c => c.status === 'pending').length}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-800">Resolvidas</p>
                      <p className="text-2xl font-bold text-green-900">
                        {contestations.filter(c => c.status === 'resolved').length}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <XCircle className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Dispensadas</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {contestations.filter(c => c.status === 'dismissed').length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Ranking de Colaboradores e Gráficos - Layout Premium */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 mb-12">
          
          {/* Ranking de Colaboradores - Design Moderno */}
          <div className="xl:col-span-5">
            <Card className="h-full shadow-lg border-0 bg-white overflow-hidden">
              <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3">
                  <div className="w-1 h-8 bg-gradient-to-b from-yellow-500 to-orange-500 rounded-full"></div>
                    <div>
                      <span className="text-xl font-bold text-gray-900">Ranking - {profile.sector}</span>
                      <p className="text-sm font-normal text-gray-600 mt-1">
                      Ranking completo de colaboradores por performance
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
              
                              <CardContent className="p-6">
                  <div className="space-y-4">
                  {collaboratorRankings.map((ranking, index) => (
                    <div 
                      key={ranking.id}
                      className="group relative p-4 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                      onClick={() => {
                        const collaborator = profiles.find(p => p.$id === ranking.id);
                        if (collaborator) {
                          setSelectedCollaborator(collaborator);
                          
                          // Filtrar apenas submissões do colaborador específico
                          const collaboratorSubmissions = submissions.filter(sub => 
                            sub.userProfile.$id === collaborator.$id || 
                            sub.userProfile.userId === collaborator.userId
                          );
                          
                          setFilteredSubmissions(collaboratorSubmissions);
                          setIsModalOpen(true);
                        }
                      }}
                    >
                      {/* Posição de destaque */}
                      <div className="absolute -top-2 -left-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md ${
                          index === 0 ? 'bg-yellow-500 text-yellow-900' :
                          index === 1 ? 'bg-gray-400 text-gray-800' :
                          index === 2 ? 'bg-orange-500 text-orange-900' :
                          'bg-blue-500 text-blue-900'
                        }`}>
                          {index + 1}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between ml-6">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-700 transition-colors">
                              {ranking.name}
                            </h3>
                            <div className="flex items-center gap-4 mt-1">
                              <div className="flex items-center gap-1">
                                <Zap className="w-3 h-3 text-purple-500" />
                                <span className="text-xs text-gray-600">
                                  {ranking.streak} dias
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-blue-500" />
                                <span className="text-xs text-gray-600">
                                  {ranking.submissionsThisWeek} esta semana
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">{ranking.completionRate}%</p>
                              <p className="text-xs text-gray-500">Taxa de conclusão</p>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                              ranking.status === 'active' ? 'bg-green-100 text-green-800' :
                              ranking.status === 'risk' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {ranking.status === 'active' ? '🟢 Ativo' :
                               ranking.status === 'risk' ? '🟡 Atenção' : '🔴 Inativo'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Barra de progresso */}
                      <div className="mt-3 ml-6">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-1000 ${
                              ranking.completionRate >= 80 ? 'bg-green-500' :
                              ranking.completionRate >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${ranking.completionRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico Consolidado e Métricas Avançadas */}
          <div className="xl:col-span-7 space-y-6">
            
            {/* Performance e Tendência Consolidados */}
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-1 h-8 bg-gradient-to-b from-blue-500 via-purple-500 to-indigo-600 rounded-full"></div>
                    <div>
                    <span className="text-xl font-bold text-gray-900">Performance & Tendência</span>
                      <p className="text-sm font-normal text-gray-600 mt-1">
                      Análise completa de evolução semanal
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800">Evolução da Performance</h4>
                      <p className="text-sm text-gray-600">Últimos 7 dias - Taxa de conclusão e tendência</p>
              </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-gray-600">Taxa de Conclusão</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-gray-600">Tendência</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                  <Chart 
                      data={performanceTendencia} 
                    type="line" 
                    title=""
                  />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Média Semanal</span>
                        <span className="text-lg font-bold text-blue-600">
                          {performanceTendencia.length > 0 ? 
                            Math.round(performanceTendencia.reduce((acc, item) => acc + item.completion, 0) / performanceTendencia.length) : 0}%
                        </span>
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Tendência Geral</span>
                        <span className={`text-lg font-bold ${performanceTendencia.length > 1 ? 
                          (performanceTendencia[performanceTendencia.length - 1].completion > performanceTendencia[0].completion ? 'text-green-600' : 'text-red-600') : 'text-gray-600'}`}>
                          {performanceTendencia.length > 1 ? 
                            (performanceTendencia[performanceTendencia.length - 1].completion > performanceTendencia[0].completion ? '↗ Crescendo' : '↘ Diminuindo') : '→ Estável'}
                        </span>
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Total Submissões</span>
                        <span className="text-lg font-bold text-purple-600">
                          {performanceTendencia.reduce((acc, item) => acc + item.submissions, 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Métricas Avançadas dos Colaboradores */}
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-1 h-8 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full"></div>
                    <div>
                    <span className="text-xl font-bold text-gray-900">Métricas Avançadas</span>
                      <p className="text-sm font-normal text-gray-600 mt-1">
                      Insights detalhados dos colaboradores
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {/* Colaboradores por Status */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-gray-800">Status dos Colaboradores</span>
              </div>
                    </div>
                                         <div className="space-y-2">
                       {(() => {
                         const activeCount = collaboratorRankings.filter((r: CollaboratorRanking) => r.status === 'active').length;
                         const riskCount = collaboratorRankings.filter((r: CollaboratorRanking) => r.status === 'risk').length;
                         const inactiveCount = collaboratorRankings.filter((r: CollaboratorRanking) => r.status === 'inactive').length;
                         
                         return (
                           <>
                             <div className="flex items-center justify-between">
                               <span className="text-sm text-gray-600">Ativos</span>
                               <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                 <span className="font-semibold text-gray-900">{activeCount}</span>
                               </div>
                             </div>
                             <div className="flex items-center justify-between">
                               <span className="text-sm text-gray-600">Em Risco</span>
                               <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                 <span className="font-semibold text-gray-900">{riskCount}</span>
                               </div>
                             </div>
                             <div className="flex items-center justify-between">
                               <span className="text-sm text-gray-600">Inativos</span>
                               <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                 <span className="font-semibold text-gray-900">{inactiveCount}</span>
                               </div>
                             </div>
                           </>
                         );
                       })()}
                     </div>
                  </div>

                  {/* Média de Streaks */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-purple-600" />
                        <span className="font-semibold text-gray-800">Streak Médio</span>
                      </div>
                    </div>
                                         <div className="text-center">
                       <span className="text-3xl font-bold text-purple-600">
                         {collaboratorRankings.length > 0 ? Math.round(collaboratorRankings.reduce((acc: number, r: CollaboratorRanking) => acc + r.streak, 0) / collaboratorRankings.length) : 0}
                       </span>
                       <p className="text-sm text-gray-600 mt-1">dias consecutivos</p>
                     </div>
                  </div>

                  {/* Colaborador com Melhor Performance */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-gray-800">Top Performer</span>
                      </div>
                    </div>
                                         {(() => {
                       const topPerformer = collaboratorRankings.sort((a: CollaboratorRanking, b: CollaboratorRanking) => b.completionRate - a.completionRate)[0];
                       return topPerformer ? (
                         <div className="text-center">
                           <p className="font-semibold text-gray-900 text-sm">{topPerformer.name}</p>
                           <span className="text-2xl font-bold text-green-600">{topPerformer.completionRate}%</span>
                           <p className="text-xs text-gray-600 mt-1">taxa de conclusão</p>
                         </div>
                       ) : (
                         <div className="text-center">
                           <p className="text-sm text-gray-500">Nenhum dado</p>
                         </div>
                       );
                     })()}
                  </div>

                  {/* Submissões da Semana */}
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 p-4 rounded-xl border border-orange-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-orange-600" />
                        <span className="font-semibold text-gray-800">Submissões Semana</span>
                      </div>
                    </div>
                                         <div className="text-center">
                       <span className="text-3xl font-bold text-orange-600">
                         {collaboratorRankings.reduce((acc: number, r: CollaboratorRanking) => acc + r.submissionsThisWeek, 0)}
                       </span>
                       <p className="text-sm text-gray-600 mt-1">total da equipe</p>
                     </div>
                  </div>

                  {/* Colaboradores que Precisam de Atenção */}
                  <div className="bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-xl border border-red-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <span className="font-semibold text-gray-800">Precisam de Atenção</span>
                      </div>
                    </div>
                                         <div className="text-center">
                       <span className="text-3xl font-bold text-red-600">
                         {collaboratorRankings.filter((r: CollaboratorRanking) => r.status === 'risk' || r.status === 'inactive').length}
                       </span>
                       <p className="text-sm text-gray-600 mt-1">colaboradores</p>
                     </div>
                  </div>

                  {/* Taxa de Engajamento */}
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                        <span className="font-semibold text-gray-800">Engajamento</span>
                      </div>
                    </div>
                                         <div className="text-center">
                       <span className="text-3xl font-bold text-indigo-600">
                         {collaboratorRankings.length > 0 ? Math.round(collaboratorRankings.reduce((acc: number, r: CollaboratorRanking) => acc + r.completionRate, 0) / collaboratorRankings.length) : 0}%
                       </span>
                       <p className="text-sm text-gray-600 mt-1">média da equipe</p>
                     </div>
                  </div>

                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Modal de Detalhes do Colaborador - Design Moderno */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto bg-white border-0 shadow-xl">
            <DialogHeader className="pb-6 border-b border-gray-200">
              <DialogTitle className="flex items-center gap-4 text-2xl">
                <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
                <div>
                  <span className="text-gray-900">
                    Perfil Detalhado - {selectedCollaborator?.name}
                  </span>
                  <p className="text-sm font-normal text-gray-600 mt-1">
                    Análise completa de performance e atividades
                  </p>
                </div>
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-2">
                Visualize informações detalhadas sobre o desempenho, metas e atividades do colaborador selecionado.
              </DialogDescription>
            </DialogHeader>
            
            {selectedCollaborator && (
              <div className="space-y-8 pt-6">
                {/* Informações Básicas - Card Moderno */}
                <Card className="border-0 shadow-lg bg-white">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <User className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Nome</p>
                        <p className="font-semibold text-gray-900">{selectedCollaborator.name}</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Target className="w-6 h-6 text-green-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Setor</p>
                        <p className="font-bold text-gray-900">{selectedCollaborator.sector}</p>
                      </div>
                      <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                        <Award className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Função</p>
                        <p className="font-bold text-gray-900">{selectedCollaborator.role}</p>
                      </div>
                      <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                        <Activity className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">ID</p>
                        <p className="font-bold text-gray-900 text-xs">{selectedCollaborator.$id}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Timeline de Atividades - Design Premium */}
                <Card className="border border-green-100/50 shadow-md bg-gradient-to-r from-white to-green-50/30 rounded-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 bg-green-100 rounded-xl">
                        <Calendar className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <span>Timeline do Mês - {getMonthNameInPortuguese(new Date())} {format(new Date(), 'yyyy')}</span>
                        <p className="text-sm font-normal text-gray-600 mt-1">
                          Acompanhamento diário de atividades do mês
                        </p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="bg-white/80 p-6 rounded-2xl">
                      <div className="grid grid-cols-7 gap-2 mb-6">
                        {eachDayOfInterval({
                          start: startOfMonth(new Date()),
                          end: new Date() // Mostra até hoje
                        }).map((day, index) => {
                          const dayStr = format(day, 'yyyy-MM-dd');
                          const hasSubmission = submissions.some(s => 
                            s.userProfile.$id === selectedCollaborator.$id &&
                            format(new Date(s.date), 'yyyy-MM-dd') === dayStr
                          );
                          
                          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                          
                          return (
                            <div
                              key={index}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-300 hover:scale-110 ${
                                isToday 
                                  ? 'bg-gradient-to-br from-blue-400 to-blue-500 text-white shadow-lg ring-2 ring-blue-300' :
                                hasSubmission 
                                  ? 'bg-gradient-to-br from-green-400 to-green-500 text-white shadow-lg' 
                                  : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                              }`}
                              title={`${format(day, 'dd/MM/yyyy')} - ${isToday ? 'Hoje' : hasSubmission ? 'Ativo' : 'Sem atividade'}`}
                            >
                              {format(day, 'd')}
                            </div>
                          );
                        })}
                        
                        {/* Mostrar dias restantes do mês em cinza claro */}
                        {Array.from({ length: getDaysInMonth(new Date()) - parseInt(format(new Date(), 'd')) }, (_, i) => {
                          const futureDay = i + parseInt(format(new Date(), 'd')) + 1;
                          return (
                            <div
                              key={`future-${i}`}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-gray-100 text-gray-400"
                              title={`${futureDay}/${format(new Date(), 'MM/yyyy')} - Futuro`}
                            >
                              {futureDay}
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="flex items-center justify-center gap-6 text-sm flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-500 rounded-lg ring-2 ring-blue-300"></div>
                          <span className="text-gray-700 font-medium">Hoje</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-green-500 rounded-lg"></div>
                          <span className="text-gray-700 font-medium">Dia com submissão</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-gray-200 rounded-lg"></div>
                          <span className="text-gray-700 font-medium">Sem atividade</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-gray-100 rounded-lg"></div>
                          <span className="text-gray-700 font-medium">Futuro</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Submissões Recentes - Design Compacto e Organizado */}
                <Card className="border border-purple-100/50 shadow-md bg-gradient-to-r from-white to-purple-50/30 rounded-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 bg-purple-100 rounded-xl">
                        <Activity className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <span>Submissões Recentes</span>
                        <p className="text-sm font-normal text-gray-600 mt-1">
                          Clique para ver detalhes completos
                        </p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {filteredSubmissions
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 8)
                        .map((submission, index) => {
                          const responses = formatChecklistResponses(submission.checklist);
                          const completed = typeof responses === 'object' ? responses.filter(r => r.isCompleted).length : 0;
                          const total = typeof responses === 'object' ? responses.length : 0;
                          const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
                          
                          return (
                            <div 
                              key={submission.$id} 
                              className="group p-4 rounded-xl bg-white shadow-sm hover:shadow-md border border-gray-100 hover:border-purple-200 transition-all duration-200 cursor-pointer"
                              onClick={() => {
                                setSelectedSubmission(submission);
                                setIsSubmissionModalOpen(true);
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                    {index + 1}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-semibold text-gray-900 text-sm">
                                        {format(new Date(submission.date), 'dd/MM/yyyy')}
                                      </p>
                                      <Badge variant="outline" className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 border-purple-200">
                                        {format(new Date(submission.date), 'HH:mm')}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-gray-600">
                                      <span>✅ {completed}/{total} metas</span>
                                      <span>📊 {completionRate}% concluído</span>
                                      {submission.observation && <span>📝 Com observação</span>}
                                      {submission.printFileId && <span>📎 Com anexo</span>}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-purple-500 to-green-500 transition-all duration-300"
                                      style={{ width: `${completionRate}%` }}
                                    ></div>
                                  </div>
                                  <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      
                      {filteredSubmissions.length === 0 && (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Activity className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-gray-500 font-medium text-sm">Nenhuma submissão encontrada</p>
                          <p className="text-xs text-gray-400 mt-1">Este colaborador ainda não fez submissões</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal: Colaboradores que Precisam de Atenção */}
        <Dialog open={isAttentionModalOpen} onOpenChange={setIsAttentionModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl font-bold text-red-700">
                <AlertTriangle className="w-6 h-6" />
                Colaboradores que Precisam de Atenção
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-2">
                Lista de colaboradores com baixo desempenho ou que necessitam de acompanhamento especial.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {getCollaboratorsNeedingAttention().length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-green-700">Excelente!</p>
                  <p className="text-gray-600">Todos os colaboradores estão com boa performance!</p>
                </div>
              ) : (
                getCollaboratorsNeedingAttention().map((collab, index) => (
                  <div key={collab.id} className="p-4 border border-red-200 rounded-xl bg-gradient-to-r from-red-50 to-orange-50">
                    <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold">
                                  {index + 1}
                                </div>
                                <div>
                          <h4 className="font-bold text-gray-900">{collab.name}</h4>
                          <p className="text-sm text-gray-600">Status: {collab.status === 'risk' ? 'Risco' : 'Inativo'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-600">
                          {Math.round(collab.completionRate)}%
                        </div>
                        <p className="text-xs text-gray-500">Taxa de conclusão</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                      <span>📅 Esta semana: {collab.submissionsThisWeek}</span>
                      <span>🔥 Streak: {collab.streak} dias</span>
                      <span>📊 Última submissão: {collab.lastSubmission}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Top Performers - Reconhecimento */}
        <Dialog open={isTopPerformersModalOpen} onOpenChange={setIsTopPerformersModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl font-bold text-blue-700">
                <Trophy className="w-6 h-6" />
                Top Performers - Reconhecimento da Equipe
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-2">
                Reconheça e celebre os colaboradores com melhor desempenho da equipe.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {getTopPerformers().length === 0 ? (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-gray-700">Nenhum Top Performer</p>
                  <p className="text-gray-600">Ainda não há colaboradores com performance acima de 80%</p>
                </div>
              ) : (
                getTopPerformers().map((collab, index) => (
                  <div key={collab.id} className="p-4 border border-blue-200 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500' :
                          index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                          index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500' :
                          'bg-gradient-to-br from-blue-400 to-blue-500'
                        }`}>
                          {index < 3 ? (
                            index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'
                          ) : (
                            index + 1
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{collab.name}</h4>
                          <p className="text-sm text-gray-600">Status: {collab.status === 'active' ? 'Ativo' : 'Bom desempenho'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {Math.round(collab.completionRate)}%
                        </div>
                        <p className="text-xs text-gray-500">Taxa de conclusão</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                      <span>📅 Esta semana: {collab.submissionsThisWeek}</span>
                      <span>🔥 Streak: {collab.streak} dias</span>
                      <span>⭐ Performance excepcional!</span>
                    </div>
                  </div>
                ))
              )}
              
              {getTopPerformers().length > 0 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                  <p className="text-center text-green-700 font-semibold">
                    🎉 Parabéns aos nossos top performers! Continue com o excelente trabalho! 🎉
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Detalhes da Submissão */}
        <Dialog open={isSubmissionModalOpen} onOpenChange={setIsSubmissionModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl font-bold text-purple-700">
                <Activity className="w-6 h-6" />
                Detalhes da Submissão
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-2">
                Informações completas sobre a submissão selecionada.
              </DialogDescription>
            </DialogHeader>
            
            {selectedSubmission && (
              <div className="space-y-6 pt-4">
                {/* Cabeçalho da Submissão */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
                        📋
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          Submissão de {format(new Date(selectedSubmission.date), 'dd/MM/yyyy')}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Enviada às {format(new Date(selectedSubmission.date), 'HH:mm')} - ID: {selectedSubmission.$id.slice(0, 12)}...
                                  </p>
                                </div>
                              </div>
                    <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 px-3 py-1">
                      Submissão Completa
                              </Badge>
                  </div>
                            </div>
                            
                              {/* Resumo das Metas */}
                              {(() => {
                  const responses = formatChecklistResponses(selectedSubmission.checklist);
                                if (typeof responses === 'object' && responses.length > 0) {
                                  const completed = responses.filter(r => r.isCompleted).length;
                                  const total = responses.length;
                                  const completionRate = Math.round((completed / total) * 100);
                                  
                                  return (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="p-6 border-b border-gray-100">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                                            {completionRate}%
                                          </div>
                                          <div>
                                <h4 className="font-bold text-gray-900">Taxa de Conclusão</h4>
                                            <p className="text-sm text-gray-600">{completed} de {total} metas concluídas</p>
                                          </div>
                                        </div>
                                        <div className="text-right">
                              <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden">
                                            <div 
                                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                                              style={{ width: `${completionRate}%` }}
                                            ></div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                              
                        <div className="p-6">
                          <h5 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                            Detalhes das Metas
                          </h5>
                          <div className="space-y-3">
                            {responses.map((response, idx) => {
                              const isContested = isGoalContestedSafe(response.goalId, selectedSubmission.$id);
                              const goalFileIds = getGoalFiles(selectedSubmission, response.goalId);
                              
                                      return (
                                <div key={idx} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                      <span className="text-2xl">{response.status}</span>
                                      <div>
                                        <p className="font-medium text-gray-900">{response.goalName}</p>
                                        <p className="text-sm text-gray-600">{response.goalType}</p>
                                        {isContested && (
                                          <p className="text-xs text-red-600 font-medium mt-1">
                                            ⚠️ Contestada
                                          </p>
                                        )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge 
                                        variant="outline" 
                                        className={`px-3 py-1 font-medium ${
                                          isContested
                                            ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                                            : response.isCompleted 
                                              ? 'bg-green-100 text-green-700 border-green-300' 
                                              : 'bg-red-100 text-red-700 border-red-300'
                                        }`}
                                      >
                                        {isContested 
                                          ? '⚠️ Contestada' 
                                          : response.isCompleted 
                                            ? '✅ Concluída' 
                                            : '❌ Pendente'
                                        }
                                      </Badge>
                                      {!isContested && response.isCompleted && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-red-600 border-red-300 hover:bg-red-50"
                                          onClick={() => {
                                            setSelectedGoalForContestation({
                                              goalId: response.goalId,
                                              goalName: response.goalName,
                                              goalType: response.goalType
                                            });
                                            setIsContestationModalOpen(true);
                                          }}
                                        >
                                          Contestar
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Arquivos Comprobatórios da Meta */}
                                  {goalFileIds.length > 0 && (
                                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                      <div className="flex items-center gap-2 mb-2">
                                        <FileImage className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm font-medium text-blue-800">
                                          Arquivos de Comprovação ({goalFileIds.length})
                                              </span>
                                            </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {goalFileIds.map((fileId) => (
                                          <div key={fileId} className="flex items-center justify-between bg-white rounded-md border border-blue-100 px-2 py-1">
                                            <span className="text-xs text-gray-700 truncate mr-2">ID: {fileId.slice(0, 8)}...</span>
                                            <div className="flex items-center gap-1">
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-2 text-blue-600 border-blue-300 hover:bg-blue-50"
                                                onClick={() => window.open(getFilePreview(fileId), '_blank')}
                                              >
                                                <Eye className="w-3 h-3" />
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-2 text-green-600 border-green-300 hover:bg-green-50"
                                                onClick={() => window.open(getFileDownload(fileId), '_blank')}
                                              >
                                                <Download className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                      </div>
                                    );
                            })}
                                </div>
                              </div>
                      </div>
                    );
                  }
                  return (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="text-center">
                        <p className="text-gray-500">Nenhuma meta encontrada nesta submissão</p>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Observação */}
                {selectedSubmission.observation && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-100">
                      <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                                    <FileImage className="w-5 h-5 text-orange-600" />
                        Observação do Colaborador
                      </h4>
                                  </div>
                    <div className="p-6">
                      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                        <p className="text-gray-700 leading-relaxed">
                          {selectedSubmission.observation}
                        </p>
                      </div>
                    </div>
                                </div>
                              )}
                              
                {/* Arquivo Comprobatório Geral (apenas se não houver arquivos por meta) */}
                {selectedSubmission.printFileId && !selectedSubmission.goalFiles && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-100">
                      <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                                    <FileImage className="w-5 h-5 text-blue-600" />
                        Arquivo Comprobatório Geral
                      </h4>
                                  </div>
                    <div className="p-6">
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <FileImage className="w-5 h-5 text-blue-600" />
                                        </div>
                            <div>
                              <p className="font-medium text-gray-900">Arquivo de comprovação geral</p>
                              <p className="text-sm text-gray-600">ID: {selectedSubmission.printFileId.slice(0, 16)}...</p>
                                      </div>
                          </div>
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                        Anexado
                          </Badge>
                                    </div>
                                    
                        <div className="flex gap-3">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                            className="flex-1 bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700 hover:text-blue-800"
                                        onClick={() => {
                              const viewUrl = `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${process.env.NEXT_PUBLIC_APPWRITE_PRINTS_BUCKET_ID}/files/${selectedSubmission.printFileId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;
                                          window.open(viewUrl, '_blank');
                                        }}
                                      >
                                        <Eye className="w-4 h-4 mr-2" />
                                        Visualizar
                                      </Button>
                                      
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                            className="flex-1 bg-green-50 hover:bg-green-100 border-green-300 text-green-700 hover:text-green-800"
                                        onClick={() => {
                              const downloadUrl = `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${process.env.NEXT_PUBLIC_APPWRITE_PRINTS_BUCKET_ID}/files/${selectedSubmission.printFileId}/download?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;
                                          window.open(downloadUrl, '_blank');
                                        }}
                                      >
                                        <Download className="w-4 h-4 mr-2" />
                                        Baixar
                                      </Button>
                                    </div>
                                    
                        <div className="mt-4 pt-4 border-t border-blue-200">
                                      <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Enviado em {format(new Date(selectedSubmission.date), 'dd/MM/yyyy às HH:mm')}</span>
                            <span>ID: {selectedSubmission.printFileId.slice(0, 12)}...</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                        </div>
                      )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal: Detalhes das Recompensas */}
        <Dialog open={isRewardsModalOpen} onOpenChange={setIsRewardsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl font-bold text-orange-700">
                <Award className="w-6 h-6" />
                Detalhes das Recompensas Pendentes
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-2">
                Lista de colaboradores com recompensas monetárias que precisam ser pagas pelo gestor.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {getCollaboratorsWithRewards().length === 0 ? (
                <div className="text-center py-8">
                  <Award className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-green-700">Nenhuma Recompensa Pendente!</p>
                  <p className="text-gray-600">Todos os colaboradores já receberam suas recompensas ou ainda não há recompensas para pagar.</p>
                </div>
              ) : (
                <>
                  {/* Resumo Geral */}
                  <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-xl border border-orange-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {formatCurrency(centavosToReais(getCollaboratorsWithRewards().reduce((acc, collab) => acc + collab.totalEarned, 0)))}
                        </div>
                        <p className="text-sm text-gray-600">Total a Pagar</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {getCollaboratorsWithRewards().length}
                        </div>
                        <p className="text-sm text-gray-600">Colaboradores</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(centavosToReais(Math.round(getCollaboratorsWithRewards().reduce((acc, collab) => acc + collab.totalEarned, 0) / getCollaboratorsWithRewards().length)))}
                        </div>
                        <p className="text-sm text-gray-600">Média por Colaborador</p>
                      </div>
                    </div>
                  </div>

                  {/* Lista de Colaboradores */}
                  <div className="space-y-3">
                    {getCollaboratorsWithRewards().map((collaborator, index) => (
                      <div key={collaborator.id} className="p-4 border border-orange-200 rounded-xl bg-gradient-to-r from-orange-50 to-yellow-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div>
                              <h4 className="font-bold text-gray-900">{collaborator.name}</h4>
                              <p className="text-sm text-gray-600">
                                {collaborator.rewardsCount} recompensa{collaborator.rewardsCount > 1 ? 's' : ''} • Última: {collaborator.lastEarned}
                              </p>
                        </div>
                      </div>
                      <div className="text-right">
                            <div className="text-2xl font-bold text-orange-600">
                              {formatCurrency(centavosToReais(collaborator.totalEarned))}
                        </div>
                            <p className="text-xs text-gray-500">A pagar</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                          <span>💰 Recompensas: {collaborator.rewardsCount}</span>
                          <span>📅 Última: {collaborator.lastEarned}</span>
                          <span>✅ Pendente de pagamento</span>
                    </div>
                  </div>
                    ))}
                  </div>

                  {/* Aviso de Pagamento */}
                  <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="text-orange-700 font-semibold">Atenção ao Pagamento</p>
                        <p className="text-sm text-orange-600">
                          Estas recompensas foram calculadas automaticamente e estão pendentes de pagamento. 
                          Certifique-se de processar os pagamentos conforme a política da empresa.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Contestação de Meta */}
        <ContestationModal
          isOpen={isContestationModalOpen}
          onClose={() => {
            setIsContestationModalOpen(false);
            setSelectedGoalForContestation(null);
          }}
          onSubmit={handleContestGoal}
          goalTitle={selectedGoalForContestation?.goalName || ''}
          collaboratorName={selectedSubmission?.userProfile?.name || ''}
          submissionDate={selectedSubmission ? format(new Date(selectedSubmission.date), 'dd/MM/yyyy') : ''}
        />

        {/* Modal de Gerenciamento de Contestações */}
        <Dialog open={isContestationManagementOpen} onOpenChange={setIsContestationManagementOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Gerenciamento de Contestações
              </DialogTitle>
              <DialogDescription>
                Visualize e gerencie todas as contestações de metas dos colaboradores
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Filtros */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Filtrar por status:</span>
                </div>
                <div className="flex gap-2">
                  {[
                    { key: 'all', label: 'Todas', count: contestations.length },
                    { key: 'pending', label: 'Pendentes', count: contestations.filter(c => c.status === 'pending').length },
                    { key: 'resolved', label: 'Resolvidas', count: contestations.filter(c => c.status === 'resolved').length },
                    { key: 'dismissed', label: 'Dispensadas', count: contestations.filter(c => c.status === 'dismissed').length }
                  ].map((filter) => (
                    <Button
                      key={filter.key}
                      variant={contestationFilter === filter.key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setContestationFilter(filter.key as any)}
                      className={contestationFilter === filter.key ? 'bg-orange-600 hover:bg-orange-700' : ''}
                    >
                      {filter.label} ({filter.count})
                    </Button>
                  ))}
                </div>
              </div>

              {/* Lista de Contestações */}
            <div className="space-y-4">
                {filteredContestations.length === 0 ? (
                <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhuma contestação encontrada</p>
                </div>
              ) : (
                  filteredContestations.map((contestation) => {
                    const goalDetails = getGoalDetails(contestation.goalId);
                    const submissionDetails = getSubmissionDetails(contestation.submissionId);
                    
                    return (
                    <Card key={contestation.$id} className="border-l-4 border-l-orange-500">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                <AlertTriangle className="w-4 h-4 text-orange-600" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 text-lg">
                                  {getGoalName(contestation.goalId)}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  Colaborador: <span className="font-medium">{getCollaboratorName(contestation.collaboratorId)}</span>
                                </p>
                                {submissionDetails && (
                                  <p className="text-xs text-gray-500">
                                    Submissão de: {format(new Date(submissionDetails.date), 'dd/MM/yyyy HH:mm')}
                                  </p>
                          )}
                        </div>
                              <Badge 
                                variant="outline" 
                                className={`${
                                  contestation.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                                  contestation.status === 'resolved' ? 'bg-green-100 text-green-700 border-green-300' :
                                  'bg-gray-100 text-gray-700 border-gray-300'
                                }`}
                              >
                                {contestation.status === 'pending' ? 'Pendente' :
                                 contestation.status === 'resolved' ? 'Resolvida' : 'Dispensada'}
                              </Badge>
                            </div>

                            {/* Detalhes da Meta */}
                            {goalDetails && (
                              <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
                                <h5 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                                  <Target className="w-4 h-4" />
                                  Detalhes da Meta Contestada
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                                    <span className="text-blue-700 font-medium">Meta:</span>
                                    <p className="text-blue-800 mt-1">{goalDetails.title}</p>
                        </div>
                                  {goalDetails.hasMonetaryReward && goalDetails.monetaryValue && (
                                    <div>
                                      <span className="text-blue-700 font-medium">Recompensa:</span>
                                      <p className="text-blue-800 mt-1">{formatCurrency(centavosToReais(goalDetails.monetaryValue))}</p>
                      </div>
                                  )}
                        </div>
                      </div>
                            )}

                            <div className="bg-red-50 rounded-lg p-4 mb-4 border border-red-200">
                              <h5 className="font-medium text-red-900 mb-2 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                Motivo da Contestação
                              </h5>
                              <p className="text-red-800">{contestation.reason}</p>
                    </div>

                            {(() => {
                              const collaboratorReply = (contestation as any).collaboratorResponse || (contestation as any).response;
                              return !!collaboratorReply;
                            })() && (
                              <div className="bg-green-50 rounded-lg p-4 mb-4 border border-green-200">
                                <h5 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                                  <MessageSquare className="w-4 h-4" />
                                  Resposta do Colaborador
                                </h5>
                                <p className="text-green-800">{(contestation as any).collaboratorResponse || (contestation as any).response}</p>
                                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                  <CalendarIcon className="w-3 h-3" />
                                  Respondido em: {((contestation as any).updatedAt || (contestation as any).$updatedAt) ?
                                    format(new Date((contestation as any).updatedAt || (contestation as any).$updatedAt), 'dd/MM/yyyy HH:mm') : 'Data não disponível'}
                                </p>
                    </div>
                            )}

                            {(!((contestation as any).collaboratorResponse || (contestation as any).response) && contestation.status === 'pending') && (
                              <div className="bg-yellow-50 rounded-lg p-4 mb-4 border border-yellow-200">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-yellow-600" />
                                  <span className="text-sm font-medium text-yellow-800">
                                    Aguardando resposta do colaborador
                                  </span>
                  </div>
                              </div>
                            )}

                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="w-4 h-4" />
                                <span>Criada em: {format(new Date(contestation.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                <span>ID: {contestation.$id.slice(0, 8)}...</span>
                              </div>
                            </div>
                          </div>

                          {/* Ações */}
                          {contestation.status === 'pending' && (
                            <div className="flex flex-col gap-2 ml-4">
                              <Button
                                size="sm"
                                onClick={() => handleResolveContestation(contestation.$id)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Resolver
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDismissContestation(contestation.$id)}
                                className="text-gray-600 border-gray-300 hover:bg-gray-50"
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Dispensar
                              </Button>
                </div>
              )}
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
