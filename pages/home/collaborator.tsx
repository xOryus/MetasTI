/**
 * Página inicial para colaboradores
 * Checklist simples baseado nas metas do setor + gráficos mínimos individuais
 */

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChecklistForm } from '@/components/ChecklistForm';
import { Chart } from '@/components/Chart';
import { useAuth } from '@/hooks/useAuth';
import { useSubmissions } from '@/hooks/useSubmissions';
import { useSectorGoals } from '@/hooks/useSectorGoals';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, isSameDay } from 'date-fns';
import { Target, TrendingUp, Calendar, Award } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function CollaboratorHome() {
  const { isAuthenticated, profile, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  const {
    submissions,
    loading: submissionsLoading,
    createSubmission,
    hasSubmissionToday,
    getCompletionStats
  } = useSubmissions();

  const {
    goals: sectorGoals,
    loading: goalsLoading,
    fetchActiveGoalsBySector
  } = useSectorGoals();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Buscar metas do setor quando o profile for carregado
  useEffect(() => {
    if (profile?.sector) {
      fetchActiveGoalsBySector(profile.sector).catch((error) => {
        logger.api.error('metas do setor', 'Falha na requisição');
      });
    }
  }, [profile?.sector, fetchActiveGoalsBySector]);

  // Separar metas por tipo para tratamento individual
  const goalsByType = useMemo(() => {
    const checklistGoals: any[] = [];
    const individualGoals: any[] = [];
    
    sectorGoals.forEach(goal => {
      if (goal.type === 'boolean_checklist' && goal.checklistItems) {
        // Para metas do tipo boolean_checklist, manter como checklist
        checklistGoals.push({
          ...goal,
          items: goal.checklistItems.map((item, index) => ({
            id: `${goal.$id}-${index}`,
            label: item,
            required: true
          }))
        });
      } else {
        // Para outros tipos de metas, tratar individualmente
        individualGoals.push(goal);
      }
    });
    
    return { checklistGoals, individualGoals };
  }, [sectorGoals]);

  // Manter compatibilidade com ChecklistForm (apenas para metas do tipo checklist)
  const checklistItems = useMemo(() => {
    return goalsByType.checklistGoals.flatMap(goal => 
      goal.items.map((item: any) => ({
        ...item,
        goalTitle: goal.title,
        goalDescription: goal.description
      }))
    );
  }, [goalsByType.checklistGoals]);

  // Cálculos de performance baseados nas submissões reais
  const calculateWeeklyCompletion = (weekStart: Date) => {
    const weekEnd = endOfWeek(weekStart);
    const weekSubmissions = submissions.filter(sub => 
      isWithinInterval(new Date(sub.$createdAt!), { start: weekStart, end: weekEnd })
    );
    
    // Assumindo 7 dias de trabalho possíveis na semana (segunda a domingo)
    const possibleDays = 7;
    const completedDays = weekSubmissions.length;
    
    return Math.round((completedDays / possibleDays) * 100);
  };

  const calculateMonthlySubmissions = () => {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    
    return submissions.filter(sub => 
      isWithinInterval(new Date(sub.$createdAt!), { start: monthStart, end: monthEnd })
    ).length;
  };

  const calculateConsecutiveDays = () => {
    if (submissions.length === 0) return 0;
    
    // Ordenar submissões por data (mais recente primeiro)
    const sortedSubmissions = [...submissions].sort((a, b) => 
      new Date(b.$createdAt!).getTime() - new Date(a.$createdAt!).getTime()
    );
    
    let streak = 0;
    let currentDate = new Date();
    
    // Verificar a partir de hoje, voltando no tempo
    for (let i = 0; i < 30; i++) { // Limitar a 30 dias para performance
      const checkDate = subDays(currentDate, i);
      const hasSubmission = sortedSubmissions.some(sub => 
        isSameDay(new Date(sub.$createdAt!), checkDate)
      );
      
      if (hasSubmission) {
        streak++;
      } else if (i > 0) { // Se não é hoje e não tem submissão, quebra a sequência
        break;
      }
    }
    
    return streak;
  };

  // Dados do gráfico otimizados com memoização
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const daySubmissions = submissions.filter(sub => 
        isSameDay(new Date(sub.$createdAt!), date)
      );
      
      // Calcular taxa de conclusão baseada no número de metas vs respostas
      const totalGoals = checklistItems.length + goalsByType.individualGoals.length;
      const hasSubmission = daySubmissions.length > 0;
      
      // Se tem submissão, assume 100%, senão 0%
      // TODO: Futuramente podemos calcular baseado nas respostas individuais
      const completionRate = hasSubmission && totalGoals > 0 ? 100 : 0;
      
      return {
        date: format(date, 'dd/MM'),
        completion: completionRate
      };
    });
    
    return last7Days;
  }, [submissions, checklistItems, goalsByType.individualGoals]);

  const handleSubmit = async (
    answers: Record<string, boolean>,
    observation: string,
    printFile: File
  ) => {
    if (!profile) return;

    try {
      setSubmitLoading(true);
      setSubmitError(null);
      logger.form.submit('checklist');
      
      await createSubmission(profile.$id, answers, observation, printFile);
      
      logger.form.success('checklist');
      alert('Checklist enviado com sucesso!');
    } catch (error: any) {
      logger.form.error('checklist', error.message);
      setSubmitError(error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      logger.ui.interaction('logout');
      await logout();
      router.push('/login');
    } catch (error) {
      logger.auth.error('Logout falhou');
    }
  };

  // Calcular estatísticas pessoais com base nos dados reais
  const personalStats = useMemo(() => {
    const thisWeekCompletion = calculateWeeklyCompletion(startOfWeek(new Date()));
    const lastWeekCompletion = calculateWeeklyCompletion(startOfWeek(subDays(new Date(), 7)));
    const consecutiveDays = calculateConsecutiveDays();
    const monthlySubmissions = calculateMonthlySubmissions();

    return {
      thisWeek: Math.round(thisWeekCompletion),
      lastWeek: Math.round(lastWeekCompletion),
      streak: consecutiveDays,
      totalThisMonth: monthlySubmissions
    };
  }, [submissions]);

  // Remover as variáveis individuais que agora estão dentro do useMemo

  if (authLoading || submissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return null;
  }

  const hasSubmittedToday = hasSubmissionToday(profile.$id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Meu Checklist - {profile.sector}
              </h1>
              <p className="text-gray-600">
                Bem-vindo, {profile.role === 'collaborator' ? 'Colaborador' : profile.role}
              </p>
            </div>
            <Button onClick={handleLogout} variant="outline">
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Checklist Principal */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                  Checklist Diário - {format(new Date(), 'dd/MM/yyyy')}
                </CardTitle>
                
                {hasSubmittedToday && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                    <p className="text-green-800 font-medium">✅ Checklist já enviado hoje!</p>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {goalsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Carregando metas do setor...</p>
                  </div>
                ) : (checklistItems.length === 0 && goalsByType.individualGoals.length === 0) ? (
                  <div className="text-center py-12 text-gray-500">
                    <Target className="w-16 h-16 mx-auto mb-4 text-blue-400" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">
                      Nenhuma meta configurada
                    </h3>
                    <p className="text-sm">
                      O administrador ainda não configurou metas para o setor {profile?.sector}.
                    </p>
                  </div>
                ) : !hasSubmittedToday ? (
                  <div className="space-y-6">
                    {/* Metas Individuais */}
                    {goalsByType.individualGoals.map(goal => (
                      <Card key={goal.$id} className="border border-gray-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg font-semibold text-gray-800">
                            {goal.title}
                          </CardTitle>
                          <p className="text-sm text-gray-600">{goal.description}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                              {goal.type === 'numeric' ? 'Numérico' : 
                               goal.type === 'percentage' ? 'Porcentagem' : 
                               goal.type === 'task_completion' ? 'Tarefa' : goal.type}
                            </span>
                            {(goal.type === 'numeric' || goal.type === 'percentage') && (
                              <span>Meta: {goal.targetValue}{goal.type === 'percentage' ? '%' : ''}</span>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {goal.type === 'numeric' && (
                              <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700">
                                  Valor Atual:
                                </label>
                                <input
                                  type="number"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder={`Meta: ${goal.targetValue}`}
                                  min="0"
                                />
                              </div>
                            )}
                            {goal.type === 'percentage' && (
                              <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700">
                                  Porcentagem Atual (%):
                                </label>
                                <input
                                  type="number"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder={`Meta: ${goal.targetValue}%`}
                                  min="0"
                                  max="100"
                                />
                              </div>
                            )}
                            {goal.type === 'task_completion' && (
                              <div className="space-y-3">
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">Tarefa concluída</span>
                                </label>
                              </div>
                            )}
                            
                            {/* Campo de upload para cada meta individual */}
                            <div className="pt-3 border-t border-gray-200">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Comprovação desta meta:
                              </label>
                              <input
                                type="file"
                                accept="image/*,.pdf,.doc,.docx"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Formatos aceitos: Imagens, PDF, DOC, DOCX
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {/* Metas do tipo Checklist */}
                    {goalsByType.checklistGoals.map(goal => (
                      <Card key={goal.$id} className="border border-gray-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg font-semibold text-gray-800">
                            {goal.title}
                          </CardTitle>
                          <p className="text-sm text-gray-600">{goal.description}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                              Lista de Verificação
                            </span>
                            <span>{goal.items.length} itens</span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              {goal.items.map((item: any) => (
                                <label key={item.id} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">{item.label}</span>
                                </label>
                              ))}
                            </div>
                            
                            {/* Campo de upload para checklist */}
                            <div className="pt-3 border-t border-gray-200">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Comprovação deste checklist:
                              </label>
                              <input
                                type="file"
                                accept="image/*,.pdf,.doc,.docx"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-sm file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Formatos aceitos: Imagens, PDF, DOC, DOCX
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Seção de Observações Gerais e Envio */}
                    <Card className="border border-gray-200 bg-gray-50">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-800">
                          Finalizar Envio
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Observações Gerais (opcional):
                          </label>
                          <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="Adicione observações gerais sobre todas as metas do dia..."
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Use este campo para comentários que se aplicam a todas as metas
                          </p>
                        </div>
                        
                        <Button 
                          className="w-full" 
                          disabled={submitLoading}
                        >
                          {submitLoading ? 'Enviando...' : 'Enviar Todas as Metas'}
                        </Button>
                        
                        {submitError && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-red-800 text-sm">{submitError}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Target className="w-16 h-16 mx-auto mb-4 text-green-500" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">
                      Parabéns! Metas do dia concluídas
                    </h3>
                    <p className="text-sm">
                      Você já enviou seu checklist hoje. Volte amanhã para novas metas!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Estatísticas Pessoais */}
          <div className="space-y-6">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="shadow-md border-0 bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-4 text-center">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold text-blue-700">{personalStats.thisWeek}%</div>
                  <div className="text-xs text-blue-600">Esta Semana</div>
                </CardContent>
              </Card>

              <Card className="shadow-md border-0 bg-gradient-to-br from-emerald-50 to-emerald-100">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
                  <div className="text-2xl font-bold text-emerald-700">{personalStats.streak}</div>
                  <div className="text-xs text-emerald-600">Dias Seguidos</div>
                </CardContent>
              </Card>

              <Card className="shadow-md border-0 bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="p-4 text-center">
                  <Award className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <div className="text-2xl font-bold text-purple-700">{personalStats.totalThisMonth}</div>
                  <div className="text-xs text-purple-600">Este Mês</div>
                </CardContent>
              </Card>

              <Card className="shadow-md border-0 bg-gradient-to-br from-orange-50 to-orange-100">
                <CardContent className="p-4 text-center">
                  <Target className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                  <div className="text-2xl font-bold text-orange-700">{personalStats.lastWeek}%</div>
                  <div className="text-xs text-orange-600">Semana Passada</div>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico Pessoal Simples */}
            <Chart
              data={chartData}
              title="Minha Performance - 7 Dias"
              type="line"
              height={200}
            />

            {/* Progresso do Mês */}
            <Card className="shadow-md border-0 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-gray-900">Progresso Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Meta do Mês</span>
                    <span className="font-medium">30 dias</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(personalStats.totalThisMonth / 30) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{personalStats.totalThisMonth} de 30 dias</span>
                    <span className="font-medium text-blue-600">
                      {Math.round((personalStats.totalThisMonth / 30) * 100)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
