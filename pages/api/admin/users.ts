/**
 * API Route para operações administrativas de usuários
 * Gerencia CRUD de usuários via Appwrite Admin SDK
 * Compatível com node-appwrite
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { adminDatabases, adminUsers, ID } from '@/lib/appwrite-server';
import { DATABASE_ID, USER_PROFILES_COLLECTION } from '@/lib/appwrite';
import { Query } from 'node-appwrite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { sector, role } = req.query;
      
      const queries = [];
      
      if (sector && sector !== 'all') {
        queries.push(Query.equal('sector', sector.toString()));
      }
      
      if (role && role !== 'all') {
        queries.push(Query.equal('role', role.toString()));
      }
      
      const response = await adminDatabases.listDocuments(
        DATABASE_ID,
        USER_PROFILES_COLLECTION,
        queries.length > 0 ? [...queries, Query.limit(500)] : [Query.limit(500)]
      );
      
      // Buscar dados completos do usuário para cada profile
      const usersWithDetails = await Promise.all(
        response.documents.map(async (profile: any) => {
          try {
            // Buscar dados do usuário no Auth
            const authUser = await adminUsers.get(profile.userId);
            return {
              ...profile,
              name: profile.name || authUser.name || authUser.email?.split('@')[0] || 'Usuário',
              email: authUser.email || 'N/A',
              isOrphan: false,
              authExists: true
            };
          } catch (error: any) {
            console.error(`Usuário órfão detectado - Profile ${profile.$id}, UserId: ${profile.userId}`);
            
            // Marcar como órfão para destacar na interface
            return {
              ...profile,
              name: profile.name || '⚠️ Usuário órfão',
              email: 'Auth não encontrado',
              isOrphan: true,
              authExists: false,
              error: error.type || 'user_not_found'
            };
          }
        })
      );
      
      // Contar órfãos para estatísticas
      const orphanCount = usersWithDetails.filter(user => user.isOrphan).length;
      if (orphanCount > 0) {
        console.log(`⚠️ Sistema possui ${orphanCount} usuário(s) órfão(s)`);
      }
      
      res.status(200).json({ users: usersWithDetails });
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error);
      res.status(500).json({ error: 'Erro interno ao buscar usuários.', details: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { email, password, sector, role, name } = req.body;
      
      // Validar se o email foi fornecido
      if (!email) {
        return res.status(400).json({ 
          error: 'Email é um campo obrigatório.' 
        });
      }
      
      // Verificar se já existe usuário com este email
      try {
        const existingUsers = await adminUsers.list([
          Query.equal('email', email)
        ]);
        if (existingUsers.users.length > 0) {
          return res.status(409).json({ 
            error: 'Usuário com este email já existe no sistema.' 
          });
        }
      } catch (checkError) {
        // Se der erro na verificação, continua (pode ser que não exista mesmo)
      }

      // Criar usuário no Appwrite Auth
      const displayName = name || email.split('@')[0]; // Usar nome fornecido ou extrair do email
      const user = await adminUsers.create(
        ID.unique(),
        email,
        undefined, // phone
        password,
        displayName // name
      );
      
      // Criar perfil do usuário
      const profile = await adminDatabases.createDocument(
        DATABASE_ID,
        USER_PROFILES_COLLECTION,
        ID.unique(),
        {
          userId: user.$id,
          name: displayName, // Salvar o nome no perfil
          email, // Adicionando email obrigatório
          sector,
          role
        }
      );
      
      res.status(201).json({ 
        message: 'Usuário criado com sucesso!',
        user: { email: user.email, id: user.$id, name: displayName }, 
        profile: { id: profile.$id, sector: profile.sector, role: profile.role, name: displayName }
      });
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      
      // Tratar erros específicos do Appwrite
      if (error.type === 'user_already_exists') {
        return res.status(409).json({ 
          error: 'Usuário com este email já existe no sistema.' 
        });
      } else if (error.type === 'document_invalid_structure') {
        // Verificar se o erro é especificamente sobre o campo de email
        if (error.message?.includes('email')) {
          return res.status(400).json({ 
            error: 'Erro na estrutura dos dados: o campo email é obrigatório.' 
          });
        } else {
          return res.status(400).json({ 
            error: 'Erro na estrutura dos dados. Verifique se todos os campos obrigatórios foram preenchidos.' 
          });
        }
      } else if (error.code === 400) {
        return res.status(400).json({ 
          error: 'Dados inválidos. Verifique as informações fornecidas.' 
        });
      }
      
      res.status(500).json({ error: 'Erro interno do servidor. Tente novamente.' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { userId, profileId } = req.body;
      
      let authUserDeleted = false;
      let profileDeleted = false;
      
      // Tentar deletar usuário do Auth primeiro (pode não existir)
      try {
        await adminUsers.delete(userId);
        authUserDeleted = true;
        console.log(`Usuário ${userId} deletado do Auth com sucesso`);
      } catch (authError: any) {
        if (authError.code === 404 || authError.type === 'user_not_found') {
          console.log(`Usuário ${userId} não encontrado no Auth - pode ser órfão`);
          authUserDeleted = true; // Considera como sucesso pois o objetivo é remover
        } else {
          console.error('Erro inesperado ao deletar do Auth:', authError);
          throw authError; // Relança se for erro diferente de "não encontrado"
        }
      }
      
      // Deletar perfil do banco (sempre tentar)
      try {
        await adminDatabases.deleteDocument(
          DATABASE_ID,
          USER_PROFILES_COLLECTION,
          profileId
        );
        profileDeleted = true;
        console.log(`Profile ${profileId} deletado do banco com sucesso`);
      } catch (profileError: any) {
        if (profileError.code === 404) {
          console.log(`Profile ${profileId} não encontrado no banco`);
          profileDeleted = true; // Considera como sucesso
        } else {
          console.error('Erro ao deletar profile:', profileError);
          throw profileError;
        }
      }
      
      if (authUserDeleted && profileDeleted) {
        res.status(200).json({ 
          success: true, 
          message: 'Usuário removido completamente do sistema' 
        });
      } else {
        res.status(500).json({ 
          error: 'Falha parcial na remoção do usuário',
          details: { authUserDeleted, profileDeleted }
        });
      }
      
    } catch (error: any) {
      console.error('Erro ao deletar usuário:', error);
      res.status(500).json({ 
        error: 'Erro interno ao deletar usuário.', 
        details: error.message,
        type: error.type || 'unknown'
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}