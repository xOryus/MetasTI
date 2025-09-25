/**
 * Hook para gerenciar contestações de metas
 * Permite criar, listar e atualizar contestações
 */

import { useState, useEffect } from 'react';
import { databases, ID, Query } from '@/lib/appwrite';
import { DATABASE_ID, CONTESTATIONS_COLLECTION } from '@/lib/appwrite';
import { Contestation, CreateContestationData } from '@/lib/appwrite';

export const useContestations = () => {
  const [contestations, setContestations] = useState<Contestation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar todas as contestações
  const fetchContestations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        CONTESTATIONS_COLLECTION,
        [Query.limit(500)]
      );
      
      setContestations(response.documents as unknown as Contestation[]);
    } catch (err) {
      console.error('Erro ao buscar contestações:', err);
      setError('Erro ao carregar contestações');
    } finally {
      setLoading(false);
    }
  };

  // Buscar contestações por colaborador
  const fetchContestationsByCollaborator = async (collaboratorId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        CONTESTATIONS_COLLECTION,
        [
          Query.equal('collaboratorId', collaboratorId),
          Query.limit(100)
        ]
      );
      
      return response.documents as unknown as Contestation[];
    } catch (err) {
      console.error('Erro ao buscar contestações do colaborador:', err);
      setError('Erro ao carregar contestações');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Buscar contestações por gestor
  const fetchContestationsByManager = async (managerId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        CONTESTATIONS_COLLECTION,
        [
          Query.equal('managerId', managerId),
          Query.limit(100)
        ]
      );
      
      return response.documents as unknown as Contestation[];
    } catch (err) {
      console.error('Erro ao buscar contestações do gestor:', err);
      setError('Erro ao carregar contestações');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Criar nova contestação
  const createContestation = async (data: CreateContestationData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await databases.createDocument(
        DATABASE_ID,
        CONTESTATIONS_COLLECTION,
        ID.unique(),
        {
          ...data,
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      );
      
      // Atualizar lista local
      setContestations(prev => [response as unknown as Contestation, ...prev]);
      
      return response as unknown as Contestation;
    } catch (err) {
      console.error('Erro ao criar contestação:', err);
      setError('Erro ao criar contestação');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Atualizar contestação (resolver, dispensar ou responder)
  const updateContestation = async (
    contestationId: string, 
    updates: Partial<Pick<Contestation, 'status' | 'response' | 'resolvedAt'>>
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await databases.updateDocument(
        DATABASE_ID,
        CONTESTATIONS_COLLECTION,
        contestationId,
        {
          ...updates,
          ...(updates.status === 'resolved' && { resolvedAt: new Date().toISOString() })
        }
      );
      
      // Atualizar lista local
      setContestations(prev => 
        prev.map(contestation => 
          contestation.$id === contestationId 
            ? response as unknown as Contestation 
            : contestation
        )
      );
      
      return response as unknown as Contestation;
    } catch (err) {
      console.error('Erro ao atualizar contestação:', err);
      setError('Erro ao atualizar contestação');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Verificar se uma meta específica está contestada
  const isGoalContested = (goalId: string, submissionId: string): Contestation | null => {
    return contestations.find(
      contestation => 
        contestation.goalId === goalId && 
        contestation.submissionId === submissionId &&
        contestation.status === 'pending'
    ) || null;
  };

  // Buscar contestações pendentes de um colaborador
  const getPendingContestations = (collaboratorId: string): Contestation[] => {
    return contestations.filter(
      contestation => 
        contestation.collaboratorId === collaboratorId && 
        contestation.status === 'pending'
    );
  };

  // Carregar contestações na inicialização
  useEffect(() => {
    fetchContestations();
  }, []);

  return {
    contestations,
    loading,
    error,
    fetchContestations,
    fetchContestationsByCollaborator,
    fetchContestationsByManager,
    createContestation,
    updateContestation,
    isGoalContested,
    getPendingContestations
  };
};
