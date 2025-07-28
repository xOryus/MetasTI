/**
 * Dashboard do Gestor
 * Análises completas do setor com gráficos e métricas avançadas baseadas em dados reais
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
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, eachDayOfInterval } from 'date-fns';
import { 
  Users, TrendingUp, Target, Award, BarChart3, Calendar, 
  Activity, PieChart, Trophy, TrendingDown, Eye, FileImage, User, Download
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

  // Calcular todas as métricas do dashboard com dados reais
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
    const startToday = startOfDay(today);
    const endToday = endOfDay(today);
    const startWeek = startOfWeek(today);
    const endWeek = endOfWeek(today);
    const startMonth = startOfMonth(today);
    const lastWeekStart = startOfWeek(subDays(today, 7));
    const lastWeekEnd = endOfWeek(subDays(today, 7));

    // Colaboradores do setor
    const sectorCollaborators = profiles.filter(
      p => p.sector === profile.sector && p.role === Role.COLLABORATOR
    );

    // Todos os colaboradores para métricas gerais
    const allCollaborators = profiles.filter(p => p.role === Role.COLLABORATOR);

    // Submissões hoje do setor
    const todaySubmissions = submissions.filter(s => {
      const submissionDate = new Date(s.date);
      return submissionDate >= startToday && 
             submissionDate <= endToday &&
             sectorCollaborators.some(collab => collab.$id === s.userProfile.$id);
    });

    // Submissões semana atual
    const thisWeekSubmissions = submissions.filter(s => {
      const submissionDate = new Date(s.date);
      return submissionDate >= startWeek && 
             submissionDate <= endWeek &&
             sectorCollaborators.some(collab => collab.$id === s.userProfile.$id);
    });

    // Submissões semana passada
    const lastWeekSubmissions = submissions.filter(s => {
      const submissionDate = new Date(s.date);
      return submissionDate >= lastWeekStart && 
             submissionDate <= lastWeekEnd &&
             sectorCollaborators.some(collab => collab.$id === s.userProfile.$id);
    });

    // Submissões do mês
    const monthSubmissions = submissions.filter(s => {
      const submissionDate = new Date(s.date);
      return submissionDate >= startMonth &&
             sectorCollaborators.some(collab => collab.$id === s.userProfile.$id);
    });

    // Cálculos principais
    const taxaConclusao = sectorCollaborators.length > 0 ? 
      (todaySubmissions.length / sectorCollaborators.length) * 100 : 0;

    const usuariosAtivos = sectorCollaborators.filter(collab => 
      submissions.some(s => {
        const submissionDate = new Date(s.date);
        return submissionDate >= startWeek && 
               submissionDate <= endWeek &&
               s.userProfile.$id === collab.$id;
      })
    ).length;

    const daysInMonth = new Date().getDate();
    const metaMensal = sectorCollaborators.length > 0 ? 
      (monthSubmissions.length / (sectorCollaborators.length * daysInMonth)) * 100 : 0;

    // Crescimento semanal
    const thisWeekRate = sectorCollaborators.length > 0 ? 
      (thisWeekSubmissions.length / sectorCollaborators.length) : 0;
    const lastWeekRate = sectorCollaborators.length > 0 ? 
      (lastWeekSubmissions.length / sectorCollaborators.length) : 0;
    const crescimentoSemanal = ((thisWeekRate - lastWeekRate) / (lastWeekRate || 1)) * 100;

    // Tendência baseada no crescimento
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

  // Performance por colaborador (apenas do setor do gestor)
  const generatePerformancePorColaborador = () => {
    if (!profile || !profiles || !submissions) return [];

    const startMonth = startOfMonth(new Date());
    const daysInMonth = new Date().getDate();
    
    // Filtrar apenas colaboradores do setor do gestor
    const sectorCollaborators = profiles.filter(
      p => p.sector === profile.sector && p.role === Role.COLLABORATOR
    );
    
    return sectorCollaborators.map(collaborator => {
      const collaboratorSubs = submissions.filter(s => {
        const submissionDate = new Date(s.date);
        return submissionDate >= startMonth && s.userProfile.$id === collaborator.$id;
      });

      const completion = Math.round((collaboratorSubs.length / daysInMonth) * 100);
      const displayName = collaborator.name || collaborator.userId.split('@')[0] || 'Usuário';

      return {
        id: collaborator.$id,
        name: displayName,
        date: displayName, // Para compatibilidade com o componente Chart
        completion,
        submissions: collaboratorSubs,
        profile: collaborator
      };
    }).sort((a, b) => b.completion - a.completion);
  };

  // Função para abrir modal com detalhes do colaborador
  const handleCollaboratorClick = (collaborator: any) => {
    setSelectedCollaborator(collaborator);
    setIsModalOpen(true);
  };

  // Gerar dados de submissões dos últimos 30 dias para o colaborador selecionado
  const getCollaboratorSubmissionsByDay = (collaboratorId: string) => {
    if (!submissions) return [];

    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      const daySubmissions = submissions.filter(s => {
        const submissionDate = new Date(s.date);
        return startOfDay(submissionDate).getTime() === startOfDay(date).getTime() &&
               s.userProfile.$id === collaboratorId;
      });

      return {
        date: format(date, 'dd/MM'),
        fullDate: date,
        hasSubmission: daySubmissions.length > 0,
        submissions: daySubmissions
      };
    });

    return last30Days;
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

  // Função para determinar o tipo de meta baseado nas respostas
  const determineGoalType = (checklistString: string) => {
    try {
      const responses = JSON.parse(checklistString);
      const entries = Object.entries(responses);
      
      if (entries.length === 0) return 'Indefinido';
      if (entries.length === 1) return 'Meta Individual';
      if (entries.length > 1) return 'Checklist';
      
      return 'Múltiplas Metas';
    } catch (error) {
      return 'Formato Inválido';
    }
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

  // Distribuição por setor (dados para gráfico de pizza)
  const generateDistribuicaoPorSetor = () => {
    if (!profiles || !submissions) return [];

    const startMonth = startOfMonth(new Date());
    const sectorNames = Array.from(new Set(profiles.map(p => p.sector)));
    
    const totalSubmissions = submissions.filter(s => new Date(s.date) >= startMonth).length;
    
    return sectorNames.map(sector => {
      const sectorColabs = profiles.filter(p => p.sector === sector && p.role === Role.COLLABORATOR);
      const sectorSubs = submissions.filter(s => {
        const submissionDate = new Date(s.date);
        return submissionDate >= startMonth &&
               sectorColabs.some(collab => collab.$id === s.userProfile.$id);
      });

      const percentage = totalSubmissions > 0 ? 
        Math.round((sectorSubs.length / totalSubmissions) * 100) : 0;

      return {
        date: sector,
        completion: percentage
      };
    }).filter(item => item.completion > 0);
  };

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

  // Calcular dados reais
  const dashboardMetrics = calculateDashboardMetrics();
  const performanceSemanal = generatePerformanceSemanal();
  const performancePorColaborador = generatePerformancePorColaborador();
  const tendenciaCrescimento = generateTendenciaCrescimento();
  const distribuicaoPorSetor = generateDistribuicaoPorSetor();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Dashboard do Setor: {profile.sector}
              </h1>
              <p className="text-gray-600">
                Bem-vindo, {profile.role === 'manager' ? 'Gestor' : profile.role}
              </p>
            </div>
            <Button onClick={handleLogout} variant="outline">
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Métricas Principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Taxa de Conclusão */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-blue-50 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-gray-600 font-medium text-sm">Taxa de Conclusão</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {dashboardMetrics.taxaConclusao}%
                  </p>
                  <p className="text-sm mt-1 text-blue-600">
                    {dashboardMetrics.crescimentoSemanal >= 0 ? '+' : ''}{dashboardMetrics.crescimentoSemanal}% esta semana
                  </p>
                </div>
                <div className="p-3 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600">
                  <Target className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usuários Ativos */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-emerald-50 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-gray-600 font-medium text-sm">Usuários Ativos</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {dashboardMetrics.usuariosAtivos}
                  </p>
                  <p className="text-sm mt-1 text-emerald-600">
                    Ativos esta semana
                  </p>
                </div>
                <div className="p-3 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-600">
                  <Activity className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meta Mensal */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-purple-50 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-gray-600 font-medium text-sm">Meta Mensal</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {dashboardMetrics.metaMensal}%
                  </p>
                  <p className="text-sm mt-1 text-purple-600">
                    Objetivo: {dashboardMetrics.metaMes}%
                  </p>
                </div>
                <div className="p-3 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 text-purple-600">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tendência */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-amber-50 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-gray-600 font-medium text-sm">Tendência</p>
                  <div className="flex items-center gap-2 mt-2">
                    {dashboardMetrics.tendencia === 'crescendo' ? (
                      <TrendingUp className="w-8 h-8 text-green-600" />
                    ) : dashboardMetrics.tendencia === 'decrescendo' ? (
                      <TrendingDown className="w-8 h-8 text-red-600" />
                    ) : (
                      <Target className="w-8 h-8 text-amber-600" />
                    )}
                    <Badge variant={
                      dashboardMetrics.tendencia === 'crescendo' ? 'default' : 
                      dashboardMetrics.tendencia === 'decrescendo' ? 'destructive' : 
                      'secondary'
                    }>
                      {dashboardMetrics.tendencia === 'crescendo' ? 'Crescendo' : 
                       dashboardMetrics.tendencia === 'decrescendo' ? 'Decrescendo' : 
                       'Estável'}
                    </Badge>
                  </div>
                  <p className="text-sm mt-1 text-amber-600">
                    {dashboardMetrics.crescimentoSemanal >= 0 ? '+' : ''}{dashboardMetrics.crescimentoSemanal}% vs semana anterior
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Semanal e Performance por Setor */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="text-blue-600" />
                Performance Semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Chart data={performanceSemanal} title="" type="line" />
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="text-green-600" />
                Performance por Colaborador
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {performancePorColaborador.slice(0, 5).map((collaborator, index) => (
                  <div 
                    key={collaborator.id} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => handleCollaboratorClick(collaborator)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {collaborator.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">{collaborator.name}</span>
                        <p className="text-xs text-gray-500">{collaborator.submissions.length} submissões este mês</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(collaborator.completion, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900 min-w-[50px]">
                        {collaborator.completion}%
                      </span>
                      <Eye className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tendência de Crescimento e Distribuição por Setor */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="text-purple-600" />
                Tendência de Crescimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Chart data={tendenciaCrescimento} title="" type="line" />
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="text-orange-600" />
                Distribuição por Setor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {distribuicaoPorSetor.slice(0, 5).map((item, index) => (
                  <div key={item.date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">{item.date}</span>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden"
                      >
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${item.completion}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900 min-w-[40px]">
                        {item.completion}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Métricas Finais */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Melhor Performance */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-emerald-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Melhor Performance</p>
                  <p className="text-2xl font-bold text-green-800">
                    {dashboardMetrics.melhorPerformance.setor}
                  </p>
                  <p className="text-lg font-semibold text-green-600">
                    {dashboardMetrics.melhorPerformance.taxa.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Média Geral */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Média Geral</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {dashboardMetrics.mediaGeral.toFixed(1)}%
                  </p>
                  <p className="text-sm text-blue-600">
                    Todos os setores
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meta do Mês */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-50 to-amber-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Meta do Mês</p>
                  <p className="text-2xl font-bold text-orange-800">
                    {dashboardMetrics.metaMes}%
                  </p>
                  <p className="text-sm text-orange-600">
                    Objetivo para julho 2025
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Detalhes do Colaborador */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {selectedCollaborator?.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <span className="text-lg">Detalhes - {selectedCollaborator?.name}</span>
                <p className="text-sm text-gray-500 font-normal">
                  {selectedCollaborator?.submissions.length} submissões nos últimos 30 dias
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedCollaborator && (
            <div className="space-y-6">
              {/* Estatísticas Resumidas */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedCollaborator.completion}%
                    </div>
                    <div className="text-sm text-gray-600">Taxa de Conclusão</div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedCollaborator.submissions.length}
                    </div>
                    <div className="text-sm text-gray-600">Total de Submissões</div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {getCollaboratorSubmissionsByDay(selectedCollaborator.id).filter(day => day.hasSubmission).length}
                    </div>
                    <div className="text-sm text-gray-600">Dias Ativos</div>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline dos Últimos 30 Dias */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Histórico dos Últimos 30 Dias</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-10 gap-1 mb-4">
                    {getCollaboratorSubmissionsByDay(selectedCollaborator.id).map((day, index) => (
                      <div
                        key={index}
                        className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium transition-all cursor-pointer ${
                          day.hasSubmission 
                            ? 'bg-green-500 text-white hover:bg-green-600' 
                            : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                        }`}
                        title={`${format(day.fullDate, 'dd/MM/yyyy')} - ${day.hasSubmission ? 'Enviado' : 'Não enviado'}`}
                      >
                        {day.date.split('/')[0]}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span>Enviado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-200 rounded"></div>
                      <span>Não enviado</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lista Detalhada de Submissões */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Submissões Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {selectedCollaborator.submissions
                      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 10)
                      .map((submission: any, index: number) => (
                        <div key={submission.$id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {format(new Date(submission.date), 'dd/MM/yyyy')}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Enviado às {format(new Date(submission.$createdAt), 'HH:mm')}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {determineGoalType(submission.checklist)}
                              </Badge>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Enviado
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Respostas do Checklist de forma mais legível */}
                          {submission.checklist && (
                            <div className="mb-3">
                              <div className="text-sm font-medium text-gray-700 mb-2">Metas Concluídas:</div>
                              <div className="bg-gray-50 p-3 rounded-md">
                                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                                  {formatChecklistResponses(submission.checklist)}
                                </pre>
                              </div>
                            </div>
                          )}
                          
                          {/* Observações */}
                          {submission.observation && (
                            <div className="mb-3 p-3 bg-amber-50 border-l-4 border-amber-200 rounded-r-md">
                              <div className="text-sm font-medium text-amber-800 mb-1">💬 Observações:</div>
                              <div className="text-sm text-amber-700">
                                "{submission.observation}"
                              </div>
                            </div>
                          )}
                          
                          {/* Comprovação */}
                          {submission.printUrl && (
                            <div className="flex items-center justify-between p-2 bg-blue-50 rounded-md">
                              <div className="flex items-center gap-2 text-sm">
                                <FileImage className="w-4 h-4 text-blue-500" />
                                <span className="text-blue-700 font-medium">Arquivo de Comprovação</span>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => window.open(submission.printUrl, '_blank')}
                                  className="text-xs"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Visualizar
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = submission.printUrl;
                                    link.download = `comprovacao_${format(new Date(submission.date), 'ddMMyyyy')}.${submission.printUrl.split('.').pop()}`;
                                    link.click();
                                  }}
                                  className="text-xs"
                                >
                                  <Download className="w-3 h-3 mr-1" />
                                  Baixar
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {!submission.printUrl && (
                            <div className="flex items-center gap-2 text-sm text-gray-500 p-2 bg-gray-50 rounded-md">
                              <FileImage className="w-4 h-4" />
                              <span>Nenhum arquivo anexado</span>
                            </div>
                          )}
                        </div>
                      ))}
                    
                    {selectedCollaborator.submissions.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Nenhuma submissão encontrada nos últimos 30 dias</p>
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
  );
}