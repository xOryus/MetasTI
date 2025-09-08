import { useState, useEffect, useCallback } from 'react';
import { databases, DATABASE_ID, SECTOR_GOALS_COLLECTION, GoalScope } from '@/lib/appwrite';
import { Query } from 'appwrite';
import type { SectorGoal, Sector, GoalType, GoalPeriod } from '@/lib/appwrite';
import { logger } from '@/lib/logger';

export interface CreateSectorGoalData {
  title: string;
  description: string;
  sectorId: string; // Mudou de 'sector' para 'sectorId'
  type: GoalType; // Mudou de 'goalType' para 'type'
  targetValue: number;
  unit: string; // Novo atributo
  checklistItems?: string[]; // Novo atributo
  period: GoalPeriod;
  category: string; // Novo atributo
  isActive?: boolean;
  scope?: GoalScope; // Novo atributo para identificar se é setorial ou individual
  assignedUserId?: string; // ID do usuário atribuído (para metas individuais)
  // Campos monetários
  hasMonetaryReward?: boolean; // Indica se possui recompensa monetária
  monetaryValue?: number; // Valor em centavos
  currency?: string; // Código da moeda
}

export interface UpdateSectorGoalData extends Partial<CreateSectorGoalData> {}

export function useSectorGoals() {
  const [goals, setGoals] = useState<SectorGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar todos os goals
  const fetchGoals = useCallback(async (queries?: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        SECTOR_GOALS_COLLECTION,
        queries ? [...queries, Query.limit(500)] : [Query.limit(500)]
      );
      setGoals(response.documents as unknown as SectorGoal[]);
    } catch (err) {
      logger.api.error('sector-goals', `Erro ao buscar metas: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      
      // Verificar se é erro de atributo não encontrado
      if (err instanceof Error && err.message.includes('Attribute not found')) {
        setError('Coleção de metas não configurada no Appwrite. Entre em contato com o administrador.');
      } else if (err instanceof Error && err.message.includes('not authorized')) {
        setError('Usuário não tem permissão para acessar as metas. Entre em contato com o administrador.');
      } else {
        setError('Erro ao carregar metas do setor');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar goals por setor
  const fetchGoalsBySector = useCallback(async (sectorId: string) => {
    await fetchGoals([Query.equal('sectorId', sectorId)]);
  }, [fetchGoals]);

  // Buscar goals ativos
  const fetchActiveGoals = useCallback(async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        SECTOR_GOALS_COLLECTION,
        [Query.limit(500)]
      );
      setGoals(response.documents as unknown as SectorGoal[]);
    } catch (err) {
      logger.api.error('sector-goals', `Erro ao buscar goals ativos: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      throw err;
    }
  }, []);

  // Buscar goals por setor e ativas
  const fetchActiveGoalsBySector = useCallback(async (sectorId: string, userId?: string) => {
    try {
      // Construir queries baseadas nos parâmetros
      const queries = [
        Query.equal('sectorId', sectorId),
        Query.equal('isActive', true),
      ];
      
      // Se o userId for fornecido, busca metas setoriais OU metas individuais desse usuário específico
      if (userId) {
        queries.push(
          Query.or([
            Query.equal('scope', GoalScope.SECTOR),
            Query.and([
              Query.equal('scope', GoalScope.INDIVIDUAL),
              Query.equal('assignedUserId', userId)
            ])
          ])
        );
      }
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        SECTOR_GOALS_COLLECTION,
        [...queries, Query.limit(500)]
      );
      
      setGoals(response.documents as unknown as SectorGoal[]);
    } catch (err) {
      logger.api.error('sector-goals', `Erro ao buscar goals do setor: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      
      // Se falhar, tentar buscar todas
      try {
        const fallbackResponse = await databases.listDocuments(
          DATABASE_ID,
          SECTOR_GOALS_COLLECTION,
          [Query.limit(500)]
        );
        setGoals(fallbackResponse.documents as unknown as SectorGoal[]);
      } catch (fallbackErr) {
        throw err;
      }
    }
  }, []);

  // Buscar metas individuais de um usuário específico
  const fetchUserIndividualGoals = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Agora podemos usar os campos scope e assignedUserId na query
      const response = await databases.listDocuments(
        DATABASE_ID,
        SECTOR_GOALS_COLLECTION,
        [
          Query.equal('scope', GoalScope.INDIVIDUAL),
          Query.equal('assignedUserId', userId),
          Query.limit(500)
        ]
      );
      
      setGoals(response.documents as unknown as SectorGoal[]);
    } catch (err) {
      logger.api.error('sector-goals', `Erro ao buscar metas individuais: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      setError('Erro ao buscar metas individuais');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Criar novo goal
  const createGoal = async (data: CreateSectorGoalData): Promise<SectorGoal> => {
    setLoading(true);
    setError(null);
    try {
      // Agora podemos enviar todos os campos diretamente
      const response = await databases.createDocument(
        DATABASE_ID,
        SECTOR_GOALS_COLLECTION,
        'unique()',
        data
      );
      const newGoal = response as unknown as SectorGoal;
      setGoals(prev => [...prev, newGoal]);
      return newGoal;
    } catch (err) {
      logger.api.error('sector-goals', `Erro ao criar meta: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      setError('Erro ao criar meta do setor');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Atualizar goal
  const updateGoal = async (goalId: string, data: UpdateSectorGoalData): Promise<SectorGoal> => {
    setLoading(true);
    setError(null);
    try {
      // Agora podemos enviar todos os campos diretamente
      const response = await databases.updateDocument(
        DATABASE_ID,
        SECTOR_GOALS_COLLECTION,
        goalId,
        data
      );
      const updatedGoal = response as unknown as SectorGoal;
      setGoals(prev => prev.map(goal => 
        goal.$id === goalId ? updatedGoal : goal
      ));
      return updatedGoal;
    } catch (err) {
      logger.api.error('sector-goals', `Erro ao atualizar meta: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      setError('Erro ao atualizar meta do setor');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Deletar goal
  const deleteGoal = async (goalId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        SECTOR_GOALS_COLLECTION,
        goalId
      );
      setGoals(prev => prev.filter(goal => goal.$id !== goalId));
    } catch (err) {
      logger.api.error('sector-goals', `Erro ao deletar meta: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      setError('Erro ao deletar meta do setor');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Ativar/desativar goal
  const toggleGoalStatus = async (goalId: string, isActive: boolean): Promise<SectorGoal> => {
    return await updateGoal(goalId, { isActive });
  };

  // Não carregamos automaticamente todas as metas para evitar vazamento de dados
  // O componente deve chamar o método apropriado para buscar as metas relevantes
  
  return {
    goals,
    loading,
    error,
    fetchGoals,
    fetchGoalsBySector,
    fetchActiveGoals,
    fetchActiveGoalsBySector,
    fetchUserIndividualGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    toggleGoalStatus,
    refetch: fetchGoals
  };
}
