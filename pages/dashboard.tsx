/**
 * Dashboard para gestores e colaboradores
 * Visualização de métricas e submissões do setor
 * VERSÃO CLIENT-SIDE (funcional)
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { useSubmissions } from '@/hooks/useSubmissions';
import { format, subDays } from 'date-fns';
import { Role } from '@/lib/roles';
import { DashboardContent } from '@/components/DashboardContent';

export default function Dashboard() {
  const { isAuthenticated, profile, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  // O hook useSubmissions agora é inteligente e não precisa de parâmetros
  const {
    submissions,
    loading: submissionsLoading,
    getCompletionStats,
    getSubmissionsByDateRange,
  } = useSubmissions();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (
      !authLoading &&
      isAuthenticated &&
      profile?.role !== Role.MANAGER &&
      profile?.role !== Role.COLLABORATOR &&
      profile?.role !== Role.ADMIN
    ) {
      router.push('/home'); // Redireciona se não tiver permissão
    }
  }, [isAuthenticated, profile, authLoading, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // O loading agora depende apenas do authLoading e do submissionsLoading
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

  // Se a autenticação terminou e não há perfil, algo deu errado.
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Erro ao carregar perfil do usuário.</p>
          <button 
            onClick={handleLogout}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Fazer Login Novamente
          </button>
        </div>
      </div>
    );
  }

  const completionStats = getCompletionStats();
  const last7DaysSubmissions = getSubmissionsByDateRange(subDays(new Date(), 7), new Date());
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    const formattedDate = format(date, 'dd/MM');
    const daySubmissions = last7DaysSubmissions.filter(
      (sub) => format(new Date(sub.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    return {
      date: formattedDate,
      value: daySubmissions.length > 0 ? 100 : 0, // Simplificado: 100% se houve submissão
    };
  }).reverse();

  return (
    <DashboardContent
      profile={profile}
      submissions={submissions}
      completionStats={completionStats}
      chartData={chartData}
      handleLogout={handleLogout}
    />
  );
}