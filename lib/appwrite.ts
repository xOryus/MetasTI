/**
 * Appwrite SDK Configuration
 * Configura cliente Appwrite com autenticação e serviços de banco/storage
 */

import { Client, Account, Databases, Storage, ID } from 'appwrite';
import { Role } from './roles';

// Validação das variáveis de ambiente
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID) {
  throw new Error('Missing required Appwrite environment variables. Please check your .env.local file.');
}

// Cliente público (frontend)
export const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

// Serviços
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Constantes
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const USER_PROFILES_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;
export const SUBMISSIONS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_SUBMISSIONS_COLLECTION_ID!;
export const SECTOR_GOALS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_SECTOR_GOALS_COLLECTION_ID!;
export const PRINTS_BUCKET = process.env.NEXT_PUBLIC_APPWRITE_PRINTS_BUCKET_ID!;

// Enums
export enum Sector {
  TI = 'TI',
  RH = 'RH',
  LOGISTICA = 'LOGISTICA',
  FROTAS = 'FROTAS',
  ABATE = 'ABATE',
  DESOSSA = 'DESOSSA',
  MIUDOS = 'MIUDOS',
  EXPEDICAO = 'EXPEDICAO',
  GERAL_GESTORES = 'GERAL_GESTORES',
  FINANCEIRO = 'FINANCEIRO',
  FISCAL_CONTABIL = 'FISCAL_CONTABIL',
  COMERCIAL = 'COMERCIAL',
  COMPRA_GADO = 'COMPRA_GADO',
  ALMOXARIFADO = 'ALMOXARIFADO',
  MANUTENCAO = 'MANUTENCAO',
  LAVANDERIA = 'LAVANDERIA',
  COZINHA = 'COZINHA'
}

export enum GoalType {
  NUMERIC = 'numeric',
  BOOLEAN_CHECKLIST = 'boolean_checklist',
  TASK_COMPLETION = 'task_completion',
  PERCENTAGE = 'percentage'
}

export enum GoalPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

// Remover duplicação - usar apenas lib/roles.ts
// export enum Role {
//   COLLABORATOR = 'collaborator',
//   MANAGER = 'manager',
//   ADMIN = 'admin'
// }

// Tipos
// Enum para o escopo da meta (setorial ou individual)
export enum GoalScope {
  SECTOR = 'sector',
  INDIVIDUAL = 'individual'
}

export interface SectorGoal {
  $id?: string;
  $createdAt?: string;
  $updatedAt?: string;
  $permissions?: string[];
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
  scope?: GoalScope; // Novo atributo para identificar se é setorial ou individual
  assignedUserId?: string; // ID do usuário atribuído (para metas individuais)
}

export interface UserProfile {
  $id: string;
  userId: string;
  name: string; // Campo para nome do usuário
  email: string; // Campo obrigatório para o Appwrite
  sector: Sector;
  role: Role;
  $createdAt: string;
  $updatedAt: string;
}

export interface Submission {
  $id: string;
  userProfile: UserProfile;
  date: string;
  checklist: string; // JSON string com as respostas do checklist
  observation?: string;
  printFileId: string;
  $createdAt: string;
  $updatedAt: string;
}

// Função utilitária para gerar URL de visualização de arquivo
export const getFilePreview = (fileId: string): string => {
  return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${PRINTS_BUCKET}/files/${fileId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;
};

// Função utilitária para gerar URL de download de arquivo
export const getFileDownload = (fileId: string): string => {
  return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${PRINTS_BUCKET}/files/${fileId}/download?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;
};

export { ID };