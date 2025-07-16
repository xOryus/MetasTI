/**
 * Hook de autenticação personalizado
 * Gerencia estado de autenticação e perfil do usuário
 */

'use client';

import { useEffect, useState } from 'react';
import { account, databases, DATABASE_ID, USER_PROFILES_COLLECTION, UserProfile, Sector } from '@/lib/appwrite';
import { Models, Query } from 'appwrite';
import { Role } from '@/lib/roles';

interface AuthState {
  user: Models.User<Models.Preferences> | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null
  });

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Buscando perfil para userId:', userId);
      const profiles = await databases.listDocuments(
        DATABASE_ID,
        USER_PROFILES_COLLECTION,
        [Query.equal('userId', userId)]
      );
      
      console.log('Profiles encontrados:', profiles.documents.length);
      
      if (profiles.documents.length > 0) {
        const profile = profiles.documents[0] as unknown as UserProfile;
        console.log('Perfil carregado:', profile);
        return profile;
      }
      console.log('Nenhum perfil encontrado para userId:', userId);
      return null;
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      return null;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Admin login especial
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
      
      if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
        console.log('Admin login detectado');
        // Salvar na sessionStorage que é admin para persistir na navegação
        sessionStorage.setItem('isAdminLogin', 'true');
        
        const adminUser = {
          $id: 'admin',
          email: adminEmail,
          name: 'Administrador',
          emailVerification: true,
          phoneVerification: false,
          prefs: {},
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString(),
          registration: new Date().toISOString(),
          status: true,
          labels: [],
          passwordUpdate: new Date().toISOString(),
          phone: '',
          accessedAt: new Date().toISOString(),
          mfa: false,
          targets: []
        } as unknown as Models.User<Models.Preferences>;
        
        const adminProfile: UserProfile = {
          $id: 'admin',
          userId: 'admin',
          sector: Sector.TI,
          role: Role.ADMIN,
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString()
        };
        
        setState(prev => ({ ...prev, user: adminUser, profile: adminProfile, loading: false }));
        return { user: adminUser, profile: adminProfile };
      }
      
      // Login normal via Appwrite
      const session = await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      console.log('Login realizado para usuário:', user);
      const profile = await fetchUserProfile(user.$id);
      
      if (!profile) {
        throw new Error('Perfil de usuário não encontrado. Entre em contato com o administrador.');
      }
      
      setState(prev => ({ ...prev, user, profile, loading: false }));
      
      return { user, profile };
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Limpar a sessão admin se existir
      sessionStorage.removeItem('isAdminLogin');
      
      try {
        // Tentar fazer logout do Appwrite se não for admin
        await account.deleteSession('current');
      } catch (e) {
        // Ignora erro se for admin (não tem sessão no Appwrite)
        console.log('Logout: sessão não encontrada no Appwrite');
      }
      
      setState({ user: null, profile: null, loading: false, error: null });
      
      // Redirecionar para login
      window.location.href = '/login';
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verificar primeiro se é admin login da sessionStorage
        const isAdminLogin = sessionStorage.getItem('isAdminLogin') === 'true';
        
        if (isAdminLogin) {
          console.log('Restaurando sessão de admin');
          const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
          
          const adminUser = {
            $id: 'admin',
            email: adminEmail || 'admin@example.com',
            name: 'Administrador',
            emailVerification: true,
            phoneVerification: false,
            prefs: {},
            $createdAt: new Date().toISOString(),
            $updatedAt: new Date().toISOString(),
            registration: new Date().toISOString(),
            status: true,
            labels: [],
            passwordUpdate: new Date().toISOString(),
            phone: '',
            accessedAt: new Date().toISOString(),
            mfa: false,
            targets: []
          } as unknown as Models.User<Models.Preferences>;
          
          const adminProfile: UserProfile = {
            $id: 'admin',
            userId: 'admin',
            sector: Sector.TI,
            role: Role.ADMIN,
            $createdAt: new Date().toISOString(),
            $updatedAt: new Date().toISOString()
          };
          
          setState({ user: adminUser, profile: adminProfile, loading: false, error: null });
          return;
        }
        
        // Verificação normal do Appwrite - verifica se já existe uma sessão
        try {
          // No Appwrite 18.1.1, primeiro devemos verificar se há uma sessão ativa
          // antes de tentar obter os dados do usuário
          const session = await account.getSession('current');
          if (session) {
            // Agora que confirmamos que há uma sessão, podemos obter o usuário
            const user = await account.get();
            console.log('Usuário autenticado:', user);
            const profile = await fetchUserProfile(user.$id);
            console.log('Perfil carregado:', profile);
            
            if (!profile) {
              console.error('Perfil não encontrado para o usuário:', user.$id);
              setState({ user: null, profile: null, loading: false, error: 'Perfil de usuário não encontrado' });
            } else {
              setState({ user, profile, loading: false, error: null });
            }
          } else {
            setState({ user: null, profile: null, loading: false, error: null });
          }
        } catch (sessionError) {
          // Sem sessão ativa
          setState({ user: null, profile: null, loading: false, error: null });
        }
      } catch (error) {
        console.log('Erro na verificação de autenticação:', error);
        setState({ user: null, profile: null, loading: false, error: null });
      }
    };

    checkAuth();
  }, []);

  return {
    ...state,
    login,
    logout,
    isAuthenticated: !!state.user,
    isAdmin: state.profile?.role === Role.ADMIN,
    isManager: state.profile?.role === Role.MANAGER,
    isCollaborator: state.profile?.role === Role.COLLABORATOR
  };
}