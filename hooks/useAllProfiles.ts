/**
 * Hook para buscar todos os perfis de usuários do setor
 * Usado pelo gestor para análise da equipe
 */

import { useState, useEffect } from 'react';
import { databases } from '@/lib/appwrite';
import { UserProfile } from '@/lib/appwrite';
import { Query } from 'appwrite';

export function useAllProfiles(sectorFilter?: string) {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllProfiles();
  }, [sectorFilter]);

  const refetch = () => {
    fetchAllProfiles();
  };

  async function fetchAllProfiles() {
    try {
      setLoading(true);
      setError(null);

      const queries = [];
      if (sectorFilter) {
        queries.push(Query.equal('sector', sectorFilter));
      }

      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!,
        queries.length > 0 ? [...queries, Query.limit(200)] : [Query.limit(200)]
      );

      setProfiles(response.documents as unknown as UserProfile[]);
    } catch (err) {
      console.error('Erro ao buscar perfis:', err);
      setError('Erro ao carregar perfis dos usuários');
    } finally {
      setLoading(false);
    }
  }

  return {
    profiles,
    loading,
    error,
    refetch
  };
}
