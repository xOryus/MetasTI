/**
 * Painel administrativo moderno
 * CRUD de usuários com filtros por setor e role
 * Gerenciamento de metas por setor
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserForm } from '@/components/UserForm';
import { SectorGoalsManager } from '@/components/SectorGoalsManager';
import { useAuth } from '@/hooks/useAuth';
import { UserProfile, Sector } from '@/lib/appwrite';
import { Role } from '@/lib/roles';
import { logger } from '@/lib/logger';
import { 
  Users, 
  Target, 
  Shield, 
  LogOut, 
  UserPlus, 
  Trash2, 
  Settings, 
  BarChart3,
  Building,
  TrendingUp,
  Eye,
  EyeOff,
  Filter
} from 'lucide-react';

interface ExtendedUserProfile extends UserProfile {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  email: string; // Removendo o opcional
  isOrphan?: boolean;
  authExists?: boolean;
  error?: string;
}

export default function AdminPanel() {
  const { user, logout, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<ExtendedUserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ExtendedUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [statistics, setStatistics] = useState({
    totalUsers: 0,
    managers: 0,
    collaborators: 0,
    sectors: 0,
    orphans: 0
  });

  useEffect(() => {
    // Aguardar o carregamento da autenticação terminar
    if (authLoading) return;
    
    // Se não estiver autenticado ou não for admin, redirecionar
    if (!user || !isAdmin) {
      router.push('/login');
      return;
    }
    
    fetchUsers();
  }, [user, isAdmin, authLoading, router]);

  useEffect(() => {
    filterUsers();
  }, [users, sectorFilter, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        throw new Error('Erro ao carregar usuários');
      }
      
      const data = await response.json();
      const usersData = Array.isArray(data) ? data : (data.users || []);
      setUsers(usersData);
      
      // Calcular estatísticas
      const stats = {
        totalUsers: usersData.length,
        managers: usersData.filter((u: ExtendedUserProfile) => u.role === 'manager').length,
        collaborators: usersData.filter((u: ExtendedUserProfile) => u.role === 'collaborator').length,
        sectors: new Set(usersData.map((u: ExtendedUserProfile) => u.sector)).size,
        orphans: usersData.filter((u: ExtendedUserProfile) => u.isOrphan).length
      };
      setStatistics(stats);
      
      // Alertar sobre órfãos se existirem
      if (stats.orphans > 0) {
        logger.data.empty(`${stats.orphans} usuário(s) órfão(s) detectado(s)`);
        setError(`Atenção: ${stats.orphans} usuário(s) órfão(s) encontrado(s). Considere fazer limpeza.`);
      }
      
    } catch (err) {
      logger.api.error('users', `Erro ao buscar usuários: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = useCallback(() => {
    let filtered = [...users];
    
    if (sectorFilter !== 'all') {
      filtered = filtered.filter(user => user.sector === sectorFilter);
    }
    
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }
    
    setFilteredUsers(filtered);
  }, [users, sectorFilter, roleFilter]);

  const deleteUser = async (userToDelete: ExtendedUserProfile) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: userToDelete.$id,
          profileId: userToDelete.$id // O profileId é o mesmo que o userId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Erro ao excluir usuário');
      }

      await fetchUsers();
    } catch (err) {
      logger.api.error('users', `Erro ao excluir usuário: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      setError(err instanceof Error ? err.message : 'Erro ao excluir usuário');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      logger.auth.error(`Erro ao fazer logout: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  const handleUserSubmit = async (userData: {
    name: string;
    email: string;
    password: string;
    sector: Sector;
    role: Role;
  }) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar usuário');
      }

      await fetchUsers();
      return true;
    } catch (err) {
      logger.api.error('users', `Erro ao criar usuário: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      setError(err instanceof Error ? err.message : 'Erro ao criar usuário');
      return false;
    }
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive" className="flex items-center gap-1"><Shield className="w-3 h-3" />Admin</Badge>;
      case 'manager':
        return <Badge variant="default" className="flex items-center gap-1"><Users className="w-3 h-3" />Gestor</Badge>;
      case 'collaborator':
        return <Badge variant="secondary" className="flex items-center gap-1"><Users className="w-3 h-3" />Colaborador</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getSectorEmoji = (sector: string) => {
    const sectorEmojis: Record<string, string> = {
      'TI': '💻',
      'RH': '👥',
      'LOGISTICA': '📦',
      'FROTAS': '🚛',
      'ABATE': '🥩',
      'DESOSSA': '🔪',
      'MIUDOS': '🍖',
      'EXPEDICAO': '📋',
      'GERAL_GESTORES': '👔',
      'FINANCEIRO': '💰',
      'FISCAL_CONTABIL': '📊',
      'COMERCIAL': '🤝',
      'COMPRA_GADO': '🐄',
      'ALMOXARIFADO': '📦',
      'MANUTENCAO': '🔧',
      'LAVANDERIA': '🧺',
      'COZINHA': '👨‍🍳'
    };
    return sectorEmojis[sector] || '🏢';
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
             {/* Header */}
       <header className="bg-gradient-to-r from-bovia-primary to-bovia-secondary shadow-lg">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex justify-between items-center h-16">
             <div className="flex items-center gap-3">
               <Shield className="h-8 w-8 text-white" />
               <div>
                 <h1 className="text-xl font-bold text-white">Painel Administrativo</h1>
                 <p className="text-sm text-white/80">Gestão de usuários e metas</p>
               </div>
             </div>
                         <div className="flex items-center gap-4">
               <div className="text-right">
                 <p className="text-sm font-medium text-white">Administrador</p>
                 <p className="text-xs text-white/80">Sistema</p>
               </div>
               <Button 
                 onClick={handleLogout}
                 variant="outline" 
                 size="sm"
                 className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
               >
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalUsers}</div>
              <p className="text-blue-100 text-xs">Usuários cadastrados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gestores</CardTitle>
              <Shield className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.managers}</div>
              <p className="text-green-100 text-xs">Usuários gestores</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Colaboradores</CardTitle>
              <Users className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.collaborators}</div>
              <p className="text-purple-100 text-xs">Usuários colaboradores</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Setores Ativos</CardTitle>
              <Building className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.sectors}</div>
              <p className="text-orange-100 text-xs">Setores diferentes</p>
            </CardContent>
          </Card>

          <Card className={statistics.orphans > 0 ? "bg-gradient-to-r from-red-500 to-red-600 text-white" : "bg-gradient-to-r from-green-500 to-green-600 text-white"}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status do Sistema</CardTitle>
              <Shield className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.orphans}</div>
              <p className={statistics.orphans > 0 ? "text-red-100 text-xs" : "text-green-100 text-xs"}>
                {statistics.orphans > 0 ? "Usuários órfãos" : "Sistema limpo"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="manager" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Gestão de Metas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Gestão de Usuários
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Gerencie todos os usuários do sistema
                    </p>
                  </div>
                  <Button 
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    {showForm ? 'Cancelar' : 'Novo Usuário'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {showForm && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <UserForm 
                      onSubmitAction={handleUserSubmit}
                      loading={loading}
                      error={error}
                    />
                  </div>
                )}

                {/* Filtros */}
                <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 flex-1">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <Select value={sectorFilter} onValueChange={setSectorFilter}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Filtrar por setor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">🏢 Todos os setores</SelectItem>
                        <SelectItem value="TI">💻 TI</SelectItem>
                        <SelectItem value="RH">👥 RH</SelectItem>
                        <SelectItem value="LOGISTICA">📦 Logística</SelectItem>
                        <SelectItem value="FROTAS">🚛 Frotas</SelectItem>
                        <SelectItem value="ABATE">🥩 Abate</SelectItem>
                        <SelectItem value="DESOSSA">🔪 Desossa</SelectItem>
                        <SelectItem value="MIUDOS">🍖 Miúdos</SelectItem>
                        <SelectItem value="EXPEDICAO">📋 Expedição</SelectItem>
                        <SelectItem value="GERAL_GESTORES">👔 Geral Gestores</SelectItem>
                        <SelectItem value="FINANCEIRO">💰 Financeiro</SelectItem>
                        <SelectItem value="FISCAL_CONTABIL">📊 Fiscal/Contábil</SelectItem>
                        <SelectItem value="COMERCIAL">🤝 Comercial</SelectItem>
                        <SelectItem value="COMPRA_GADO">🐄 Compra Gado</SelectItem>
                        <SelectItem value="ALMOXARIFADO">📦 Almoxarifado</SelectItem>
                        <SelectItem value="MANUTENCAO">🔧 Manutenção</SelectItem>
                        <SelectItem value="LAVANDERIA">🧺 Lavanderia</SelectItem>
                        <SelectItem value="COZINHA">👨‍🍳 Cozinha</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 flex-1">
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Filtrar por função" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">👥 Todas as funções</SelectItem>
                        <SelectItem value="admin">🛡️ Administrador</SelectItem>
                        <SelectItem value="manager">👔 Gestor</SelectItem>
                        <SelectItem value="collaborator">👤 Colaborador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-sm text-gray-600 flex items-center">
                    Mostrando {filteredUsers.length} de {users.length} usuários
                  </div>
                </div>

                {/* Tabela de usuários */}
                <div className="border rounded-lg overflow-hidden bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Usuário</TableHead>
                        <TableHead className="font-semibold">Email</TableHead>
                        <TableHead className="font-semibold">Setor</TableHead>
                        <TableHead className="font-semibold">Função</TableHead>
                        <TableHead className="font-semibold">Criado em</TableHead>
                        <TableHead className="font-semibold text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            Nenhum usuário encontrado com os filtros aplicados
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow 
                            key={user.$id} 
                            className={user.isOrphan ? "bg-red-50 border-red-200 hover:bg-red-100" : "hover:bg-gray-50"}
                          >
                            <TableCell className="font-medium">{user.name || user.email || 'Sem nome'}</TableCell>
                            <TableCell className="text-gray-600">{user.email || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                <span>{getSectorEmoji(user.sector)}</span>
                                {user.sector}
                              </Badge>
                            </TableCell>
                            <TableCell>{getRoleBadge(user.role)}</TableCell>
                            <TableCell className="text-gray-600">
                              {new Date(user.$createdAt).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                onClick={() => deleteUser(user)}
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manager">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Gestão de Metas
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Configure e gerencie as metas dos setores
                </p>
              </CardHeader>
              <CardContent>
                <SectorGoalsManager />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
