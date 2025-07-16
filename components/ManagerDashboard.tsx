/**
 * Dashboard Analítico para Gestores
 * Foco em métricas, insights e análise estratégica do setor
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Chart } from '@/components/Chart';
import { Role } from '@/lib/roles';
import { Submission, UserProfile } from '@/lib/appwrite';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Target, 
  AlertTriangle, 
  CheckCircle,
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

interface ManagerDashboardProps {
  profile: UserProfile;
  submissions: Submission[];
  allProfiles: UserProfile[]; // Todos os perfis do setor
  handleLogout: () => void;
}

// Função auxiliar para verificar se uma data é hoje
function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

// Função auxiliar para verificar se uma data foi ontem
function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
}

// Função auxiliar para subtrair dias
function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

// Função auxiliar para formatar data
function formatDate(date: Date, format: string): string {
  if (format === 'dd/MM') {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
  if (format === 'yyyy-MM-dd') {
    return date.toISOString().split('T')[0];
  }
  if (format === 'dd/MM HH:mm') {
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  if (format === 'MMMM') {
    return date.toLocaleDateString('pt-BR', { month: 'long' });
  }
  return date.toLocaleDateString('pt-BR');
}

export function ManagerDashboard({
  profile,
  submissions,
  allProfiles,
  handleLogout,
}: ManagerDashboardProps) {
  
  // Filtrar apenas colaboradores do mesmo setor
  const sectorCollaborators = allProfiles.filter(
    p => p.sector === profile.sector && p.role === Role.COLLABORATOR
  );

  // Métricas principais
  const today = new Date();
  const yesterday = subtractDays(today, 1);
  const last7Days = subtractDays(today, 6);
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Submissões por período
  const todaySubmissions = submissions.filter(s => isToday(new Date(s.date)));
  const yesterdaySubmissions = submissions.filter(s => isYesterday(new Date(s.date)));
  const monthSubmissions = submissions.filter(s => new Date(s.date) >= currentMonth);
  const last7DaysSubmissions = submissions.filter(s => new Date(s.date) >= last7Days);

  // Métricas de desempenho
  const totalCollaborators = sectorCollaborators.length;
  const activeToday = todaySubmissions.length;
  const complianceRate = totalCollaborators > 0 ? (activeToday / totalCollaborators) * 100 : 0;
  const averageDaily = last7DaysSubmissions.length / 7;

  // Tendências
  const todayVsYesterday = todaySubmissions.length - yesterdaySubmissions.length;
  const trendDirection = todayVsYesterday >= 0 ? 'up' : 'down';

  // Análise individual dos colaboradores
  const collaboratorStats = sectorCollaborators.map(collaborator => {
    const userSubmissions = submissions.filter(s => s.userProfile.$id === collaborator.$id);
    const todaySubmission = userSubmissions.find(s => isToday(new Date(s.date)));
    const monthSubmissions = userSubmissions.filter(s => new Date(s.date) >= currentMonth);
    const last7DaysSubmissions = userSubmissions.filter(s => new Date(s.date) >= last7Days);
    
    return {
      ...collaborator,
      todayCompleted: !!todaySubmission,
      monthTotal: monthSubmissions.length,
      weekTotal: last7DaysSubmissions.length,
      lastSubmission: userSubmissions.length > 0 ? 
        Math.max(...userSubmissions.map(s => new Date(s.date).getTime())) : null,
      consistency: last7DaysSubmissions.length / 7 * 100
    };
  });

  // Dados para gráficos - últimos 30 dias
  const last30DaysData = Array.from({ length: 30 }, (_, i) => {
    const date = subtractDays(today, 29 - i);
    const daySubmissions = submissions.filter(
      s => formatDate(new Date(s.date), 'yyyy-MM-dd') === formatDate(date, 'yyyy-MM-dd')
    );
    return {
      date: formatDate(date, 'dd/MM'),
      completion: daySubmissions.length
    };
  });

  const collaboratorPerformanceData = collaboratorStats.map(collab => ({
    name: collab.userId.split('@')[0], // Simplifica o nome
    submissions: collab.monthTotal,
    consistency: collab.consistency
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-white rounded-lg shadow-sm p-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="text-blue-600" />
              Dashboard Analítico - Setor {profile.sector}
            </h1>
            <p className="text-gray-600 mt-1">
              Gestão e análise de performance da equipe
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Sair
          </button>
        </div>

        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Taxa de Conformidade Hoje */}
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Taxa de Conformidade Hoje</CardTitle>
              <Target className="h-4 w-4 opacity-90" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{complianceRate.toFixed(1)}%</div>
              <div className="flex items-center mt-2 text-sm opacity-90">
                {trendDirection === 'up' ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {Math.abs(todayVsYesterday)} vs ontem
              </div>
            </CardContent>
          </Card>

          {/* Total de Colaboradores */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Colaboradores Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeToday}/{totalCollaborators}</div>
              <p className="text-xs text-muted-foreground">
                colaboradores ativos hoje
              </p>
            </CardContent>
          </Card>

          {/* Média Semanal */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Média Diária (7 dias)</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageDaily.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                submissões por dia
              </p>
            </CardContent>
          </Card>

          {/* Total do Mês */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total do Mês</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthSubmissions.length}</div>
              <p className="text-xs text-muted-foreground">
                submissões em {formatDate(today, 'MMMM')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Tendência de 30 dias */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Tendência dos Últimos 30 Dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Chart 
                data={last30DaysData} 
                title=""
                type="line"
              />
            </CardContent>
          </Card>

          {/* Performance por Colaborador */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-green-600" />
                Performance Mensal por Colaborador
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {collaboratorPerformanceData.slice(0, 5).map((collab, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{collab.name}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={collab.consistency} className="w-20" />
                      <span className="text-sm text-gray-600">{collab.submissions}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Análise Detalhada da Equipe */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Análise Detalhada da Equipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Status Hoje</TableHead>
                  <TableHead>Consistência (7 dias)</TableHead>
                  <TableHead>Total do Mês</TableHead>
                  <TableHead>Última Atividade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collaboratorStats.map((collaborator, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {collaborator.userId.split('@')[0]}
                    </TableCell>
                    <TableCell>
                      {collaborator.todayCompleted ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completo
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={collaborator.consistency} className="w-16" />
                        <span className="text-sm">{collaborator.consistency.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{collaborator.monthTotal}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {collaborator.lastSubmission
                        ? formatDate(new Date(collaborator.lastSubmission), 'dd/MM HH:mm')
                        : 'Nunca'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Insights e Alertas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <Activity className="h-5 w-5" />
                Insights Inteligentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {complianceRate >= 80 && (
                <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Excelente Performance!</p>
                    <p className="text-xs text-green-600">Sua equipe está mantendo alta conformidade.</p>
                  </div>
                </div>
              )}
              
              {averageDaily > monthSubmissions.length / 30 && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Tendência Positiva</p>
                    <p className="text-xs text-blue-600">A atividade da equipe está aumentando.</p>
                  </div>
                </div>
              )}

              {collaboratorStats.filter(c => !c.todayCompleted).length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Atenção Necessária</p>
                    <p className="text-xs text-yellow-600">
                      {collaboratorStats.filter(c => !c.todayCompleted).length} colaborador(es) 
                      ainda não completaram hoje.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metas e Objetivos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-600">
                <Target className="h-5 w-5" />
                Metas e Objetivos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Meta de Conformidade */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Meta de Conformidade Diária</span>
                  <span>{complianceRate.toFixed(1)}% / 85%</span>
                </div>
                <Progress value={Math.min(complianceRate, 100)} className="h-2" />
              </div>

              {/* Meta Mensal */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Meta Mensal (Equipe)</span>
                  <span>{monthSubmissions.length} / {totalCollaborators * 22}</span>
                </div>
                <Progress 
                  value={Math.min((monthSubmissions.length / (totalCollaborators * 22)) * 100, 100)} 
                  className="h-2" 
                />
              </div>

              {/* Consistência da Equipe */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Consistência da Equipe (7 dias)</span>
                  <span>{(collaboratorStats.reduce((acc, c) => acc + c.consistency, 0) / collaboratorStats.length).toFixed(1)}%</span>
                </div>
                <Progress 
                  value={collaboratorStats.reduce((acc, c) => acc + c.consistency, 0) / collaboratorStats.length} 
                  className="h-2" 
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
