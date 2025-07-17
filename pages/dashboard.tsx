/**
 * Página de redirecionamento para dashboards
 * Redireciona para os novos dashboards específicos por role
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/lib/roles';

export default function Dashboard() {
  const { isAuthenticated, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      if (profile) {
        // Redirecionar para os novos dashboards específicos
        switch (profile.role) {
          case Role.COLLABORATOR:
            router.push('/home/collaborator');
            break;
          case Role.MANAGER:
            router.push('/home/manager');
            break;
          case Role.ADMIN:
            router.push('/admin');
            break;
          default:
            router.push('/login');
        }
      }
    }
  }, [isAuthenticated, profile, authLoading, router]);

  // Loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecionando para seu dashboard...</p>
      </div>
    </div>
  );
}
