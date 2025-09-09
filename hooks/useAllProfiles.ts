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

  // Cache simples em memória por setor (módulo)
  // TTL de 5 minutos
  const CACHE_TTL_MS = 5 * 60 * 1000;
  // @ts-ignore - anexando no objeto global do módulo
  const globalAny: any = globalThis as any;
  if (!globalAny.__profilesCache) {
    globalAny.__profilesCache = new Map<string, { ts: number; data: UserProfile[] }>();
  }

  function getCacheKey(filter?: string) {
    return filter && filter !== 'all' ? `sector:${filter}` : 'all';
  }

  async function fetchAllProfiles() {
    try {
      setLoading(true);
      setError(null);

      // Tentar cache primeiro
      const cacheKey = getCacheKey(sectorFilter);
      const cached = globalAny.__profilesCache.get(cacheKey);
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        setProfiles(cached.data);
        setLoading(false);
        return;
      }

      console.log('🚀 useAllProfiles - Iniciando busca de perfis...');
      console.log('📂 DATABASE_ID:', process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID);
      console.log('📂 PROFILES_COLLECTION_ID:', process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID);
      console.log('🔍 sectorFilter:', sectorFilter);

      const queries = [];
      if (sectorFilter && sectorFilter !== 'all') {
        queries.push(Query.equal('sector', sectorFilter));
      }

      console.log('📋 Queries preparadas:', queries);

      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!,
        queries.length > 0 ? [...queries, Query.limit(200)] : [Query.limit(200)]
      );

      console.log('✅ Resposta do Appwrite:', response);
      console.log('👥 Documentos encontrados:', response.documents.length);

      let docs = response.documents as unknown as UserProfile[];

      // Fallback: se nenhum perfil for retornado, tentar via API admin
      if (!docs || docs.length === 0) {
        try {
          const params = new URLSearchParams();
          if (sectorFilter && sectorFilter !== 'all') {
            params.set('sector', sectorFilter);
          }
          const res = await fetch(`/api/admin/users?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.users)) {
              docs = data.users as UserProfile[];
              console.log('🛡️ Fallback admin OK. Perfis via API:', docs.length);
            }
          } else {
            console.warn('Fallback admin falhou:', res.status);
          }
        } catch (fallbackErr) {
          console.warn('Erro no fallback admin:', fallbackErr);
        }
      }

      const finalDocs = docs || [];
      setProfiles(finalDocs);
      // Salvar no cache
      globalAny.__profilesCache.set(cacheKey, { ts: Date.now(), data: finalDocs });
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
