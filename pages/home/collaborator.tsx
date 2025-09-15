/**
 * Página inicial para colaboradores
 * Checklist simples baseado nas metas do setor + gráficos mínimos individuais
 */

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ChecklistForm } from '@/components/ChecklistForm';
import { Chart } from '@/components/Chart';
import { useAuth } from '@/hooks/useAuth';
import { useSubmissions } from '@/hooks/useSubmissions';
import { useSectorGoals } from '@/hooks/useSectorGoals';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, isSameDay } from 'date-fns';
import { Target, TrendingUp, Calendar, Award } from 'lucide-react';
import { logger } from '@/lib/logger';
import { formatCurrency, centavosToReais } from '@/lib/currency';
import { calculateUserRewards, formatPeriodDisplay, calculateDailyRewardValue, type UserRewardStats } from '@/lib/rewards';
import { useFeedback } from '@/components/FeedbackProvider';

export default function CollaboratorHome() {
  const { isAuthenticated, profile, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const { toastSuccess, toastError } = useFeedback();
  
  // Estados para coleta de dados das metas
  const [individualGoalData, setIndividualGoalData] = useState<Record<string, any>>({});
  const [checklistData, setChecklistData] = useState<Record<string, boolean>>({});
  const [generalObservation, setGeneralObservation] = useState('');
  const [goalFiles, setGoalFiles] = useState<Record<string, File>>({});
  
  const {
    submissions,
    loading: submissionsLoading,
    createSubmission,
    hasSubmissionToday,
    getCompletionStats,
    calculateRewards,
    getMonthlyEarnings
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
    if (profile?.sector && profile?.userId) {
      fetchActiveGoalsBySector(profile.sector, profile.userId).catch((error) => {
        logger.api.error('metas do setor', 'Falha na requisição');
      });
    }
  }, [profile?.sector, profile?.userId, fetchActiveGoalsBySector]);

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

  // NOVA LÓGICA: Calcular itens de checklist com progresso parcial (por dia)
  const checklistItemsWithProgress = useMemo(() => {
    if (!goalsByType.checklistGoals.length) {
      return [];
    }

    const today = new Date();

    return goalsByType.checklistGoals.flatMap(goal => {
      // Considerar apenas submissões do dia atual para esta meta
      const goalSubmissionsToday = submissions.filter(sub => {
        try {
          const sameDay = isSameDay(new Date(sub.date), today);
          if (!sameDay) return false;
          const checklist = JSON.parse(sub.checklist);
          return checklist[goal.$id!] !== undefined;
        } catch {
          return false;
        }
      });

      // Calcular itens já completados HOJE
      const completedItemsToday = new Set<string>();
      goalSubmissionsToday.forEach(sub => {
        try {
          const checklist = JSON.parse(sub.checklist);
          const goalData = checklist[goal.$id!];
          
          if (Array.isArray(goalData)) {
            goalData.forEach((completed: boolean, index: number) => {
              if (completed) {
                completedItemsToday.add(`${goal.$id}-${index}`);
              }
            });
          } else if (goalData && typeof goalData === 'object') {
            Object.entries(goalData).forEach(([itemId, completed]) => {
              if (completed) {
                completedItemsToday.add(itemId);
              }
            });
          }
        } catch {
          // Ignora erros de parsing
        }
      });

      // Retornar apenas itens não completados HOJE
      return goal.items
        .filter((item: any) => !completedItemsToday.has(item.id))
        .map((item: any) => ({
          ...item,
          goalTitle: goal.title,
          goalDescription: goal.description,
          goalId: goal.$id
        }));
    });
  }, [goalsByType.checklistGoals, submissions]);

  // NOVA LÓGICA: Calcular metas individuais com progresso parcial
  const individualGoalsWithProgress = useMemo(() => {
    if (!goalsByType.individualGoals.length) {
      return [];
    }

    return goalsByType.individualGoals.filter(goal => {
      // Buscar todas as submissões deste usuário para esta meta
      const goalSubmissions = submissions.filter(sub => {
        try {
          const checklist = JSON.parse(sub.checklist);
          return checklist[goal.$id!] !== undefined;
        } catch {
          return false;
        }
      });

      // Se não tem submissões, mostrar a meta
      if (goalSubmissions.length === 0) {
        return true;
      }

      // Verificar se a meta já foi completada baseado no tipo
      try {
        switch (goal.type) {
          case 'numeric':
            // CORREÇÃO: Para metas numéricas, somar todos os valores acumulados
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
            // CORREÇÃO: Meta continua aparecendo mesmo após ser atingida para controle
            return true; // Sempre mostrar para controle contínuo
          
          case 'percentage':
            // Para metas de porcentagem, verificar se atingiu o targetValue
            const lastSubmission = goalSubmissions[goalSubmissions.length - 1];
            const checklist = JSON.parse(lastSubmission.checklist);
            const goalData = checklist[goal.$id!];
            const currentPercentage = parseFloat(goalData) || 0;
            return currentPercentage < goal.targetValue;
          
          case 'task_completion': {
            // Para tarefas diárias, considerar apenas submissões de HOJE
            const today = new Date();
            const submissionsToday = goalSubmissions.filter(sub => isSameDay(new Date(sub.date), today));
            if (submissionsToday.length === 0) {
              return true; // Nenhuma submissão hoje -> ainda pendente
            }
            // Verificar se alguma submissão de hoje marcou como concluída
            const completedToday = submissionsToday.some(sub => {
              try {
                const checklistTask = JSON.parse(sub.checklist);
                const goalDataTask = checklistTask[goal.$id!];
                return Boolean(goalDataTask);
              } catch {
                return false;
              }
            });
            return !completedToday;
          }
          
          default:
            return true;
        }
      } catch {
        // Se erro no parsing, mostrar a meta
        return true;
      }
    });
  }, [goalsByType.individualGoals, submissions]);

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

  // Função para calcular o progresso atual de uma meta
  const calculateGoalProgress = (goalId: string, goalType: string, targetValue: number) => {
    if (goalType !== 'numeric') return { currentValue: 0, progress: 0, isCompleted: false };
    
    let totalValue = 0;
    const goalSubmissions = submissions.filter(sub => {
      try {
        const checklist = JSON.parse(sub.checklist);
        return checklist[goalId] !== undefined;
      } catch {
        return false;
      }
    });
    
    goalSubmissions.forEach(sub => {
      try {
        const checklist = JSON.parse(sub.checklist);
        const goalData = checklist[goalId];
        if (goalData !== undefined && goalData !== null) {
          totalValue += parseFloat(goalData) || 0;
        }
      } catch {
        // Ignora erros de parsing
      }
    });
    
    // CORREÇÃO: Mostrar progresso real mesmo após atingir a meta (ex: 6/5, 7/5)
    const progress = (totalValue / targetValue) * 100;
    const isCompleted = totalValue >= targetValue;
    
    return { currentValue: totalValue, progress, isCompleted };
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

  // Funções para gerenciar dados das metas
  const updateIndividualGoalData = (goalId: string, value: any) => {
    setIndividualGoalData(prev => ({
      ...prev,
      [goalId]: value
    }));
  };

  const updateChecklistData = (itemId: string, checked: boolean) => {
    setChecklistData(prev => ({
      ...prev,
      [itemId]: checked
    }));
  };

  const updateGoalFile = (goalId: string, file: File) => {
    setGoalFiles(prev => ({
      ...prev,
      [goalId]: file
    }));
  };

  const handleSubmit = async () => {
    if (!profile) return;

    try {
      setSubmitLoading(true);
      setSubmitError(null);
      logger.form.submit('all-goals');
      
      // NOVA LÓGICA: Combinar dados com progresso parcial para checklists
      const combinedAnswers: Record<string, any> = { ...checklistData };
      
      // Para metas individuais, calcular valores acumulados
      Object.entries(individualGoalData).forEach(([goalId, value]) => {
        const goal = goalsByType.individualGoals.find(g => g.$id === goalId);
        if (goal) {
          switch (goal.type) {
            case 'numeric':
              // CORREÇÃO: Para metas numéricas, calcular o valor acumulado total
              let totalValue = parseFloat(value) || 0;
              
              // Somar valores de submissões anteriores
              const previousSubmissions = submissions.filter(sub => {
                try {
                  const checklist = JSON.parse(sub.checklist);
                  return checklist[goalId] !== undefined;
                } catch {
                  return false;
                }
              });
              
              previousSubmissions.forEach(sub => {
                try {
                  const checklist = JSON.parse(sub.checklist);
                  const previousValue = parseFloat(checklist[goalId]) || 0;
                  totalValue += previousValue;
                } catch {
                  // Ignora erros de parsing
                }
              });
              
              // CORREÇÃO: Limitar o valor enviado ao máximo da meta
              const goal = goalsByType.individualGoals.find(g => g.$id === goalId);
              if (goal && goal.targetValue) {
                totalValue = Math.min(totalValue, goal.targetValue);
              }
              
              combinedAnswers[goalId] = totalValue;
              break;
              
            case 'percentage':
              // Para metas de porcentagem, preservar o valor original
              combinedAnswers[goalId] = value;
              break;
              
            case 'task_completion':
              combinedAnswers[goalId] = Boolean(value);
              break;
              
            default:
              combinedAnswers[goalId] = Boolean(value);
          }
        }
      });
      
      // Para checklists, salvar apenas os itens marcados hoje (progresso parcial)
      goalsByType.checklistGoals.forEach(goal => {
        const todayItems = goal.items.filter((item: any) => checklistData[item.id]);
        if (todayItems.length > 0) {
          // Salvar apenas os itens completados hoje
          const todayProgress: Record<string, boolean> = {};
          todayItems.forEach((item: any) => {
            todayProgress[item.id] = true;
          });
          combinedAnswers[goal.$id!] = todayProgress;
        }
      });
      
      // Usar o primeiro arquivo encontrado (podemos melhorar isso depois para múltiplos arquivos)
      const firstFile = Object.values(goalFiles)[0];
      
      // Verificar se há itens marcados no checklist
      const hasChecklistItems = Object.values(checklistData).some(checked => checked);
      
      // Verificar se há metas individuais com dados
      const hasIndividualGoals = Object.keys(individualGoalData).length > 0;
      
      // Verificar se alguma meta envolvida exige comprovação e então exigir arquivo
      const involvedGoalIds = new Set<string>();
      Object.keys(individualGoalData).forEach((id) => involvedGoalIds.add(id));
      goalsByType.checklistGoals.forEach((goal) => {
        const someChecked = goal.items.some((item: any) => checklistData[item.id]);
        if (someChecked && goal.$id) involvedGoalIds.add(goal.$id);
      });

      const requiresProof = sectorGoals.some((g) => g.requireProof && g.$id && involvedGoalIds.has(g.$id));
      if (requiresProof && Object.keys(goalFiles).length === 0) {
        setSubmitError('Pelo menos uma das metas selecionadas exige anexo de comprovação.');
        return;
      }
      
      // Se não há itens para enviar
      if (!hasChecklistItems && !hasIndividualGoals) {
        setSubmitError('Nenhum item selecionado para envio.');
        return;
      }
      
      await createSubmission(profile.$id, combinedAnswers, generalObservation, firstFile);
      
      logger.form.success('all-goals');
      toastSuccess('Progresso salvo com sucesso!', 'Sucesso');
      
      // Limpar apenas os dados de hoje, mantendo o progresso histórico
      setIndividualGoalData({});
      setChecklistData({});
      setGeneralObservation('');
      setGoalFiles({});
      
    } catch (error: any) {
      logger.form.error('all-goals', error.message);
      setSubmitError(error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSubmitOld = async (
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
      toastSuccess('Checklist enviado com sucesso!', 'Sucesso');
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

  // Calcular recompensas monetárias baseadas nas metas individuais
  const rewardStats = useMemo(() => {
    if (!profile?.userId || !sectorGoals.length) {
      return {
        totalEarnedThisMonth: 0,
        totalEarnedThisWeek: 0,
        totalEarnedToday: 0,
        totalPendingRewards: 0,
        totalAvailableRewards: 0,
        rewardsByPeriod: []
      };
    }

    return calculateRewards ? calculateRewards(sectorGoals, profile.userId) : {
      totalEarnedThisMonth: 0,
      totalEarnedThisWeek: 0,
      totalEarnedToday: 0,
      totalPendingRewards: 0,
      totalAvailableRewards: 0,
      rewardsByPeriod: []
    };
  }, [sectorGoals, submissions, profile?.userId, calculateRewards]);

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

  // Considerar "concluídas" apenas quando não houver pendências
  const hasSubmittedToday = hasSubmissionToday(profile.$id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
             {/* Header */}
       <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 shadow-lg">
         <div className="w-full px-4 sm:px-6 lg:px-8">
           <div className="flex justify-between items-center py-6">
             <div className="flex items-center space-x-4">
               <div className="flex items-center space-x-3">
                 <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                   <Target className="w-6 h-6 text-white" />
                 </div>
                 <div>
                   <h1 className="text-2xl font-bold text-white">
                     Meu Checklist - {profile.sector}
                   </h1>
                   <div className="flex items-center space-x-2 text-blue-100">
                     <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                     <p className="text-sm font-medium">
                       Bem-vindo, {profile.name || (profile.role === 'collaborator' ? 'Colaborador' : profile.role)}
                     </p>
                   </div>
                 </div>
               </div>
             </div>
             
             <div className="flex items-center space-x-3">
               <div className="hidden sm:flex items-center space-x-2 text-blue-100">
                 <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
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
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           
           {/* Checklist Principal */}
           <div className="md:col-span-2 lg:col-span-1 xl:col-span-2 space-y-6">
             
             {/* Seção Principal - Checklist */}
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
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-3 text-gray-600">Carregando metas do setor...</p>
                  </div>
                ) : sectorGoals.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Target className="w-12 h-12 mx-auto mb-3 text-blue-400" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Nenhuma meta configurada</h3>
                    <p className="text-sm">O administrador ainda não configurou metas para o setor {profile?.sector}.</p>
                  </div>
                ) : (checklistItemsWithProgress.length > 0 || individualGoalsWithProgress.length > 0) ? (
                  <div className="space-y-6">
                    {/* Metas Individuais com Progresso Parcial */}
                    {individualGoalsWithProgress.length > 0 ? (
                      <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h3 className="text-lg font-semibold text-green-800 mb-2">🎯 Metas Pendentes - Progresso Parcial</h3>
                          <p className="text-sm text-green-700">Mostrando apenas as metas que ainda não foram completadas. Você pode salvar o progresso a qualquer momento.</p>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {individualGoalsWithProgress.map(goal => {
                            const progress = calculateGoalProgress(goal.$id!, goal.type, goal.targetValue);
                            const isCompleted = progress.isCompleted;
                            
                            return (
                              <Card key={goal.$id} className={`border ${
                                isCompleted 
                                  ? 'border-green-200 bg-green-50' 
                                  : 'border-gray-200'
                              }`}>
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <CardTitle className={`text-lg font-semibold ${
                                      isCompleted ? 'text-green-800' : 'text-gray-800'
                                    }`}>
                                      {goal.title}
                                      {isCompleted && (
                                        <span className="ml-2 text-sm text-green-600">✅</span>
                                      )}
                                    </CardTitle>
                                  </div>
                                  <p className={`text-sm ${
                                    isCompleted ? 'text-green-600' : 'text-gray-600'
                                  }`}>{goal.description}</p>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">{goal.type === 'numeric' ? 'Numérico' : goal.type === 'percentage' ? 'Porcentagem' : goal.type === 'task_completion' ? 'Tarefa' : goal.type}</span>
                                    {(goal.type === 'numeric' || goal.type === 'percentage') && (<span>Meta: {goal.targetValue}{goal.type === 'percentage' ? '%' : ''}</span>)}
                                    {goal.hasMonetaryReward && goal.monetaryValue && (
                                      <div className="flex flex-col gap-1">
                                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium text-xs">💰 {formatCurrency(centavosToReais(goal.monetaryValue))} - {formatPeriodDisplay(goal.period)}</span>
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium text-xs">Diário: {formatCurrency(centavosToReais(calculateDailyRewardValue(goal.monetaryValue, goal.period, goal.$createdAt!)))}</span>
                                      </div>
                                    )}
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-4">
                                    {goal.type === 'numeric' && (
                                      <div className="space-y-3">
                                        <label className="block text-sm font-medium text-gray-700">Valor Atual:</label>
                                        
                                        {/* Mostrar progresso atual */}
                                        {(() => {
                                          const progress = calculateGoalProgress(goal.$id!, goal.type, goal.targetValue);
                                          return (
                                            <div className="mb-3">
                                              <div className="flex justify-between text-sm text-gray-600 mb-1">
                                                <span>Progresso: {progress.currentValue}/{goal.targetValue}</span>
                                                <span>{Math.round(progress.progress)}%</span>
                                              </div>
                                              <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div 
                                                  className={`h-2 rounded-full transition-all duration-300 ${
                                                    progress.isCompleted ? 'bg-green-500' : 'bg-blue-500'
                                                  }`}
                                                  style={{ width: `${Math.min(progress.progress, 100)}%` }}
                                                ></div>
                                              </div>
                                              {progress.isCompleted && (
                                                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                                                  <p className="text-xs text-green-700 font-medium">
                                                    ✅ Meta atingida! {progress.currentValue > goal.targetValue ? `Valor adicional (${progress.currentValue - goal.targetValue}) não será pago.` : 'Valores adicionais não serão pagos.'}
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })()}
                                        
                                        <input 
                                          type="number" 
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                          placeholder={`Meta: ${goal.targetValue}`} 
                                          min="0" 
                                          value={individualGoalData[goal.$id!] || ''} 
                                          onChange={(e) => updateIndividualGoalData(goal.$id!, parseFloat(e.target.value) || 0)} 
                                        />
                                      </div>
                                    )}
                                    {goal.type === 'percentage' && (
                                      <div className="space-y-3">
                                        <label className="block text-sm font-medium text-gray-700">Porcentagem Atual (%):</label>
                                        <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={`Meta: ${goal.targetValue}%`} min="0" max="100" value={individualGoalData[goal.$id!] || ''} onChange={(e) => updateIndividualGoalData(goal.$id!, parseFloat(e.target.value) || 0)} />
                                      </div>
                                    )}
                                    {goal.type === 'task_completion' && (
                                      <div className="space-y-3">
                                        <label className="flex items-center space-x-2">
                                          <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" checked={individualGoalData[goal.$id!] || false} onChange={(e) => updateIndividualGoalData(goal.$id!, e.target.checked)} />
                                          <span className="text-sm text-gray-700">Tarefa concluída</span>
                                        </label>
                                      </div>
                                    )}
                                    <div className="pt-3 border-t border-gray-200">
                                      <label className="block text-sm font-medium text-gray-700 mb-2">Comprovação desta meta {goal.requireProof ? '(obrigatória)' : '(opcional)'}:</label>
                                      <input type="file" accept="image/*,.pdf,.doc,.docx" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={(e) => { const file = e.target.files?.[0]; if (file) updateGoalFile(goal.$id!, file); }} />
                                      <p className="text-xs text-gray-500 mt-1">Formatos aceitos: Imagens, PDF, DOC, DOCX</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ) : (goalsByType.individualGoals.length > 0) ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                        <div className="text-green-600 mb-3">
                          <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        </div>
                        <h3 className="text-lg font-semibold text-green-800 mb-2">🎉 Todas as Metas Concluídas!</h3>
                        <p className="text-sm text-green-700">Parabéns! Você completou todas as metas individuais. Continue assim!</p>
                      </div>
                    ) : null}
                    {/* Checklist com Progresso Parcial */}
                    {checklistItemsWithProgress.length > 0 ? (
                      <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h3 className="text-lg font-semibold text-blue-800 mb-2">📋 Itens Pendentes - Progresso Parcial</h3>
                          <p className="text-sm text-blue-700">Mostrando apenas os itens que ainda não foram completados. Você pode salvar o progresso a qualquer momento.</p>
                        </div>
                        
                        {/* Agrupar itens por meta */}
                        {(() => {
                          const groupedItems = checklistItemsWithProgress.reduce((groups: any, item: any) => {
                            const goalId = item.goalId;
                            if (!groups[goalId]) {
                              groups[goalId] = {
                                goalTitle: item.goalTitle,
                                goalDescription: item.goalDescription,
                                items: []
                              };
                            }
                            groups[goalId].items.push(item);
                            return groups;
                          }, {});

                          return Object.entries(groupedItems).map(([goalId, group]: [string, any]) => (
                            <Card key={goalId} className="border border-blue-200 bg-white shadow-sm">
                              <CardHeader className="pb-3">
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 2a1 1 0 000 2h6a1 1 0 100-2H7zm0 4a1 1 0 000 2h6a1 1 0 100-2H7zm0 4a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <CardTitle className="text-lg font-semibold text-gray-900">{group.goalTitle}</CardTitle>
                                    {group.goalDescription && (
                                      <p className="text-sm text-gray-600 mt-1">{group.goalDescription}</p>
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="space-y-3">
                                  {group.items.map((item: any) => (
                                    <div key={item.id} className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                      <div className="flex items-center space-x-3">
                                        <input 
                                          type="checkbox" 
                                          className="w-5 h-5 text-blue-600 border-blue-300 rounded focus:ring-blue-500" 
                                          checked={checklistData[item.id] || false} 
                                          onChange={(e) => updateChecklistData(item.id, e.target.checked)} 
                                        />
                                        <div className="flex-1">
                                          <Label className="text-sm font-medium text-blue-800 cursor-pointer">{item.label}</Label>
                                        </div>
                                        {checklistData[item.id] && (
                                          <div className="text-green-600">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Campo de arquivo para este item */}
                                      {checklistData[item.id] && (
                                        <div className="ml-8 space-y-2">
                                          <label className="block text-sm font-medium text-blue-700">Comprovação para "{item.label}":</label>
                                          <input 
                                            type="file" 
                                            accept="image/*,.pdf,.doc,.docx" 
                                            className="w-full px-3 py-2 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                                            onChange={(e) => { 
                                              const file = e.target.files?.[0]; 
                                              if (file) updateGoalFile(item.id, file); 
                                            }} 
                                          />
                                          <p className="text-xs text-blue-600">Formatos aceitos: Imagens, PDF, DOC, DOCX</p>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          ));
                        })()}
                      </div>
                    ) : (goalsByType.checklistGoals.length > 0) ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                        <div className="text-green-600 mb-3">
                          <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        </div>
                        <h3 className="text-lg font-semibold text-green-800 mb-2">🎉 Todos os Itens Concluídos!</h3>
                        <p className="text-sm text-green-700">Parabéns! Você completou todos os itens dos checklists. Continue assim!</p>
                      </div>
                    ) : null}
                    {/* Observações e Envio */}
                    {(individualGoalsWithProgress.length > 0 || checklistItemsWithProgress.length > 0) && (
                      <Card className="border border-gray-200 bg-gray-50">
                        <CardHeader>
                          <CardTitle className="text-lg font-semibold text-gray-800">Finalizar Envio</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Observações Gerais (opcional):</label>
                            <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Adicione observações gerais sobre todas as metas do dia..." value={generalObservation} onChange={(e) => setGeneralObservation(e.target.value)} />
                            <p className="text-xs text-gray-500 mt-1">Use este campo para comentários que se aplicam a todas as metas</p>
                          </div>
                          <Button className="w-full" disabled={submitLoading || (checklistItemsWithProgress.length === 0 && individualGoalsWithProgress.length === 0)} onClick={handleSubmit}>
                            {submitLoading ? 'Salvando...' : 'Salvar Progresso'}
                          </Button>
                          {submitError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <p className="text-red-800 text-sm">{submitError}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  hasSubmittedToday ? (
                    <div className="text-center py-8 text-gray-500">
                      <Target className="w-12 h-12 mx-auto mb-3 text-green-500" />
                      <h3 className="text-lg font-medium text-gray-700 mb-2">Parabéns! Metas do dia concluídas</h3>
                      <p className="text-sm">Você completou todas as metas disponíveis para hoje.</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Target className="w-12 h-12 mx-auto mb-3 text-blue-500" />
                      <h3 className="text-lg font-medium text-gray-700 mb-2">Nenhuma meta pendente listada agora</h3>
                      <p className="text-sm">Se houver metas individuais para hoje, elas aparecerão aqui para envio.</p>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
            
            {/* Seção de Resumo Rápido - Apenas quando já enviou */}
            {hasSubmittedToday && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="shadow-md border-0 bg-gradient-to-br from-green-50 to-green-100">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Target className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-green-800">Metas Concluídas</div>
                        <div className="text-lg font-bold text-green-700">
                          {sectorGoals.filter(g => g.isActive).length} metas ativas
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                                 <Card className="shadow-md border-0 bg-gradient-to-br from-blue-50 to-blue-100">
                   <CardContent className="p-4">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                         <TrendingUp className="w-5 h-5 text-blue-600" />
                       </div>
                       <div>
                         <div className="text-sm font-medium text-blue-800">Próximo Envio</div>
                         <div className="text-lg font-bold text-blue-700">Amanhã</div>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
                 
                 <Card className="shadow-md border-0 bg-gradient-to-br from-purple-50 to-purple-100">
                   <CardContent className="p-4">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                         <Award className="w-5 h-5 text-purple-600" />
                       </div>
                       <div>
                         <div className="text-sm font-medium text-purple-800">Total Ganho</div>
                         <div className="text-lg font-bold text-purple-700">
                           {formatCurrency(centavosToReais(rewardStats?.totalEarnedThisMonth || 0))}
                         </div>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
               </div>
             )}
          </div>

                     {/* Sidebar - Estatísticas Pessoais */}
           <div className="lg:col-span-2 xl:col-span-2 space-y-8">
             
             {/* Stats Cards */}
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                             <Card className="shadow-md border-0 bg-gradient-to-br from-blue-50 to-blue-100">
                 <CardContent className="p-8 text-center">
                   <Calendar className="w-10 h-10 mx-auto mb-4 text-blue-600" />
                   <div className="text-3xl font-bold text-blue-700">{personalStats.thisWeek}%</div>
                   <div className="text-sm text-blue-600">Esta Semana</div>
                 </CardContent>
               </Card>

                             <Card className="shadow-md border-0 bg-gradient-to-br from-emerald-50 to-emerald-100">
                 <CardContent className="p-8 text-center">
                   <TrendingUp className="w-10 h-10 mx-auto mb-4 text-emerald-600" />
                   <div className="text-3xl font-bold text-emerald-700">{personalStats.streak}</div>
                   <div className="text-sm text-emerald-600">Dias Seguidos</div>
                 </CardContent>
               </Card>

                             <Card className="shadow-md border-0 bg-gradient-to-br from-green-50 to-green-100">
                 <CardContent className="p-8 text-center">
                   <div className="w-10 h-10 mx-auto mb-4 text-green-600 flex items-center justify-center text-2xl">
                     💰
                   </div>
                   <div className="text-3xl font-bold text-green-700">
                     {formatCurrency(centavosToReais(rewardStats?.totalEarnedThisMonth || 0))}
                   </div>
                   <div className="text-sm text-green-600">Ganho no Mês</div>
                 </CardContent>
               </Card>

                             <Card className="shadow-md border-0 bg-gradient-to-br from-orange-50 to-orange-100">
                 <CardContent className="p-8 text-center">
                   <Target className="w-10 h-10 mx-auto mb-4 text-orange-600" />
                   <div className="text-3xl font-bold text-orange-700">{personalStats.lastWeek}%</div>
                   <div className="text-sm text-orange-600">Semana Passada</div>
                 </CardContent>
               </Card>
            </div>

                         {/* Gráfico Pessoal Simples */}
             <Card className="shadow-md border-0 bg-white">
               <CardHeader className="pb-3">
                 <CardTitle className="text-lg font-bold text-gray-900">Minha Performance - 7 Dias</CardTitle>
               </CardHeader>
               <CardContent>
                 <Chart
                   data={chartData}
                   title=""
                   type="line"
                   height={180}
                 />
               </CardContent>
             </Card>

             {/* Recompensas Monetárias */}
             <Card className="shadow-md border-0 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-gray-900">Recompensas Monetárias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                                     <div className="grid grid-cols-2 gap-6">
                     <div className="bg-green-50 rounded-lg p-6">
                       <div className="text-sm text-green-600 font-medium">Ganho na Semana</div>
                       <div className="text-xl font-bold text-green-700">
                         {formatCurrency(centavosToReais(rewardStats?.totalEarnedThisWeek || 0))}
                       </div>
                     </div>
                     
                     <div className="bg-blue-50 rounded-lg p-6">
                       <div className="text-sm text-blue-600 font-medium">Disponível</div>
                       <div className="text-xl font-bold text-blue-700">
                         {formatCurrency(centavosToReais(rewardStats?.totalAvailableRewards || 0))}
                       </div>
                     </div>
                     
                     
                   </div>

                                     {/* Lista de metas com recompensas */}
                                                                                 {rewardStats?.rewardsByPeriod && rewardStats.rewardsByPeriod.length > 0 && (
                        <div className="space-y-4">
                        <div className="text-sm font-medium text-gray-700 mb-3">Metas com Recompensas:</div>
                        
                                                 {/* Resumo das recompensas */}
                         <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 mb-4">
                           <div className="text-center">
                             <div className="text-blue-600 font-semibold text-sm">Ganho Hoje</div>
                             <div className="text-xl font-bold text-blue-700">
                               {formatCurrency(centavosToReais(rewardStats?.totalEarnedToday || 0))}
                             </div>
                           </div>
                         </div>
                                                                        {rewardStats.rewardsByPeriod.slice(0, 3).map((reward, index) => (
                           <div key={reward.goalId} className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="text-sm font-semibold text-gray-800">
                                    {reward.goalTitle}
                                  </div>
                                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    reward.goalType === 'numeric' ? 'bg-blue-100 text-blue-700' :
                                    reward.goalType === 'task_completion' ? 'bg-green-100 text-green-700' :
                                    'bg-purple-100 text-purple-700'
                                  }`}>
                                    {reward.goalType === 'numeric' ? 'Numérico' : 
                                     reward.goalType === 'task_completion' ? 'Tarefa' : 'Checklist'}
                                  </div>
                                </div>
                                
                                                                 <div className="flex items-center gap-4 text-xs text-gray-600">
                                   <span className="flex items-center gap-1">
                                     <Calendar className="w-3 h-3" />
                                     {formatPeriodDisplay(reward.periodType)}
                                   </span>
                                   <span className="flex items-center gap-1">
                                     <TrendingUp className="w-3 h-3" />
                                     {Math.round(reward.completionRate)}%
                                   </span>
                                   {reward.goalType === 'numeric' && reward.currentValue && (
                                     <span className="text-blue-600 font-medium">
                                       {reward.currentValue}/{reward.targetValue}
                                     </span>
                                   )}
                                   <span className="flex items-center gap-1 text-green-600">
                                     <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                     {formatCurrency(centavosToReais(reward.totalMonetaryValue))} total
                                   </span>
                                   <span className="flex items-center gap-1 text-blue-600">
                                     <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                     {formatCurrency(centavosToReais(reward.dailyValue))}/dia
                                   </span>
                                 </div>
                                
                                {reward.goalType === 'numeric' && reward.currentValue && (
                                  <div className="w-full bg-blue-200 rounded-full h-1 mt-2">
                                    <div 
                                      className="bg-blue-600 h-1 rounded-full transition-all duration-300" 
                                      style={{ width: `${Math.min((reward.currentValue || 0) / reward.targetValue * 100, 100)}%` }}
                                    ></div>
                                  </div>
                                )}
                              </div>
                              
                              <div className="text-right ml-3">
                                <div className="text-lg font-bold text-green-600">
                                  {formatCurrency(centavosToReais(reward.earnedAmount))}
                                </div>
                                <div className={`text-xs mt-1 px-2 py-1 rounded-full ${
                                  reward.isEarned ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {reward.isEarned ? '✅ Ganho' : '⏳ Pendente'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                       
                       {rewardStats.rewardsByPeriod.length > 3 && (
                         <div className="text-center py-3">
                           <div className="text-xs text-gray-500 bg-gray-100 rounded-lg py-2 px-3 inline-block">
                             +{rewardStats.rewardsByPeriod.length - 3} metas adicionais disponíveis
                           </div>
                         </div>
                       )}
                     </div>
                   )}

                  {(!rewardStats?.rewardsByPeriod || rewardStats.rewardsByPeriod.length === 0) && (
                    <div className="text-center py-4 text-gray-500">
                      <div className="text-sm">Nenhuma meta com recompensa monetária encontrada</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>


      </div>
    </div>
  );
}
