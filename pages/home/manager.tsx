/**
 * Dashboard do Gestor
 * Análises completas do setor com gráficos e métricas avançadas baseadas em dados reais
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Chart } from '@/components/Chart';
import ProofImageViewer from '@/components/ProofImageViewer';
import { useAuth } from '@/hooks/useAuth';
import { useSubmissions } from '@/hooks/useSubmissions';
import { useAllProfiles } from '@/hooks/useAllProfiles';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, eachDayOfInterval } from 'date-fns';
import { 
  Users, TrendingUp, Target, Award, BarChart3, Calendar, 
  Activity, PieChart, Trophy, TrendingDown 
} from 'lucide-react';
import { Role } from '@/lib/roles';

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

  // Performance por setor (todos os setores)
  const generatePerformancePorSetor = () => {
    if (!profiles || !submissions) return [];

    const startMonth = startOfMonth(new Date());
    const daysInMonth = new Date().getDate();
    const sectorNames = Array.from(new Set(profiles.map(p => p.sector)));
    
    return sectorNames.map(sector => {
      const sectorColabs = profiles.filter(p => p.sector === sector && p.role === Role.COLLABORATOR);
      const sectorSubs = submissions.filter(s => {
        const submissionDate = new Date(s.date);
        return submissionDate >= startMonth &&
               sectorColabs.some(collab => collab.$id === s.userProfile.$id);
      });

      const completion = sectorColabs.length > 0 ? 
        Math.round((sectorSubs.length / (sectorColabs.length * daysInMonth)) * 100) : 0;

      return {
        date: sector,
        completion
      };
    }).sort((a, b) => b.completion - a.completion);
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
      console.error('Erro ao fazer logout:', error);
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
  const performancePorSetor = generatePerformancePorSetor();
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
                <BarChart3 className="text-green-600" />
                Performance por Setor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Chart data={performancePorSetor.slice(0, 5)} title="" type="bar" />
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
    </div>
  );
}