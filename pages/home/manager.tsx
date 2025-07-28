/**
 * Dashboard Avançado do Gestor
 * Sistema inteligente de monitoramento com alertas, rankings e métricas gerenciais
 * Focado em insights acionáveis para tomada de decisão eficaz
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Chart } from '@/components/Chart';
import ProofImageViewer from '@/components/ProofImageViewer';
import { useAuth } from '@/hooks/useAuth';
import { useSubmissions } from '@/hooks/useSubmissions';
import { useAllProfiles } from '@/hooks/useAllProfiles';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, eachDayOfInterval, differenceInDays, getDaysInMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Users, TrendingUp, Target, Award, BarChart3, Calendar, 
  Activity, PieChart, Trophy, TrendingDown, Eye, FileImage, User, Download,
  AlertTriangle, Clock, CheckCircle, XCircle, Star, Zap
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { Role } from '@/lib/roles';
import { account } from '@/lib/appwrite';

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
  action: string;
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

  // Estados para o modal de detalhes do colaborador
  const [selectedCollaborator, setSelectedCollaborator] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados para funcionalidades avançadas
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [collaboratorRankings, setCollaboratorRankings] = useState<CollaboratorRanking[]>([]);
  const [actionCards, setActionCards] = useState<ActionCard[]>([]);
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
        count: inactiveCollaborators.length,
        action: 'Revisar atividade'
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
        action: 'Analisar tendência',
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
        action: 'Incentivar',
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

  if (authLoading || submissionsLoading || profilesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return null;
  }

  const dashboardMetrics = calculateDashboardMetrics();
  const performanceSemanal = generatePerformanceSemanal();
  const tendenciaCrescimento = generateTendenciaCrescimento();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header Profissional */}
      <div className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-700 bg-clip-text text-transparent">
                  Dashboard Avançado - {profile.sector}
                </h1>
                <p className="text-gray-600 font-medium">
                  Sistema Inteligente de Monitoramento Gerencial
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">Sistema Ativo</span>
              </div>
              <Button 
                onClick={handleLogout} 
                variant="outline"
                className="border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 lg:px-12 py-8">
        
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
                        
                        <div className="pt-4">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="group-hover:bg-blue-50 group-hover:text-blue-700 transition-all duration-200 rounded-xl px-4 py-2 text-xs font-semibold"
                          >
                            {card.action} 
                            <TrendingUp className="w-3 h-3 ml-2" />
                          </Button>
                        </div>
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

        {/* Seção de Alertas - Design Premium */}
        {alerts.length > 0 && (
          <Card className="mb-12 shadow-lg border border-orange-100/50 bg-gradient-to-r from-white via-orange-50/20 to-red-50/20 backdrop-blur-sm overflow-hidden rounded-xl">
            {/* Header com gradiente */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-1 rounded-t-xl">
              <CardHeader className="bg-white/95 backdrop-blur-sm rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-orange-700">
                  <div className="p-2 bg-orange-100 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <span className="text-xl font-bold">Alertas Inteligentes</span>
                    <p className="text-sm font-normal text-gray-600 mt-1">
                      Sistema de monitoramento proativo para tomada de decisão
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
            </div>
            
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {alerts.map((alert, index) => (
                  <div 
                    key={index} 
                    className={`group relative p-6 rounded-xl border shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 ${
                      alert.type === 'risk' ? 'border-red-100 bg-gradient-to-br from-red-50 to-red-100/30 hover:border-red-200' :
                      alert.type === 'warning' ? 'border-yellow-100 bg-gradient-to-br from-yellow-50 to-yellow-100/30 hover:border-yellow-200' :
                      'border-green-100 bg-gradient-to-br from-green-50 to-green-100/30 hover:border-green-200'
                    }`}
                  >
                    {/* Badge de status */}
                    <div className="absolute -top-3 -right-3">
                      <Badge 
                        variant="secondary" 
                        className={`text-sm font-bold px-3 py-1 shadow-lg ${
                          alert.type === 'risk' ? 'bg-red-500 text-white' :
                          alert.type === 'warning' ? 'bg-yellow-500 text-white' :
                          'bg-green-500 text-white'
                        }`}
                      >
                        {alert.count}
                      </Badge>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl ${
                          alert.type === 'risk' ? 'bg-red-200' :
                          alert.type === 'warning' ? 'bg-yellow-200' :
                          'bg-green-200'
                        }`}>
                          {alert.type === 'risk' ? <XCircle className="w-5 h-5 text-red-600" /> :
                           alert.type === 'warning' ? <Clock className="w-5 h-5 text-yellow-600" /> :
                           <CheckCircle className="w-5 h-5 text-green-600" />}
                        </div>
                        <div>
                          <h4 className={`font-bold text-lg ${
                            alert.type === 'risk' ? 'text-red-800' :
                            alert.type === 'warning' ? 'text-yellow-800' :
                            'text-green-800'
                          }`}>
                            {alert.title}
                          </h4>
                          <p className={`text-sm mt-2 leading-relaxed ${
                            alert.type === 'risk' ? 'text-red-700' :
                            alert.type === 'warning' ? 'text-yellow-700' :
                            'text-green-700'
                          }`}>
                            {alert.description}
                          </p>
                        </div>
                      </div>
                      
                      {alert.action && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className={`w-full font-semibold transition-all duration-200 ${
                            alert.type === 'risk' ? 'border-red-300 text-red-700 hover:bg-red-100' :
                            alert.type === 'warning' ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-100' :
                            'border-green-300 text-green-700 hover:bg-green-100'
                          }`}
                        >
                          {alert.action}
                          <TrendingUp className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
                        <span>Timeline do Mês - {format(new Date(), 'MMMM yyyy', { locale: ptBR })}</span>
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
                                    <ProofImageViewer 
                                      fileId={submission.printFileId}
                                      submissionDate={format(new Date(submission.date), 'dd/MM/yyyy')}
                                      userName={selectedCollaborator.name}
                                    />
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

      </div>
    </div>
  );
}
