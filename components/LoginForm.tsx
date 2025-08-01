/**
 * Componente de formulário de login
 * Suporta login admin especial e autenticação via Appwrite
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
      const { user, profile } = await login(email, password);
      
      // Não resetar o loading aqui, deixar ativo durante o redirecionamento
      // para prevenir múltiplos cliques
      
      // Adicionar pequeno delay para garantir que os estados sejam atualizados
      setTimeout(() => {
        // Redirecionar diretamente para as páginas específicas por role
        if (profile?.role === Role.ADMIN) {
          window.location.href = '/admin';
        } else if (profile?.role === Role.MANAGER) {
          window.location.href = '/home/manager';
        } else if (profile?.role === Role.COLLABORATOR) {
          window.location.href = '/home/collaborator';
        } else {
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
             {/* Background com blur */}
       <div className="absolute inset-0 bg-gradient-to-br from-orange-100 via-yellow-100 to-red-100">
         <div className="absolute inset-0 opacity-20" style={{
           backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23E64114' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
         }}></div>
       </div>
      
      <div className="w-full max-w-6xl mx-4 relative z-10">
        <Card className="overflow-hidden shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <div className="flex min-h-[600px]">
            {/* Seção da Esquerda - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-bovia-primary to-bovia-secondary relative">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10 flex flex-col justify-center w-full p-16 text-white">
                <div className="max-w-md">
                  {/* Logo */}
                  <div className="mb-2">
                    <Image
                      src="/images/Logo Principal_-1 1.png"
                      alt="Bovía Logo"
                      width={280}
                      height={102}
                      className="mb-4"
                    />
                  </div>
                  
                  {/* Conteúdo Principal */}
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h1 className="text-4xl font-bold text-[#f4e9ce] leading-tight">
                        Login Metas
                      </h1>
                      <div className="w-23 h-1.5 bg-white/40 rounded-full"></div>
                    </div>
                    
                    <p className="text-white/90 text-xl leading-relaxed font-light">
                      Sistema de Gestão de Metas e Produtividade
                    </p>
                  </div>
                  
                  {/* Elementos Decorativos */}
                  <div className="mt-12 space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-3 h-3 bg-white/70 rounded-full"></div>
                      <span className="text-white/90 text-base font-medium">Gestão Inteligente</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-3 h-3 bg-white/70 rounded-full"></div>
                      <span className="text-white/90 text-base font-medium">Produtividade</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-3 h-3 bg-white/70 rounded-full"></div>
                      <span className="text-white/90 text-base font-medium">Resultados</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção da Direita - Formulário */}
            <div className="w-full lg:w-1/2 p-12">
              <div className="max-w-md mx-auto">
                <div className="text-center mb-10">
                  <h2 className="text-4xl font-bold text-bovia-primary mb-4">Bem-vindo!</h2>
                  <p className="text-gray-600 text-lg">
                    Faça seu login para lançar suas metas diárias de produtividade
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-gray-700 font-medium text-base">
                      E-mail
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                      </div>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                        className="pl-12 h-12 text-base border-gray-300 focus:border-bovia-primary focus:ring-bovia-primary"
                        placeholder="Digite seu e-mail"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="password" className="text-gray-700 font-medium text-base">
                      Senha
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="pl-12 h-12 text-base border-gray-300 focus:border-bovia-primary focus:ring-bovia-primary"
                        placeholder="Digite sua senha"
                      />
                    </div>
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
                    className="w-full bg-bovia-primary hover:bg-bovia-dark text-white font-semibold py-4 text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                    disabled={loading}
                  >
                    {loading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>

                {/* Versão mobile do logo */}
                <div className="lg:hidden text-center mt-10">
                  <Image
                    src="/images/Logo Principal_-1 1.png"
                    alt="Bovía Logo"
                    width={160}
                    height={64}
                    className="mx-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}