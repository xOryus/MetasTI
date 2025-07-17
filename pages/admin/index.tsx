/**
 * Painel administrativo
 * CRUD de usuários com filtros por setor e role
 * Gerenciamento de metas por setor
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserForm } from '@/components/UserForm';
import SectorGoals from '@/components/SectorGoals';
import { useAuth } from '@/hooks/useAuth';
import { UserProfile, Sector } from '@/lib/appwrite';
import { Role } from '@/lib/roles';
import { Models } from 'appwrite';

export default function AdminPanel() {
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    console.log('[ADMIN] useEffect triggered:', { 
      authLoading, 
      isAuthenticated, 
      isAdmin 
    });
    
    if (!authLoading && !isAuthenticated) {
      console.log('[ADMIN] Não autenticado, redirecionando para login');
      router.push('/login');
    } else if (!authLoading && isAuthenticated && !isAdmin) {
      console.log('[ADMIN] Autenticado mas não é admin, redirecionando para home');
      router.push('/home');
    }
  }, [isAuthenticated, isAdmin, authLoading, router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (sectorFilter !== 'all') params.append('sector', sectorFilter);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      
      const response = await fetch(`/api/admin/users?${params}`);
      if (response.ok) {
        const users = await response.json();
        setUsers(users);
      } else {
        throw new Error('Erro ao buscar usuários');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData: {
    email: string;
    password: string;
    sector: Sector;
    role: Role;
  }) => {
    try {
      setError(null);
      
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        throw new Error('Erro ao criar usuário');
      }

      await fetchUsers();
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const deleteUser = async (userId: string, profileId: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, profileId })
      });
      
      if (!response.ok) {
        throw new Error('Erro ao deletar usuário');
      }
      
      await fetchUsers();
    } catch (error: any) {
      setError(error.message);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, sectorFilter, roleFilter]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
          <p className="text-gray-600 mt-2">Gerenciar usuários, metas e configurações do sistema</p>
        </div>
        
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">Gerenciar Usuários</TabsTrigger>
            <TabsTrigger value="goals">Metas por Setor</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulário de criação de usuário */}
              <div className="lg:col-span-1">
                <UserForm 
                  onSubmit={createUser}
                  loading={loading}
                  error={error}
                />
              </div>
              
              {/* Lista de usuários */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Usuários</CardTitle>
                    <div className="flex space-x-4">
                      <Select value={sectorFilter} onValueChange={setSectorFilter}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os setores</SelectItem>
                          <SelectItem value="TI">TI</SelectItem>
                          <SelectItem value="RH">RH</SelectItem>
                          <SelectItem value="LOGISTICA">Logística</SelectItem>
                          <SelectItem value="PORTARIA">Portaria</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as funções</SelectItem>
                          <SelectItem value="collaborator">Colaborador</SelectItem>
                          <SelectItem value="manager">Gestor</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Setor</TableHead>
                          <TableHead>Função</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.$id}>
                            <TableCell className="font-mono text-sm">{user.userId}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{user.sector}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={user.role === 'admin' ? 'default' : 'secondary'}
                              >
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteUser(user.userId, user.$id)}
                              >
                                Deletar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="goals" className="mt-6">
            <SectorGoals />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}