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
        queries
      );
      
      res.status(200).json(response.documents);
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error);
      res.status(500).json({ error: 'Erro interno ao buscar usuários.', details: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { email, password, sector, role } = req.body;
      
      // Criar usuário no Appwrite Auth
      const user = await adminUsers.create(
        ID.unique(),
        email,
        undefined, // phone
        password,
        email.split('@')[0] // name
      );
      
      // Criar perfil do usuário
      const profile = await adminDatabases.createDocument(
        DATABASE_ID,
        USER_PROFILES_COLLECTION,
        ID.unique(),
        {
          userId: user.$id,
          sector,
          role
        }
      );
      
      res.status(201).json({ user, profile });
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      res.status(500).json({ error: 'Erro interno ao criar usuário.', details: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { userId, profileId } = req.body;
      
      // Deletar perfil
      await adminDatabases.deleteDocument(
        DATABASE_ID,
        USER_PROFILES_COLLECTION,
        profileId
      );
      
      // Deletar usuário do Auth
      await adminUsers.delete(userId);
      
      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Erro ao deletar usuário:', error);
      res.status(500).json({ error: 'Erro interno ao deletar usuário.', details: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}