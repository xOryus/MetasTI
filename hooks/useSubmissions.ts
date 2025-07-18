/**
 * Hook para gerenciar submissões de checklist
 * Busca, cria e filtra submissões baseado no perfil do usuário logado
 */

'use client';

import { useEffect, useState } from 'react';
import { databases, storage, DATABASE_ID, SUBMISSIONS_COLLECTION, PRINTS_BUCKET, Submission, ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { format } from 'date-fns';
import { useAuth } from './useAuth';
import { Role } from '@/lib/roles';

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

    console.log(`[useSubmissions] Iniciando busca para perfil: ${profile.role} - ${profile.sector}`);

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
            console.log('[useSubmissions] Nenhum usuário encontrado no setor:', profile.sector);
            setSubmissions([]);
            setLoading(false);
            return;
          }
          
          // Agora buscar submissões desses perfis
          queries.push(Query.equal('userProfile', profileIds));
        } catch (profileError) {
          console.error('[useSubmissions] Erro ao buscar perfis do setor:', profileError);
          setError('Erro ao carregar dados do setor');
          setLoading(false);
          return;
        }
      }
      // ADMIN não tem filtro, busca tudo.

      // Se não for admin e não tiver query, algo está errado.
      if (queries.length === 0 && profile.role !== Role.ADMIN) {
        console.warn('[useSubmissions] Nenhuma query foi formada para o perfil:', profile.role);
        setSubmissions([]);
        setLoading(false);
        return;
      }
      
      console.log('[useSubmissions] Executando com queries:', queries.map(q => q.toString()));

      const response = await databases.listDocuments(
        DATABASE_ID,
        SUBMISSIONS_COLLECTION,
        queries
      );
      
      console.log(`[useSubmissions] Encontradas ${response.documents.length} submissões.`);
      setSubmissions(response.documents as unknown as Submission[]);
    } catch (error: any) {
      console.error('[useSubmissions] Erro ao buscar submissões:', error);
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
      return submission;
    } catch (error: any) {
      console.error('[useSubmissions] Erro ao criar submissão:', error);
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

  return {
    submissions,
    loading,
    error,
    createSubmission,
    hasSubmissionToday,
    getSubmissionsByDateRange,
    getCompletionStats,
    refetch: fetchSubmissions
  };
}