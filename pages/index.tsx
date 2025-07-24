/**
 * Página inicial
 * Redireciona para login ou dashboard baseado na autenticação
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
  const { isAuthenticated, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated && profile) {
        // Redirecionar diretamente para as páginas específicas por role
        if (profile.role === 'admin') {
          router.push('/admin');
        } else if (profile.role === 'manager') {
          router.push('/home/manager');  
        } else if (profile.role === 'collaborator') {
          router.push('/home/collaborator');
        } else {
          router.push('/login');
        }
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, profile, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Carregando...</p>
      </div>
    </div>
  );
}