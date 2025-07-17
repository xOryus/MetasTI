/**
 * Dashboard do Gestor
 * Análises completas do setor com gráficos e métricas avançadas
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricsDashboard } from '@/components/MetricsDashboard';
import { Chart } from '@/components/Chart';
import { useAuth } from '@/hooks/useAuth';
import { useSubmissions } from '@/hooks/useSubmissions';
import { format, subDays } from 'date-fns';
import { Users, TrendingUp, Target, Award, BarChart3, Calendar } from 'lucide-react';

export default function ManagerDashboard() {
  const { isAuthenticated, profile, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const {
    submissions,
    loading: submissionsLoading,
    getCompletionStats
  } = useSubmissions();

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

  // Dados simulados para o dashboard do gestor
  const sectorMetrics = {
    totalCollaborators: 12,
    completionRate: 87,
    weeklyGrowth: 5.2,
    monthlyTarget: 90,
    completedToday: 8,
    averageScore: 86.4
  };

  const teamPerformanceData = [
    { date: '11/07', completion: 82 },
    { date: '12/07', completion: 85 },
    { date: '13/07', completion: 78 },
    { date: '14/07', completion: 90 },
    { date: '15/07', completion: 87 },
    { date: '16/07', completion: 92 },
    { date: '17/07', completion: 89 }
  ];

  const individualPerformance = [
    { date: 'João S.', completion: 95 },
    { date: 'Maria L.', completion: 88 },
    { date: 'Pedro C.', completion: 92 },
    { date: 'Ana R.', completion: 85 },
    { date: 'Carlos M.', completion: 90 }
  ];

  if (authLoading || submissionsLoading) {
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
          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-blue-50 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-gray-600 font-medium text-sm">Colaboradores</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {sectorMetrics.totalCollaborators}
                  </p>
                  <p className="text-sm mt-1 text-blue-600">
                    Setor {profile.sector}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-emerald-50 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-gray-600 font-medium text-sm">Taxa de Conclusão</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {sectorMetrics.completionRate}%
                  </p>
                  <p className="text-sm mt-1 text-emerald-600">
                    +{sectorMetrics.weeklyGrowth}% esta semana
                  </p>
                </div>
                <div className="p-3 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-600">
                  <Target className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-purple-50 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-gray-600 font-medium text-sm">Completaram Hoje</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {sectorMetrics.completedToday}
                  </p>
                  <p className="text-sm mt-1 text-purple-600">
                    de {sectorMetrics.totalCollaborators} colaboradores
                  </p>
                </div>
                <div className="p-3 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 text-purple-600">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-orange-50 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-gray-600 font-medium text-sm">Média Geral</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {sectorMetrics.averageScore}%
                  </p>
                  <p className="text-sm mt-1 text-orange-600">
                    Meta: {sectorMetrics.monthlyTarget}%
                  </p>
                </div>
                <div className="p-3 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 text-orange-600">
                  <Award className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos da Equipe */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Chart
            data={teamPerformanceData}
            title="Performance da Equipe - Últimos 7 Dias"
            type="area"
            height={300}
          />

          <Chart
            data={individualPerformance}
            title="Top 5 Colaboradores - Esta Semana"
            type="bar"
            height={300}
          />
        </div>

        {/* Dashboard Completo de Métricas */}
        <div className="mb-8">
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                Análises Avançadas do Setor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MetricsDashboard />
            </CardContent>
          </Card>
        </div>

        {/* Resumo e Alertas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-green-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-green-900">✅ Pontos Fortes</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-green-800">
                <li>• Alta taxa de conclusão (87%)</li>
                <li>• Crescimento constante semanal</li>
                <li>• Equipe engajada e produtiva</li>
                <li>• Meta mensal alcançável</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-gradient-to-br from-yellow-50 to-yellow-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-yellow-900">⚠️ Atenção</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-yellow-800">
                <li>• 4 colaboradores faltaram hoje</li>
                <li>• Queda de 3% na última sexta</li>
                <li>• Necessário foco em treinamento</li>
                <li>• Revisar metas semanais</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-blue-900">🎯 Próximas Ações</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• Reunião individual com equipe</li>
                <li>• Implementar gamificação</li>
                <li>• Revisar processos do setor</li>
                <li>• Definir metas Q3 2025</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
