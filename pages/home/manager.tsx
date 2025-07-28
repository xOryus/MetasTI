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
  AlertTriangle, Clock, CheckCircle, XCircle, Star, Zap, ChevronDown, ChevronUp, Minimize2, Maximize2
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { Role } from '@/lib/roles';
import { account } from '@/lib/appwrite';

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

  // Estados para funcionalidades avançadas
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [collaboratorRankings, setCollaboratorRankings] = useState<CollaboratorRanking[]>([]);
  const [actionCards, setActionCards] = useState<ActionCard[]>([]);
  
  // Estado para controlar minimização dos alertas
  const [isAlertsMinimized, setIsAlertsMinimized] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');

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
        metaMes: 90
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

    // Taxa de conclusão (submissões vs esperado)
    const expectedSubmissions = sectorCollaborators.length * daysInMonth;
    const taxaConclusao = expectedSubmissions > 0 ? (sectorSubmissions.length / expectedSubmissions) * 100 : 0;

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

    return {
      taxaConclusao: Math.round(taxaConclusao * 10) / 10,
      usuariosAtivos,
      metaMensal: Math.round(metaMensal * 10) / 10,
      tendencia,
      crescimentoSemanal: Math.round(crescimentoSemanal * 10) / 10,
      melhorPerformance,
      mediaGeral: Math.round(mediaGeral * 10) / 10,
      metaMes: 90
    };
  };

  // Performance semanal (últimos 7 dias)
  const generatePerformanceSemanal = () => {
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

      return {
        date: format(date, 'dd/MM'),
        completion: sectorCollaborators.length > 0 ? 
          Math.round((daySubmissions.length / sectorCollaborators.length) * 100) : 0
      };
    });
  };

  // Tendência de crescimento (últimos 7 dias)
  const generateTendenciaCrescimento = () => {
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

      return {
        date: format(date, 'dd/MM'),
        completion: sectorCollaborators.length > 0 ? 
          Math.round((daySubmissions.length / sectorCollaborators.length) * 100) : 0
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
      // Submissões do último mês
      const monthStart = startOfMonth(new Date());
      const collabSubmissions = submissions.filter(s => 
        s.userProfile.$id === collab.$id && new Date(s.date) >= monthStart
      );

      // Taxa de conclusão do mês
      const daysInMonth = new Date().getDate();
      const completionRate = (collabSubmissions.length / daysInMonth) * 100;

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

      // Status do colaborador
      let status: 'active' | 'risk' | 'inactive' = 'active';
      if (!lastSubmission || new Date(lastSubmission.date) < subDays(new Date(), 3)) {
        status = 'inactive';
      } else if (completionRate < 50) {
        status = 'risk';
      }

      return {
        id: collab.$id,
        name: collab.name,
        completionRate: Math.round(completionRate),
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

    // Card 4: Streak médio
    const averageStreak = rankings.reduce((sum, r) => sum + r.streak, 0) / rankings.length;

    return [
      {
        title: 'Precisam Atenção',
        value: needAttention,
        trend: -attentionTrend,
        description: `${needAttention} de ${sectorCollaborators.length} colaboradores`,
        action: 'Ver detalhes',
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
        title: 'Streak Médio',
        value: Math.round(averageStreak),
        trend: 12, // Placeholder
        description: 'Dias consecutivos em média',
        icon: Zap,
        color: 'text-purple-600'
      }
    ];
  };

  // Função para sanitizar e formatar respostas do checklist
  const formatChecklistResponses = (checklistString: string) => {
    try {
      const responses = JSON.parse(checklistString);
      const entries = Object.entries(responses);
      
      if (entries.length === 0) return 'Nenhuma resposta registrada';
      
      return entries.map(([key, value]) => {
        const isCompleted = value === true || value === 'true';
        const status = isCompleted ? '✅' : '❌';
        const goalName = key.replace(/^.*-/, '').replace(/_/g, ' '); // Simplificar nome da meta
        return `${status} ${goalName}`;
      }).join('\n');
    } catch (error) {
      return 'Formato de resposta inválido';
    }
  };

  // Funções para lidar com os cliques dos botões dos cards
  const handleCardAction = (action: string) => {
    switch(action) {
      case 'Ver detalhes':
        setIsAttentionModalOpen(true);
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
  }, [profiles, submissions, profile]);

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
  const performanceSemanal = generatePerformanceSemanal();
  const tendenciaCrescimento = generateTendenciaCrescimento();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Corporativo */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Dashboard Gerencial - {profile.sector}
                </h1>
                <p className="text-xs text-gray-500">
                  Sistema Inteligente de Monitoramento
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-700">Sistema Ativo</span>
              </div>
              <Button 
                onClick={handleLogout} 
                variant="outline"
                size="sm"
                className="border-gray-200 hover:bg-gray-50 text-sm"
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-6">
        
        {/* Cards de Ação Rápida - Layout Profissional */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-8 mb-12">
          {actionCards.map((card, index) => {
            const IconComponent = card.icon;
            const isPositive = card.title.includes('Top') || card.title.includes('Performance');
            const isNegative = card.title.includes('Atenção');
            
            return (
              <Card key={index} className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 bg-gradient-to-br from-white via-white to-gray-50/50">
                {/* Gradiente de fundo decorativo */}
                <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${
                  isPositive ? 'from-green-400 to-blue-500' :
                  isNegative ? 'from-red-400 to-orange-500' :
                  'from-purple-400 to-indigo-500'
                }`}></div>
                
                <CardContent className="p-8 relative">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-3 rounded-2xl shadow-lg ${
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
                      
                      <div className="space-y-3">
                        <p className={`text-4xl font-bold ${card.color} leading-none`}>
                          {card.value}{card.title.includes('Performance') ? '%' : ''}
                        </p>
                        
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {card.description}
                        </p>
                        
                        {card.action && (
                          <div className="pt-4">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleCardAction(card.action!)}
                              className="group-hover:bg-blue-50 group-hover:text-blue-700 transition-all duration-200 rounded-xl px-4 py-2 text-xs font-semibold hover:shadow-md"
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
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
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

        {/* Alertas Inteligentes - Design Corporativo */}
        {alerts.length > 0 && (
          <div className="mb-8">
            <Card className="border border-gray-200 shadow-sm overflow-hidden">
              {/* Cabeçalho com toggle - estilo profissional */}
              <div 
                className="flex items-center justify-between px-6 py-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setIsAlertsMinimized(!isAlertsMinimized)}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-2 rounded-md">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-medium text-gray-900">Alertas Inteligentes</h2>
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
                  {/* Alerta resumido em formato horizontal - mais compacto e profissional */}
                  <div className="space-y-4">
                    {alerts.map((alert, index) => (
                      <div 
                        key={index} 
                        className={`flex items-center border rounded-lg shadow-sm overflow-hidden ${
                          alert.type === 'risk' ? 'border-red-200 bg-white' :
                          alert.type === 'warning' ? 'border-amber-200 bg-white' :
                          'border-green-200 bg-white'
                        }`}
                      >
                        {/* Indicador de tipo (barra vertical) */}
                        <div 
                          className={`self-stretch w-1.5 ${
                            alert.type === 'risk' ? 'bg-red-500' :
                            alert.type === 'warning' ? 'bg-amber-500' :
                            'bg-green-500'
                          }`}
                        />
                        
                        {/* Ícone */}
                        <div className={`p-4 ${
                          alert.type === 'risk' ? 'text-red-600' :
                          alert.type === 'warning' ? 'text-amber-600' :
                          'text-green-600'
                        }`}>
                          {alert.type === 'risk' ? <XCircle className="h-6 w-6" /> :
                           alert.type === 'warning' ? <Clock className="h-6 w-6" /> :
                           <CheckCircle className="h-6 w-6" />}
                        </div>
                        
                        {/* Conteúdo do alerta */}
                        <div className="py-4 px-2 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className={`font-medium ${
                              alert.type === 'risk' ? 'text-red-900' :
                              alert.type === 'warning' ? 'text-amber-900' :
                              'text-green-900'
                            }`}>
                              {alert.title}
                            </h4>
                            <Badge className={`ml-2 ${
                              alert.type === 'risk' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                              alert.type === 'warning' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' :
                              'bg-green-100 text-green-800 hover:bg-green-200'
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
                          <div className="p-4 border-l border-gray-100">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`whitespace-nowrap ${
                                alert.type === 'risk' ? 'text-red-700 hover:text-red-800 hover:bg-red-50' :
                                alert.type === 'warning' ? 'text-amber-700 hover:text-amber-800 hover:bg-amber-50' :
                                'text-green-700 hover:text-green-800 hover:bg-green-50'
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

        {/* Ranking de Colaboradores e Gráficos - Layout Premium */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 mb-12">
          
          {/* Ranking de Colaboradores - Design Premium */}
          <div className="xl:col-span-5">
            <Card className="h-full shadow-lg border border-yellow-100/50 bg-gradient-to-br from-white via-yellow-50/15 to-orange-50/15 overflow-hidden rounded-xl">
              {/* Header com gradiente */}
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-1">
                <CardHeader className="bg-white/95 backdrop-blur-sm rounded-t-lg">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-xl">
                      <Trophy className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <span className="text-xl font-bold text-gray-900">Ranking - {profile.sector}</span>
                      <p className="text-sm font-normal text-gray-600 mt-1">
                        Top 5 colaboradores por performance
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
              </div>
              
              <CardContent className="p-8">
                <div className="space-y-6">
                  {collaboratorRankings.slice(0, 5).map((ranking, index) => (
                    <div 
                      key={ranking.id}
                      className="group relative p-6 rounded-2xl bg-gradient-to-r from-white via-gray-50/50 to-blue-50/30 hover:from-blue-50 hover:via-indigo-50 hover:to-purple-50 border-2 border-gray-100 hover:border-blue-200 shadow-lg hover:shadow-xl transition-all duration-500 cursor-pointer transform hover:-translate-y-1"
                      onClick={() => {
                        const collaborator = profiles.find(p => p.$id === ranking.id);
                        if (collaborator) {
                          setSelectedCollaborator(collaborator);
                          setIsModalOpen(true);
                        }
                      }}
                    >
                      {/* Posição de destaque */}
                      <div className="absolute -top-3 -left-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-lg ${
                          index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-yellow-900' :
                          index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800' :
                          index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-orange-900' :
                          'bg-gradient-to-br from-blue-400 to-blue-500 text-blue-900'
                        }`}>
                          {index + 1}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 ml-6">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-700 transition-colors">
                              {ranking.name}
                            </h3>
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-purple-500" />
                                <span className="text-sm font-medium text-gray-600">
                                  Streak: {ranking.streak} dias
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-medium text-gray-600">
                                  {ranking.submissionsThisWeek} esta semana
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-3xl font-bold text-gray-900">{ranking.completionRate}%</p>
                              <p className="text-xs text-gray-500">Taxa de conclusão</p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold shadow-md ${
                              ranking.status === 'active' ? 'bg-green-100 text-green-800 border border-green-200' :
                              ranking.status === 'risk' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                              'bg-red-100 text-red-800 border border-red-200'
                            }`}>
                              {ranking.status === 'active' ? '🟢 Ativo' :
                               ranking.status === 'risk' ? '🟡 Atenção' : '🔴 Inativo'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Barra de progresso */}
                      <div className="mt-4 ml-6">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-1000 ${
                              ranking.completionRate >= 80 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                              ranking.completionRate >= 60 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                              'bg-gradient-to-r from-red-400 to-red-500'
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

          {/* Gráficos - Design Premium */}
          <div className="xl:col-span-7 space-y-8">
            
            {/* Performance Semanal */}
            <Card className="shadow-lg border border-blue-100/50 bg-gradient-to-br from-white via-blue-50/15 to-indigo-50/15 overflow-hidden rounded-xl">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-1">
                <CardHeader className="bg-white/95 backdrop-blur-sm rounded-t-lg">
                  <CardTitle className="flex items-center gap-3 text-blue-700">
                    <div className="p-2 bg-blue-100 rounded-xl">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <span className="text-xl font-bold">Performance Semanal</span>
                      <p className="text-sm font-normal text-gray-600 mt-1">
                        Evolução dos últimos 7 dias
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
              </div>
              <CardContent className="p-8">
                <div className="bg-white/80 rounded-2xl p-6 shadow-inner">
                  <Chart 
                    data={performanceSemanal} 
                    type="line" 
                    title=""
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tendência de Crescimento */}
            <Card className="shadow-lg border border-purple-100/50 bg-gradient-to-br from-white via-purple-50/15 to-pink-50/15 overflow-hidden rounded-xl">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-1">
                <CardHeader className="bg-white/95 backdrop-blur-sm rounded-t-lg">
                  <CardTitle className="flex items-center gap-3 text-purple-700">
                    <div className="p-2 bg-purple-100 rounded-xl">
                      <BarChart3 className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <span className="text-xl font-bold">Tendência de Crescimento</span>
                      <p className="text-sm font-normal text-gray-600 mt-1">
                        Análise de evolução temporal
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
              </div>
              <CardContent className="p-8">
                <div className="bg-white/80 rounded-2xl p-6 shadow-inner">
                  <Chart 
                    data={tendenciaCrescimento} 
                    type="line" 
                    title=""
                  />
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Modal de Detalhes do Colaborador - Design Premium */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 border-0 shadow-2xl">
            <DialogHeader className="pb-6 border-b border-gray-200">
              <DialogTitle className="flex items-center gap-4 text-2xl">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
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
                {/* Informações Básicas - Card Premium */}
                <Card className="border border-blue-100/50 shadow-md bg-gradient-to-r from-white to-blue-50/30 rounded-xl">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                        <User className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Nome</p>
                        <p className="font-bold text-gray-900">{selectedCollaborator.name}</p>
                      </div>
                      <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                        <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
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

                {/* Submissões Recentes - Design Premium */}
                <Card className="border border-purple-100/50 shadow-md bg-gradient-to-r from-white to-purple-50/30 rounded-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 bg-purple-100 rounded-xl">
                        <Activity className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <span>Submissões Recentes</span>
                        <p className="text-sm font-normal text-gray-600 mt-1">
                          Últimas 10 atividades registradas
                        </p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                      {submissions
                        .filter(s => s.userProfile.$id === selectedCollaborator.$id)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 10)
                        .map((submission, index) => (
                          <div key={submission.$id} className="group p-6 rounded-2xl bg-white shadow-lg hover:shadow-xl border border-gray-100 hover:border-blue-200 transition-all duration-300">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-bold text-lg text-gray-900">
                                    {format(new Date(submission.date), 'dd/MM/yyyy - HH:mm')}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    ID: {submission.$id.slice(0, 8)}...
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                                Submissão #{index + 1}
                              </Badge>
                            </div>
                            
                            <div className="space-y-4">
                              <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 p-4 rounded-xl">
                                <div className="flex items-center gap-2 mb-3">
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                  <p className="font-semibold text-gray-800">Respostas do Checklist</p>
                                </div>
                                <div className="text-sm text-gray-700 bg-white p-4 rounded-lg whitespace-pre-line shadow-sm">
                                  {formatChecklistResponses(submission.checklist)}
                                </div>
                              </div>
                              
                              {submission.observation && (
                                <div className="bg-gradient-to-r from-yellow-50 to-orange-50/50 p-4 rounded-xl">
                                  <div className="flex items-center gap-2 mb-3">
                                    <FileImage className="w-5 h-5 text-orange-600" />
                                    <p className="font-semibold text-gray-800">Observação</p>
                                  </div>
                                  <p className="text-sm text-gray-700 bg-white p-4 rounded-lg shadow-sm">
                                    {submission.observation}
                                  </p>
                                </div>
                              )}
                              
                              {submission.printFileId && (
                                <div className="bg-gradient-to-r from-green-50 to-blue-50/50 p-4 rounded-xl">
                                  <div className="flex items-center gap-2 mb-3">
                                    <FileImage className="w-5 h-5 text-blue-600" />
                                    <span className="font-semibold text-gray-800">Arquivo Comprobatório</span>
                                  </div>
                                  <div className="flex gap-3">
                                    <Suspense fallback={
                                      <div className="animate-pulse bg-gray-200 h-10 w-24 rounded"></div>
                                    }>
                                      <ProofImageViewer 
                                        fileId={submission.printFileId}
                                        submissionDate={format(new Date(submission.date), 'dd/MM/yyyy')}
                                        userName={selectedCollaborator.name}
                                      />
                                    </Suspense>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="bg-white hover:bg-blue-50 border-blue-200 text-blue-700 hover:text-blue-800 shadow-sm"
                                      onClick={() => {
                                        const downloadUrl = `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${process.env.NEXT_PUBLIC_APPWRITE_PRINTS_BUCKET_ID}/files/${submission.printFileId}/download?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;
                                        window.open(downloadUrl, '_blank');
                                      }}
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Baixar Arquivo
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      
                      {submissions.filter(s => s.userProfile.$id === selectedCollaborator.$id).length === 0 && (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileImage className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="text-gray-500 font-medium">Nenhuma submissão encontrada</p>
                          <p className="text-sm text-gray-400 mt-1">Este colaborador ainda não fez submissões</p>
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

      </div>
    </div>
  );
}
