/**
 * Página de login
 * Formulário de autenticação com redirecionamento baseado em roles
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { LoginForm } from '@/components/LoginForm';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const { isAuthenticated, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated && profile) {
      // Redirecionar baseado no role
      if (profile.role === 'admin') {
        router.push('/admin');
      } else if (profile.role === 'manager') {
        router.push(`/dashboard?sector=${profile.sector}`);
      } else {
        router.push('/home');
      }
    }
  }, [isAuthenticated, profile, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Redirecionamento acontecerá via useEffect
  }

  return <LoginForm />;
}