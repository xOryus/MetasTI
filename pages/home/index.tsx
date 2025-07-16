/**
 * Página inicial para colaboradores
 * Checklist diário e dashboard pessoal
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChecklistForm } from '@/components/ChecklistForm';
import { Chart } from '@/components/Chart';
import { useAuth } from '@/hooks/useAuth';
import { useSubmissions } from '@/hooks/useSubmissions';
import { format, subDays } from 'date-fns';

// Itens do checklist (pode ser movido para configuração)
const CHECKLIST_ITEMS = [
  { id: 'item1', label: 'Verificar emails importantes' },
  { id: 'item2', label: 'Atualizar relatórios diários' },
  { id: 'item3', label: 'Confirmar reuniões do dia' },
  { id: 'item4', label: 'Revisar tarefas pendentes' },
  { id: 'item5', label: 'Backup de dados importantes' },
];

export default function Home() {
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
  } = useSubmissions(profile?.$id);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (
    answers: Record<string, boolean>,
    observation: string,
    printFile: File
  ) => {
    if (!profile) return;
    
    try {
      setSubmitLoading(true);
      setSubmitError(null);
      
      await createSubmission(profile.$id, answers, observation, printFile);
    } catch (error: any) {
      setSubmitError(error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (authLoading || submissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return null;
  }

  // Preparar dados para o gráfico
  const completionStats = getCompletionStats();
  const chartData = Object.entries(completionStats).map(([date, completion]) => ({
    date: format(new Date(date), 'dd/MM'),
    completion
  }));

  const todaySubmitted = hasSubmissionToday(profile.$id);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Checklist Metas</h1>
              <p className="text-gray-600">Bem-vindo, {profile.sector}</p>
            </div>
            <Button onClick={handleLogout} variant="outline">
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Checklist Form */}
          <div>
            <ChecklistForm
              items={CHECKLIST_ITEMS}
              onSubmit={handleSubmit}
              loading={submitLoading}
              error={submitError}
              disabled={todaySubmitted}
            />
          </div>

          {/* Statistics */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Status de Hoje</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  {todaySubmitted ? (
                    <div className="text-green-600">
                      <div className="text-2xl font-bold">✓</div>
                      <p className="mt-2">Checklist concluído hoje</p>
                    </div>
                  ) : (
                    <div className="text-amber-600">
                      <div className="text-2xl font-bold">⏳</div>
                      <p className="mt-2">Checklist pendente</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Submissions Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total de submissões:</span>
                    <span className="font-bold">{submissions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Esta semana:</span>
                    <span className="font-bold">{Object.keys(completionStats).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Média de conclusão:</span>
                    <span className="font-bold">
                      {Object.keys(completionStats).length > 0
                        ? Math.round(
                            Object.values(completionStats).reduce((a, b) => a + b, 0) / Object.keys(completionStats).length
                          )
                        : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="mt-8">
            <Chart
              data={chartData}
              title="Evolução Semanal (%)"
              type="line"
            />
          </div>
        )}
      </div>
    </div>
  );
}