/**
 * Componente de formulário de login
 * Suporta login admin especial e autenticação via Appwrite
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/lib/roles';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('Tentando login com:', email);
      const { user, profile } = await login(email, password);
      console.log('Login bem-sucedido:', { user: user.$id, role: profile?.role });
      
      // Não resetar o loading aqui, deixar ativo durante o redirecionamento
      // para prevenir múltiplos cliques
      
      // Adicionar pequeno delay para garantir que os estados sejam atualizados
      setTimeout(() => {
        // Redirecionar diretamente para as páginas específicas por role
        if (profile?.role === Role.ADMIN) {
          console.log('Redirecionando para /admin');
          window.location.href = '/admin';
        } else if (profile?.role === Role.MANAGER) {
          console.log(`Redirecionando para dashboard manager`);
          window.location.href = '/home/manager';
        } else if (profile?.role === Role.COLLABORATOR) {
          console.log(`Redirecionando para dashboard collaborator`);
          window.location.href = '/home/collaborator';
        } else {
          console.log('Role não reconhecido, redirecionando para /login');
          window.location.href = '/login';
        }
      }, 500);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Checklist Metas</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}