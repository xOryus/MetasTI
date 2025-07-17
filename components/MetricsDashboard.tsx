/**
 * Dashboard de Métricas Moderno
 * Gráficos bonitos usando Chart.js
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Chart } from '@/components/Chart';
import { TrendingUp, Target, Users, Award } from 'lucide-react';

interface MetricsDashboardProps {
  sectorData?: any[];
  performanceData?: any[];
  goalData?: any[];
}

export function MetricsDashboard({ 
  sectorData = [], 
  performanceData = [],
  goalData = []
}: MetricsDashboardProps) {
  
  // Dados mockados para demonstração
  const kpiData = [
    {
      title: 'Taxa de Conclusão',
      value: '87%',
      change: '+5%',
      changeType: 'positive',
      icon: Target,
      color: 'text-blue-600'
    },
    {
      title: 'Usuários Ativos',
      value: '1,234',
      change: '+12%',
      changeType: 'positive', 
      icon: Users,
      color: 'text-emerald-600'
    },
    {
      title: 'Meta Mensal',
      value: '92%',
      change: '+3%',
      changeType: 'positive',
      icon: Award,
      color: 'text-purple-600'
    },
    {
      title: 'Tendência',
      value: '↗️',
      change: 'Crescendo',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'text-orange-600'
    }
  ];

  // Dados de exemplo para os gráficos
  const chartData = [
    { date: '01/07', completion: 75 },
    { date: '02/07', completion: 82 },
    { date: '03/07', completion: 78 },
    { date: '04/07', completion: 85 },
    { date: '05/07', completion: 90 },
    { date: '06/07', completion: 87 },
    { date: '07/07', completion: 92 }
  ];

  const sectorChartData = [
    { date: 'TI', completion: 92 },
    { date: 'RH', completion: 87 },
    { date: 'Vendas', completion: 78 },
    { date: 'Marketing', completion: 85 },
    { date: 'Operações', completion: 90 }
  ];

  return (
    <div className="space-y-6">
      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => {
          const IconComponent = kpi.icon;
          return (
            <Card key={index} className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-gray-600 font-medium text-sm">{kpi.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {kpi.value}
                    </p>
                    <p className={`text-sm mt-1 ${kpi.changeType === 'positive' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {kpi.change}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 ${kpi.color}`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico de Linha - Performance ao Longo do Tempo */}
        <Chart
          data={chartData}
          title="Performance Semanal"
          type="line"
          height={300}
        />

        {/* Gráfico de Barras - Comparação por Setor */}
        <Chart
          data={sectorChartData}
          title="Performance por Setor"
          type="bar"
          height={300}
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico de Área - Tendência */}
        <Chart
          data={chartData}
          title="Tendência de Crescimento"
          type="area"
          height={300}
        />

        {/* Gráfico de Rosca - Distribuição */}
        <Chart
          data={sectorChartData}
          title="Distribuição por Setor"
          type="doughnut"
          height={300}
        />
      </div>

      {/* Resumo Estatístico */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-blue-900">Melhor Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">TI - 92%</div>
            <p className="text-blue-600 text-sm mt-1">Setor com maior taxa de conclusão</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-emerald-900">Média Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">86.4%</div>
            <p className="text-emerald-600 text-sm mt-1">Taxa média de todos os setores</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-orange-900">Meta do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-700">90%</div>
            <p className="text-orange-600 text-sm mt-1">Objetivo para julho de 2025</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
