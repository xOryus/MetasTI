import { NextApiRequest } from 'next';
import { Client, Account, Databases, Query } from 'node-appwrite';
import { Role } from './roles';
import { DATABASE_ID, SUBMISSIONS_COLLECTION, USER_PROFILES_COLLECTION } from './appwrite';

// Função para inicializar o cliente Appwrite no lado do servidor
const initServerAppwrite = (cookie: string) => {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

  // Extrai o session ID do cookie
  const session = cookie.split(';').find(s => s.trim().startsWith('a_session_'));
  if (session) {
    client.setSession(session.split('=')[1]);
  }

  const account = new Account(client);
  const databases = new Databases(client);

  return { account, databases };
};

// Função auxiliar para buscar perfil e submissões
export const getProfileAndSubmissions = async (cookieHeader: string | undefined) => {
  if (!cookieHeader) {
    return { profile: null, submissions: [] };
  }

  const { account, databases } = initServerAppwrite(cookieHeader);

  try {
    // 1. Obter o usuário logado
    const user = await account.get();

    // 2. Obter o perfil do usuário
    const profileResponse = await databases.listDocuments(
      DATABASE_ID,
      USER_PROFILES_COLLECTION,
      [Query.equal('userId', user.$id)]
    );

    if (profileResponse.documents.length === 0) {
      return { profile: null, submissions: [] };
    }

    const profile = profileResponse.documents[0];

    // 3. Obter as submissões com base no perfil
    let submissionQueries = [];
    if (profile.role === Role.COLLABORATOR) {
      submissionQueries.push(Query.equal('userProfile', profile.$id));
    } else if (profile.role === Role.MANAGER) {
      // Esta query pode não funcionar dependendo da versão do Appwrite e índices.
      // Uma alternativa seria buscar todos do setor e filtrar no código.
      submissionQueries.push(Query.equal('userProfile.sector', profile.sector));
    }
    // Admin não tem filtro, busca tudo

    const submissionsResponse = await databases.listDocuments(
      DATABASE_ID,
      SUBMISSIONS_COLLECTION,
      submissionQueries.length > 0 ? [...submissionQueries, Query.limit(1000)] : [Query.limit(1000)]
    );

    return {
      profile: JSON.parse(JSON.stringify(profile)),
      submissions: JSON.parse(JSON.stringify(submissionsResponse.documents)),
    };

  } catch (error) {
    console.error('Server helper error:', error);
    return { profile: null, submissions: [] };
  }
};
