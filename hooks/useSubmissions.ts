/**
 * Hook para gerenciar submissões de checklist
 * Busca, cria e filtra submissões baseado no perfil do usuário logado
 * Inclui funcionalidades para cálculo de recompensas monetárias
 */

import { useEffect, useState } from 'react';
import { databases, storage, DATABASE_ID, SUBMISSIONS_COLLECTION, PRINTS_BUCKET, Submission, ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { format } from 'date-fns';
import { useAuth } from './useAuth';
import { Role } from '@/lib/roles';
import { logger } from '@/lib/logger';
import { calculateUserRewards, calculateMonthlyEarnings, type UserRewardStats } from '@/lib/rewards';

export function useSubmissions() {
  const { profile, loading: authLoading } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    // Perfil ainda não carregado, não faz nada
    if (!profile) {
      setLoading(false);
      return;
    }

    logger.api.request(`submissions/${profile.role}`);

    try {
      setLoading(true);
      
      let queries = [];
      
      if (profile.role === Role.COLLABORATOR) {
        // Colaborador só vê as próprias submissões
        // CORREÇÃO: usar o ID do perfil, não userId
        queries.push(Query.equal('userProfile', profile.$id));
      } else if (profile.role === Role.MANAGER) {
        // Gestor vê todas as submissões do seu setor
        // CORREÇÃO: Primeiro buscar todos os usuários do setor, depois suas submissões
        try {
          const profilesResponse = await databases.listDocuments(
            DATABASE_ID,
            'user_profiles', // Collection de perfis
            [Query.equal('sector', profile.sector)]
          );
          
          const profileIds = profilesResponse.documents.map(p => p.$id);
          
          if (profileIds.length === 0) {
            logger.data.empty('usuários no setor');
            setSubmissions([]);
            setLoading(false);
            return;
          }
          
          // Agora buscar submissões desses perfis
          queries.push(Query.equal('userProfile', profileIds));
        } catch (profileError) {
          logger.api.error('perfis do setor', 'Falha na requisição');
          setError('Erro ao carregar dados do setor');
          setLoading(false);
          return;
        }
      }
      // ADMIN não tem filtro, busca tudo.

      // Se não for admin e não tiver query, algo está errado.
      if (queries.length === 0 && profile.role !== Role.ADMIN) {
        logger.data.empty('queries para perfil');
        setSubmissions([]);
        setLoading(false);
        return;
      }
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        SUBMISSIONS_COLLECTION,
        queries
      );
      
      logger.data.load('submissões', response.documents.length);
      setSubmissions(response.documents as unknown as Submission[]);
    } catch (error: any) {
      logger.api.error('submissões', 'Falha na busca');
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Roda o fetch apenas quando a autenticação terminar
    if (!authLoading) {
      fetchSubmissions();
    }
  }, [profile, authLoading]); // Depende do profile e do status de loading da auth

  const createSubmission = async (
    userProfileId: string,
    answers: Record<string, boolean>,
    observation: string,
    printFile: File
  ) => {
    try {
      const uploadResponse = await storage.createFile(
        PRINTS_BUCKET,
        ID.unique(),
        printFile
      );
      
      const submission = await databases.createDocument(
        DATABASE_ID,
        SUBMISSIONS_COLLECTION,
        ID.unique(),
        {
          userProfile: userProfileId,
          date: new Date().toISOString(),
          checklist: JSON.stringify(answers), // Usando checklist em vez de answers
          observation: observation || '',
          printFileId: uploadResponse.$id
        }
      );
      
      // Re-fetch para atualizar a lista
      await fetchSubmissions();
      logger.data.save('submissão');
      return submission;
    } catch (error: any) {
      logger.form.error('submissão', error.message);
      throw new Error(error.message);
    }
  };

  const hasSubmissionToday = (userProfileId: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return submissions.some(
      sub => sub.userProfile.$id === userProfileId && 
      format(new Date(sub.date), 'yyyy-MM-dd') === today
    );
  };

  const getSubmissionsByDateRange = (startDate: Date, endDate: Date) => {
    return submissions.filter(sub => {
      const subDate = new Date(sub.date);
      return subDate >= startDate && subDate <= endDate;
    });
  };

  const getCompletionStats = () => {
    const today = new Date();
    const todaySubmissions = getSubmissionsByDateRange(today, today);
    
    const completed = todaySubmissions.length;
    const total = 1;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    return { completed, total, percentage };
  };

  // Funcionalidades de recompensas monetárias
  const calculateRewards = (goals: any[], userId?: string): UserRewardStats | null => {
    const targetUserId = userId || profile?.userId;
    if (!targetUserId || !goals.length) {
      return null;
    }

    return calculateUserRewards(goals, submissions, targetUserId);
  };

  const getMonthlyEarnings = (goals: any[], month: Date, userId?: string): number => {
    const targetUserId = userId || profile?.userId;
    if (!targetUserId || !goals.length) {
      return 0;
    }

    return calculateMonthlyEarnings(goals, submissions, targetUserId, month);
  };

  return {
    submissions,
    loading,
    error,
    createSubmission,
    hasSubmissionToday,
    getSubmissionsByDateRange,
    getCompletionStats,
    calculateRewards,
    getMonthlyEarnings,
    refetch: fetchSubmissions
  };
}