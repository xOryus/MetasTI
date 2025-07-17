import { useState, useEffect } from 'react';
import { databases, DATABASE_ID, SECTOR_GOALS_COLLECTION } from '@/lib/appwrite';
import { Query } from 'appwrite';
import type { SectorGoal, Sector, GoalType, GoalPeriod } from '@/lib/appwrite';

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
  isActive: boolean;
}

export interface UpdateSectorGoalData extends Partial<CreateSectorGoalData> {}

export function useSectorGoals() {
  const [goals, setGoals] = useState<SectorGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar todos os goals
  const fetchGoals = async (queries?: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        SECTOR_GOALS_COLLECTION,
        queries
      );
      setGoals(response.documents as unknown as SectorGoal[]);
    } catch (err) {
      console.error('Erro ao buscar sector goals:', err);
      
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
  };

  // Buscar goals por setor
  const fetchGoalsBySector = async (sectorId: string) => {
    await fetchGoals([Query.equal('sectorId', sectorId)]);
  };

  // Buscar goals ativos
  const fetchActiveGoals = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        SECTOR_GOALS_COLLECTION
      );
      setGoals(response.documents as unknown as SectorGoal[]);
    } catch (err) {
      console.error('Erro ao buscar goals ativos:', err);
      throw err;
    }
  };

  // Buscar goals por setor e ativas
  const fetchActiveGoalsBySector = async (sectorId: string) => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        SECTOR_GOALS_COLLECTION,
        [
          Query.equal('sectorId', sectorId),
          Query.equal('isActive', true)
        ]
      );
      setGoals(response.documents as unknown as SectorGoal[]);
    } catch (err) {
      console.error('Erro ao buscar goals do setor:', err);
      
      // Se falhar, tentar buscar todas
      try {
        const fallbackResponse = await databases.listDocuments(
          DATABASE_ID,
          SECTOR_GOALS_COLLECTION
        );
        setGoals(fallbackResponse.documents as unknown as SectorGoal[]);
      } catch (fallbackErr) {
        throw err;
      }
    }
  };

  // Criar novo goal
  const createGoal = async (data: CreateSectorGoalData): Promise<SectorGoal> => {
    setLoading(true);
    setError(null);
    try {
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
      console.error('Erro ao criar sector goal:', err);
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
      console.error('Erro ao atualizar sector goal:', err);
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
      console.error('Erro ao deletar sector goal:', err);
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

  // Buscar goals no mount
  useEffect(() => {
    fetchGoals();
  }, []);

  return {
    goals,
    loading,
    error,
    fetchGoals,
    fetchGoalsBySector,
    fetchActiveGoals,
    fetchActiveGoalsBySector,
    createGoal,
    updateGoal,
    deleteGoal,
    toggleGoalStatus,
    refetch: fetchGoals
  };
}
