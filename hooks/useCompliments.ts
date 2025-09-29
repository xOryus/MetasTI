import { useCallback, useEffect, useState } from 'react';
import { databases, DATABASE_ID, COMPLIMENTS_COLLECTION, type Compliment, type CreateComplimentData, Query } from '@/lib/appwrite';

export function useCompliments() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compliments, setCompliments] = useState<Compliment[] | null>(null);

  const fetchComplimentsForUser = useCallback(async (collaboratorId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await databases.listDocuments(DATABASE_ID, COMPLIMENTS_COLLECTION, [
        Query.equal('collaboratorId', collaboratorId),
        Query.orderDesc('$createdAt'),
        Query.limit(20)
      ]);
      setCompliments(res.documents as unknown as Compliment[]);
    } catch (e: any) {
      setError(e.message || 'Erro ao buscar elogios');
    } finally {
      setLoading(false);
    }
  }, []);

  const createCompliment = useCallback(async (data: CreateComplimentData) => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        managerId: data.managerId,
        collaboratorId: data.collaboratorId,
        message: data.message,
        presetKey: data.presetKey || null,
      } as any;
      const doc = await databases.createDocument(DATABASE_ID, COMPLIMENTS_COLLECTION, 'unique()', payload);
      return doc as unknown as Compliment;
    } catch (e: any) {
      setError(e.message || 'Erro ao criar elogio');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    compliments,
    fetchComplimentsForUser,
    createCompliment,
  };
}


