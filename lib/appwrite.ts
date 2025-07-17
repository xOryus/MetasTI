/**
 * Appwrite SDK Configuration
 * Configura cliente Appwrite com autenticação e serviços de banco/storage
 */

import { Client, Account, Databases, Storage, ID } from 'appwrite';
import { Role } from './roles';

// Cliente público (frontend)
export const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

// Serviços
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Constantes
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const USER_PROFILES_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;
export const SUBMISSIONS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_SUBMISSIONS_COLLECTION_ID!;
export const PRINTS_BUCKET = 'prints';

// Enums
export enum Sector {
  TI = 'TI',
  RH = 'RH',
  LOGISTICA = 'LOGISTICA',
  PORTARIA = 'PORTARIA'
}

// Remover duplicação - usar apenas lib/roles.ts
// export enum Role {
//   COLLABORATOR = 'collaborator',
//   MANAGER = 'manager',
//   ADMIN = 'admin'
// }

// Tipos
export interface UserProfile {
  $id: string;
  userId: string;
  sector: Sector;
  role: Role;
  $createdAt: string;
  $updatedAt: string;
}

export interface Submission {
  $id: string;
  userProfile: UserProfile;
  date: string;
  answers: string;
  observation?: string;
  printFileId: string;
  $createdAt: string;
  $updatedAt: string;
}

export { ID };